"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { useI18n } from "@/i18n/context";
import { Modal } from "@/shared/ui/Modal";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleDate, formatLocaleDateTime } from "@/shared/lib/locale-date";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/cn";
import type { Locale } from "@/i18n/messages";
import {
  useBranchProductBalances,
  useBranchStockConsumptions,
} from "@/modules/branch/hooks/useBranchStockConsumptions";
import { useBranchStockReceiptsPaged } from "@/modules/branch/hooks/useBranchQueries";

type Props = {
  branchId: number;
  active: boolean;
};

/**
 * Güncel stok (anlık bakiye) görünümü — depodan-gelen (inbound) ve düşüm-girişinden ayrı, salt-okunur.
 * Ürün satırına tıklanınca o ürüne ait son hareketler (kim, ne zaman, ne türde) modal'da gösterilir.
 */
export function BranchStockBalancesPanel({ branchId, active }: Props) {
  const { t, locale } = useI18n();
  const { data, isPending, isError, error } = useBranchProductBalances(branchId, undefined, active);

  const [search, setSearch] = useState("");
  const [drillProduct, setDrillProduct] = useState<{ id: number; name: string; unit: string | null } | null>(null);
  // Açık/kapalı ana ürün grupları — varsayılan: hepsi açık. Sadece kapatılanları tutarız.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Ana ürün bazlı gruplama: parent_product_id olan satırlar ana ürün altında toplanır,
  // grup başlığında o ana ürünün toplam bakiyesi gösterilir. Parent'ı olmayan ürünler
  // tek başına (başlıksız) satır olur. Birim ancak tüm alt ürünlerde aynıysa gösterilir.
  const groups = useMemo(() => {
    const all = data ?? [];
    const q = search.trim().toLocaleLowerCase("tr");
    const filtered = q
      ? all.filter(
          (r) =>
            r.productName.toLocaleLowerCase("tr").includes(q) ||
            (r.parentProductName?.toLocaleLowerCase("tr").includes(q) ?? false)
        )
      : all;

    const byParent = new Map<
      number,
      { parentId: number; parentName: string; children: typeof all }
    >();
    const standalone: typeof all = [];

    for (const r of filtered) {
      if (r.parentProductId != null) {
        const g = byParent.get(r.parentProductId);
        if (g) {
          g.children.push(r);
        } else {
          byParent.set(r.parentProductId, {
            parentId: r.parentProductId,
            parentName: r.parentProductName ?? r.productName,
            children: [r],
          });
        }
      } else {
        standalone.push(r);
      }
    }

    type Group = {
      key: string;
      isGroup: boolean;
      name: string;
      total: number;
      unit: string | null;
      children: typeof all;
    };

    const result: Group[] = [];
    for (const g of byParent.values()) {
      const total = g.children.reduce((sum, c) => sum + c.balance, 0);
      const units = new Set(g.children.map((c) => c.productUnit ?? ""));
      const unit = units.size === 1 ? g.children[0]?.productUnit ?? null : null;
      result.push({
        key: `p-${g.parentId}`,
        isGroup: true,
        name: g.parentName,
        total,
        unit,
        children: g.children,
      });
    }
    for (const r of standalone) {
      result.push({
        key: `u-${r.productId}`,
        isGroup: false,
        name: r.productName,
        total: r.balance,
        unit: r.productUnit ?? null,
        children: [r],
      });
    }
    result.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    return result;
  }, [data, search]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("branchStockConsumption.balancesHeading")}
        </h3>
        <p className="text-xs leading-relaxed text-zinc-500">
          {t("branchStockConsumption.balancesHint")}
        </p>
      </div>

      <div className="relative w-full sm:max-w-xs">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("branchStockConsumption.searchPlaceholder")}
          className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm transition focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        />
      </div>

      {isPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-800">
          {toErrorMessage(error) || t("branchStockConsumption.loadFailed")}
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-zinc-500">{t("branchStockConsumption.balancesEmpty")}</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("branchStockConsumption.balancesSearchEmpty")}</p>
      ) : (
        <div className="space-y-2.5">
          {groups.map((g) =>
            g.isGroup ? (
              <BalanceGroupCard
                key={g.key}
                group={g}
                open={!collapsed.has(g.key)}
                onToggle={() => toggleGroup(g.key)}
                t={t}
                onPick={(r) =>
                  setDrillProduct({ id: r.productId, name: r.productName, unit: r.productUnit ?? null })
                }
              />
            ) : (
              <StandaloneBalanceCard
                key={g.key}
                row={g.children[0]!}
                t={t}
                onClick={() =>
                  setDrillProduct({
                    id: g.children[0]!.productId,
                    name: g.children[0]!.productName,
                    unit: g.children[0]!.productUnit ?? null,
                  })
                }
              />
            )
          )}
        </div>
      )}

      {drillProduct ? (
        <ProductHistoryModal
          branchId={branchId}
          product={drillProduct}
          locale={locale as Locale}
          onClose={() => setDrillProduct(null)}
        />
      ) : null}
    </div>
  );
}

