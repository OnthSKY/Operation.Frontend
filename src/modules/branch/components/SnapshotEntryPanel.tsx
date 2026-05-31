"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/i18n/context";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import type { ProductListItem } from "@/types/product";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { ModalFormLayout, FormSection } from "@/shared/components/ModalFormLayout";
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
  currentBalance: number;
  snapshotText: string;
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
      wide
      wideFixedHeight
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
    setRows((prev) => [
      ...prev,
      {
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        currentBalance: balanceByProductId.get(p.id) ?? 0,
        snapshotText: "",
      },
    ]);
    setSearch("");
  };

  const updateRowSnapshot = (productId: number, snapshotText: string) => {
    setRows((prev) =>
      prev.map((r) => (r.productId === productId ? { ...r, snapshotText } : r))
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

  return (
    <ModalFormLayout
      body={
        <>
          <FormSection
            title={t("branchStockConsumption.snapshotEntryHeading")}
            description={t("branchStockConsumption.snapshotEntryDescription")}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("branchStockConsumption.searchPlaceholder")}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              disabled={isSubmitting}
            />
            {search.trim() ? (
              <ul className="max-h-48 overflow-y-auto rounded-md border border-zinc-200">
                {catalogPending ? (
                  <li className="px-3 py-2 text-xs text-zinc-500">{t("branchStockConsumption.loadingProducts")}</li>
                ) : matched.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-zinc-500">{t("branchStockConsumption.noMatches")}</li>
                ) : (
                  matched.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                        onClick={() => addRow(p)}
                      >
                        <span>
                          <span className="font-medium text-zinc-900">{p.name}</span>
                          {p.parentProductName ? (
                            <span className="ml-2 text-xs text-zinc-500">{p.parentProductName}</span>
                          ) : null}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {t("branchStockConsumption.balanceShort")}: {balanceByProductId.get(p.id) ?? 0}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </FormSection>

          <FormSection title={t("branchStockConsumption.snapshotRowsHeading")}>
            {rows.length === 0 ? (
              <p className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-4 text-center text-xs text-zinc-500">
                {t("branchStockConsumption.snapshotEmptyHint")}
              </p>
            ) : (
              <ul className="space-y-2">
                {rows.map((r) => {
                  const snapshotValue = parseDecimal(r.snapshotText);
                  const diff =
                    snapshotValue !== null ? r.currentBalance - snapshotValue : null;
                  return (
                    <li
                      key={r.productId}
                      className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-zinc-900">{r.productName}</div>
                        <div className="text-xs text-zinc-500">
                          {t("branchStockConsumption.currentBalanceLabel")}: {r.currentBalance}
                          {r.unit ? ` ${r.unit}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={r.snapshotText}
                          onChange={(e) => updateRowSnapshot(r.productId, e.target.value)}
                          placeholder={t("branchStockConsumption.remainingPlaceholder")}
                          className="w-24 rounded-md border border-zinc-300 px-2 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
                          disabled={isSubmitting}
                        />
                        {r.unit ? <span className="text-xs text-zinc-500">{r.unit}</span> : null}
                      </div>
                      <div className="w-20 text-right text-xs text-zinc-600">
                        {diff === null
                          ? "—"
                          : diff === 0
                            ? t("branchStockConsumption.diffNoChange")
                            : diff > 0
                              ? `−${diff}`
                              : `+${Math.abs(diff)}`}
                      </div>
                      <button
                        type="button"
                        className="text-xs text-rose-700 hover:underline"
                        onClick={() => removeRow(r.productId)}
                        disabled={isSubmitting}
                      >
                        {t("common.remove")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </FormSection>

          <FormSection title={t("branchStockConsumption.dateLabel")}>
            <input
              type="date"
              value={dateText}
              max={localIsoDate()}
              onChange={(e) => setDateText(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none sm:w-auto"
              disabled={isSubmitting}
            />
          </FormSection>

          <FormSection title={t("branchStockConsumption.noteLabel")}>
            <textarea
              value={globalNote}
              onChange={(e) => setGlobalNote(e.target.value)}
              placeholder={t("branchStockConsumption.notePlaceholder")}
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              disabled={isSubmitting}
            />
          </FormSection>

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
          <Button onClick={submit} disabled={isSubmitting || rows.length === 0}>
            {isSubmitting ? t("common.saving") : t("branchStockConsumption.saveSnapshot")}
          </Button>
        </>
      }
    />
  );
}
