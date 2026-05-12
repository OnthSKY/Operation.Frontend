"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { useAuth } from "@/lib/auth/AuthContext";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  DAILY_REGISTER_RANGE_MAX_DAYS,
  useDailyRangeBranchesSummary,
} from "@/modules/dashboard/hooks/useDailyRangeBranchesSummary";
import type { BranchTodayRow } from "@/modules/dashboard/hooks/useTodayBranchesSummary";
import { useTodayBranchesSummary } from "@/modules/dashboard/hooks/useTodayBranchesSummary";
import type { DashboardBulkCashParams } from "@/modules/dashboard/types/dashboard-cash-filter";
import {
  REPORT_YEAR_QUICK_PLACEHOLDER,
  reportYearQuickSelectTopYear,
} from "@/modules/reports/lib/report-period-helpers";
import {
  FinancialExpensePaySourceSubline,
  expenseBucketsFromDailyRegisterRow,
  shouldShowExpensePaySourceBreakdown,
  type ExpensePayFiveBucket,
} from "@/modules/reports/lib/financial-expense-pay-source-inline";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import {
  addDaysToLocalIsoDate,
  localIsoDate,
} from "@/shared/lib/local-iso-date";
import {
  MobileFilterFunnelButton,
  MobilePageToolRow,
} from "@/shared/components/MobilePageToolRow";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Tooltip } from "@/shared/ui/Tooltip";
import { EyeIcon } from "@/shared/ui/EyeIcon";
import { buildBranchDetailHref } from "@/shared/branch-detail/branch-detail-deep-link";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RegisterScopeMode = "day" | "season_single" | "season_range" | "date_range";

const BRANCH_FILTER_ALL = "__all__";

function emptyExpenseBuckets(): ExpensePayFiveBucket {
  return { register: 0, patron: 0, personnelPocket: 0, heldRegister: 0, unset: 0 };
}

function addExpenseBuckets(a: ExpensePayFiveBucket, b: ExpensePayFiveBucket): ExpensePayFiveBucket {
  return {
    register: a.register + b.register,
    patron: a.patron + b.patron,
    personnelPocket: a.personnelPocket + b.personnelPocket,
    heldRegister: a.heldRegister + b.heldRegister,
    unset: a.unset + b.unset,
  };
}

function sumBranchRegisterRows(rows: BranchTodayRow[]): {
  income: number;
  cash: number;
  card: number;
  expenseOut: number;
  expenseFromRegister: number;
  net: number;
  expensePayBuckets: ExpensePayFiveBucket;
} | null {
  let income = 0;
  let card = 0;
  let expenseFromRegister = 0;
  let expensePayBuckets = emptyExpenseBuckets();
  let has = false;

  for (const r of rows) {
    if (r.financialHidden) continue;
    has = true;
    
    // totalIncome: Cash + POS
    income += r.income;
    
    // card: POS portion (the "Kazanılan Kart / POS" subline in cards)
    card += r.expenseOperationalUnset;
    
    // expenseFromRegister: Outgoing from the till
    expenseFromRegister += r.expenseFromRegister;

    // Accumulate buckets for potential breakdown view
    const buckets = expenseBucketsFromDailyRegisterRow(r);
    expensePayBuckets = addExpenseBuckets(expensePayBuckets, buckets);
  }

  if (!has) return null;

  // Manual derivation to match card logic:
  // Nakit Tahsilat = income - card
  // Elde Kalan Nakit = Nakit Tahsilat - expenseFromRegister
  const cashIntake = income - card;
  const netCash = cashIntake - expenseFromRegister;

  return {
    income,
    card,
    cash: cashIntake,
    expenseFromRegister,
    net: netCash,
    expenseOut: expenseFromRegister, // Legacy/alias field
    expensePayBuckets,
  };
}

