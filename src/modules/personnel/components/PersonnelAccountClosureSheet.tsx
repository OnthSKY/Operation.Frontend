"use client";

import {
  useClosePersonnelYearAccount,
  usePersonnelAccountClosurePreview,
  usePersonnelEmploymentTerms,
  usePersonnelYearAccountPreview,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { notify } from "@/shared/lib/notify";
import { Card } from "@/shared/components/Card";
import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Input } from "@/shared/ui/Input";
import { Select, type SelectOption } from "@/shared/ui/Select";
import type {
  PersonnelAccountClosureCurrencyLine,
  PersonnelEmploymentTerm,
} from "@/types/personnel-account-closure";
import { openPersonnelSettlementPrintWindow } from "@/modules/personnel/lib/personnel-settlement-print";
import { calendarYearNumericSelectOptions } from "@/modules/personnel/lib/settlement-print-season";
import { useEffect, useId, useMemo, useState } from "react";

type Scope = "year" | "term";

type Props = {
  open: boolean;
  onClose: () => void;
  personnelId: number;
  personnelDisplayName: string;
  /** Yıl kapatma (POST) sadece aktif personelde. */
  canCloseYear: boolean;
  nested?: boolean;
  /** Açılışta doğrudan takvim yılı toplamları (2. adım); «Kesilen hesaplar» sekmesinden. */
  startWithYearSummary?: boolean;
  /** `startWithYearSummary` için başlangıç yılı (geçerli aralıkta değilse bu yıl). */
  summaryYear?: number;
  branchNameById: Map<number, string>;
  /** PDF meta (personel kartı — turizm sezonu gelişi). */
  personnelSeasonArrivalDate?: string | null;
  /** Karttaki aylık maaş — öneri: (maaş × çalışılan gün) ÷ 30. */
  personnelMonthlySalary?: number | null;
  personnelSalaryCurrency?: string | null;
};

