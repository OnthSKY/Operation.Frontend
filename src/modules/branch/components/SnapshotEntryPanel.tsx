"use client";

import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { ProductUnitPicker } from "@/modules/products/components/ProductUnitPicker";
import type { ProductListItem } from "@/types/product";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Modal } from "@/shared/ui/Modal";
import { ModalFormLayout } from "@/shared/components/ModalFormLayout";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import {
  useBranchProductBalances,
  useRecordBranchStockSnapshot,
} from "@/modules/branch/hooks/useBranchStockConsumptions";

type Props = {
  open: boolean;
  onClose: () => void;
  branchId: number;
};

const TITLE_ID = "branch-stock-snapshot-entry-title";

type SnapshotRow = {
  productId: number;
  productName: string;
  unit: string | null;
  stockUnit: string | null;
  currentBalance: number;
  snapshotText: string;
  /** Boş = ürünün temel/legacy birimi (backend default'a düşer). */
  unitName: string;
};

function normalizeSearch(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function isLeafProduct(p: ProductListItem): boolean {
  return p.hasChildren !== true;
}

function parseDecimal(text: string): number | null {
  const cleaned = text.replace(",", ".").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function SnapshotEntryPanel({ open, onClose, branchId }: Props) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={TITLE_ID}
      title={t("branchStockConsumption.snapshotEntryTitle")}
      bodyScroll
    >
      {open ? <SnapshotFormBody onClose={onClose} branchId={branchId} /> : null}
    </Modal>
  );
}