function branchExpenseDetailItems(row: BranchTodayRow) {
  const EXP_EPS = 0.005;
  return [
    { v: row.registerOwesPatronToday, labelKey: "dashboard.dailyRegisterDetailOwesPatron" as const },
    { v: row.registerOwesPersonnelToday, labelKey: "dashboard.dailyRegisterDetailOwesPersonnel" as const },
    {
      v: row.personnelPocketRepaidFromPatronToday,
      labelKey: "dashboard.dailyRegisterDetailPocketRepaidPatron" as const,
    },
    {
      v: row.personnelPocketRepaidFromRegisterToday,
      labelKey: "dashboard.dailyRegisterDetailPocketRepaidRegister" as const,
    },
    {
      v: row.patronDebtRepaidFromRegisterToday,
      labelKey: "dashboard.dailyRegisterDetailPatronDebtRepaidRegister" as const,
    },
  ].filter((x) => x.v > EXP_EPS);
}

export function DailyBranchRegisterScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const y0 = new Date().getFullYear();

  const [mode, setMode] = useState<RegisterScopeMode>("day");
  const [date, setDate] = useState(() => localIsoDate());
  const [seasonYear, setSeasonYear] = useState(y0);
  const [seasonYearFrom, setSeasonYearFrom] = useState(y0);
  const [seasonYearTo, setSeasonYearTo] = useState(y0);
  const [rangeFrom, setRangeFrom] = useState(() => addDaysToLocalIsoDate(localIsoDate(), -6));
  const [rangeTo, setRangeTo] = useState(() => localIsoDate());
  const [branchFilterBranchId, setBranchFilterBranchId] = useState(BRANCH_FILTER_ALL);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: branchList = [], isPending: branchesListPending } = useBranchesList();

  const nonRangeParams: DashboardBulkCashParams = useMemo(() => {
    if (mode === "date_range") return { kind: "day", date: localIsoDate() };
    if (mode === "day") return { kind: "day", date };
    if (mode === "season_single") return { kind: "season_single", seasonYear };
    return { kind: "season_range", fromYear: seasonYearFrom, toYear: seasonYearTo };
  }, [mode, date, seasonYear, seasonYearFrom, seasonYearTo]);

  const single = useTodayBranchesSummary(nonRangeParams, mode !== "date_range");
  const range = useDailyRangeBranchesSummary(rangeFrom, rangeTo, mode === "date_range");

  const state = mode === "date_range" ? range.state : single.state;
  const refetch = () => {
    single.refetch();
    range.refetch();
  };

  useEffect(() => {
    if (branchFilterBranchId === BRANCH_FILTER_ALL) return;
    if (branchList.length === 0) return;
    const ok = branchList.some((b) => String(b.id) === branchFilterBranchId);
    if (!ok) setBranchFilterBranchId(BRANCH_FILTER_ALL);
  }, [branchList, branchFilterBranchId]);

  const branchFilterOptions = useMemo((): SelectOption[] => {
    const all: SelectOption = {
      value: BRANCH_FILTER_ALL,
      label: t("dashboard.dailyRegisterBranchFilterAll"),
    };
    const rest = [...branchList]
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      )
      .map((b) => ({ value: String(b.id), label: b.name }));
    return [all, ...rest];
  }, [branchList, t]);

  const seasonYearOptions = useMemo((): SelectOption[] => {
    const start = Math.max(1990, reportYearQuickSelectTopYear());
    const opts: SelectOption[] = [
      {
        value: REPORT_YEAR_QUICK_PLACEHOLDER,
        label: t("dashboard.seasonYearPlaceholder"),
      },
    ];
    for (let y = start; y >= 1990; y--) {
      opts.push({ value: String(y), label: String(y) });
    }
    return opts;
  }, [t]);

  const scopeDescription = useMemo(() => {
    if (mode === "day") return formatLocaleDate(date, locale);
    if (mode === "season_single")
      return t("dashboard.dailyRegisterScopeSeasonSingle").replace("{year}", String(seasonYear));
    if (mode === "season_range")
      return t("dashboard.dailyRegisterScopeSeasonRange")
        .replace("{from}", String(seasonYearFrom))
        .replace("{to}", String(seasonYearTo));
    const a = formatLocaleDate(rangeFrom, locale);
    const b = formatLocaleDate(rangeTo, locale);
    return t("dashboard.dailyRegisterScopeDateRange")
      .replace("{from}", a)
      .replace("{to}", b)
      .replace("{n}", String(range.dayCount));
  }, [
    mode,
    date,
    locale,
    seasonYear,
    seasonYearFrom,
    seasonYearTo,
    rangeFrom,
    rangeTo,
    range.dayCount,
    t,
  ]);

  const visibleRows = useMemo(() => {
    if (state.kind !== "ok") return [];
    const rows = state.branchTodayRows;
    if (branchFilterBranchId === BRANCH_FILTER_ALL) return rows;
    const id = Number.parseInt(branchFilterBranchId, 10);
    if (!Number.isFinite(id) || id <= 0) return rows;
    return rows.filter((r) => r.branchId === id);
  }, [state, branchFilterBranchId]);

  const totalsStrip = useMemo(() => {
    if (state.kind !== "ok") return null;
    return sumBranchRegisterRows(visibleRows);
  }, [state, visibleRows]);

  const selectedBranchLabel = useMemo(() => {
    if (branchFilterBranchId === BRANCH_FILTER_ALL) return null;
    const id = Number.parseInt(branchFilterBranchId, 10);
    const b = branchList.find((x) => x.id === id);
    return b
      ? `${t("dashboard.dailyRegisterBranchFilterLabel")}: ${b.name}`
      : t("dashboard.dailyRegisterBranchFilterLabel");
  }, [branchFilterBranchId, branchList, t]);

  const filtersActive = useMemo(
    () =>
      branchFilterBranchId !== BRANCH_FILTER_ALL ||
      mode !== "day" ||
      (mode === "day" && date !== localIsoDate()),
    [branchFilterBranchId, mode, date]
  );

  const modeBtn = (active: boolean) =>
    cn(
      "min-h-10 w-full min-w-0 touch-manipulation rounded-lg px-2 py-2 text-center text-xs font-semibold transition sm:text-sm",
      active
        ? "bg-white text-zinc-900 shadow-sm"
        : "text-zinc-600 active:bg-zinc-200/80 hover:text-zinc-900"
    );

  if (personnelPortal) {
    return (
      <PageScreenScaffold
        className="w-full p-4 pb-6 sm:p-5 sm:pb-8"
        intro={
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-xl">
              {t("dashboard.dailyRegisterTitle")}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">{t("dashboard.dailyRegisterPersonnelBlocked")}</p>
          </div>
        }
        main={null}
      />
    );
  }

  return (
    <PageScreenScaffold
      className="w-full p-4 pb-6 sm:p-5 sm:pb-8"
      intro={
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-xl">
            {t("dashboard.dailyRegisterTitle")}
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-600">
            {t("dashboard.dailyRegisterIntroHint")}
          </p>
        </div>
      }
      mobileToolbar={
        <MobilePageToolRow
          preview={
            <>
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
                {t("dashboard.dailyRegisterToolbarPreviewLabel")}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900">{scopeDescription}</p>
              {selectedBranchLabel ? (
                <p className="mt-0.5 truncate text-xs text-zinc-600">{selectedBranchLabel}</p>
              ) : null}
            </>
          }
          actions={
            <>
              <Tooltip content={t("common.filters")} delayMs={200}>
                <span className="inline-flex">
                  <MobileFilterFunnelButton
                    active={filtersActive}
                    expanded={filtersOpen}
                    onClick={() => setFiltersOpen(true)}
                    ariaLabel={t("common.filters")}
                  />
                </span>
              </Tooltip>
              <Tooltip content={t("dashboard.dailyRegisterRefresh")} delayMs={200}>
                <Button
                  type="button"
                  variant="secondary"
                  className="mobile-hit-44 h-11 w-11 shrink-0 px-0"
                  onClick={() => refetch()}
                  aria-label={t("dashboard.dailyRegisterRefresh")}
                >
                  <svg
                    className="mx-auto h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                </Button>
              </Tooltip>
            </>
          }
        />
      }
      main={
        <div className="flex flex-col gap-5">
          <RightDrawer
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            title={t("dashboard.dailyRegisterFilterDrawerTitle")}
            closeLabel={t("common.close")}
            backdropCloseRequiresConfirm={false}
            className="max-w-lg"
          >
            <div className="space-y-5">
              <div className="rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/40 p-4 shadow-sm ring-1 ring-violet-100/50">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700/90">
                  {t("dashboard.dailyRegisterStoryBadge")}
                </p>
                <ol className="mt-3 space-y-2 text-sm leading-relaxed text-violet-950/90">
                  <li className="flex gap-2">
                    <span className="font-bold text-violet-700">1.</span>
                    <span>{t("dashboard.dailyRegisterStoryStep1")}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-violet-700">2.</span>
                    <span>{t("dashboard.dailyRegisterStoryStep2")}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-violet-700">3.</span>
                    <span>{t("dashboard.dailyRegisterStoryStep3")}</span>
                  </li>
                </ol>
              </div>

              <div>
                <Select
                  name="dailyRegisterBranchFilter"
                  label={t("dashboard.dailyRegisterBranchFilterLabel")}
                  options={branchFilterOptions}
                  value={branchFilterBranchId}
                  disabled={branchesListPending}
                  menuZIndex={260}
                  onChange={(e) => setBranchFilterBranchId(e.target.value)}
                  onBlur={() => { }}
                  className="min-h-11 sm:min-h-10 sm:text-sm"
                />
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                  {t("dashboard.dailyRegisterBranchFilterHint")}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-4 ring-1 ring-zinc-950/[0.03]">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("dashboard.dailyRegisterFilterTitle")}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                  {t("dashboard.dailyRegisterFilterHint").replace(
                    "{max}",
                    String(DAILY_REGISTER_RANGE_MAX_DAYS)
                  )}
                </p>
                <div
                  className="mt-3 grid w-full min-w-0 grid-cols-2 gap-1 rounded-xl border border-zinc-200/90 bg-zinc-100/85 p-1 sm:grid-cols-4"
                  role="group"
                  aria-label={t("dashboard.dailyRegisterFilterAria")}
                >
                  <button type="button" className={modeBtn(mode === "day")} onClick={() => setMode("day")}>
                    {t("dashboard.dailyRegisterFilterDay")}
                  </button>
                  <button
                    type="button"
                    className={modeBtn(mode === "season_single")}
                    onClick={() => setMode("season_single")}
                  >
                    {t("dashboard.dailyRegisterFilterSeasonSingle")}
                  </button>
                  <button
                    type="button"
                    className={modeBtn(mode === "season_range")}
                    onClick={() => setMode("season_range")}
                  >
                    {t("dashboard.dailyRegisterFilterSeasonRange")}
                  </button>
                  <button
                    type="button"
                    className={modeBtn(mode === "date_range")}
                    onClick={() => setMode("date_range")}
                  >
                    {t("dashboard.dailyRegisterFilterDateRange")}
                  </button>
                </div>

                {mode === "day" ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div className="min-w-0">
                      <DateField
                        label={t("dashboard.dailyRegisterDateLabel")}
                        value={date}
                        onChange={(e) => setDate(e.target.value.slice(0, 10))}
                        mode="date"
                      />
                      <p className="mt-1.5 text-xs text-zinc-500">{t("dashboard.dailyRegisterDateHint")}</p>
                    </div>
                    <div className="flex min-h-11 items-end sm:justify-end">
                      {date !== localIsoDate() ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-11 w-full touch-manipulation sm:min-h-10 sm:w-auto"
                          onClick={() => setDate(localIsoDate())}
                        >
                          {t("dashboard.registerSnapshotResetToday")}
                        </Button>
                      ) : (
                        <div className="hidden min-w-[6rem] sm:block" aria-hidden />
                      )}
                    </div>
                  </div>
                ) : null}

                {mode === "season_single" ? (
                  <div className="mt-4 min-w-0">
                    <Select
                      name="dailyRegisterSeasonYear"
                      label={t("dashboard.seasonYearFieldLabel")}
                      options={seasonYearOptions}
                      value={String(seasonYear)}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        if (!v || v === REPORT_YEAR_QUICK_PLACEHOLDER) return;
                        const y = Number.parseInt(v, 10);
                        if (Number.isFinite(y)) setSeasonYear(y);
                      }}
                      onBlur={() => { }}
                      className="min-h-11 sm:min-h-10 sm:text-sm"
                    />
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                      {t("dashboard.seasonSingleModeHint")}
                    </p>
                  </div>
                ) : null}

                {mode === "season_range" ? (
                  <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                    <Select
                      name="dailyRegisterSeasonFrom"
                      label={t("dashboard.seasonYearFromFieldLabel")}
                      options={seasonYearOptions}
                      value={String(seasonYearFrom)}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        if (!v || v === REPORT_YEAR_QUICK_PLACEHOLDER) return;
                        const y = Number.parseInt(v, 10);
                        if (Number.isFinite(y)) setSeasonYearFrom(y);
                      }}
                      onBlur={() => { }}
                      className="min-h-11 sm:min-h-10 sm:text-sm"
                    />
                    <Select
                      name="dailyRegisterSeasonTo"
                      label={t("dashboard.seasonYearToFieldLabel")}
                      options={seasonYearOptions}
                      value={String(seasonYearTo)}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        if (!v || v === REPORT_YEAR_QUICK_PLACEHOLDER) return;
                        const y = Number.parseInt(v, 10);
                        if (Number.isFinite(y)) setSeasonYearTo(y);
                      }}
                      onBlur={() => { }}
                      className="min-h-11 sm:min-h-10 sm:text-sm"
                    />
                    <p className="col-span-full text-xs leading-relaxed text-zinc-500 sm:-mt-2">
                      {t("dashboard.seasonRangeModeHint")}
                    </p>
                  </div>
                ) : null}

                {mode === "date_range" ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <DateField
                        label={t("dashboard.dailyRegisterRangeFromLabel")}
                        value={rangeFrom}
                        onChange={(e) => setRangeFrom(String(e.target.value).trim().slice(0, 10))}
                        mode="date"
                      />
                      <DateField
                        label={t("dashboard.dailyRegisterRangeToLabel")}
                        value={rangeTo}
                        onChange={(e) => setRangeTo(String(e.target.value).trim().slice(0, 10))}
                        mode="date"
                      />
                    </div>
                    <p className="text-xs leading-relaxed text-zinc-500">{t("dashboard.dailyRegisterRangeHint")}</p>
                    {range.truncated ? (
                      <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
                        {t("dashboard.dailyRegisterRangeTruncated").replace(
                          "{max}",
                          String(DAILY_REGISTER_RANGE_MAX_DAYS)
                        )}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <p className="mt-4 text-sm font-medium text-zinc-800">
                  <span className="text-zinc-500">{t("dashboard.dailyRegisterScopeLabel")}</span>{" "}
                  {scopeDescription}
                </p>

                <Button type="button" className="mt-4 w-full min-h-11" onClick={() => refetch()}>
                  {t("dashboard.dailyRegisterRefresh")}
                </Button>
              </div>
            </div>
          </RightDrawer>

          {state.kind === "loading" ? (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          ) : null}
          {state.kind === "error" ? (
            <div className="rounded-xl border border-red-200/80 bg-red-50/60 p-4 text-sm text-red-900">
              <p>{toErrorMessage(state.message)}</p>
              <Button type="button" className="mt-3" onClick={() => refetch()}>
                {t("dashboard.dailyRegisterRetry")}
              </Button>
            </div>
          ) : null}
          {state.kind === "empty" ? (
            <p className="text-sm text-zinc-600">{t("dashboard.dailyRegisterEmpty")}</p>
          ) : null}

          {state.kind === "ok" && visibleRows.length === 0 ? (
            <p className="text-sm text-zinc-600">
              {branchFilterBranchId !== BRANCH_FILTER_ALL && state.branchTodayRows.length > 0
                ? t("dashboard.dailyRegisterBranchFilterNoRows")
                : t("dashboard.dailyRegisterEmpty")}
            </p>
          ) : null}

          {totalsStrip ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {/* TOTAL INCOME */}
              <div className="relative overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-500/5 to-transparent" />
                <p className="relative text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
                  {t("dashboard.dailyRegisterCardTotalIncome")}
                </p>
                <p className="relative mt-1.5 text-lg font-black tabular-nums text-zinc-950">
                  {formatLocaleAmount(totalsStrip.income, locale)}
                </p>
              </div>

              {/* CASH INCOME */}
              <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
                <p className="relative text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                  {t("dashboard.dailyRegisterCardCashIncome")}
                </p>
                <p className="relative mt-1.5 text-lg font-black tabular-nums text-zinc-950">
                  {formatLocaleAmount(totalsStrip.cash, locale)}
                </p>
              </div>

              {/* POS INCOME */}
              <div className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
                <p className="relative text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">
                  {t("dashboard.dailyRegisterCardPosIncome")}
                </p>
                <p className="relative mt-1.5 text-lg font-black tabular-nums text-zinc-950">
                  {formatLocaleAmount(totalsStrip.card, locale)}
                </p>
              </div>

              {/* CASH SPENT (EXPENSE) */}
              <div className="relative overflow-hidden rounded-[1.75rem] border border-orange-100 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent" />
                <p className="relative text-[10px] font-black uppercase tracking-[0.12em] text-orange-700">
                  {t("dashboard.dailyRegisterCardCashSpentToday")}
                </p>
                <p className="relative mt-1.5 text-lg font-black tabular-nums text-orange-950">
                  {formatLocaleAmount(totalsStrip.expenseFromRegister, locale)}
                </p>
              </div>

              {/* NET RESULT */}
              {(() => {
                const netVal = totalsStrip.income - totalsStrip.expenseFromRegister;
                const isGood = netVal >= -0.005;
                return (
                  <div className={cn(
                    "relative overflow-hidden rounded-[1.75rem] border p-4 shadow-sm transition-all hover:shadow-md hidden lg:block",
                    isGood ? "border-emerald-200 bg-emerald-50/30" : "border-rose-200 bg-rose-50/30"
                  )}>
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br to-transparent",
                      isGood ? "from-emerald-500/10" : "from-rose-500/10"
                    )} />
                    <p className={cn(
                      "relative text-[10px] font-black uppercase tracking-[0.12em]",
                      isGood ? "text-emerald-700" : "text-rose-700"
                    )}>
                      {t("dashboard.dailyRegisterCardNetEarnings")}
                    </p>
                    <p className={cn(
                      "relative mt-1.5 text-lg font-black tabular-nums",
                      isGood ? "text-emerald-900" : "text-rose-900"
                    )}>
                      {formatLocaleAmount(netVal, locale)}
                    </p>
                  </div>
                );
              })()}
            </div>
          ) : null}

          {state.kind === "ok" && visibleRows.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleRows.map((row) => {
                const expensePayBuckets = expenseBucketsFromDailyRegisterRow(row);
                const expenseDetails = branchExpenseDetailItems(row);
                return (
                  <article
                    key={row.branchId}
                    className="group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-zinc-300"
                  >
                    {/* Status Gradient Background */}
                    {(() => {
                      const netVal = row.income - row.expenseFromRegister;
                      return (
                        <div
                          className={cn(
                            "absolute inset-0 h-32 opacity-[0.03] transition-opacity group-hover:opacity-[0.05]",
                            netVal >= -0.005 ? "bg-emerald-500" : "bg-rose-500"
                          )}
                        />
                      );
                    })()}

                    <div className="relative flex items-center justify-between border-b border-zinc-100/80 bg-zinc-50/40 px-6 py-5">
                      <div className="flex flex-col">
                        <h2 className="text-lg font-black text-zinc-900 tracking-tight group-hover:text-zinc-950 transition-colors">
                          {row.branchName}
                        </h2>
                      </div>
                      
                      {/* Profit/Loss Badge */}
                      {(() => {
                        const netVal = row.income - row.expenseFromRegister;
                        const isGood = netVal >= -0.005;
                        return (
                          <div className={cn(
                            "flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm border",
                            isGood 
                              ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                              : "bg-rose-50 border-rose-100 text-rose-700"
                          )}>
                            <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", isGood ? "bg-emerald-500" : "bg-rose-500")} />
                            {isGood ? "Pozitif" : "Negatif"}
                          </div>
                        );
                      })()}
                    </div>

                    {row.financialHidden ? (
                      <div className="px-6 py-12 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                          <EyeIcon className="h-6 w-6 text-zinc-400 opacity-50" />
                        </div>
                        <p className="text-sm text-zinc-500 font-medium italic">{t("dashboard.branchTodayHiddenRow")}</p>
                      </div>
                    ) : (
                      <div className="relative mt-5 px-5 pb-6">
                        <div className="space-y-5">
                          {/* TAHSİLAT (IN) */}
                          <div className="relative overflow-hidden rounded-2xl border border-emerald-100/80 bg-emerald-50/10 p-4 transition-colors hover:bg-emerald-50/20">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-800/60">
                                {t("dashboard.dailyRegisterIncomeGroupTitle")}
                              </span>
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100/50">
                                <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between border-b border-emerald-100/50 pb-2 mb-2">
                                <span className="text-[11px] font-bold text-emerald-900">{t("dashboard.dailyRegisterCardTotalIncome")}</span>
                                <span className="text-sm font-black text-emerald-950 tabular-nums">
                                  {formatLocaleAmount(row.income, locale)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[13px]">
                                <span className="text-zinc-500 font-medium">{t("dashboard.dailyRegisterCardCashIncome")}</span>
                                <span className="font-bold text-zinc-900 tabular-nums">
                                  {formatLocaleAmount(row.income - row.expenseOperationalUnset, locale)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[13px]">
                                <span className="text-zinc-500 font-medium">{t("dashboard.dailyRegisterCardPosIncome")}</span>
                                <span className="font-bold text-zinc-900 tabular-nums">
                                  {formatLocaleAmount(row.expenseOperationalUnset, locale)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* GİDER (OUT) */}
                          <div className="relative overflow-hidden rounded-2xl border border-orange-100/80 bg-orange-50/10 p-4 transition-colors hover:bg-orange-50/20">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-orange-800/60">
                                {t("dashboard.dailyRegisterExpenseGroupTitle")}
                              </span>
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100/50">
                                <svg className="h-3.5 w-3.5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-[13px]">
                                <span className="text-zinc-500 font-medium">{t("dashboard.dailyRegisterSpentFromRegister")}</span>
                                <span className="font-bold text-orange-950 tabular-nums">
                                  {formatLocaleAmount(row.expenseFromRegister, locale)}
                                </span>
                              </div>
                              {row.expenseOperationalPatron > 0.005 && (
                                <div className="flex items-center justify-between text-[13px]">
                                  <span className="text-zinc-500 font-medium">{t("dashboard.dailyRegisterPatronExpenseOutside")}</span>
                                  <span className="font-bold text-orange-950 tabular-nums text-opacity-80">
                                    {formatLocaleAmount(row.expenseOperationalPatron, locale)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* NET SONUÇ */}
                          <div className="relative pt-1">
                            {(() => {
                              const netVal = row.income - row.expenseFromRegister;
                              const isGood = netVal >= -0.005;
                              return (
                                <div
                                  className={cn(
                                    "flex items-center justify-between rounded-2xl px-5 py-4 border-2 shadow-sm transition-all duration-300",
                                    isGood
                                      ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-200/50"
                                      : "bg-rose-600 border-rose-500 text-white shadow-rose-200/50"
                                  )}
                                >
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                                      {t("dashboard.dailyRegisterCardNetEarnings")}
                                    </span>
                                    <span className="text-[12px] font-medium text-white/90">
                                      {isGood ? "Net Kazanç" : "Net Zarar"}
                                    </span>
                                  </div>
                                  <span className="text-xl font-black tabular-nums">
                                    {formatLocaleAmount(netVal, locale)}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>

                          <Link
                            href={buildBranchDetailHref(row.branchId, { tab: "income", registerDay: date })}
                            className="flex h-12 w-full items-center justify-center rounded-2xl bg-zinc-900 text-[13px] font-bold text-white transition-all hover:bg-zinc-800 active:scale-[0.98] shadow-md shadow-zinc-200"
                          >
                            <EyeIcon className="mr-2 h-4 w-4" />
                            {t("dashboard.dailyRegisterCardOpenBranchDetail")}
                          </Link>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      }
    />
  );
}
