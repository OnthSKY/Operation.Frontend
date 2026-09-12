"use client";

import {
  useClosePersonnelYearAccount,
  usePersonnelAccountClosurePreview,
  usePersonnelEmploymentTerms,
  usePersonnelManagementSnapshot,
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
import { DateField } from "@/shared/ui/DateField";
import { Select, type SelectOption } from "@/shared/ui/Select";
import type {
  PersonnelAccountClosureCurrencyLine,
  PersonnelEmploymentTerm,
} from "@/types/personnel-account-closure";
import {
  suggestClosureWorkedDaysFromSeasonStart,
  computeWorkedDaysForClosure,
  type ClosureWorkedDaysFromSeason,
} from "@/modules/personnel/lib/closure-worked-days-suggestion";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import {
  generatePersonnelSettlementPdfBlob,
  openPersonnelSettlementPrintWindow,
} from "@/modules/personnel/lib/personnel-settlement-print";
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

/**
 * Sadeleştirilmiş özet: çalışılan gün (başlangıç → bugün, dahil) + para birimi başına
 * "avans" ve "gider" ayrı satır ve toplamları. Ayrıntılı döküm için kullanıcı hesap
 * özeti PDF'ine yönlendirilir (bkz. aşağıdaki PDF kartı).
 */
function ClosureSimpleSummary({
  lines,
  workedDays,
  lastWorkingDay,
  onLastWorkingDayChange,
  lastWorkingDayMin,
  lastWorkingDayMax,
  canPickLastWorkingDay,
  t,
  locale,
  dash,
}: {
  lines: PersonnelAccountClosureCurrencyLine[];
  workedDays: ClosureWorkedDaysFromSeason | null;
  lastWorkingDay: string;
  onLastWorkingDayChange: (iso: string) => void;
  lastWorkingDayMin: string;
  lastWorkingDayMax: string;
  canPickLastWorkingDay: boolean;
  t: (k: string) => string;
  locale: Locale;
  dash: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card className="border-zinc-200/90 bg-zinc-50/40 shadow-none ring-1 ring-zinc-950/[0.04]">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("personnel.accountClosure.simpleWorkedDaysTitle")}
        </p>
        {workedDays ? (
          <>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
              {t("personnel.accountClosure.simpleWorkedDaysValue").replace(
                "{days}",
                String(workedDays.days),
              )}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600">
              {t("personnel.accountClosure.simpleWorkedDaysRange")
                .replace(
                  "{from}",
                  formatLocaleDate(workedDays.periodStart, locale, dash),
                )
                .replace(
                  "{to}",
                  formatLocaleDate(workedDays.periodEnd, locale, dash),
                )}
            </p>
          </>
        ) : (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {t("personnel.accountClosure.workedDaysSeasonSuggestionMissing")}
          </p>
        )}
        {canPickLastWorkingDay ? (
          <div className="mt-3">
            <DateField
              name="lastWorkingDay"
              mode="date"
              label={t("personnel.accountClosure.lastWorkingDayLabel")}
              value={lastWorkingDay}
              min={lastWorkingDayMin}
              max={lastWorkingDayMax}
              onChange={(e) => onLastWorkingDayChange(e.target.value)}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
              {t("personnel.accountClosure.lastWorkingDayHint")}
            </p>
          </div>
        ) : null}
      </Card>

      {lines.length === 0 ? (
        <p className="text-sm text-zinc-500 sm:col-span-2">
          {t("personnel.accountClosure.noLines")}
        </p>
      ) : (
        lines.map((line) => {
          const total =
            line.advancesTotal +
            line.personnelAttributedNonAdvanceExpenseTotal;
          return (
            <Card
              key={line.currencyCode}
              className="overflow-hidden p-0 shadow-none ring-1 ring-zinc-950/5"
            >
              <div className="border-b border-zinc-100 bg-zinc-50/80 px-4 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {line.currencyCode}
                </p>
              </div>
              <ul className="divide-y divide-zinc-100 text-sm">
                {lineRow(
                  t("personnel.accountClosure.rowAdvances"),
                  line.advancesTotal,
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
              <div className="flex flex-col gap-1 border-t border-zinc-200 bg-zinc-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <span className="font-semibold text-zinc-800">
                  {t("personnel.accountClosure.simpleTotalLabel")}
                </span>
                <span className="text-base font-semibold tabular-nums text-zinc-900 sm:text-right">
                  {formatLocaleAmount(total, locale, line.currencyCode)}
                </span>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

/** "Yılı kapatmadan önce" adım rehberi — özetin en üstünde gösterilir. */
function CloseYearStoryCard({
  story,
  t,
}: {
  story: { items: { key: string; label: string; done: boolean }[] };
  t: (k: string) => string;
}) {
  const firstOpen = story.items.findIndex((x) => !x.done);
  return (
    <Card className="border-amber-200/80 bg-amber-50/35 shadow-none ring-1 ring-amber-900/10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-sm font-semibold text-zinc-900">
          {t("personnel.accountClosure.closeYearStoryTitle")}
        </p>
        <p className="text-xs leading-relaxed text-zinc-600">
          {t("personnel.accountClosure.closeYearStoryLead")}
        </p>
      </div>
      <ol className="mt-2.5 grid list-none grid-cols-3 gap-2 p-0">
        {story.items.map((it, i) => {
          const active = !it.done && i === firstOpen;
          return (
            <li
              key={it.key}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2",
                it.done
                  ? "border-emerald-200 bg-emerald-50/70"
                  : active
                    ? "border-zinc-900 bg-white shadow-sm"
                    : "border-zinc-200 bg-white",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
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
                  "min-w-0 text-xs font-medium leading-tight",
                  it.done
                    ? "text-zinc-600"
                    : active
                      ? "text-zinc-900"
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
  const salaryBalanceSettledInputId = useId();
  const dash = t("personnel.dash");
  const [step, setStep] = useState<1 | 2>(1);
  const [scope, setScope] = useState<Scope>("year");
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear()
  );
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [closeNotes, setCloseNotes] = useState("");
  const [showCloseNote, setShowCloseNote] = useState(false);
  // Yıl kapatma + PDF üretim/yükleme tek akış — tüm süre boyunca «yükleniyor».
  const [isClosing, setIsClosing] = useState(false);
  const [printSettlementBusy, setPrintSettlementBusy] = useState(false);
  const [closureWorkedDays, setClosureWorkedDays] = useState("");
  const [closureExpectedSalary, setClosureExpectedSalary] = useState("");
  const [closureSalaryCurrency, setClosureSalaryCurrency] = useState("TRY");
  const [salaryBalanceSettled, setSalaryBalanceSettled] = useState(false);
  const [salaryPaymentSourceType, setSalaryPaymentSourceType] = useState("");
  const [salarySettlementNote, setSalarySettlementNote] = useState("");
  // Son çalışma / çıkış günü (YYYY-MM-DD). Default: bugün (cari yıl) veya yıl sonu.
  // Çalışılan gün bu güne göre hesaplanır; backend'e gitmez, yalnızca gün sayısını türetir.
  const [lastWorkingDay, setLastWorkingDay] = useState("");

  const { data: terms = [], isLoading: termsLoading } =
    usePersonnelEmploymentTerms(personnelId, open && scope === "term");

  const workedDaysSeasonSuggestion = useMemo(
    () => suggestClosureWorkedDaysFromSeasonStart(selectedYear, personnelSeasonArrivalDate),
    [selectedYear, personnelSeasonArrivalDate],
  );

  // Seçilen "son çalışma günü"ne göre canlı çalışılan-gün hesabı (özet kartı + gün sayısı).
  const workedDays = useMemo(
    () =>
      computeWorkedDaysForClosure(
        selectedYear,
        personnelSeasonArrivalDate,
        lastWorkingDay,
      ),
    [selectedYear, personnelSeasonArrivalDate, lastWorkingDay],
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
      setClosureWorkedDays("");
      setClosureExpectedSalary("");
      setSalaryBalanceSettled(false);
      setSalaryPaymentSourceType("");
      setSalarySettlementNote("");
      setLastWorkingDay("");
      setShowCloseNote(false);
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
    if (!open || scope !== "year") return;
    const c =
      personnelSalaryCurrency?.trim().toUpperCase().slice(0, 3) || "TRY";
    setClosureSalaryCurrency(c.length === 3 ? c : "TRY");
    setLastWorkingDay(workedDaysSeasonSuggestion?.periodEnd ?? localIsoDate());
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

  // Kapanış sırasında: kişinin üzerinde hâlâ tuttuğu kasa nakit (net IN−OUT > 0)
  // varsa uyarı göster — sezon kapatmadan önce devredilmesi/iade edilmesi gerekir.
  const { data: mgmtSnap } = usePersonnelManagementSnapshot(personnelId, open);
  const heldRegisterCashLines = useMemo(
    () =>
      (mgmtSnap?.cashAccountSummaries ?? []).filter(
        (s) => s.currentBalance > 0.009,
      ),
    [mgmtSnap],
  );

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

  const parsedClosureDays = parseInt(closureWorkedDays, 10);
  const salaryDaysOk =
    Number.isFinite(parsedClosureDays) &&
    parsedClosureDays >= 1 &&
    parsedClosureDays <= 366;
  // Girilen alan artık AYLIK maaş; hak ediş = aylık × (çalışılan gün ÷ 30).
  const parsedMonthlySalary = parseLocaleAmount(closureExpectedSalary, locale);
  const salaryExpectedOk =
    Number.isFinite(parsedMonthlySalary) && parsedMonthlySalary >= 0;
  const salarySourceOk =
    !salaryBalanceSettled ||
    (salaryPaymentSourceType.trim().length > 0 &&
      ["PATRON"].includes(salaryPaymentSourceType.trim().toUpperCase()));

  // Karttaki aylık maaş — «kullan» önerisi.
  const suggestedMonthlySalary =
    personnelMonthlySalary != null &&
    Number.isFinite(personnelMonthlySalary) &&
    personnelMonthlySalary > 0
      ? roundMoney2(personnelMonthlySalary)
      : null;

  // Bu para birimindeki alınmış tutarlar (avans + ödenen maaş + personel gideri).
  const closureCcyUpper = (closureSalaryCurrency || "TRY").trim().toUpperCase();
  const closureCcyLine = (yearPreview?.lines ?? []).find(
    (l) => l.currencyCode.trim().toUpperCase() === closureCcyUpper,
  );
  const closureAdvancesTotal = closureCcyLine?.advancesTotal ?? 0;
  const closureSalaryPaidTotal = closureCcyLine?.salaryPaymentsTotal ?? 0;
  const closureExpensesTotal =
    closureCcyLine?.personnelAttributedNonAdvanceExpenseTotal ?? 0;

  // Hak ediş (toplam alacak) = aylık maaş × çalışılan gün ÷ 30.
  const earnedSalaryTotal =
    salaryExpectedOk && salaryDaysOk
      ? roundMoney2((parsedMonthlySalary * parsedClosureDays) / 30)
      : null;

  const netSalaryPreview =
    scope === "year" &&
    yearPreview &&
    !yearPreview.isYearClosed &&
    earnedSalaryTotal != null
      ? earnedSalaryTotal -
        closureAdvancesTotal -
        closureSalaryPaidTotal -
        closureExpensesTotal
      : null;

  const salarySourceOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("personnel.accountClosure.salarySourcePick") },
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
    if (!salaryDaysOk)
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
      !yearPreview?.isYearClosed &&
      (step === 2 ||
        scope !== "year" ||
        closeNotes.trim() !== "" ||
        salaryBalanceSettled ||
        salaryPaymentSourceType.trim() !== "" ||
        salarySettlementNote.trim() !== ""),
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
      wideFullScreen
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
            // Step 2 (kapatma akışı): üst stepper'ı tümüyle gizle — geri butonu +
            // «Özet / Maaş» çubuğu yönlendirme için yeterli, üst alan sadeleşir.
            step === 2 && yearCloseTabs && "hidden",
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
                <section className="space-y-3">
                  {closeYearStory ? (
                    <CloseYearStoryCard story={closeYearStory} t={t} />
                  ) : null}
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 sm:text-sm">
                      {t("personnel.accountClosure.summaryTotalsTitle")}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-600 sm:text-xs">
                      {t("personnel.accountClosure.summaryTotalsHint")}
                    </p>
                  </div>
                  {heldRegisterCashLines.length > 0 ? (
                    <Card className="border-amber-300/90 bg-amber-50/60 shadow-none ring-1 ring-amber-900/15">
                      <p className="text-sm font-semibold text-amber-950">
                        {t("personnel.accountClosure.heldCashWarningTitle")}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
                        {t("personnel.accountClosure.heldCashWarningBody")}
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {heldRegisterCashLines.map((s) => (
                          <li
                            key={s.currencyCode}
                            className="text-sm font-semibold tabular-nums text-amber-950"
                          >
                            {formatLocaleAmount(
                              s.currentBalance,
                              locale,
                              s.currencyCode,
                            )}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ) : null}
                  <ClosureSimpleSummary
                    lines={lines}
                    workedDays={
                      scope === "year"
                        ? workedDays ?? workedDaysSeasonSuggestion
                        : null
                    }
                    lastWorkingDay={lastWorkingDay}
                    onLastWorkingDayChange={(iso) => {
                      setLastWorkingDay(iso);
                      const w = computeWorkedDaysForClosure(
                        selectedYear,
                        personnelSeasonArrivalDate,
                        iso,
                      );
                      if (w) setClosureWorkedDays(String(w.days));
                    }}
                    lastWorkingDayMin={
                      workedDaysSeasonSuggestion?.periodStart ??
                      `${selectedYear}-01-01`
                    }
                    lastWorkingDayMax={`${selectedYear}-12-31`}
                    canPickLastWorkingDay={
                      scope === "year" && Boolean(personnelSeasonArrivalDate)
                    }
                    t={t}
                    locale={locale}
                    dash={dash}
                  />
                  {yearCloseTabs ? (
                    <Card className="border-sky-200/80 bg-sky-50/25 shadow-none ring-1 ring-sky-900/10">
                      <p className="text-sm font-semibold text-zinc-900">
                        {t("personnel.accountClosure.simpleDetailPdfHint")}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                        {t("personnel.accountClosure.settlementPdfAutoSaveHint")
                          .replace("{name}", personnelDisplayName)
                          .replace("{year}", String(selectedYear))}
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
                    </Card>
                  ) : null}
                </section>

                {scope === "year" && yearPreview ? (
                  <>
                    {yearPreview.isYearClosed ? (
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
                    ) : null}

                    {scope === "year" &&
                    !yearPreview.isYearClosed &&
                    canCloseYear &&
                    selectedYear <= new Date().getFullYear() ? (
                      <>
                        <Card className="border-violet-200/90 bg-violet-50/25 shadow-none ring-1 ring-violet-900/10">
                          <p className="text-sm font-semibold text-zinc-900">
                            {t("personnel.accountClosure.salarySectionTitle")}
                          </p>
                          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                            {t("personnel.accountClosure.salarySectionHint")}
                          </p>
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            {personnelSeasonArrivalDate ? null : (
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
                            )}
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
                            <div className="min-w-0">
                              <Input
                                name="closureExpectedSalary"
                                inputMode="decimal"
                                label={t("personnel.accountClosure.monthlySalaryLabel")}
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
                              {suggestedMonthlySalary != null ? (
                                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="text-xs text-zinc-600">
                                    {t(
                                      "personnel.accountClosure.monthlySalaryFromCard",
                                    ).replace(
                                      "{amount}",
                                      formatLocaleAmount(
                                        suggestedMonthlySalary,
                                        locale,
                                        closureSalaryCurrency || "TRY",
                                      ),
                                    )}
                                  </p>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="min-h-[44px] min-w-[44px] w-full shrink-0 sm:w-auto"
                                    onClick={() =>
                                      setClosureExpectedSalary(
                                        formatLocaleAmountInput(
                                          suggestedMonthlySalary,
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
                          </div>
                          {earnedSalaryTotal != null && salaryDaysOk ? (
                            <div className="mt-4 overflow-hidden rounded-lg border border-violet-200/80 bg-white/80">
                              <ul className="divide-y divide-zinc-100 text-sm">
                                <li className="flex items-start justify-between gap-3 px-4 py-2.5">
                                  <span className="min-w-0 text-zinc-700">
                                    {t(
                                      "personnel.accountClosure.breakdownEarnedLabel",
                                    ).replace("{days}", String(parsedClosureDays))}
                                  </span>
                                  <span className="shrink-0 font-medium tabular-nums text-zinc-900">
                                    {formatLocaleAmount(
                                      earnedSalaryTotal,
                                      locale,
                                      closureSalaryCurrency || "TRY",
                                    )}
                                  </span>
                                </li>
                                <li className="flex items-start justify-between gap-3 px-4 py-2.5">
                                  <span className="min-w-0 text-zinc-600">
                                    − {t("personnel.accountClosure.rowAdvances")}
                                  </span>
                                  <span className="shrink-0 tabular-nums text-zinc-700">
                                    {formatLocaleAmount(
                                      closureAdvancesTotal,
                                      locale,
                                      closureSalaryCurrency || "TRY",
                                    )}
                                  </span>
                                </li>
                                <li className="flex items-start justify-between gap-3 px-4 py-2.5">
                                  <span className="min-w-0 text-zinc-600">
                                    − {t("personnel.accountClosure.rowExpenses")}
                                  </span>
                                  <span className="shrink-0 tabular-nums text-zinc-700">
                                    {formatLocaleAmount(
                                      closureExpensesTotal,
                                      locale,
                                      closureSalaryCurrency || "TRY",
                                    )}
                                  </span>
                                </li>
                                {closureSalaryPaidTotal > 0.005 ? (
                                  <li className="flex items-start justify-between gap-3 px-4 py-2.5">
                                    <span className="min-w-0 text-zinc-600">
                                      − {t("personnel.accountClosure.rowSalary")}
                                    </span>
                                    <span className="shrink-0 tabular-nums text-zinc-700">
                                      {formatLocaleAmount(
                                        closureSalaryPaidTotal,
                                        locale,
                                        closureSalaryCurrency || "TRY",
                                      )}
                                    </span>
                                  </li>
                                ) : null}
                              </ul>
                              <div className="flex items-center justify-between gap-3 border-t border-violet-200/70 bg-violet-50/40 px-4 py-3">
                                <span className="text-sm font-semibold text-zinc-900">
                                  {t(
                                    "personnel.accountClosure.breakdownRemainingLabel",
                                  )}
                                </span>
                                <span
                                  className={cn(
                                    "text-lg font-semibold tabular-nums",
                                    (netSalaryPreview ?? 0) >= 0
                                      ? "text-violet-950"
                                      : "text-red-700",
                                  )}
                                >
                                  {formatLocaleAmount(
                                    netSalaryPreview ?? 0,
                                    locale,
                                    closureSalaryCurrency || "TRY",
                                  )}
                                </span>
                              </div>
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
                        </Card>
                        <Card className="border-zinc-200/90 shadow-none ring-1 ring-zinc-950/[0.06]">
                          {showCloseNote || closeNotes ? (
                            <>
                              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                                {t("personnel.accountClosure.closeNotesLabel")}
                              </label>
                              <textarea
                                name="closeNotes"
                                rows={3}
                                maxLength={2000}
                                autoFocus={showCloseNote && !closeNotes}
                                value={closeNotes}
                                onChange={(e) => setCloseNotes(e.target.value)}
                                className="min-h-[5.5rem] w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 sm:text-sm"
                                placeholder={t(
                                  "personnel.accountClosure.closeNotesPlaceholder",
                                )}
                              />
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShowCloseNote(true)}
                              className="flex min-h-11 w-full items-center gap-2 text-left text-sm font-medium text-zinc-600 hover:text-zinc-900"
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-base leading-none text-zinc-500">
                                +
                              </span>
                              {t("personnel.accountClosure.addNoteButton")}
                            </button>
                          )}
                        </Card>
                        <div className="sticky bottom-0 z-[1] -mx-3 mt-2 border-t border-zinc-200 bg-white/95 px-3 py-3 shadow-[0_-6px_20px_-8px_rgba(0,0,0,0.12)] backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:static sm:z-0 sm:mx-0 sm:mt-3 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
                          {closeYearStory ? (
                            <p
                              id={closeHintId}
                              role="status"
                              className="mb-2 text-xs leading-relaxed text-zinc-600 sm:max-w-xl"
                            >
                              {isClosing || closeYear.isPending
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
                            busy={isClosing}
                            disabled={
                              isClosing ||
                              closeYear.isPending ||
                              !salaryDaysOk ||
                              !salaryExpectedOk ||
                              !salarySourceOk
                            }
                            onClick={async () => {
                              if (isClosing) return;
                              setIsClosing(true);
                              try {
                                const ccy =
                                  closureSalaryCurrency.trim().toUpperCase() ||
                                  "TRY";
                                await closeYear.mutateAsync({
                                  closureYear: selectedYear,
                                  notes: closeNotes.trim() || null,
                                  settlementPdfAcknowledged: true,
                                  closureWorkedDays: parsedClosureDays,
                                  closureExpectedSalaryAmount: earnedSalaryTotal ?? 0,
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
                                setCloseNotes("");
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
                                setShowCloseNote(false);
                                // Yıl kapandıktan sonra mutabakat PDF'i otomatik
                                // üretilip kişinin kapanış belgesine kaydedilir
                                // («{kişi adı}-kapanis-{yıl}»). Ayrı adım; patlarsa
                                // kapanış başarısını maskeleme, sadece PDF'in
                                // kaydedilemediğini bildir.
                                try {
                                  const pdfCcy =
                                    closureSalaryCurrency.trim().toUpperCase() ||
                                    "TRY";
                                  const paidAtClosure = salaryBalanceSettled
                                    ? computeClosureSalaryNetRemaining(
                                        yearPreview?.lines ?? [],
                                        earnedSalaryTotal ?? 0,
                                        pdfCcy,
                                      )
                                    : null;
                                  // Çalışma dönemi sonu = geliş + (çalışılan gün − 1).
                                  const arrivalIso = (
                                    personnelSeasonArrivalDate ?? ""
                                  ).slice(0, 10);
                                  let departureIso: string | null = null;
                                  if (
                                    /^\d{4}-\d{2}-\d{2}$/.test(arrivalIso) &&
                                    Number.isFinite(parsedClosureDays) &&
                                    parsedClosureDays > 0
                                  ) {
                                    const [yy, mm, dd] = arrivalIso
                                      .split("-")
                                      .map(Number);
                                    const dt = new Date(
                                      Date.UTC(yy, mm - 1, dd),
                                    );
                                    dt.setUTCDate(
                                      dt.getUTCDate() + parsedClosureDays - 1,
                                    );
                                    departureIso = dt.toISOString().slice(0, 10);
                                  }
                                  const { blob } =
                                    await generatePersonnelSettlementPdfBlob({
                                      target: {
                                        scope: "personnel",
                                        personnelId,
                                        title: personnelDisplayName,
                                        seasonArrivalDate:
                                          personnelSeasonArrivalDate ?? undefined,
                                        seasonYearFilter: selectedYear,
                                        isYearClosure: true,
                                        closureSummary: {
                                          arrivalDate: arrivalIso || null,
                                          departureDate:
                                            /^\d{4}-\d{2}-\d{2}$/.test(
                                              lastWorkingDay,
                                            )
                                              ? lastWorkingDay
                                              : departureIso,
                                          workedDays: Number.isFinite(
                                            parsedClosureDays,
                                          )
                                            ? parsedClosureDays
                                            : null,
                                          monthlySalaryAmount: salaryExpectedOk
                                            ? parsedMonthlySalary
                                            : null,
                                          expectedSalaryAmount: earnedSalaryTotal,
                                          expectedSalaryCurrency: pdfCcy,
                                          advancesTotal: closureAdvancesTotal,
                                          expensesTotal: closureExpensesTotal,
                                          salaryPaidTotal: closureSalaryPaidTotal,
                                          netRemaining: netSalaryPreview,
                                          paidAtClosureAmount: paidAtClosure,
                                          salaryBalanceSettled,
                                          salaryPaymentSource: salaryBalanceSettled
                                            ? salaryPaymentSourceType
                                                .trim()
                                                .toUpperCase()
                                            : null,
                                        },
                                      },
                                      locale,
                                      branchNameById,
                                      t,
                                    });
                                  const file = new File(
                                    [blob],
                                    `${personnelDisplayName}-kapanis-${selectedYear}.pdf`,
                                    { type: "application/pdf" },
                                  );
                                  await uploadClosurePdf.mutateAsync({
                                    year: selectedYear,
                                    file,
                                  });
                                  notify.success(
                                    t("personnel.accountClosure.closeAndPdfSuccess"),
                                  );
                                } catch {
                                  notify.error(
                                    t(
                                      "personnel.accountClosure.closeSuccessPdfFailed",
                                    ),
                                  );
                                }
                                // Yıl kapandı: sheet'i kapat → dialogtaki
                                // «Kesilen hesaplar» sekmesine dön (onay sorma).
                                onClose();
                              } catch (e) {
                                notify.error(toErrorMessage(e));
                              } finally {
                                setIsClosing(false);
                              }
                            }}
                          >
                            {isClosing
                              ? t("personnel.accountClosure.closingInProgress")
                              : t("personnel.accountClosure.closeYearButton")}
                          </Button>
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
        </div>
      </div>
    </Modal>
  );
}