type BalanceLeaf = {
  productId: number;
  productName: string;
  productUnit: string | null;
  balance: number;
};

type BalanceGroup = {
  key: string;
  isGroup: boolean;
  name: string;
  total: number;
  unit: string | null;
  children: BalanceLeaf[];
};

/** Ana ürün kartı — başlıkta toplam, açılınca alt ürünler. Mobil öncelikli, dokunmatik hedefler ≥44px. */
function BalanceGroupCard({
  group,
  open,
  onToggle,
  t,
  onPick,
}: {
  group: BalanceGroup;
  open: boolean;
  onToggle: () => void;
  t: (k: string) => string;
  onPick: (row: BalanceLeaf) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-zinc-50 sm:px-4"
      >
        <ChevronDown
          aria-hidden
          className={cn(
            "h-5 w-5 shrink-0 text-zinc-400 transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-semibold text-zinc-900 sm:text-base">
            {group.name}
          </span>
          <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-600">
            {group.children.length}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-base font-bold tabular-nums text-zinc-900 sm:text-lg">
            {group.total}
            {group.unit ? (
              <span className="ml-1 text-xs font-medium text-zinc-400">{group.unit}</span>
            ) : null}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            {t("branchStockConsumption.balancesGroupTotal")}
          </span>
        </div>
      </button>

      {open ? (
        <ul className="divide-y divide-zinc-100 border-t border-zinc-100">
          {group.children.map((r) => (
            <li key={r.productId}>
              <button
                type="button"
                onClick={() => onPick(r)}
                className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2.5 pl-10 text-left transition hover:bg-blue-50/40 sm:px-4 sm:pl-12"
              >
                <span className="truncate text-sm font-medium text-blue-700 underline decoration-blue-700/30 underline-offset-2">
                  {r.productName}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                  {r.balance}
                  {r.productUnit ? (
                    <span className="ml-1 text-xs font-normal text-zinc-400">{r.productUnit}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Ana ürünü olmayan tekil ürün — tek satırlık kompakt kart. */
function StandaloneBalanceCard({
  row,
  onClick,
}: {
  row: BalanceLeaf;
  t: (k: string) => string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-left shadow-sm transition hover:bg-blue-50/40 sm:px-4"
    >
      <span className="truncate text-sm font-medium text-blue-700 underline decoration-blue-700/30 underline-offset-2 sm:text-base">
        {row.productName}
      </span>
      <span className="shrink-0 text-base font-bold tabular-nums text-zinc-900">
        {row.balance}
        {row.productUnit ? (
          <span className="ml-1 text-xs font-medium text-zinc-400">{row.productUnit}</span>
        ) : null}
      </span>
    </button>
  );
}

function ProductHistoryModal({
  branchId,
  product,
  locale,
  onClose,
}: {
  branchId: number;
  product: { id: number; name: string; unit: string | null };
  locale: Locale;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { user } = useAuth();
  const canManage = user != null;
  void canManage;
  const PAGE_SIZE = 100;
  const [consPage, setConsPage] = useState(1);
  const [recPage, setRecPage] = useState(1);
  const [accConsumptions, setAccConsumptions] = useState<
    NonNullable<ReturnType<typeof useBranchStockConsumptions>["data"]>["items"]
  >([]);
  const [accReceipts, setAccReceipts] = useState<
    NonNullable<ReturnType<typeof useBranchStockReceiptsPaged>["data"]>["items"]
  >([]);
  const consumptionsQ = useBranchStockConsumptions(
    branchId,
    { dateFrom: "", dateTo: "", includeDeleted: false, page: consPage, pageSize: PAGE_SIZE },
    true
  );
  const receiptsQ = useBranchStockReceiptsPaged(
    branchId,
    {
      page: recPage,
      pageSize: PAGE_SIZE,
      productId: product.id,
    },
    true
  );

  // Yeni sayfa veri dönünce mevcut listeye ekle (id ile dedupe).
  if (consumptionsQ.data && accConsumptions.at(-1)?.id !== consumptionsQ.data.items.at(-1)?.id) {
    const existingIds = new Set(accConsumptions.map((x) => x.id));
    const next = consumptionsQ.data.items.filter((x) => !existingIds.has(x.id));
    if (next.length > 0) setAccConsumptions((prev) => [...prev, ...next]);
  }
  if (receiptsQ.data && accReceipts.at(-1)?.id !== receiptsQ.data.items.at(-1)?.id) {
    const existingIds = new Set(accReceipts.map((x) => x.id));
    const next = receiptsQ.data.items.filter((x) => !existingIds.has(x.id));
    if (next.length > 0) setAccReceipts((prev) => [...prev, ...next]);
  }

  type TimelineRow = {
    id: string;
    sourceDate: string;
    sortKey: string;
    direction: "IN" | "OUT";
    quantity: number;
    unit: string | null;
    by: string | null;
    at: string | null;
    badge: string;
    note: string | null;
    snapshotDelta?: { pre: number; post: number };
  };

  const isInitialLoading =
    (consumptionsQ.isPending && consPage === 1) ||
    (receiptsQ.isPending && recPage === 1);
  const isError = consumptionsQ.isError || receiptsQ.isError;
  const error = consumptionsQ.error ?? receiptsQ.error;
  const consumptionRows = accConsumptions;
  const receiptRows = accReceipts;
  const consHasMore =
    consumptionsQ.data != null &&
    accConsumptions.length < consumptionsQ.data.totalCount;
  const recHasMore =
    receiptsQ.data != null &&
    accReceipts.length < receiptsQ.data.totalCount;
  const canLoadMore = consHasMore || recHasMore;
  const isFetchingMore =
    (consumptionsQ.isFetching && consPage > 1) ||
    (receiptsQ.isFetching && recPage > 1);

  // Sentinel'i izleyip görünür olunca otomatik sonraki sayfayı çek (instagram-vari sonsuz scroll).
  const listRef = useRef<HTMLUListElement | null>(null);
  const sentinelRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (!canLoadMore || isFetchingMore) return;
    const node = sentinelRef.current;
    const root = listRef.current;
    if (!node || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        if (consHasMore) setConsPage((p) => p + 1);
        if (recHasMore) setRecPage((p) => p + 1);
      },
      { root, rootMargin: "150px", threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoadMore, isFetchingMore, consHasMore, recHasMore]);

  const productRows = useMemo<TimelineRow[]>(() => {
    const out: TimelineRow[] = [];
    for (const r of consumptionRows) {
      if (r.productId !== product.id) continue;
      out.push({
        id: `c-${r.id}`,
        sourceDate: r.consumptionDate,
        sortKey: `${r.consumptionDate} ${r.createdAt ?? ""}`,
        direction: r.direction === "OUT" ? "OUT" : "IN",
        quantity: r.quantity,
        unit: r.productUnit ?? null,
        by: r.createdByName ?? null,
        at: r.createdAt ?? null,
        badge: typeLabel(t, r.type),
        note: r.note ?? null,
        snapshotDelta:
          r.type === "SNAPSHOT" && r.snapshotValue != null && r.preBalance != null
            ? { pre: r.preBalance, post: r.snapshotValue }
            : undefined,
      });
    }
    for (const r of receiptRows) {
      out.push({
        id: `r-${r.id}`,
        sourceDate: r.movementDate,
        sortKey: `${r.movementDate} ${r.createdAt ?? ""}`,
        direction: "IN",
        quantity: r.quantity,
        unit: r.unit ?? null,
        by: r.createdByUserName ?? null,
        at: r.createdAt ?? null,
        badge: r.warehouseName?.trim()
          ? `${t("branchStockConsumption.drillReceiptFrom")} ${r.warehouseName.trim()}`
          : t("branchStockConsumption.drillReceipt"),
        note: null,
      });
    }
    out.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return out;
  }, [consumptionRows, receiptRows, product.id, t]);

  return (
    <Modal
      open
      onClose={onClose}
      titleId="branch-stock-balance-history-title"
      title={
        <span className="flex flex-col">
          <span className="text-base font-semibold text-zinc-900 sm:text-lg">
            {product.name}
          </span>
          {product.unit ? (
            <span className="text-xs font-normal text-zinc-500">{product.unit}</span>
          ) : null}
        </span>
      }
      description={t("branchStockConsumption.drillHint")}
      closeButtonLabel={t("common.close")}
      narrow
    >
      <div className="mt-2 flex flex-col gap-2">
        {isInitialLoading ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : isError ? (
          <p className="text-sm text-red-700">
            {toErrorMessage(error) || t("branchStockConsumption.loadFailed")}
          </p>
        ) : productRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 px-3 py-4 text-center text-xs text-zinc-500">
            {t("branchStockConsumption.drillEmpty")}
          </p>
        ) : (
          <ul
            ref={listRef}
            className="max-h-[60vh] divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200 bg-white"
          >
            {productRows.map((r) => (
              <li key={r.id} className="px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900">
                      {formatLocaleDate(r.sourceDate, locale, "—")}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {r.by ?? "—"}
                      {r.at ? (
                        <>
                          <span aria-hidden className="mx-1 text-zinc-300">·</span>
                          {formatLocaleDateTime(r.at, locale)}
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                        r.direction === "OUT"
                          ? "bg-rose-50 text-rose-800 ring-rose-200"
                          : "bg-emerald-50 text-emerald-800 ring-emerald-200"
                      )}
                    >
                      {r.direction === "OUT" ? "−" : "+"} {r.badge}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        r.direction === "IN" ? "text-emerald-700" : "text-zinc-900"
                      )}
                    >
                      {r.direction === "IN" ? "+" : "−"}
                      {r.quantity}
                      {r.unit ? (
                        <span className="ml-0.5 text-[11px] font-normal text-zinc-500">
                          {r.unit}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </div>
                {r.note ? (
                  <p className="mt-1 text-[11px] text-zinc-600">{r.note}</p>
                ) : null}
                {r.snapshotDelta ? (
                  <p className="mt-1 text-[11px] tabular-nums text-zinc-500">
                    {r.snapshotDelta.pre} →{" "}
                    <span className="font-semibold text-zinc-700">{r.snapshotDelta.post}</span>
                  </p>
                ) : null}
              </li>
            ))}
            {canLoadMore ? (
              <li
                ref={sentinelRef}
                aria-hidden
                className="flex items-center justify-center py-3 text-[11px] text-zinc-400"
              >
                {isFetchingMore ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
                    {t("common.loading")}
                  </span>
                ) : (
                  <span>{t("branchStockConsumption.drillLoadMore")}</span>
                )}
              </li>
            ) : (
              <li className="py-2 text-center text-[11px] text-zinc-400">
                {t("branchStockConsumption.drillAllLoaded")}
              </li>
            )}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function typeLabel(t: (k: string) => string, type: "CONSUMPTION" | "SNAPSHOT" | "ADJUSTMENT"): string {
  if (type === "CONSUMPTION") return t("branchStockConsumption.typeConsumption");
  if (type === "SNAPSHOT") return t("branchStockConsumption.typeSnapshot");
  return t("branchStockConsumption.typeAdjustment");
}
