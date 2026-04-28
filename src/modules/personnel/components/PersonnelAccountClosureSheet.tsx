"use client";

import {
  useClosePersonnelYearAccount,
  usePersonnelAccountClosurePreview,
  usePersonnelEmploymentTerms,
  usePersonnelYearAccountPreview,
  useUploadPersonnelYearClosurePdf,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { toErrorMessage } from "@/shared/lib/error-message";
import {
  formatAmountInputOnBlur,
  formatLocaleAmount,
  formatLocaleAmountInput,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { notify } from "@/shared/lib/notify";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
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
import { suggestClosureWorkedDaysFromSeasonStart } from "@/modules/personnel/lib/closure-worked-days-suggestion";
import { openPersonnelSettlementPrintWindow } from "@/modules/personnel/lib/personnel-settlement-print";
import { calendarYearNumericSelectOptions } from "@/modules/personnel/lib/settlement-print-season";
import { useEffect, useId, useMemo, useState } from "react";

type Scope = "year" | "term";

type YearCloseMobileTab = "overview" | "pdf" | "salary";

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

function salaryClosurePaymentSourceLabel(
  raw: string | null | undefined,
  t: (k: string) => string,
): string {
  const u = raw?.trim().toUpperCase() ?? "";
  if (u === "PATRON") return t("personnel.accountClosure.salarySourcePatron");
  if (u === "PATRON_BRANCH")
    return t("personnel.accountClosure.salarySourcePatronBranch");
  if (u === "BANK") return t("personnel.advanceSourceAbbrBank");
  if (u === "CASH") return t("personnel.accountClosure.salarySourceCash");
  return raw?.trim() || u;
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
    <li className="flex min-h-11 flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <span className="min-w-0 shrink text-zinc-600 sm:pt-0.5">{label}</span>
      <span className="font-medium tabular-nums text-zinc-900 sm:shrink-0 sm:text-right">
        {formatLocaleAmount(amount, locale, currencyCode)}
      </span>
    </li>
  );
}

function YearCloseBalanceGuide({
  lines,
  t,
  locale,
}: {
  lines: PersonnelAccountClosureCurrencyLine[];
  t: (k: string) => string;
  locale: Locale;
}) {
  if (lines.length === 0) {
    return (
      <Card className="border-amber-200/85 bg-amber-50/40 shadow-none ring-1 ring-amber-900/10">
        <p className="text-sm font-semibold text-zinc-900">
          {t("personnel.accountClosure.closeYearGuideEmptyTitle")}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-700">
          {t("personnel.accountClosure.closeYearGuideEmptyBody")}
        </p>
      </Card>
    );
  }
  return (
    <Card className="border-sky-200/80 bg-sky-50/30 shadow-none ring-1 ring-sky-900/10">
      <p className="text-sm font-semibold text-zinc-900">
        {t("personnel.accountClosure.closeYearGuideTitle")}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-600">
        {t("personnel.accountClosure.closeYearGuideLead")}
      </p>
      <div className="mt-3 space-y-3">
        {lines.map((line) => {
          const net = line.suggestedEmployerOffset;
          const netZero = Math.abs(net) < 0.005;
          const meaning =
            net > 0.005
              ? t("personnel.accountClosure.closeYearBalanceNetPositive")
              : net < -0.005
                ? t("personnel.accountClosure.closeYearBalanceNetNegative")
                : t("personnel.accountClosure.closeYearBalanceNetZero");
          return (
            <div
              key={line.currencyCode}
              className="rounded-xl border border-zinc-200/90 bg-white/80 px-3 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {line.currencyCode}
              </p>
              <ul className="mt-2 divide-y divide-zinc-100 text-xs">
                {lineRow(
                  t("personnel.accountClosure.rowAdvances"),
                  line.advancesTotal,
                  locale,
                  line.currencyCode,
                )}
                {lineRow(
                  t("personnel.accountClosure.rowSalary"),
                  line.salaryPaymentsTotal,
                  locale,
                  line.currencyCode,
                )}
                {lineRow(
                  t("personnel.accountClosure.rowExpenses"),
                  line.personnelAttributedNonAdvanceExpenseTotal,
                  locale,
                  line.currencyCode,
                )}
              </ul>
              <div className="mt-2 flex flex-col gap-1 border-t border-zinc-100 pt-2 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                <span className="text-xs font-semibold text-zinc-800">
                  {t("personnel.accountClosure.rowOffset")}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums sm:text-right",
                    net > 0.005 && "text-amber-900",
                    net < -0.005 && "text-sky-900",
                    netZero && "text-zinc-800",
                  )}
                >
                  {formatLocaleAmount(net, locale, line.currencyCode)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-600">{meaning}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        {t("personnel.accountClosure.closeYearGuideHandoverNote")}
      </p>
    </Card>
  );
}

function ClosureLinesBlock({
  lines,
  t,
  locale,
}: {
  lines: PersonnelAccountClosureCurrencyLine[];
  t: (k: string) => string;
  locale: Locale;
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
              <p className="bg-zinc-50/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
              <p className="bg-zinc-50/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
              <p className="bg-zinc-50/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
  const closeHintId = useId();
  const settlementPdfAckInputId = useId();
  const salaryBalanceSettledInputId = useId();
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
  const [closurePdfFile, setClosurePdfFile] = useState<File | null>(null);
  const [closureWorkedDays, setClosureWorkedDays] = useState("");
  const [closureExpectedSalary, setClosureExpectedSalary] = useState("");
  const [closureSalaryCurrency, setClosureSalaryCurrency] = useState("TRY");
  const [salaryBalanceSettled, setSalaryBalanceSettled] = useState(false);
  const [salaryPaymentSourceType, setSalaryPaymentSourceType] = useState("");
  const [salarySettlementNote, setSalarySettlementNote] = useState("");
  const [yearCloseTab, setYearCloseTab] = useState<YearCloseMobileTab>(
    "overview",
  );

  const { data: terms = [], isLoading: termsLoading } =
    usePersonnelEmploymentTerms(personnelId, open && scope === "term");

  const workedDaysSeasonSuggestion = useMemo(
    () => suggestClosureWorkedDaysFromSeasonStart(selectedYear, personnelSeasonArrivalDate),
    [selectedYear, personnelSeasonArrivalDate],
  );

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
      setClosurePdfFile(null);
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
      setClosurePdfFile(null);
      setClosureWorkedDays(
        (() => {
          const w = suggestClosureWorkedDaysFromSeasonStart(pick, personnelSeasonArrivalDate);
          return w ? String(w.days) : "";
        })(),
      );
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
    setSettlementPdfAcknowledged(false);
    setClosurePdfFile(null);
    setClosureWorkedDays(
      (() => {
        const yy = new Date().getFullYear();
        const w = suggestClosureWorkedDaysFromSeasonStart(yy, personnelSeasonArrivalDate);
        return w ? String(w.days) : "";
      })(),
    );
    setClosureExpectedSalary("");
    setSalaryBalanceSettled(false);
    setSalaryPaymentSourceType("");
    setSalarySettlementNote("");
    // `personnelSeasonArrivalDate` is applied via the year/salary effect only so
    // hydrating that prop does not reset the stepper back to step 1.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [open, startWithYearSummary, summaryYear]);

  useEffect(() => {
    setYearCloseTab("overview");
  }, [step, scope, selectedYear, open]);

  useEffect(() => {
    if (!open || scope !== "year") return;
    const c =
      personnelSalaryCurrency?.trim().toUpperCase().slice(0, 3) || "TRY";
    setClosureSalaryCurrency(c.length === 3 ? c : "TRY");
    setClosureWorkedDays(
      workedDaysSeasonSuggestion
        ? String(workedDaysSeasonSuggestion.days)
        : "",
    );
    setClosureExpectedSalary("");
    setSalaryBalanceSettled(false);
    setSalaryPaymentSourceType("");
    setSalarySettlementNote("");
  }, [open, scope, selectedYear, personnelSalaryCurrency, workedDaysSeasonSuggestion]);

  useEffect(() => {
    if (!open) return;
    setSettlementPdfAcknowledged(false);
    setClosurePdfFile(null);
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
  const uploadClosurePdf = useUploadPersonnelYearClosurePdf(personnelId);

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
  const parsedExpectedSalary = parseLocaleAmount(closureExpectedSalary, locale);
  const salaryDaysOk =
    Number.isFinite(parsedClosureDays) &&
    parsedClosureDays >= 1 &&
    parsedClosureDays <= 366;
  const salaryExpectedOk =
    Number.isFinite(parsedExpectedSalary) && parsedExpectedSalary >= 0;
  const salarySourceOk =
    !salaryBalanceSettled ||
    (salaryPaymentSourceType.trim().length > 0 &&
      ["CASH", "PATRON"].includes(salaryPaymentSourceType.trim().toUpperCase()));

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
        value: "PATRON",
        label: t("personnel.accountClosure.salarySourcePatron"),
      },
    ],
    [t],
  );

  const closeYearStory = useMemo(() => {
    if (
      scope !== "year" ||
      !yearPreview ||
      yearPreview.isYearClosed ||
      !canCloseYear ||
      selectedYear > new Date().getFullYear()
    )
      return null;

    const items = [
      {
        key: "pdf",
        label: t("personnel.accountClosure.closeYearStepPdf"),
        done: settlementPdfAcknowledged,
      },
      {
        key: "days",
        label: t("personnel.accountClosure.closeYearStepDays"),
        done: salaryDaysOk,
      },
      {
        key: "salary",
        label: t("personnel.accountClosure.closeYearStepSalary"),
        done: salaryExpectedOk,
      },
      {
        key: "source",
        label: t("personnel.accountClosure.closeYearStepSource"),
        done: salarySourceOk,
      },
    ];

    let submitHint: string;
    if (!settlementPdfAcknowledged)
      submitHint = t("personnel.accountClosure.closeYearHintPdf");
    else if (!salaryDaysOk)
      submitHint = t("personnel.accountClosure.closeYearHintDays");
    else if (!salaryExpectedOk)
      submitHint = t("personnel.accountClosure.closeYearHintSalary");
    else if (!salarySourceOk)
      submitHint = t("personnel.accountClosure.closeYearHintSource");
    else submitHint = t("personnel.accountClosure.closeYearReadyHint");

    return { items, submitHint };
  }, [
    scope,
    yearPreview,
    canCloseYear,
    selectedYear,
    settlementPdfAcknowledged,
    salaryDaysOk,
    salaryExpectedOk,
    salarySourceOk,
    t,
  ]);

  const yearCloseTabs = useMemo(
    () =>
      step === 2 &&
      !previewLoading &&
      !previewError &&
      scope === "year" &&
      yearPreview != null &&
      !yearPreview.isYearClosed &&
      canCloseYear &&
      selectedYear <= new Date().getFullYear(),
    [
      step,
      previewLoading,
      previewError,
      scope,
      yearPreview,
      canCloseYear,
      selectedYear,
    ],
  );

  useEffect(() => {
    if (!open || !yearCloseTabs) return;
    if (yearCloseTab === "salary" && !settlementPdfAcknowledged) {
      setYearCloseTab("pdf");
    }
  }, [open, yearCloseTabs, yearCloseTab, settlementPdfAcknowledged]);

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
  const requestClose = useDirtyGuard({
    isDirty:
      step === 2 ||
      scope !== "year" ||
      closeNotes.trim() !== "" ||
      settlementPdfAcknowledged ||
      closurePdfFile != null ||
      salaryBalanceSettled ||
      salaryPaymentSourceType.trim() !== "" ||
      salarySettlementNote.trim() !== "",
    isBlocked: closeYear.isPending || uploadClosurePdf.isPending || printSettlementBusy,
    confirmMessage: t("common.unsavedChangesConfirm"),
    onClose,
  });

  return (
    <Modal
      open={open}
      onClose={requestClose}
      titleId={titleId}
      title={t("personnel.accountClosure.title")}
      description={personnelDisplayName}
      closeButtonLabel={t("common.close")}
      wide
      wideExpanded
      nested={nested}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "min-h-0 flex-1 overscroll-contain px-3 pt-2 sm:px-6 sm:pt-3",
            step === 2 && yearCloseTabs
              ? "flex min-h-0 flex-col overflow-hidden pb-3 [-webkit-overflow-scrolling:touch] sm:pb-4"
              : cn(
                  "overflow-y-auto [-webkit-overflow-scrolling:touch]",
                  step === 2
                    ? "pb-24 sm:pb-6"
                    : "pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-6",
                ),
          )}
        >
          <div
            className={cn(
              "min-h-0",
              step === 2 && yearCloseTabs
                ? "flex flex-1 flex-col gap-3"
                : "space-y-5",
            )}
          >
        <ol
          className={cn(
            "grid list-none grid-cols-2 gap-2 sm:flex sm:grid-cols-none sm:flex-row sm:items-stretch sm:gap-3",
            step === 2 && yearCloseTabs && "shrink-0",
          )}
          aria-label={t("personnel.accountClosure.stepsAria")}
        >
          <li
            className={cn(
              "flex min-h-[4.25rem] min-w-0 flex-col justify-center rounded-xl border px-3 py-2.5 sm:min-h-0 sm:flex-1 sm:flex-row sm:items-center sm:gap-3 sm:py-3",
              step === 1
                ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                : "border-zinc-200 bg-white text-zinc-700"
            )}
          >
            <span
              className={cn(
                "mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:mb-0",
                step === 1 ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-600"
              )}
              aria-current={step === 1 ? "step" : undefined}
            >
              1
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">
                {t("personnel.accountClosure.stepPick")}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-xs leading-snug sm:line-clamp-2",
                  step === 1 ? "text-white/85" : "text-zinc-500"
                )}
              >
                {t("personnel.accountClosure.stepPickHelp")}
              </p>
            </div>
          </li>
          <li
            className={cn(
              "flex min-h-[4.25rem] min-w-0 flex-col justify-center rounded-xl border px-3 py-2.5 sm:min-h-0 sm:flex-1 sm:flex-row sm:items-center sm:gap-3 sm:py-3",
              step === 2
                ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                : "border-zinc-200 bg-white text-zinc-700"
            )}
          >
            <span
              className={cn(
                "mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:mb-0",
                step === 2 ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-600"
              )}
              aria-current={step === 2 ? "step" : undefined}
            >
              2
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">
                {t("personnel.accountClosure.stepSummary")}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-xs leading-snug sm:line-clamp-2",
                  step === 2 ? "text-white/85" : "text-zinc-500"
                )}
              >
                {t("personnel.accountClosure.stepSummaryHelp")}
              </p>
            </div>
          </li>
        </ol>

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
                  "min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors touch-manipulation active:opacity-95",
                  scope === "year"
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
                )}
                onClick={() => setScope("year")}
              >
                {t("personnel.accountClosure.scopeYear")}
              </button>
              <button
                type="button"
                className={cn(
                  "min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors touch-manipulation active:opacity-95",
                  scope === "term"
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
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
                onClick={requestClose}
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
          <div
            className={cn(
              step === 2 && yearCloseTabs
                ? "flex min-h-0 flex-1 flex-col gap-2"
                : "space-y-5",
            )}
          >
            <Button
              type="button"
              variant="ghost"
              className="-ml-2 min-h-12 shrink-0 px-3 text-sm text-zinc-600 hover:text-zinc-900 touch-manipulation"
              onClick={() => setStep(1)}
            >
              ← {t("personnel.accountClosure.back")}
            </Button>

            {yearCloseTabs ? (
              <div
                className="shrink-0 rounded-xl border border-zinc-200/90 bg-zinc-50/60 px-1 py-2 sm:mx-auto sm:max-w-2xl sm:px-2"
                role="group"
                aria-label={t("personnel.accountClosure.closeYearTabsAria")}
              >
                <div className="flex gap-1">
                  {(
                    [
                      ["overview", "closeYearMobileTabOverview"],
                      ["pdf", "closeYearMobileTabPdf"],
                      ["salary", "closeYearMobileTabSalary"],
                    ] as const
                  ).map(([id, labelKey]) => (
                    <div
                      key={id}
                      aria-current={yearCloseTab === id ? "step" : undefined}
                      className={cn(
                        "pointer-events-none min-h-11 min-w-0 flex-1 select-none rounded-lg px-2 py-2 text-center text-xs font-semibold leading-tight sm:text-sm",
                        yearCloseTab === id
                          ? "bg-zinc-900 text-white shadow-sm"
                          : "bg-white text-zinc-600 ring-1 ring-zinc-200/80",
                      )}
                    >
                      {t(`personnel.accountClosure.${labelKey}`)}
                    </div>
                  ))}
                </div>
                <p className="mt-2 px-1 text-center text-xs leading-snug text-zinc-500">
                  {t(
                    "personnel.accountClosure.closeYearMobileTabsFooterHint",
                  )}
                </p>
              </div>
            ) : null}

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
              <div
                className={cn(
                  yearCloseTabs &&
                    "flex min-h-0 flex-1 flex-col overflow-y-auto [-webkit-overflow-scrolling:touch]",
                )}
              >
                <section
                  className={cn(
                    "space-y-3",
                    yearCloseTabs &&
                      yearCloseTab !== "overview" &&
                      "hidden",
                  )}
                >
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 sm:text-sm">
                      {t("personnel.accountClosure.summaryTotalsTitle")}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-600 sm:text-xs">
                      {t("personnel.accountClosure.summaryTotalsHint")}
                    </p>
                  </div>
                  {scope === "year" && yearPreview ? (
                    <YearCloseBalanceGuide lines={lines} t={t} locale={locale} />
                  ) : null}
                  <ClosureLinesBlock lines={lines} t={t} locale={locale} />
                </section>

                {scope === "year" && yearPreview ? (
                  <>
                    <div
                      className={cn(
                        yearCloseTabs &&
                          yearCloseTab !== "overview" &&
                          "hidden",
                      )}
                    >
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
                                  ? ` · ${t("personnel.accountClosure.closedSalarySource")}: ${salaryClosurePaymentSourceLabel(yearPreview.salaryPaymentSourceType, t)}`
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
                    </div>

                    {scope === "year" &&
                    !yearPreview.isYearClosed &&
                    canCloseYear &&
                    selectedYear <= new Date().getFullYear() ? (
                      <>
                        <div
                          className={cn(
                            yearCloseTabs &&
                              yearCloseTab !== "overview" &&
                              "hidden",
                          )}
                        >
                        {closeYearStory ? (
                          <Card className="border-amber-200/80 bg-amber-50/35 shadow-none ring-1 ring-amber-900/10">
                            <p className="text-sm font-semibold text-zinc-900">
                              {t("personnel.accountClosure.closeYearStoryTitle")}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                              {t("personnel.accountClosure.closeYearStoryLead")}
                            </p>
                            <ol className="mt-3 list-none space-y-2.5 p-0">
                              {closeYearStory.items.map((it, i) => {
                                const firstOpen = closeYearStory.items.findIndex(
                                  (x) => !x.done,
                                );
                                const active = !it.done && i === firstOpen;
                                return (
                                  <li
                                    key={it.key}
                                    className="flex gap-3 text-sm leading-snug"
                                  >
                                    <span
                                      className={cn(
                                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                                        it.done
                                          ? "bg-emerald-600 text-white"
                                          : active
                                            ? "bg-zinc-900 text-white"
                                            : "border border-zinc-300 bg-white text-zinc-500",
                                      )}
                                      aria-hidden
                                    >
                                      {it.done ? "✓" : i + 1}
                                    </span>
                                    <span
                                      className={cn(
                                        "min-w-0 pt-0.5",
                                        it.done
                                          ? "text-zinc-600"
                                          : active
                                            ? "font-medium text-zinc-900"
                                            : "text-zinc-700",
                                      )}
                                    >
                                      {it.label}
                                    </span>
                                  </li>
                                );
                              })}
                            </ol>
                          </Card>
                        ) : null}
                        </div>
                        <div
                          className={cn(
                            yearCloseTabs &&
                              yearCloseTab !== "pdf" &&
                              "hidden",
                          )}
                        >
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
                          <div className="mt-3">
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                              {t("personnel.yearClosuresUploadPdf")}
                            </label>
                            <input
                              type="file"
                              accept="application/pdf,.pdf"
                              className="block w-full text-sm text-zinc-700"
                              onChange={(e) =>
                                setClosurePdfFile(e.target.files?.[0] ?? null)
                              }
                            />
                            {closurePdfFile ? (
                              <p className="mt-1 text-xs text-zinc-600">
                                {closurePdfFile.name}
                              </p>
                            ) : null}
                          </div>
                          <label
                            htmlFor={settlementPdfAckInputId}
                            className={cn(
                              "mt-4 flex min-h-[3.25rem] cursor-pointer items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors duration-200 touch-manipulation",
                              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sky-500 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-white",
                              settlementPdfAcknowledged
                                ? "border-emerald-300/90 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/30 shadow-sm ring-1 ring-emerald-500/10"
                                : "border-zinc-200/90 bg-white/90 hover:border-sky-200/90 hover:bg-sky-50/25",
                            )}
                          >
                            <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-zinc-900">
                              {t("personnel.accountClosure.settlementPdfAckLabel")}
                            </span>
                            <input
                              id={settlementPdfAckInputId}
                              type="checkbox"
                              role="switch"
                              aria-checked={settlementPdfAcknowledged}
                              className="sr-only"
                              checked={settlementPdfAcknowledged}
                              onChange={(e) =>
                                setSettlementPdfAcknowledged(e.target.checked)
                              }
                            />
                            <span
                              className={cn(
                                "pointer-events-none relative h-9 w-[3.25rem] shrink-0 rounded-full p-1 transition-colors duration-200 ease-out",
                                settlementPdfAcknowledged
                                  ? "bg-emerald-500 shadow-inner shadow-emerald-900/20"
                                  : "bg-zinc-300/95",
                              )}
                              aria-hidden
                            >
                              <span
                                className={cn(
                                  "absolute left-1 top-1 block h-7 w-7 rounded-full bg-white shadow-md ring-1 ring-zinc-900/[0.08] transition-transform duration-200 ease-out will-change-transform",
                                  settlementPdfAcknowledged
                                    ? "translate-x-4"
                                    : "translate-x-0",
                                )}
                              />
                            </span>
                          </label>
                        </Card>
                        </div>
                        <div
                          className={cn(
                            yearCloseTabs &&
                              yearCloseTab !== "salary" &&
                              "hidden",
                          )}
                        >
                        <Card className="border-violet-200/90 bg-violet-50/25 shadow-none ring-1 ring-violet-900/10">
                          <p className="text-sm font-semibold text-zinc-900">
                            {t("personnel.accountClosure.salarySectionTitle")}
                          </p>
                          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                            {t("personnel.accountClosure.salarySectionHint")}
                          </p>
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div className="min-w-0">
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
                              {workedDaysSeasonSuggestion ? (
                                <div className="mt-2 space-y-2">
                                  <p className="text-xs leading-relaxed text-zinc-600">
                                    {t("personnel.accountClosure.workedDaysSeasonSuggestion")
                                      .replace(
                                        "{arrival}",
                                        formatLocaleDate(
                                          workedDaysSeasonSuggestion.seasonArrivalIso,
                                          locale,
                                          dash,
                                        ),
                                      )
                                      .replace("{year}", String(selectedYear))
                                      .replace(
                                        "{from}",
                                        formatLocaleDate(
                                          workedDaysSeasonSuggestion.periodStart,
                                          locale,
                                          dash,
                                        ),
                                      )
                                      .replace(
                                        "{to}",
                                        formatLocaleDate(
                                          workedDaysSeasonSuggestion.periodEnd,
                                          locale,
                                          dash,
                                        ),
                                      )
                                      .replace(
                                        "{days}",
                                        String(workedDaysSeasonSuggestion.days),
                                      )}
                                  </p>
                                  {closureWorkedDays !==
                                  String(workedDaysSeasonSuggestion.days) ? (
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      className="min-h-[44px] min-w-[44px] w-full sm:w-auto"
                                      onClick={() =>
                                        setClosureWorkedDays(
                                          String(workedDaysSeasonSuggestion.days),
                                        )
                                      }
                                    >
                                      {t(
                                        "personnel.accountClosure.workedDaysApplySuggestionButton",
                                      )}
                                    </Button>
                                  ) : null}
                                </div>
                              ) : (
                                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                                  {t(
                                    "personnel.accountClosure.workedDaysSeasonSuggestionMissing",
                                  )}
                                </p>
                              )}
                            </div>
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
                              onBlur={() =>
                                setClosureExpectedSalary((prev) =>
                                  formatAmountInputOnBlur(prev, locale),
                                )
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
                                  className="min-h-[44px] min-w-[44px] w-full shrink-0 sm:w-auto"
                                  onClick={() =>
                                    setClosureExpectedSalary(
                                      formatLocaleAmountInput(
                                        suggestedExpectedSalary,
                                        locale,
                                      ),
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
                          <label
                            htmlFor={salaryBalanceSettledInputId}
                            className={cn(
                              "mt-4 flex min-h-[3.25rem] cursor-pointer items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors duration-200 touch-manipulation",
                              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-white",
                              salaryBalanceSettled
                                ? "border-violet-300/90 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/20 shadow-sm ring-1 ring-violet-500/10"
                                : "border-zinc-200/90 bg-white/90 hover:border-violet-200/90 hover:bg-violet-50/20",
                            )}
                          >
                            <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-zinc-900">
                              {t("personnel.accountClosure.salarySettledLabel")}
                            </span>
                            <input
                              id={salaryBalanceSettledInputId}
                              type="checkbox"
                              role="switch"
                              aria-checked={salaryBalanceSettled}
                              className="sr-only"
                              checked={salaryBalanceSettled}
                              onChange={(e) => {
                                setSalaryBalanceSettled(e.target.checked);
                                if (!e.target.checked)
                                  setSalaryPaymentSourceType("");
                              }}
                            />
                            <span
                              className={cn(
                                "pointer-events-none relative h-9 w-[3.25rem] shrink-0 rounded-full p-1 transition-colors duration-200 ease-out",
                                salaryBalanceSettled
                                  ? "bg-violet-600 shadow-inner shadow-violet-900/20"
                                  : "bg-zinc-300/95",
                              )}
                              aria-hidden
                            >
                              <span
                                className={cn(
                                  "absolute left-1 top-1 block h-7 w-7 rounded-full bg-white shadow-md ring-1 ring-zinc-900/[0.08] transition-transform duration-200 ease-out will-change-transform",
                                  salaryBalanceSettled ? "translate-x-4" : "translate-x-0",
                                )}
                              />
                            </span>
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
                          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                            {t("personnel.accountClosure.closeNotesLabel")}
                          </label>
                          <textarea
                            name="closeNotes"
                            rows={3}
                            maxLength={2000}
                            value={closeNotes}
                            onChange={(e) => setCloseNotes(e.target.value)}
                            className="min-h-[5.5rem] w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 sm:text-sm"
                            placeholder={t(
                              "personnel.accountClosure.closeNotesPlaceholder",
                            )}
                          />
                        </Card>
                        <div className="sticky bottom-0 z-[1] -mx-3 mt-2 border-t border-zinc-200 bg-white/95 px-3 py-3 shadow-[0_-6px_20px_-8px_rgba(0,0,0,0.12)] backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:static sm:z-0 sm:mx-0 sm:mt-3 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
                          {closeYearStory ? (
                            <p
                              id={closeHintId}
                              role="status"
                              className="mb-2 text-xs leading-relaxed text-zinc-600 sm:max-w-xl"
                            >
                              {closeYear.isPending
                                ? t("common.loading")
                                : closeYearStory.submitHint}
                            </p>
                          ) : null}
                          <Button
                            type="button"
                            className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto"
                            aria-describedby={
                              closeYearStory ? closeHintId : undefined
                            }
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
                                setClosureWorkedDays(
                                  (() => {
                                    const w = suggestClosureWorkedDaysFromSeasonStart(
                                      selectedYear,
                                      personnelSeasonArrivalDate,
                                    );
                                    return w ? String(w.days) : "";
                                  })(),
                                );
                                setClosureExpectedSalary("");
                                setSalaryBalanceSettled(false);
                                setSalaryPaymentSourceType("");
                                setSalarySettlementNote("");
                                if (closurePdfFile && closurePdfFile.size > 0) {
                                  await uploadClosurePdf.mutateAsync({
                                    year: selectedYear,
                                    file: closurePdfFile,
                                  });
                                  notify.success(
                                    t("personnel.yearClosuresUploadPdfSuccess"),
                                  );
                                }
                                setClosurePdfFile(null);
                              } catch (e) {
                                notify.error(toErrorMessage(e));
                              }
                            }}
                          >
                            {t("personnel.accountClosure.closeYearButton")}
                          </Button>
                        </div>
                        </div>
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
              </div>
            )}

            {step === 2 && !yearCloseTabs ? (
              <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto"
                  onClick={requestClose}
                >
                  {t("common.close")}
                </Button>
              </div>
            ) : null}
          </div>
        )}
          </div>
        {yearCloseTabs && yearCloseTab !== "salary" ? (
          <div
            className={cn(
              "shrink-0 border-t border-zinc-200 bg-white py-3",
              "pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] sm:pl-6 sm:pr-6",
              "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
            )}
          >
            {yearCloseTab === "pdf" && !settlementPdfAcknowledged ? (
              <p className="mb-2 text-left text-xs leading-relaxed text-amber-900/90 sm:text-right">
                {t(
                  "personnel.accountClosure.closeYearSalaryTabRequiresPdfAck",
                )}
              </p>
            ) : null}
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              {yearCloseTab === "overview" ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto sm:shrink-0"
                  onClick={() => setYearCloseTab("pdf")}
                >
                  {t("personnel.accountClosure.closeYearGoPdfTab")}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto sm:shrink-0"
                  disabled={!settlementPdfAcknowledged}
                  title={
                    !settlementPdfAcknowledged
                      ? t(
                          "personnel.accountClosure.closeYearSalaryTabRequiresPdfAck",
                        )
                      : undefined
                  }
                  onClick={() => setYearCloseTab("salary")}
                >
                  {t("personnel.accountClosure.closeYearGoSalaryTab")}
                </Button>
              )}
            </div>
          </div>
        ) : null}
        </div>
      </div>
    </Modal>
  );
}