function SnapshotFormBody({ onClose, branchId }: { onClose: () => void; branchId: number }) {
  const { t } = useI18n();
  const { data: catalog = [], isPending: catalogPending } = useProductsCatalog(true);
  const { data: balances = [] } = useBranchProductBalances(branchId, undefined, true);
  const snapshotMut = useRecordBranchStockSnapshot(branchId);

  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [dateText, setDateText] = useState(() => localIsoDate());
  const [globalNote, setGlobalNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Yeni eklenen satırın adet inputunu otomatik focuslamak için.
  const [lastAddedId, setLastAddedId] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const balanceByProductId = useMemo(() => {
    const m = new Map<number, number>();
    for (const b of balances) m.set(b.productId, b.balance);
    return m;
  }, [balances]);

  const leafProducts = useMemo(() => catalog.filter(isLeafProduct), [catalog]);

  const matched = useMemo(() => {
    if (!search.trim()) return [];
    const q = normalizeSearch(search);
    const existingIds = new Set(rows.map((r) => r.productId));
    return leafProducts
      .filter(
        (p) =>
          !existingIds.has(p.id) &&
          normalizeSearch(`${p.name} ${p.parentProductName ?? ""}`).includes(q)
      )
      .slice(0, 8);
  }, [leafProducts, search, rows]);

  const addRow = (p: ProductListItem) => {
    // Yeni satır listenin EN ÜSTÜNE eklenir (aramanın hemen altı) — kullanıcı aşağı kaymak zorunda kalmaz.
    setRows((prev) => [
      {
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        stockUnit: p.stockUnit ?? null,
        currentBalance: balanceByProductId.get(p.id) ?? 0,
        snapshotText: "",
        unitName: "",
      },
      ...prev,
    ]);
    setLastAddedId(p.id);
    setSearch("");
  };

  const updateRowSnapshot = (productId: number, snapshotText: string) => {
    setRows((prev) =>
      prev.map((r) => (r.productId === productId ? { ...r, snapshotText } : r))
    );
  };

  const updateRowUnit = (productId: number, unitName: string) => {
    setRows((prev) =>
      prev.map((r) => (r.productId === productId ? { ...r, unitName } : r))
    );
  };

  const removeRow = (productId: number) => {
    setRows((prev) => prev.filter((r) => r.productId !== productId));
  };

  const submit = async () => {
    setFormError(null);
    if (dateText.length !== 10) {
      setFormError(t("branchStockConsumption.errorDateRequired"));
      return;
    }
    const toSubmit = rows
      .map((r) => ({ row: r, value: parseDecimal(r.snapshotText) }))
      .filter((x): x is { row: SnapshotRow; value: number } => x.value !== null);
    if (toSubmit.length === 0) {
      setFormError(t("branchStockConsumption.errorNoSnapshotRows"));
      return;
    }
    setIsSubmitting(true);
    try {
      const note = globalNote.trim() || null;
      let writtenCount = 0;
      let noOpCount = 0;
      const failed: string[] = [];
      for (const { row, value } of toSubmit) {
        try {
          const result = await snapshotMut.mutateAsync({
            productId: row.productId,
            snapshotValue: value,
            consumptionDate: dateText,
            note,
            unitName: row.unitName.trim() || null,
          });
          if (result === null) noOpCount += 1;
          else writtenCount += 1;
        } catch (e) {
          failed.push(`${row.productName}: ${toErrorMessage(e)}`);
        }
      }
      if (failed.length > 0) {
        setFormError(failed.join("\n"));
        notify.error(t("branchStockConsumption.snapshotPartialFailure"));
        return;
      }
      notify.success(
        t("branchStockConsumption.snapshotResultSummary")
          .replace("{written}", String(writtenCount))
          .replace("{noop}", String(noOpCount))
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const filledCount = rows.filter((r) => parseDecimal(r.snapshotText) !== null).length;

  return (
    <ModalFormLayout
      body={
        <>
          {/* Sticky arama — liste uzasa da hep erişilebilir; ürün seçince satır en üste eklenir, adet otomatik focuslanır. */}
          <div className="sticky -top-1 z-20 -mx-4 border-b border-zinc-100 bg-white/95 px-4 pb-3 pt-1 backdrop-blur sm:-mx-6 sm:px-6">
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && matched.length > 0) {
                    e.preventDefault();
                    addRow(matched[0]!);
                  }
                }}
                placeholder={t("branchStockConsumption.searchPlaceholder")}
                className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm transition focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                disabled={isSubmitting}
              />
            </div>
            {search.trim() ? (
              <ul className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
                {catalogPending ? (
                  <li className="px-3 py-2 text-xs text-zinc-500">{t("branchStockConsumption.loadingProducts")}</li>
                ) : matched.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-zinc-500">{t("branchStockConsumption.noMatches")}</li>
                ) : (
                  matched.map((p) => (
                    <li key={p.id} className="border-b border-zinc-100 last:border-b-0">
                      <button
                        type="button"
                        className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-blue-50/50 active:bg-blue-100/50"
                        onClick={() => addRow(p)}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-zinc-900">{p.name}</span>
                          {p.parentProductName ? (
                            <span className="block truncate text-xs text-zinc-500">{p.parentProductName}</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500">
                          {t("branchStockConsumption.balanceShort")}: {balanceByProductId.get(p.id) ?? 0}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-6 text-center text-xs text-zinc-500">
              {t("branchStockConsumption.snapshotEmptyHint")}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between px-0.5 text-xs text-zinc-500">
                <span className="font-medium text-zinc-700">
                  {rows.length} {t("branchStockConsumption.snapshotRowsHeading")}
                </span>
                <span className="tabular-nums">
                  {filledCount}/{rows.length}
                </span>
              </div>
              <ul className="space-y-2">
                {rows.map((r) => {
                  const snapshotValue = parseDecimal(r.snapshotText);
                  // Kullanıcı temel/legacy dışı bir birim seçtiyse client-side diff yanıltıcı
                  // olur (factor bilmiyoruz, balance = temel birim). Backend doğru hesaplar;
                  // UI'da diff badge'ini gizliyoruz.
                  const baseLike = (r.stockUnit?.trim() || r.unit?.trim() || "").toLowerCase();
                  const enteredLower = r.unitName.trim().toLowerCase();
                  const sameAsBase = enteredLower === "" || enteredLower === baseLike;
                  const diff =
                    snapshotValue !== null && sameAsBase
                      ? r.currentBalance - snapshotValue
                      : null;
                  const diffLabel =
                    diff === null
                      ? null
                      : diff === 0
                        ? t("branchStockConsumption.diffNoChange")
                        : diff > 0
                          ? `−${diff}`
                          : `+${Math.abs(diff)}`;
                  const diffBadgeClass =
                    diff === 0
                      ? "bg-zinc-100 text-zinc-600"
                      : diff !== null && diff > 0
                        ? "bg-rose-50 text-rose-700"
                        : "bg-emerald-50 text-emerald-700";
                  return (
                    <li
                      key={r.productId}
                      className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-2.5 py-2 shadow-sm transition-colors sm:gap-3 sm:px-3"
                    >
                      {/* Sol: ürün adı + mevcut bakiye */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-zinc-900">{r.productName}</div>
                        <div className="mt-0.5 text-[11px] text-zinc-500">
                          {t("branchStockConsumption.currentBalanceLabel")}: {r.currentBalance}
                          {r.unit ? ` ${r.unit}` : ""}
                        </div>
                      </div>
                      {/* Birim seçici (kompakt) — tek birimde küçük metin, çok birimde dar select */}
                      <div className="shrink-0">
                        <ProductUnitPicker
                          productId={r.productId}
                          baseUnit={r.stockUnit}
                          legacyUnit={r.unit}
                          preferredContext="SALE"
                          value={r.unitName}
                          onChange={(v) => updateRowUnit(r.productId, v)}
                          disabled={isSubmitting}
                          label=""
                          compact
                        />
                      </div>
                      {/* Adet inputu — eklenince otomatik focus, Enter ile aramaya dön */}
                      <input
                        type="text"
                        inputMode="decimal"
                        autoFocus={r.productId === lastAddedId}
                        value={r.snapshotText}
                        onChange={(e) => updateRowSnapshot(r.productId, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            searchRef.current?.focus();
                          }
                        }}
                        placeholder={t("branchStockConsumption.remainingPlaceholder")}
                        className="w-16 shrink-0 rounded-lg border border-zinc-300 px-2 py-2 text-center text-sm tabular-nums focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-50"
                        disabled={isSubmitting}
                      />
                      {/* Fark rozeti — sabit genişlik, hizalı */}
                      {diffLabel !== null ? (
                        <span
                          className={cn(
                            "w-12 shrink-0 rounded-full py-0.5 text-center text-[11px] font-medium tabular-nums",
                            diffBadgeClass
                          )}
                        >
                          {diffLabel}
                        </span>
                      ) : (
                        <span className="w-12 shrink-0 text-center text-[11px] text-zinc-300">—</span>
                      )}
                      {/* Kaldır — X ikonu */}
                      <button
                        type="button"
                        aria-label={t("common.remove")}
                        className="shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        onClick={() => removeRow(r.productId)}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="w-full sm:w-48">
              <DateField
                mode="date"
                label={t("branchStockConsumption.dateLabel")}
                value={dateText}
                max={localIsoDate()}
                onChange={(e) => setDateText(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-500">
              <span className="font-medium text-zinc-700">{t("branchStockConsumption.noteLabel")}</span>
              <input
                type="text"
                value={globalNote}
                onChange={(e) => setGlobalNote(e.target.value)}
                placeholder={t("branchStockConsumption.notePlaceholder")}
                maxLength={500}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
                disabled={isSubmitting}
              />
            </label>
          </div>

          {formError ? (
            <p className="whitespace-pre-line rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {formError}
            </p>
          ) : null}
        </>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={isSubmitting || filledCount === 0}>
            {isSubmitting ? t("common.saving") : t("branchStockConsumption.saveSnapshot")}
          </Button>
        </>
      }
    />
  );
}