function parseDecimalInput(s: string): number {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return NaN;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeClosureSalaryNetRemaining(
  lineList: PersonnelAccountClosureCurrencyLine[],
  expected: number,
  currency: string,
): number {
  const ccy = (currency || "TRY").trim().toUpperCase();
  const line = lineList.find(
    (l) => l.currencyCode.trim().toUpperCase() === ccy,
  );
  const adv = line?.advancesTotal ?? 0;
  const sal = line?.salaryPaymentsTotal ?? 0;
  const exp = line?.personnelAttributedNonAdvanceExpenseTotal ?? 0;
  return expected - adv - sal - exp;
}

function termLabel(
  term: PersonnelEmploymentTerm,
  t: (k: string) => string,
  locale: Locale,
  dash: string
): string {
  const from = formatLocaleDate(term.validFrom.slice(0, 10), locale, dash);
  if (term.isOpen)
    return `${from} → ${t("personnel.accountClosure.termOpen")}`;
  const to = term.validTo?.slice(0, 10);
  return to
    ? `${from} → ${formatLocaleDate(to, locale, dash)}`
    : `${from} → ${dash}`;
}

function lineRow(
  label: string,
  amount: number,
  locale: Locale,
  currencyCode: string
) {
  return (
    <li className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <span className="min-w-0 shrink text-zinc-600 sm:pt-0.5">{label}</span>
      <span className="font-medium tabular-nums text-zinc-900 sm:shrink-0 sm:text-right">
        {formatLocaleAmount(amount, locale, currencyCode)}
      </span>
    </li>
  );
}

function ClosureLinesBlock({
  lines,
  t,
  locale,
  dash: _dash,
}: {
  lines: PersonnelAccountClosureCurrencyLine[];
  t: (k: string) => string;
  locale: Locale;
  dash: string;
}) {
  if (lines.length === 0) {
    return (
      <p className="text-sm text-zinc-500">{t("personnel.accountClosure.noLines")}</p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {lines.map((line) => (
        <Card
          key={line.currencyCode}
          className="sm:col-span-2 overflow-hidden p-0 shadow-none ring-1 ring-zinc-950/5"
        >
          <div className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {line.currencyCode}
            </p>
          </div>
          <div className="divide-y divide-zinc-100 text-sm">
            <div>
              <p className="bg-zinc-50/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {t("personnel.accountClosure.groupPaidOutLabel")}
              </p>
              <ul className="divide-y divide-zinc-100">
                {lineRow(
                  t("personnel.accountClosure.rowAdvances"),
                  line.advancesTotal,
                  locale,
                  line.currencyCode
                )}
                {lineRow(
                  t("personnel.accountClosure.rowSalary"),
                  line.salaryPaymentsTotal,
                  locale,
                  line.currencyCode
                )}
              </ul>
            </div>
            <div>
              <p className="bg-zinc-50/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {t("personnel.accountClosure.groupExpensesLabel")}
              </p>
              <ul>
                {lineRow(
                  t("personnel.accountClosure.rowExpenses"),
                  line.personnelAttributedNonAdvanceExpenseTotal,
                  locale,
                  line.currencyCode
                )}
              </ul>
            </div>
            <div>
              <p className="bg-zinc-50/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {t("personnel.accountClosure.groupHandoverLabel")}
              </p>
              <ul>
                {lineRow(
                  t("personnel.accountClosure.rowHandover"),
                  line.cashHandoverInTotal,
                  locale,
                  line.currencyCode
                )}
              </ul>
            </div>
            <ul>
              <li className="flex flex-col gap-1 bg-amber-50/40 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0 sm:pt-0.5">
                  <span className="font-medium text-zinc-800">
                    {t("personnel.accountClosure.rowOffset")}
                  </span>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                    {t("personnel.accountClosure.rowOffsetExplain")}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-semibold tabular-nums sm:shrink-0 sm:text-right",
                    line.suggestedEmployerOffset > 0 && "text-amber-800",
                    line.suggestedEmployerOffset < 0 && "text-sky-800",
                    line.suggestedEmployerOffset === 0 && "text-zinc-900"
                  )}
                >
                  {formatLocaleAmount(line.suggestedEmployerOffset, locale, line.currencyCode)}
                </span>
              </li>
            </ul>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function PersonnelAccountClosureSheet({
  open,
  onClose,
  personnelId,
  personnelDisplayName,
  canCloseYear,
  nested = false,
  startWithYearSummary = false,
  summaryYear,
  branchNameById,
  personnelSeasonArrivalDate,
  personnelMonthlySalary,
  personnelSalaryCurrency,
}: Props) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const dash = t("personnel.dash");
  const [step, setStep] = useState<1 | 2>(1);
  const [scope, setScope] = useState<Scope>("year");
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear()
  );
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [closeNotes, setCloseNotes] = useState("");
  const [settlementPdfAcknowledged, setSettlementPdfAcknowledged] =
    useState(false);
  const [printSettlementBusy, setPrintSettlementBusy] = useState(false);
  const [closureWorkedDays, setClosureWorkedDays] = useState("");
  const [closureExpectedSalary, setClosureExpectedSalary] = useState("");
  const [closureSalaryCurrency, setClosureSalaryCurrency] = useState("TRY");
  const [salaryBalanceSettled, setSalaryBalanceSettled] = useState(false);
  const [salaryPaymentSourceType, setSalaryPaymentSourceType] = useState("");
  const [salarySettlementNote, setSalarySettlementNote] = useState("");

  const { data: terms = [], isLoading: termsLoading } =
    usePersonnelEmploymentTerms(personnelId, open && scope === "term");

  const yearOptions: SelectOption[] = useMemo(
    () => calendarYearNumericSelectOptions({ capAtCurrentYear: true }),
    [],
  );

  useEffect(() => {
    if (!open) {
      setStep(1);
      setScope("year");
      setSelectedYear(new Date().getFullYear());
      setSelectedTermId(null);
      setCloseNotes("");
      setSettlementPdfAcknowledged(false);
      setClosureWorkedDays("");
      setClosureExpectedSalary("");
      setSalaryBalanceSettled(false);
      setSalaryPaymentSourceType("");
      setSalarySettlementNote("");
      return;
    }
    if (startWithYearSummary) {
      setStep(2);
      setScope("year");
      const y = new Date().getFullYear();
      const pick =
        summaryYear != null && summaryYear >= 1990 && summaryYear <= 2100
          ? summaryYear
          : y;
      setSelectedYear(pick);
      setSelectedTermId(null);
      setCloseNotes("");
      setSettlementPdfAcknowledged(false);
      setClosureWorkedDays("");
      setClosureExpectedSalary("");
      setSalaryBalanceSettled(false);
      setSalaryPaymentSourceType("");
      setSalarySettlementNote("");
      return;
    }
    setStep(1);
    setScope("year");
    setSelectedYear(new Date().getFullYear());
    setSelectedTermId(null);
    setCloseNotes("");
    setClosureWorkedDays("");
    setClosureExpectedSalary("");
    setSalaryBalanceSettled(false);
    setSalaryPaymentSourceType("");
    setSalarySettlementNote("");
  }, [open, startWithYearSummary, summaryYear]);

  useEffect(() => {
    if (!open || scope !== "year") return;
    const c =
      personnelSalaryCurrency?.trim().toUpperCase().slice(0, 3) || "TRY";
    setClosureSalaryCurrency(c.length === 3 ? c : "TRY");
    setClosureWorkedDays("");
    setClosureExpectedSalary("");
    setSalaryBalanceSettled(false);
    setSalaryPaymentSourceType("");
    setSalarySettlementNote("");
  }, [open, scope, selectedYear, personnelSalaryCurrency]);

  useEffect(() => {
    if (!open) return;
    setSettlementPdfAcknowledged(false);
  }, [open, selectedYear]);

  useEffect(() => {
    if (!open) return;
    if (scope !== "term" || terms.length === 0) return;
    const openTerm = terms.find((x) => x.isOpen);
    setSelectedTermId((prev) => {
      if (prev != null && terms.some((x) => x.id === prev)) return prev;
      return openTerm?.id ?? terms[0]!.id;
    });
  }, [open, scope, terms]);

  const {
    data: termPreview,
    isLoading: termPreviewLoading,
    isError: termPreviewError,
    error: termPreviewErr,
    refetch: refetchTermPreview,
  } = usePersonnelAccountClosurePreview(
    personnelId,
    selectedTermId,
    open && step === 2 && scope === "term" && selectedTermId != null
  );

  const {
    data: yearPreview,
    isLoading: yearPreviewLoading,
    isError: yearPreviewError,
    error: yearPreviewErr,
    refetch: refetchYearPreview,
  } = usePersonnelYearAccountPreview(
    personnelId,
    selectedYear,
    open && step === 2 && scope === "year"
  );

  const closeYear = useClosePersonnelYearAccount(personnelId);

  const termOptions: SelectOption[] = useMemo(
    () =>
      terms.map((term) => ({
        value: String(term.id),
        label: `#${term.id} · ${termLabel(term, t, locale, dash)}`,
      })),
    [terms, t, locale, dash]
  );

  const canGoStep2 =
    scope === "year"
      ? selectedYear >= 1990 &&
        selectedYear <= 2100 &&
        selectedYear <= new Date().getFullYear()
      : selectedTermId != null && terms.some((x) => x.id === selectedTermId);

  const previewLoading =
    scope === "year" ? yearPreviewLoading : termPreviewLoading;
  const previewError = scope === "year" ? yearPreviewError : termPreviewError;
  const previewErr = scope === "year" ? yearPreviewErr : termPreviewErr;
  const refetchPreview = () =>
    scope === "year" ? void refetchYearPreview() : void refetchTermPreview();

  const lines =
    scope === "year" ? yearPreview?.lines ?? [] : termPreview?.lines ?? [];

  const suggestedExpectedSalary = useMemo(() => {
    const days = parseInt(closureWorkedDays, 10);
    if (
      personnelMonthlySalary == null ||
      !Number.isFinite(personnelMonthlySalary) ||
      !Number.isFinite(days) ||
      days < 1
    )
      return null;
    return roundMoney2((personnelMonthlySalary * days) / 30);
  }, [personnelMonthlySalary, closureWorkedDays]);

  const parsedClosureDays = parseInt(closureWorkedDays, 10);
  const parsedExpectedSalary = parseDecimalInput(closureExpectedSalary);
  const salaryDaysOk =
    Number.isFinite(parsedClosureDays) &&
    parsedClosureDays >= 1 &&
    parsedClosureDays <= 366;
  const salaryExpectedOk =
    Number.isFinite(parsedExpectedSalary) && parsedExpectedSalary >= 0;
  const salarySourceOk =
    !salaryBalanceSettled ||
    (salaryPaymentSourceType.trim().length > 0 &&
      ["CASH", "BANK", "PATRON"].includes(
        salaryPaymentSourceType.trim().toUpperCase(),
      ));

  const netSalaryPreview =
    scope === "year" &&
    yearPreview &&
    !yearPreview.isYearClosed &&
    salaryExpectedOk
      ? computeClosureSalaryNetRemaining(
          yearPreview.lines,
          parsedExpectedSalary,
          closureSalaryCurrency,
        )
      : null;

  const salarySourceOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("personnel.accountClosure.salarySourcePick") },
      {
        value: "CASH",
        label: t("personnel.accountClosure.salarySourceCash"),
      },
      {
        value: "BANK",
        label: t("personnel.accountClosure.salarySourceBank"),
      },
      {
        value: "PATRON",
        label: t("personnel.accountClosure.salarySourcePatron"),
      },
    ],
    [t],
  );

  const runSettlementPdfForClosureYear = async () => {
    setPrintSettlementBusy(true);
    try {
      await openPersonnelSettlementPrintWindow({
        target: {
          scope: "personnel",
          personnelId,
          title: personnelDisplayName,
          seasonArrivalDate: personnelSeasonArrivalDate ?? undefined,
          seasonYearFilter: selectedYear,
        },
        locale,
        branchNameById,
        t,
      });
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setPrintSettlementBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={t("personnel.accountClosure.title")}
      description={personnelDisplayName}
      closeButtonLabel={t("common.close")}
      wide
      wideFixedHeight
      nested={nested}
      className={cn(
        nested
          ? "!h-[min(calc(100dvh-5rem),40rem)] sm:!h-[min(88dvh,44rem)]"
          : "!h-[min(calc(100dvh-2rem),44rem)] sm:!h-[min(92dvh,48rem)]"
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-2 [-webkit-overflow-scrolling:touch] sm:px-6 sm:pb-6 sm:pt-3">
          <div className="space-y-5">
        <nav
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3"
          aria-label={t("personnel.accountClosure.stepsAria")}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                step === 1
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-emerald-600 text-white"
              )}
              aria-current={step === 1 ? "step" : undefined}
            >
              1
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-xs font-medium uppercase leading-snug tracking-wide break-words sm:truncate",
                  step === 1 ? "text-zinc-900" : "text-zinc-500"
                )}
              >
                {t("personnel.accountClosure.stepPick")}
              </p>
            </div>
          </div>
          <div
            className="h-px w-full shrink-0 bg-zinc-200 sm:min-w-[1.5rem] sm:flex-1 sm:max-w-none"
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                step === 2 ? "bg-zinc-900 text-white shadow-sm" : "bg-zinc-100 text-zinc-500"
              )}
              aria-current={step === 2 ? "step" : undefined}
            >
              2
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-xs font-medium uppercase leading-snug tracking-wide break-words sm:truncate",
                  step === 2 ? "text-zinc-900" : "text-zinc-500"
                )}
              >
                {t("personnel.accountClosure.stepSummary")}
              </p>
            </div>
          </div>
        </nav>

        {step === 1 ? (
          <div className="space-y-5">
            <Card className="border-zinc-200/90 bg-zinc-50/40 shadow-none ring-1 ring-zinc-950/[0.04]">
              <p className="text-sm leading-relaxed text-zinc-600">
                {t("personnel.accountClosure.introYearFirst")}
              </p>
            </Card>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={cn(
                  "min-h-[3.25rem] rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
                  scope === "year"
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-md ring-2 ring-zinc-900 ring-offset-0 ring-offset-white sm:ring-offset-2"
                    : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                )}
                onClick={() => setScope("year")}
              >
                {t("personnel.accountClosure.scopeYear")}
              </button>
              <button
                type="button"
                className={cn(
                  "min-h-[3.25rem] rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
                  scope === "term"
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-md ring-2 ring-zinc-900 ring-offset-0 ring-offset-white sm:ring-offset-2"
                    : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                )}
                onClick={() => setScope("term")}
              >
                {t("personnel.accountClosure.scopeTerm")}
              </button>
            </div>

            {scope === "year" ? (
              <div className="space-y-2">
                <p className="text-xs leading-relaxed text-zinc-500">
                  {t("personnel.accountClosure.yearRulesHint")}
                </p>
                <Select
                  label={t("personnel.accountClosure.selectYear")}
                  labelRequired
                  name="closureYear"
                  options={yearOptions}
                  value={String(selectedYear)}
                  onChange={(e) =>
                    setSelectedYear(parseInt(e.target.value, 10) || selectedYear)
                  }
                  onBlur={() => {}}
                />
              </div>
            ) : termsLoading ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : terms.length === 0 ? (
              <Card className="border-amber-200/90 bg-amber-50/50 shadow-none ring-1 ring-amber-900/10">
                <p className="text-sm leading-relaxed text-amber-950">
                  {t("personnel.accountClosure.emptyTerms")}
                </p>
              </Card>
            ) : (
              <Select
                label={t("personnel.accountClosure.selectTerm")}
                labelRequired
                name="employmentTermId"
                options={termOptions}
                value={selectedTermId != null ? String(selectedTermId) : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedTermId(v ? parseInt(v, 10) : null);
                }}
                onBlur={() => {}}
              />
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full sm:w-auto"
                onClick={onClose}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                className="min-h-11 w-full sm:w-auto"
                disabled={!canGoStep2}
                onClick={() => setStep(2)}
              >
                {t("personnel.accountClosure.next")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <Button
              type="button"
              variant="ghost"
              className="-ml-2 min-h-10 px-2 text-sm text-zinc-600 hover:text-zinc-900"
              onClick={() => setStep(1)}
            >
              ← {t("personnel.accountClosure.back")}
            </Button>

            {previewLoading ? (
              <Card className="border-zinc-200/80 bg-zinc-50/30 shadow-none">
                <p className="text-sm text-zinc-500">{t("common.loading")}</p>
              </Card>
            ) : previewError ? (
              <Card className="border-red-200/90 bg-red-50/50 shadow-none ring-1 ring-red-900/10">
                <p className="text-sm text-red-900">{toErrorMessage(previewErr)}</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => refetchPreview()}
                >
                  {t("personnel.accountClosure.retry")}
                </Button>
              </Card>
            ) : (
              <>
                <section className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {t("personnel.accountClosure.summaryTotalsTitle")}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                      {t("personnel.accountClosure.summaryTotalsHint")}
                    </p>
                  </div>
                  <ClosureLinesBlock
                    lines={lines}
                    t={t}
                    locale={locale}
                    dash={dash}
                  />
                </section>

                {scope === "year" && yearPreview ? (
                  <>
                    <Card
                      className={cn(
                        "shadow-none ring-1",
                        yearPreview.isYearClosed
                          ? "border-emerald-200/90 bg-emerald-50/40 ring-emerald-900/10"
                          : "border-zinc-200/90 bg-zinc-50/40 ring-zinc-950/[0.04]"
                      )}
                    >
                      <p className="text-sm font-semibold text-zinc-900">
                        {t("personnel.accountClosure.yearPeriodTitle").replace(
                          "{year}",
                          String(yearPreview.closureYear),
                        )}
                      </p>
                      {yearPreview.isYearClosed ? (
                        <>
                          <p className="mt-2 text-xs leading-relaxed text-emerald-900/90">
                            {yearPreview.closedAtUtc
                              ? formatLocaleDate(
                                  yearPreview.closedAtUtc.slice(0, 10),
                                  locale,
                                  dash
                                )
                              : dash}
                            {yearPreview.closureNotes?.trim()
                              ? ` — ${yearPreview.closureNotes.trim()}`
                              : ""}
                          </p>
                          <p className="mt-2 text-xs font-medium leading-relaxed text-emerald-950/90">
                            {yearPreview.settlementPdfAcknowledged
                              ? t("personnel.accountClosure.closedPdfAckYes")
                              : t("personnel.accountClosure.closedPdfAckNo")}
                          </p>
                          <p className="mt-3 text-xs leading-relaxed text-emerald-900/80">
                            {t("personnel.accountClosure.yearClosedViewHint")}
                          </p>
                          {yearPreview.closureWorkedDays != null ||
                          yearPreview.closureExpectedSalaryAmount != null ? (
                            <div className="mt-3 space-y-2 border-t border-emerald-200/60 pt-3 text-xs leading-relaxed text-emerald-950/90">
                              {yearPreview.closureWorkedDays != null ? (
                                <p>
                                  <span className="font-semibold">
                                    {t("personnel.accountClosure.closedWorkedDays")}
                                  </span>{" "}
                                  {yearPreview.closureWorkedDays}
                                </p>
                              ) : null}
                              {yearPreview.closureExpectedSalaryAmount != null ? (
                                <p>
                                  <span className="font-semibold">
                                    {t("personnel.accountClosure.closedExpectedSalary")}
                                  </span>{" "}
                                  {formatLocaleAmount(
                                    yearPreview.closureExpectedSalaryAmount,
                                    locale,
                                    yearPreview.closureExpectedSalaryCurrency?.trim().toUpperCase() ||
                                      "TRY",
                                  )}
                                </p>
                              ) : null}
                              {yearPreview.closureSalaryNetRemaining != null ? (
                                <p>
                                  <span className="font-semibold">
                                    {t("personnel.accountClosure.closedNetRemaining")}
                                  </span>{" "}
                                  {formatLocaleAmount(
                                    yearPreview.closureSalaryNetRemaining,
                                    locale,
                                    yearPreview.closureExpectedSalaryCurrency?.trim().toUpperCase() ||
                                      "TRY",
                                  )}
                                </p>
                              ) : null}
                              <p>
                                <span className="font-semibold">
                                  {t("personnel.accountClosure.closedSalarySettledLabel")}
                                </span>{" "}
                                {yearPreview.salaryBalanceSettled === true
                                  ? t("personnel.accountClosure.closedSalarySettledYes")
                                  : t("personnel.accountClosure.closedSalarySettledNo")}
                                {yearPreview.salaryPaymentSourceType?.trim()
                                  ? ` · ${t("personnel.accountClosure.closedSalarySource")}: ${yearPreview.salaryPaymentSourceType.trim().toUpperCase()}`
                                  : ""}
                              </p>
                              {yearPreview.salarySettlementNote?.trim() ? (
                                <p className="break-words">
                                  <span className="font-semibold">
                                    {t("personnel.accountClosure.salarySettlementNoteLabel")}
                                  </span>{" "}
                                  {yearPreview.salarySettlementNote.trim()}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                          {t("personnel.accountClosure.yearNotClosedHint")}
                        </p>
                      )}
                    </Card>

                    {!yearPreview.isYearClosed &&
                    canCloseYear &&
                    selectedYear <= new Date().getFullYear() ? (
                      <>
                        <Card className="border-sky-200/90 bg-sky-50/30 shadow-none ring-1 ring-sky-900/10">
                          <p className="text-sm font-semibold text-zinc-900">
                            {t("personnel.accountClosure.settlementPdfStepTitle")}
                          </p>
                          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                            {t("personnel.accountClosure.settlementPdfStepHint").replace(
                              "{year}",
                              String(selectedYear),
                            )}
                          </p>
                          <Button
                            type="button"
                            variant="secondary"
                            className="mt-3 w-full sm:w-auto"
                            disabled={printSettlementBusy}
                            onClick={() => void runSettlementPdfForClosureYear()}
                          >
                            {printSettlementBusy
                              ? t("common.loading")
                              : t("personnel.accountClosure.settlementPdfOpenButton")}
                          </Button>
                          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm leading-snug text-zinc-800">
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900/20"
                              checked={settlementPdfAcknowledged}
                              onChange={(e) =>
                                setSettlementPdfAcknowledged(e.target.checked)
                              }
                            />
                            <span>{t("personnel.accountClosure.settlementPdfAckLabel")}</span>
                          </label>
                        </Card>
                        <Card className="border-violet-200/90 bg-violet-50/25 shadow-none ring-1 ring-violet-900/10">
                          <p className="text-sm font-semibold text-zinc-900">
                            {t("personnel.accountClosure.salarySectionTitle")}
                          </p>
                          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                            {t("personnel.accountClosure.salarySectionHint")}
                          </p>
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <Input
                              name="closureWorkedDays"
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={366}
                              label={t("personnel.accountClosure.workedDaysLabel")}
                              labelRequired
                              value={closureWorkedDays}
                              onChange={(e) => setClosureWorkedDays(e.target.value)}
                            />
                            <Input
                              name="closureSalaryCurrency"
                              maxLength={3}
                              label={t("personnel.accountClosure.salaryCurrencyLabel")}
                              labelRequired
                              value={closureSalaryCurrency}
                              onChange={(e) =>
                                setClosureSalaryCurrency(
                                  e.target.value.toUpperCase().slice(0, 3),
                                )
                              }
                            />
                          </div>
                          <div className="mt-4">
                            <Input
                              name="closureExpectedSalary"
                              inputMode="decimal"
                              label={t("personnel.accountClosure.expectedSalaryLabel")}
                              labelRequired
                              value={closureExpectedSalary}
                              onChange={(e) =>
                                setClosureExpectedSalary(e.target.value)
                              }
                            />
                            {suggestedExpectedSalary != null ? (
                              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-zinc-600">
                                  {t(
                                    "personnel.accountClosure.suggestedFromCard",
                                  )
                                    .replace(
                                      "{amount}",
                                      formatLocaleAmount(
                                        suggestedExpectedSalary,
                                        locale,
                                        closureSalaryCurrency || "TRY",
                                      ),
                                    )
                                    .replace("{days}", closureWorkedDays || "—")}
                                </p>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="min-h-9 w-full shrink-0 sm:w-auto"
                                  onClick={() =>
                                    setClosureExpectedSalary(
                                      String(suggestedExpectedSalary),
                                    )
                                  }
                                >
                                  {t("personnel.accountClosure.useSuggestedButton")}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          {netSalaryPreview != null && salaryExpectedOk ? (
                            <div className="mt-4 rounded-lg border border-violet-200/80 bg-white/80 px-3 py-2.5">
                              <p className="text-sm font-semibold text-zinc-900">
                                {t("personnel.accountClosure.netRemainingLabel")}
                              </p>
                              <p className="mt-1 text-lg font-semibold tabular-nums text-violet-950">
                                {formatLocaleAmount(
                                  netSalaryPreview,
                                  locale,
                                  closureSalaryCurrency || "TRY",
                                )}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                                {t("personnel.accountClosure.netRemainingHint")}
                              </p>
                            </div>
                          ) : null}
                          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm leading-snug text-zinc-800">
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900/20"
                              checked={salaryBalanceSettled}
                              onChange={(e) => {
                                setSalaryBalanceSettled(e.target.checked);
                                if (!e.target.checked)
                                  setSalaryPaymentSourceType("");
                              }}
                            />
                            <span>{t("personnel.accountClosure.salarySettledLabel")}</span>
                          </label>
                          {salaryBalanceSettled ? (
                            <div className="mt-3">
                              <Select
                                label={t("personnel.accountClosure.salarySourceLabel")}
                                labelRequired
                                name="salaryPaymentSourceType"
                                options={salarySourceOptions}
                                value={salaryPaymentSourceType}
                                onChange={(e) =>
                                  setSalaryPaymentSourceType(e.target.value)
                                }
                                onBlur={() => {}}
                              />
                            </div>
                          ) : null}
                          <label className="mb-1.5 mt-4 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                            {t("personnel.accountClosure.salarySettlementNoteLabel")}
                          </label>
                          <textarea
                            name="salarySettlementNote"
                            rows={2}
                            maxLength={2000}
                            value={salarySettlementNote}
                            onChange={(e) =>
                              setSalarySettlementNote(e.target.value)
                            }
                            className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                            placeholder={t(
                              "personnel.accountClosure.salarySettlementNotePlaceholder",
                            )}
                          />
                        </Card>
                        <Card className="border-zinc-200/90 shadow-none ring-1 ring-zinc-950/[0.06]">
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                            {t("personnel.accountClosure.closeNotesLabel")}
                          </label>
                          <textarea
                            name="closeNotes"
                            rows={3}
                            maxLength={2000}
                            value={closeNotes}
                            onChange={(e) => setCloseNotes(e.target.value)}
                            className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                            placeholder={t(
                              "personnel.accountClosure.closeNotesPlaceholder",
                            )}
                          />
                          <Button
                            type="button"
                            className="mt-3 w-full sm:w-auto"
                            disabled={
                              closeYear.isPending ||
                              !settlementPdfAcknowledged ||
                              !salaryDaysOk ||
                              !salaryExpectedOk ||
                              !salarySourceOk
                            }
                            onClick={async () => {
                              try {
                                const ccy =
                                  closureSalaryCurrency.trim().toUpperCase() ||
                                  "TRY";
                                await closeYear.mutateAsync({
                                  closureYear: selectedYear,
                                  notes: closeNotes.trim() || null,
                                  settlementPdfAcknowledged: true,
                                  closureWorkedDays: parsedClosureDays,
                                  closureExpectedSalaryAmount: parsedExpectedSalary,
                                  closureExpectedSalaryCurrency: ccy,
                                  salaryBalanceSettled,
                                  salaryPaymentSourceType: salaryBalanceSettled
                                    ? salaryPaymentSourceType
                                        .trim()
                                        .toUpperCase()
                                    : null,
                                  salarySettlementNote:
                                    salarySettlementNote.trim() || null,
                                });
                                notify.success(
                                  t("personnel.accountClosure.closeSuccess"),
                                );
                                setCloseNotes("");
                                setSettlementPdfAcknowledged(false);
                                setClosureWorkedDays("");
                                setClosureExpectedSalary("");
                                setSalaryBalanceSettled(false);
                                setSalaryPaymentSourceType("");
                                setSalarySettlementNote("");
                              } catch (e) {
                                notify.error(toErrorMessage(e));
                              }
                            }}
                          >
                            {t("personnel.accountClosure.closeYearButton")}
                          </Button>
                        </Card>
                      </>
                    ) : null}
                  </>
                ) : scope === "term" && termPreview ? (
                  <Card className="border-zinc-200/90 bg-zinc-50/30 shadow-none ring-1 ring-zinc-950/[0.04]">
                    <p className="text-sm font-semibold text-zinc-900">
                      {t("personnel.accountClosure.period")}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                      {formatLocaleDate(
                        termPreview.periodStartInclusive.slice(0, 10),
                        locale,
                        dash
                      )}
                      {" — "}
                      {formatLocaleDate(
                        termPreview.periodEndInclusive.slice(0, 10),
                        locale,
                        dash
                      )}
                      {termPreview.isOpenTerm
                        ? ` · ${t("personnel.accountClosure.openPeriodHint")}`
                        : null}
                    </p>
                  </Card>
                ) : null}

                <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/40 px-3 py-2.5 text-xs leading-relaxed text-zinc-500">
                  {t("personnel.accountClosure.disclaimer")}
                </p>
              </>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={onClose}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
