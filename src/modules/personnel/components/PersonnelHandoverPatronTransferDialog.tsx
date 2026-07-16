"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { fetchPersonnelCashHandoverLinesPaged } from "@/modules/personnel/api/personnel-api";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import { cn } from "@/lib/cn";
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

  // Cash-account (gerçek zimmet) tavanı — seçili şubenin net bakiyesi (ctx.branchOptions),
  // yani karttaki KALAN. OUT_POCKET_CLAIM_TO_PATRON açık bir HANDOVER_IN satırına bağlanmaz;
  // devredilebilir gerçek tutar elde tutulan nakittir = bu net bakiye. Breakdown ctx para
  // biriminde geldiği için yalnızca ccy === ctx.currencyCode iken YETKİLİ.
  const ctxCcyNorm = (ctx?.currencyCode ?? "TRY").trim().toUpperCase() || "TRY";
  const accountCeilingAuthoritative = ccy === ctxCcyNorm;
  const branchAccountCeiling = useMemo(() => {
    if (!accountCeilingAuthoritative) return 0;
    const opts = ctx?.branchOptions ?? [];
    if (opts.length > 0) {
      const match = opts.find((o) => o.branchId === branchId);
      return match && match.amount > 0.009 ? match.amount : 0;
    }
    const sug = ctx?.suggestedAmount ?? 0;
    return sug > 0.009 ? sug : 0;
  }, [accountCeilingAuthoritative, ctx?.branchOptions, ctx?.suggestedAmount, branchId]);

  // Tavan = cash-account net bakiye (gerçek devredilebilir). Net yetkiliyken doğrudan onu
  // kullan — elde tutulandan fazlası devredilemez (max(pool, net) fazla izin verebilirdi).
  // Yalnız net hesaplanamadığında (para birimi ctx'ten farklı) FIFO havuza düş.
  const effectiveCeilingCents = useMemo(
    () =>
      accountCeilingAuthoritative
        ? toCents(branchAccountCeiling)
        : poolTotalCents,
    [accountCeilingAuthoritative, branchAccountCeiling, poolTotalCents]
  );
  const effectiveCeiling = useMemo(
    () => fromCents(effectiveCeilingCents),
    [effectiveCeilingCents]
  );

  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(() =>
    defaultDateTimeFromInput(localIsoDate())
  );
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

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
  const amountExceeds = amountCents > effectiveCeilingCents;

  const submitDisabled =
    saving ||
    createTx.isPending ||
    linesQuery.isPending ||
    linesQuery.isError ||
    effectiveCeilingCents <= 0 ||
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
    if (targetCents > effectiveCeilingCents) {
      notify.error(t("personnel.handoverPatronTransferAmountExceeds"));
      return;
    }
    // OUT_POCKET_CLAIM_TO_PATRON: personel zimmetli kasa-IN alacağının patrona devri.
    // Kasa fiziksel olarak ETKİLENMEZ (expense_payment_source = NULL), sadece zimmet/patron alacak defteri güncellenir.
    // Bu yüzden eski OUT_PATRON_DEBT_REPAY (REGISTER + cashHandoverSettlements) flow'u terk edildi —
    // o flow kasayı yanlış şekilde düşürüyordu ve day-close ekranında "Patrona kasa borcu ödemesi"
    // olarak gözükmesine yol açıyordu.
    setSaving(true);
    try {
      await createTx.mutateAsync({
        branchId,
        type: "OUT",
        mainCategory: "OUT_POCKET_CLAIM_TO_PATRON",
        category: "POCKET_CLAIM_TRANSFER_TO_PATRON",
        amount: amt,
        currencyCode: ccy,
        transactionDate,
        linkedPersonnelId: personnel.id,
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
    effectiveCeilingCents,
    loc,
    onClose,
    personnel,
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
  const suggestedHint = useMemo(() => {
    const ceil = effectiveCeiling;
    const fromCtx = ctx?.suggestedAmount ?? 0;
    let v =
      ccy === ctxCcyNorm && fromCtx > 0.009 ? fromCtx : ceil > 0.009 ? ceil : 0;
    if (v > ceil + 1e-9) v = ceil;
    return v;
  }, [ccy, ctx?.suggestedAmount, ctxCcyNorm, effectiveCeiling]);
  const fromInitials = useMemo(() => {
    const nm = personnel ? personnelDisplayName(personnel) : "";
    const ini = nm
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
    return ini || "•";
  }, [personnel]);

  return (
    <Modal
      open={dialogOpen}
      onClose={requestClose}
      titleId={TITLE_ID}
      title={
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1 break-words leading-snug">
            {t("personnel.handoverPatronTransferTitle")}
          </span>
          <button
            type="button"
            aria-label={t("common.sectionInfoExplainButton")}
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen((v) => !v)}
            className={cn(
              "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors",
              infoOpen
                ? "border-violet-300 bg-violet-100 text-violet-700"
                : "border-zinc-300 bg-white text-zinc-500 hover:border-violet-300 hover:text-violet-600"
            )}
          >
            i
          </button>
        </span>
      }
      narrow
      nested
      className="lg:!max-w-md xl:!max-w-md 2xl:!max-w-md"
    >
      {personnel ? (
        <div className="flex w-full flex-col gap-3 text-sm">
          {infoOpen ? (
            <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-[11px] leading-relaxed text-zinc-600">
              {t("personnel.handoverPatronTransferLead")}
            </div>
          ) : null}
          <div className="rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50 to-white px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white"
              >
                {fromInitials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase leading-none tracking-wide text-violet-700">
                  {t("personnel.pocketClaimDialogFromLabel")}
                </p>
                <p className="truncate text-sm font-semibold leading-tight text-zinc-900">
                  {personnelDisplayName(personnel)}
                </p>
                {branchSelectOptions.length <= 1 ? (
                  <p className="truncate text-[11px] leading-tight text-zinc-500">{branchLabel}</p>
                ) : null}
              </div>
              {!linesQuery.isError && !linesQuery.isPending && effectiveCeilingCents > 0 ? (
                <div className="shrink-0 text-right">
                  <p className="text-[9px] font-medium uppercase leading-none tracking-wide text-zinc-500">
                    {t("personnel.handoverPatronTransferAvailableLabel")}
                  </p>
                  <p className="font-mono text-[15px] font-semibold leading-tight tabular-nums text-violet-900">
                    {formatLocaleAmount(effectiveCeiling, loc, ccy)}
                  </p>
                </div>
              ) : null}
            </div>
            {branchSelectOptions.length > 1 ? (
              <div className="mt-2">
                <Select
                  name="handoverPatronBranch"
                  label={t("personnel.handoverPatronTransferBranchLabel")}
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
              </div>
            ) : null}
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
              ) : effectiveCeilingCents <= 0 ? (
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
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:items-start">
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
                    <div className="flex flex-col gap-1.5">
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
                      {effectiveCeiling > 0.009 ? (
                        <button
                          type="button"
                          onClick={() => setAmount(formatLocaleAmountInput(effectiveCeiling, loc))}
                          className="flex w-full items-center justify-between gap-2 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
                        >
                          <span>{t("personnel.handoverPatronTransferMaxButton")}</span>
                          <span className="font-mono tabular-nums">
                            {formatLocaleAmount(effectiveCeiling, loc, ccy)}
                          </span>
                        </button>
                      ) : null}
                    </div>
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
