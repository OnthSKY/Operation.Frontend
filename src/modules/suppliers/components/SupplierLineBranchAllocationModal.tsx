"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  usePostSupplierInvoiceLineBranchAllocations,
  useSetSupplierInvoiceLineBranchAllocations,
  useSupplierInvoiceLineAllocations,
} from "@/modules/suppliers/hooks/useSupplierQueries";
import { cn } from "@/lib/cn";
import { useI18n } from "@/i18n/context";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Switch } from "@/shared/ui/Switch";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Row = { key: string; branchId: string; amount: string };

function emptyRow(): Row {
  return { key: crypto.randomUUID(), branchId: "", amount: "" };
}

function parseDec(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Kuruş düzeyinde eşit bölüşüm (son kuruşlar ilk şubelere). */
function splitEqualCents(total: number, branchIds: number[]): Array<{ branchId: number; amount: number }> {
  if (branchIds.length === 0) return [];
  const cents = Math.round(total * 100);
  const n = branchIds.length;
  const base = Math.floor(cents / n);
  const rem = cents % n;
  return branchIds.map((branchId, i) => ({
    branchId,
    amount: (base + (i < rem ? 1 : 0)) / 100,
  }));
}

const EXPENSE_PRESET_KEYS = [
  "default",
  "opsRent",
  "opsUtil",
  "opsMarket",
  "opsMeal",
  "opsFuel",
  "opsCargo",
  "taxOther",
  "expOther",
] as const;

type PresetKey = (typeof EXPENSE_PRESET_KEYS)[number];

function presetToApi(
  key: PresetKey
): { main: string | null; cat: string | null } {
  switch (key) {
    case "default":
      return { main: null, cat: null };
    case "opsRent":
      return { main: "OUT_OPS", cat: "OPS_RENT" };
    case "opsUtil":
      return { main: "OUT_OPS", cat: "OPS_UTIL" };
    case "opsMarket":
      return { main: "OUT_OPS", cat: "OPS_MARKET" };
    case "opsMeal":
      return { main: "OUT_OPS", cat: "OPS_MEAL" };
    case "opsFuel":
      return { main: "OUT_OPS", cat: "OPS_FUEL" };
    case "opsCargo":
      return { main: "OUT_OPS", cat: "OPS_CARGO" };
    case "taxOther":
      return { main: "OUT_TAX", cat: "TAX_OTHER" };
    case "expOther":
      return { main: "OUT_OTHER", cat: "EXP_OTHER" };
    default:
      return { main: null, cat: null };
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  lineId: number;
  /** Fatura detayı yenilensin (satır tablosu). */
  onPosted?: () => void;
};

export function SupplierLineBranchAllocationModal({ open, onClose, lineId, onPosted }: Props) {
  const { t, locale } = useI18n();
  const { data, isPending, isError, error, refetch } = useSupplierInvoiceLineAllocations(lineId, open);
  const { data: branches = [], isPending: brPending } = useBranchesList();
  const setMut = useSetSupplierInvoiceLineBranchAllocations();
  const postMut = usePostSupplierInvoiceLineBranchAllocations();

  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [postDate, setPostDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expensePreset, setExpensePreset] = useState<PresetKey>("default");
  const [postBranchPaid, setPostBranchPaid] = useState(false);
  const seededForLine = useRef<number | null>(null);

  useEffect(() => {
    seededForLine.current = null;
  }, [lineId]);

  const activeBranches = useMemo(
    () => [...branches].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [branches]
  );

  const branchSelectOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("suppliers.allocPickBranch") },
      ...activeBranches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [activeBranches, t]
  );

  const expensePresetOptions: SelectOption[] = useMemo(
    () =>
      EXPENSE_PRESET_KEYS.map((k) => ({
        value: k,
        label: t(`suppliers.expensePreset.${k}`),
      })),
    [t]
  );

  const resetSeed = useCallback(() => {
    seededForLine.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      resetSeed();
      return;
    }
    if (lineId !== seededForLine.current && seededForLine.current !== null) {
      seededForLine.current = null;
    }
  }, [open, lineId, resetSeed]);

  useEffect(() => {
    if (!open || !data || data.isPosted) return;
    if (seededForLine.current === lineId) return;
    seededForLine.current = lineId;
    if (data.shares.length === 0) {
      setRows([emptyRow()]);
    } else {
      setRows(
        data.shares.map((s) => ({
          key: `s-${s.id}`,
          branchId: String(s.branchId),
          amount: String(s.amount),
        }))
      );
    }
    setPostDate(new Date().toISOString().slice(0, 10));
    setExpensePreset("default");
    setPostBranchPaid(false);
  }, [open, data, lineId]);

  const lineAmount = data?.lineAmount ?? 0;
  const currencyCode = data?.currencyCode ?? "TRY";

  const draftTotal = useMemo(() => {
    let s = 0;
    for (const r of rows) {
      const a = parseDec(r.amount);
      if (a != null && a > 0) s += a;
    }
    return Math.round(s * 100) / 100;
  }, [rows]);

  const draftTotalMatches = useMemo(() => {
    const target = Math.round(lineAmount * 100) / 100;
    return Math.abs(draftTotal - target) < 0.001;
  }, [draftTotal, lineAmount]);

  const branchName = (id: number) => activeBranches.find((b) => b.id === id)?.name ?? `#${id}`;

  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = (key: string) => setRows((r) => (r.length <= 1 ? r : r.filter((x) => x.key !== key)));

  const updateRow = (key: string, patch: Partial<Pick<Row, "branchId" | "amount">>) => {
    setRows((list) => list.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  };

  const applyEqualSplit = () => {
    if (!data || activeBranches.length === 0) {
      notify.error(t("suppliers.allocNoBranches"));
      return;
    }
    const ids = activeBranches.map((b) => b.id);
    const parts = splitEqualCents(data.lineAmount, ids);
    setRows(
      parts.map((p) => ({
        key: crypto.randomUUID(),
        branchId: String(p.branchId),
        amount: String(p.amount),
      }))
    );
    notify.success(t("suppliers.allocEqualApplied"));
  };

  const buildPayloadShares = (): Array<{ branchId: number; amount: number }> | null => {
    const out: Array<{ branchId: number; amount: number }> = [];
    const seen = new Set<number>();
    for (const r of rows) {
      const bid = parseInt(r.branchId, 10);
      const amt = parseDec(r.amount);
      if (!Number.isFinite(bid) || bid <= 0) continue;
      if (amt == null || amt <= 0) continue;
      if (seen.has(bid)) {
        notify.error(t("suppliers.allocDuplicateBranch"));
        return null;
      }
      seen.add(bid);
      out.push({ branchId: bid, amount: Math.round(amt * 100) / 100 });
    }
    return out;
  };

  const saveDraft = async () => {
    const shares = buildPayloadShares();
    if (shares === null) return;
    try {
      await setMut.mutateAsync({ lineId, shares });
      notify.success(t("suppliers.allocDraftSaved"));
      void refetch();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const postToBranches = async () => {
    if (!data || !draftTotalMatches) {
      notify.error(t("suppliers.allocTotalMismatch"));
      return;
    }
    const shares = buildPayloadShares();
    if (shares === null) return;
    if (shares.length === 0) {
      notify.error(t("suppliers.allocNeedShares"));
      return;
    }
    const { main, cat } = presetToApi(expensePreset);
    try {
      if (setMut.isPending) return;
      await setMut.mutateAsync({ lineId, shares });
      await postMut.mutateAsync({
        lineId,
        transactionDate: `${postDate}T12:00:00`,
        expenseMainCategory: main,
        expenseCategory: cat,
        expensePaymentSource: postBranchPaid ? "REGISTER" : "PATRON",
      });
      notify.success(t("suppliers.allocPosted"));
      onPosted?.();
      void refetch();
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const lineLabel = data
    ? `${t("suppliers.lineShort")} ${data.lineNo}${data.lineDescription ? ` — ${data.lineDescription}` : ""}`
    : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="supplier-line-alloc-title"
      title={t("suppliers.allocModalTitle")}
      wide
      wideFixedHeight
      nested
      closeButtonLabel={t("common.close")}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {isPending || brPending ? (
          <p className="p-4 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : isError ? (
          <p className="p-4 text-sm text-red-600">{toErrorMessage(error)}</p>
        ) : !data ? (
          <p className="p-4 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : !data.canAllocateToBranches ? (
          <p className="p-4 text-sm text-zinc-600">{t("suppliers.allocBlockedWarehouse")}</p>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2 pb-3 pt-1 [-webkit-overflow-scrolling:touch] sm:px-4 sm:pb-4">
              <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-sm text-violet-950">
                <p className="font-semibold text-violet-900">{lineLabel}</p>
                <p className="mt-1 text-xs leading-relaxed text-violet-800/90">{t("suppliers.allocHint")}</p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                    {t("suppliers.lineAmount")}
                  </span>
                  <span className="tabular-nums text-lg font-bold text-violet-950">
                    {formatLocaleAmount(data.lineAmount, locale, currencyCode)}
                  </span>
                  {data.isPosted ? (
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                      {t("suppliers.allocStatusPosted")}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {t("suppliers.allocStatusDraft")}
                    </span>
                  )}
                </div>
              </div>

              {data.isPosted ? (
                <ul className="space-y-2">
                  {data.shares.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-zinc-900">{branchName(s.branchId)}</p>
                        <p className="text-xs text-zinc-500">
                          {s.branchTransactionId
                            ? `${t("suppliers.allocTxPrefix")} #${s.branchTransactionId}`
                            : "—"}
                        </p>
                      </div>
                      <p className="text-right text-base font-semibold tabular-nums text-zinc-900">
                        {formatLocaleAmount(s.amount, locale, currencyCode)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-full sm:w-auto"
                      onClick={() => void applyEqualSplit()}
                    >
                      {t("suppliers.allocEqualAll")}
                    </Button>
                    <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={addRow}>
                      {t("suppliers.allocAddBranch")}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {rows.map((r, idx) => (
                      <div
                        key={r.key}
                        className="min-w-0 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm ring-1 ring-zinc-100 sm:p-4"
                      >
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-xs font-bold text-zinc-400">#{idx + 1}</span>
                          {rows.length > 1 ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className="min-h-11 w-full text-xs sm:min-h-9 sm:w-auto"
                              onClick={() => removeRow(r.key)}
                            >
                              {t("suppliers.removeLine")}
                            </Button>
                          ) : null}
                        </div>
                        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                          <Select
                            name={`alloc-branch-${r.key}`}
                            label={t("suppliers.allocBranch")}
                            options={branchSelectOptions}
                            value={r.branchId}
                            onChange={(e) => updateRow(r.key, { branchId: e.target.value })}
                            onBlur={() => {}}
                            className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                          />
                          <Input
                            label={t("suppliers.allocShareAmount")}
                            value={r.amount}
                            onChange={(e) => updateRow(r.key, { amount: e.target.value })}
                            inputMode="decimal"
                            className="min-h-12 text-base sm:min-h-11 sm:text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className={
                      draftTotalMatches
                        ? "rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900"
                        : "rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-950"
                    }
                  >
                    <span className="font-semibold">{t("suppliers.allocRunningTotal")}: </span>
                    <span className="tabular-nums font-bold">
                      {formatLocaleAmount(draftTotal, locale, currencyCode)}
                    </span>
                    <span className="text-zinc-600"> / </span>
                    <span className="tabular-nums font-medium">
                      {formatLocaleAmount(lineAmount, locale, currencyCode)}
                    </span>
                    {!draftTotalMatches ? (
                      <span className="mt-1 block text-xs">{t("suppliers.allocTotalMismatch")}</span>
                    ) : null}
                  </div>

                  <div className="min-w-0 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 sm:p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {t("suppliers.allocPostSection")}
                    </p>
                    <label
                      className={cn(
                        "mb-3 flex cursor-pointer gap-3 rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm transition hover:bg-zinc-50/90 sm:p-3.5",
                        (postMut.isPending || setMut.isPending) && "pointer-events-none opacity-60"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-zinc-900">
                          {t("suppliers.allocBranchPaidLabel")}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-zinc-600">
                          {t("suppliers.allocBranchPaidHint")}
                        </span>
                      </span>
                      <Switch
                        checked={postBranchPaid}
                        onCheckedChange={setPostBranchPaid}
                        disabled={postMut.isPending || setMut.isPending}
                        className="shrink-0 self-start sm:self-center"
                        aria-label={t("suppliers.allocBranchPaidLabel")}
                      />
                    </label>
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                      <DateField
                        label={t("suppliers.allocExpenseDate")}
                        labelRequired
                        value={postDate}
                        onChange={(e) => setPostDate(e.target.value)}
                      />
                      <Select
                        name="alloc-expense-preset"
                        label={t("suppliers.allocExpenseType")}
                        options={expensePresetOptions}
                        value={expensePreset}
                        onChange={(e) => setExpensePreset(e.target.value as PresetKey)}
                        onBlur={() => {}}
                        className="min-h-12 text-base sm:min-h-10 sm:text-sm"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {!data.isPosted ? (
              <div className="shrink-0 border-t border-zinc-200 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-3 sm:px-4">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={onClose}>
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 w-full sm:w-auto"
                    disabled={setMut.isPending}
                    onClick={() => void saveDraft()}
                  >
                    {t("suppliers.allocSaveDraft")}
                  </Button>
                  <Button
                    type="button"
                    className="min-h-11 w-full sm:w-auto"
                    disabled={postMut.isPending || setMut.isPending || !draftTotalMatches}
                    onClick={() => void postToBranches()}
                  >
                    {t("suppliers.allocPostToBranches")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="shrink-0 border-t border-zinc-200 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-3 sm:px-4">
                <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={onClose}>
                  {t("common.close")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
