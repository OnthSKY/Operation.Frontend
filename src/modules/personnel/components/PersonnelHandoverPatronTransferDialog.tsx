"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { fetchPersonnelCashHandoverLinesPaged } from "@/modules/personnel/api/personnel-api";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import { useCreateBranchTransaction } from "@/modules/branch/hooks/useBranchQueries";
import {
  formatLocaleAmount,
  formatLocaleAmountInput,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { currencySelectOptions } from "@/shared/lib/iso4217-currencies";
import { defaultDateTimeFromInput, localIsoDate } from "@/shared/lib/local-iso-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import type { Personnel } from "@/types/personnel";
import type { PersonnelCashHandoverLine } from "@/types/personnel-management-snapshot";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

const TITLE_ID = "personnel-handover-patron-transfer-title";

function toCents(n: number): number {
  return Math.round((Number(n) || 0) * 100);
}

function fromCents(c: number): number {
  return Math.round(c) / 100;
}

/**
 * En eski IN satırından başlayarak tutarı sent olarak böl; tek API çağrısında `cashHandoverSettlements` ile gönderilir.
 * Parçaların toplamı `targetCents` ile birebir eşit olmalı; aksi halde null.
 */
function allocateHandoverPatronAmountCents(
  openLines: PersonnelCashHandoverLine[],
  targetCents: number
): { transactionId: number; amountCents: number }[] | null {
  if (targetCents <= 0) return null;
  const sorted = [...openLines].sort((a, b) => {
    const c = String(a.transactionDate).localeCompare(String(b.transactionDate));
    if (c !== 0) return c;
    return (a.transactionId ?? 0) - (b.transactionId ?? 0);
  });
  let left = targetCents;
  const parts: { transactionId: number; amountCents: number }[] = [];
  for (const row of sorted) {
    if (left <= 0) break;
    const rem = toCents(row.remainingHandoverAmount);
    if (rem <= 0) continue;
    const take = Math.min(rem, left);
    if (take <= 0) continue;
    parts.push({ transactionId: row.transactionId, amountCents: take });
    left -= take;
  }
  if (left > 0) return null;
  const sum = parts.reduce((s, p) => s + p.amountCents, 0);
  if (sum !== targetCents) return null;
  return parts;
}

async function fetchAllHandoverLinesPaged(
  personnelId: number,
  branchId: number,
  currencyCode: string
): Promise<PersonnelCashHandoverLine[]> {
  const ccy = currencyCode.trim().toUpperCase() || "TRY";
  const acc: PersonnelCashHandoverLine[] = [];
  let page = 1;
  const pageSize = 100;
  for (;;) {
    const r = await fetchPersonnelCashHandoverLinesPaged(personnelId, {
      page,
      pageSize,
      branchId,
      currencyCode: ccy,
    });
    acc.push(...r.items);
    if (r.items.length === 0 || page * pageSize >= r.totalCount) break;
    page += 1;
    if (page > 40) break;
  }
  return acc;
}

export type PersonnelHandoverPatronTransferBranchOption = {
  branchId: number;
  branchName: string;
  /** Bu şubedeki net devredilebilir bakiye (cash-account breakdown). */
  amount: number;
};

export type PersonnelHandoverPatronTransferOpen = {
  personnel: Personnel;
  branchId: number;
  branchName?: string;
  currencyCode: string;
  /** Bu şubede havuz önerisi (üst sınır ipucu). */
  suggestedAmount: number;
  /**
   * Çoklu şubeye dağılmış bakiyede kullanıcı dialog içinde şube değiştirebilsin
   * diye seçenek listesi. Bir tane veya boş ise Select gizlenir, statik label
   * gösterilir. Backend hala tek tx = tek branchId; multi-branch için kullanıcı
   * sırayla devreder.
   */
  branchOptions?: PersonnelHandoverPatronTransferBranchOption[];
};

type Props = {
  open: boolean;
  ctx: PersonnelHandoverPatronTransferOpen | null;
  onClose: () => void;
};

export function PersonnelHandoverPatronTransferDialog({ open, ctx, onClose }: Props) {
  const { t, locale } = useI18n();
  const loc = locale as Locale;
  const createTx = useCreateBranchTransaction();
  const personnel = ctx?.personnel;
  const personnelId = personnel?.id ?? 0;
  const [branchId, setBranchId] = useState<number>(ctx?.branchId ?? 0);
  const [currencyCode, setCurrencyCode] = useState("TRY");
  const ccy = currencyCode.trim().toUpperCase() || "TRY";
  const dialogOpen =
    open && ctx != null && personnel != null && !personnel.isDeleted && branchId > 0 && personnelId > 0;

  const currencyOptions = useMemo(() => currencySelectOptions(), []);
  const branchSelectOptions = useMemo(() => {
    const opts = ctx?.branchOptions ?? [];
    if (opts.length === 0) return [];
    return opts
      .filter((o) => o.branchId > 0)
      .map((o) => ({
        value: String(o.branchId),
        label:
          o.amount > 0.009
            ? `${o.branchName} · ${formatLocaleAmount(o.amount, loc, ccy)}`
            : o.branchName,
      }));
  }, [ctx?.branchOptions, ccy, loc]);

  const linesQuery = useQuery({
    queryKey: [
      "personnel",
      "handover-patron-transfer-lines",
      personnelId,
      branchId,
      ccy,
    ],
    queryFn: () => fetchAllHandoverLinesPaged(personnelId, branchId, ccy),
    enabled: dialogOpen,
    staleTime: 10_000,
  });

  const openLines = useMemo(() => {
    const rows = linesQuery.data ?? [];
    return rows.filter((x) => (Number(x.remainingHandoverAmount) || 0) > 0.009);
  }, [linesQuery.data]);

  const poolTotalCents = useMemo(
    () => openLines.reduce((s, x) => s + toCents(x.remainingHandoverAmount), 0),
    [openLines]
  );
  const poolCeiling = useMemo(() => fromCents(poolTotalCents), [poolTotalCents]);

  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(() =>
    defaultDateTimeFromInput(localIsoDate())
  );
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || ctx == null) return;
    setAmount("");
    setTransactionDate(defaultDateTimeFromInput(localIsoDate()));
    setDescription("");
    setSaving(false);
    setCurrencyCode((ctx.currencyCode ?? "TRY").trim().toUpperCase() || "TRY");
    setBranchId(ctx.branchId);
  }, [open, ctx?.personnel.id, ctx?.branchId, ctx?.currencyCode]);

  // Şube değiştiğinde amount sıfırlanır — yeni şubenin pool ceiling'i farklı olabilir.
  useEffect(() => {
    if (!open) return;
    setAmount("");
  }, [branchId, open]);

  const amountNum = useMemo(() => parseLocaleAmount(amount.trim(), loc), [amount, loc]);
  const amountCents = useMemo(
    () => (Number.isFinite(amountNum) && amountNum > 0 ? toCents(amountNum) : 0),
    [amountNum]
  );
  const amountMissing = amount.trim() === "";
  const amountExceeds = amountCents > poolTotalCents;

  const submitDisabled =
    saving ||
    createTx.isPending ||
    linesQuery.isPending ||
    linesQuery.isError ||
    openLines.length === 0 ||
    poolTotalCents <= 0 ||
    amountMissing ||
    amountExceeds ||
    (!amountMissing && (!Number.isFinite(amountNum) || amountNum <= 0));
  const requestClose = useDirtyGuard({
    isDirty:
      amount.trim() !== "" ||
      description.trim() !== "" ||
      transactionDate.trim() !== defaultDateTimeFromInput(localIsoDate()) ||
      currencyCode.trim().toUpperCase() !==
        (((ctx?.currencyCode ?? "TRY").trim().toUpperCase() || "TRY")),
    isBlocked: saving || createTx.isPending,
    confirmMessage: t("common.unsavedChangesConfirm"),
    onClose,
  });

  const onSubmit = useCallback(async () => {
    if (!ctx || personnel == null) return;
    if (amount.trim() === "") {
      notify.error(t("personnel.handoverPatronTransferAmountRequired"));
      return;
    }
    const amt = fromCents(toCents(parseLocaleAmount(amount, loc)));
    if (!Number.isFinite(amt) || amt <= 0) {
      notify.error(t("personnel.handoverPatronTransferAmountInvalid"));
      return;
    }
    const targetCents = toCents(amt);
    if (targetCents > poolTotalCents) {
      notify.error(t("personnel.handoverPatronTransferAmountExceeds"));
      return;
    }
    const planCents = allocateHandoverPatronAmountCents(openLines, targetCents);
    if (planCents == null || planCents.length === 0) {
      notify.error(t("personnel.handoverPatronTransferAmountExceeds"));
      return;
    }
    setSaving(true);
    try {
      await createTx.mutateAsync({
        branchId,
        type: "OUT",
        mainCategory: "OUT_PATRON_DEBT_REPAY",
        category: "PATRON_DEBT_REPAY",
        amount: amt,
        currencyCode: ccy,
        transactionDate,
        expensePaymentSource: "REGISTER",
        cashHandoverSettlements: planCents.map((step) => ({
          handoverTransactionId: step.transactionId,
          amount: fromCents(step.amountCents),
        })),
        description: description.trim() || null,
      });
      const amountLabel = formatLocaleAmount(amt, loc, ccy);
      notify.success(t("personnel.handoverPatronTransferSavedSummary").replace("{amount}", amountLabel));
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }, [
    amount,
    branchId,
    ccy,
    createTx,
    ctx,
    description,
    loc,
    onClose,
    openLines,
    personnel,
    poolTotalCents,
    t,
    transactionDate,
  ]);

  const currentBranchName = useMemo(() => {
    const opts = ctx?.branchOptions ?? [];
    const found = opts.find((o) => o.branchId === branchId);
    return (
      found?.branchName?.trim() ||
      ctx?.branchName?.trim() ||
      t("personnel.cashHandoverToPatronDialogBranchFallback").replace(
        "{id}",
        String(branchId),
      )
    );
  }, [ctx?.branchOptions, ctx?.branchName, branchId, t]);
  const branchLabel = currentBranchName;
  const ctxCcy = (ctx?.currencyCode ?? "TRY").trim().toUpperCase() || "TRY";
  const suggestedHint = useMemo(() => {
    const ceil = poolCeiling;
    const fromCtx = ctx?.suggestedAmount ?? 0;
    let v =
      ccy === ctxCcy && fromCtx > 0.009 ? fromCtx : ceil > 0.009 ? ceil : 0;
    if (v > ceil + 1e-9) v = ceil;
    return v;
  }, [ccy, ctx?.suggestedAmount, ctxCcy, poolCeiling]);

  return (
    <Modal
      open={dialogOpen}
      onClose={requestClose}
      titleId={TITLE_ID}
      title={t("personnel.handoverPatronTransferTitle")}
      description={t("personnel.handoverPatronTransferLead")}
      narrow
      nested
    >
      {personnel ? (
        <div className="mx-auto flex max-w-lg flex-col gap-4 text-sm">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5 text-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("personnel.pocketClaimDialogFromLabel")}
            </p>
            <p className="font-semibold text-zinc-900">{personnelDisplayName(personnel)}</p>
            {branchSelectOptions.length > 1 ? (
              <div className="mt-2">
                <Select
                  name="handoverPatronBranch"
                  label="Şube"
                  labelRequired
                  options={branchSelectOptions}
                  value={String(branchId)}
                  onChange={(e) => {
                    const v = Number.parseInt(e.target.value, 10);
                    if (Number.isFinite(v) && v > 0) setBranchId(v);
                  }}
                  onBlur={() => {}}
                  menuZIndex={320}
                />
                <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                  Birden çok şubeye dağılmış cep parası — her şube için ayrı
                  devir yapılır.
                </p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-zinc-600">{branchLabel}</p>
            )}
          </div>

          {linesQuery.isError ? (
            <p className="text-sm text-amber-800">{t("personnel.handoverPatronTransferError")}</p>
          ) : (
            <>
              {linesQuery.isPending ? (
                <>
                  <Select
                    name="handoverPatronCurrencyPending"
                    label={t("branch.txCurrency")}
                    labelRequired
                    options={currencyOptions}
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                    onBlur={() => {}}
                    menuZIndex={320}
                  />
                  <p className="text-sm text-zinc-500">{t("personnel.handoverPatronTransferLoading")}</p>
                </>
              ) : openLines.length === 0 ? (
                <>
                  <Select
                    name="handoverPatronCurrencyEmpty"
                    label={t("branch.txCurrency")}
                    labelRequired
                    options={currencyOptions}
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                    onBlur={() => {}}
                    menuZIndex={320}
                  />
                  <p className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm text-amber-950">
                    {t("personnel.handoverPatronTransferNoLines")}
                  </p>
                  <div className="flex justify-end pt-1">
                    <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={requestClose}>
                      {t("common.close")}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs leading-relaxed text-zinc-600">
                    {t("personnel.handoverPatronTransferPoolTotalHint").replace(
                      "{amount}",
                      formatLocaleAmount(poolCeiling, loc, ccy)
                    )}
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start sm:gap-4">
                    <Select
                      name="handoverPatronCurrencyForm"
                      label={t("branch.txCurrency")}
                      labelRequired
                      options={currencyOptions}
                      value={currencyCode}
                      onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                      onBlur={() => {}}
                      menuZIndex={320}
                    />
                    <Input
                      name="handoverPatronAmount"
                      label={t("personnel.handoverPatronTransferAmountLabel")}
                      labelRequired
                      required
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder={
                        suggestedHint > 0.009 ? formatLocaleAmountInput(suggestedHint, loc) : undefined
                      }
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onBlur={(e) => {
                        const n = parseLocaleAmount(e.target.value, loc);
                        if (Number.isFinite(n) && n >= 0) {
                          setAmount(formatLocaleAmountInput(n, loc));
                        }
                      }}
                      error={amountExceeds ? t("personnel.handoverPatronTransferAmountExceeds") : undefined}
                    />
                  </div>
                  <DateField
                    name="handoverPatronWhen"
                    label={t("personnel.handoverPatronTransferDateLabel")}
                    labelRequired
                    required
                    mode="datetime-local"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                  />
                  <Input
                    name="handoverPatronNote"
                    label={t("personnel.handoverPatronTransferNoteLabel")}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    autoComplete="off"
                  />
                  <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
                    <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={requestClose}>
                      {t("common.cancel")}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      className="min-h-11 w-full sm:w-auto"
                      disabled={submitDisabled}
                      onClick={() => void onSubmit()}
                    >
                      {t("personnel.handoverPatronTransferSubmit")}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
