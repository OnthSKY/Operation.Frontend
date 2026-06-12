"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
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

  const rows = useMemo(() => {
    const all = data ?? [];
    const q = search.trim().toLocaleLowerCase("tr");
    if (!q) return all;
    return all.filter((r) => r.productName.toLocaleLowerCase("tr").includes(q));
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

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("branchStockConsumption.searchPlaceholder")}
        className="w-full max-w-xs rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
      />

      {isPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-800">
          {toErrorMessage(error) || t("branchStockConsumption.loadFailed")}
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-zinc-500">{t("branchStockConsumption.balancesEmpty")}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("branchStockConsumption.balancesSearchEmpty")}</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>{t("branchStockConsumption.colProduct")}</TableHeader>
              <TableHeader>{t("branchStockConsumption.balancesColUnit")}</TableHeader>
              <TableHeader className="text-right">
                {t("branchStockConsumption.balancesColBalance")}
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.productId}
                className="cursor-pointer transition hover:bg-zinc-50/80"
                onClick={() =>
                  setDrillProduct({
                    id: r.productId,
                    name: r.productName,
                    unit: r.productUnit ?? null,
                  })
                }
              >
                <TableCell dataLabel={t("branchStockConsumption.colProduct")}>
                  <span className="font-medium text-blue-700 underline decoration-blue-700/40 underline-offset-2 hover:text-blue-800">
                    {r.productName}
                  </span>
                </TableCell>
                <TableCell dataLabel={t("branchStockConsumption.balancesColUnit")}>
                  <span className="text-xs text-zinc-600">{r.productUnit ?? "—"}</span>
                </TableCell>
                <TableCell
                  dataLabel={t("branchStockConsumption.balancesColBalance")}
                  className="text-right font-semibold tabular-nums text-zinc-900"
                >
                  {r.balance}
                  {r.productUnit ? (
                    <span className="ml-1 text-xs font-normal text-zinc-500">{r.productUnit}</span>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
  const receiptsQ = useBranchStockReceiptsPaged(branchId, {
    page: recPage,
    pageSize: PAGE_SIZE,
    productId: product.id,
  });

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
