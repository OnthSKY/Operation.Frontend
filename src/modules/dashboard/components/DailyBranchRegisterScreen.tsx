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
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type RegisterScopeMode = "day" | "season_single" | "season_range" | "date_range";

const BRANCH_FILTER_ALL = "__all__";

function sumBranchRegisterRows(rows: BranchTodayRow[]): {
  income: number;
  cash: number;
  card: number;
  expenseOut: number;
  expenseFromRegister: number;
  net: number;
} | null {
  let income = 0;
  let cash = 0;
  let card = 0;
  let expenseOut = 0;
  let expenseFromRegister = 0;
  let net = 0;
  let has = false;
  for (const r of rows) {
    if (r.financialHidden) continue;
    has = true;
    income += r.income;
    cash += r.incomeCash;
    card += r.incomeCard;
    expenseOut += r.totalExpenseOut;
    expenseFromRegister += r.expenseFromRegister;
    net += r.netCash;
  }
  if (!has) return null;
  if (income > 0.005 && cash + card < 0.005) {
    cash = income;
    card = 0;
  }
  return { income, cash, card, expenseOut, expenseFromRegister, net };
}

function splitIncomeDisplay(row: BranchTodayRow): { cash: number; card: number } {
  if (row.financialHidden) return { cash: 0, card: 0 };
  const c = row.incomeCash;
  const cd = row.incomeCard;
  if (c + cd > 0.005) return { cash: c, card: cd };
  if (row.income > 0.005) return { cash: row.income, card: 0 };
  return { cash: 0, card: 0 };
}

const EXP_EPS = 0.005;

function expenseRegisterSplit(totalOut: number, fromRegister: number) {
  const total = Math.max(0, totalOut);
  const fromReg = Math.max(0, fromRegister);
  const fromRegCapped = total > EXP_EPS ? Math.min(fromReg, total) : fromReg;
  const outside = Math.max(0, total - fromRegCapped);
  const denom = total > EXP_EPS ? total : null;
  const ratioRegister = denom != null ? fromRegCapped / denom : 0;
  const ratioOutside = denom != null ? outside / denom : 0;
  return { total, fromRegCapped, outside, ratioRegister, ratioOutside };
}

function formatPercentRatio(ratio: number, locale: Locale) {
  const loc = locale === "tr" ? "tr-TR" : "en-US";
  return new Intl.NumberFormat(loc, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(ratio);
}

function branchExpenseDetailItems(row: BranchTodayRow) {
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

function DailyRegisterExpenseSplit({
  totalOut,
  fromRegister,
  locale,
  labelRegister,
  labelOutside,
  labelNoOutHint,
  className,
}: {
  totalOut: number;
  fromRegister: number;
  locale: Locale;
  labelRegister: string;
  labelOutside: string;
  labelNoOutHint: string;
  className?: string;
}) {
  const s = expenseRegisterSplit(totalOut, fromRegister);
  if (s.total <= EXP_EPS && s.fromRegCapped <= EXP_EPS && s.outside <= EXP_EPS) return null;
  if (s.total <= EXP_EPS) {
    return (
      <div className={cn("text-[0.65rem] leading-snug text-zinc-500", className)}>
        {labelNoOutHint}
      </div>
    );
  }
  return (
    <div className={cn("space-y-0.5 text-[0.65rem] leading-snug text-zinc-600", className)}>
      <p>
        <span className="text-zinc-500">{labelRegister}</span>{" "}
        <span className="font-medium text-zinc-800">
          {formatPercentRatio(s.ratioRegister, locale)} · {formatLocaleAmount(s.fromRegCapped, locale)}
        </span>
      </p>
      <p>
        <span className="text-zinc-500">{labelOutside}</span>{" "}
        <span className="font-medium text-zinc-800">
          {formatPercentRatio(s.ratioOutside, locale)} · {formatLocaleAmount(s.outside, locale)}
        </span>
      </p>
    </div>
  );
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
                  onBlur={() => {}}
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
                      onBlur={() => {}}
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
                      onBlur={() => {}}
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
                      onBlur={() => {}}
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {(
                [
                  ["income", totalsStrip.income, "text-zinc-900"],
                  ["cash", totalsStrip.cash, "text-emerald-900"],
                  ["pos", totalsStrip.card, "text-sky-900"],
                ] as const
              ).map(([key, val, color]) => (
                <div
                  key={key}
                  className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 shadow-sm"
                >
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
                    {t(`dashboard.dailyRegisterTotal_${key}`)}
                  </p>
                  <p className={`mt-1 text-sm font-semibold tabular-nums ${color}`}>
                    {formatLocaleAmount(val, locale)}
                  </p>
                </div>
              ))}
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 shadow-sm">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
                  {t("dashboard.dailyRegisterTotal_expense_primary")}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-orange-950">
                  {formatLocaleAmount(totalsStrip.expenseOut, locale)}
                </p>
                <DailyRegisterExpenseSplit
                  totalOut={totalsStrip.expenseOut}
                  fromRegister={totalsStrip.expenseFromRegister}
                  locale={locale}
                  labelRegister={t("dashboard.dailyRegisterExpenseShareRegister")}
                  labelOutside={t("dashboard.dailyRegisterExpenseShareOutside")}
                  labelNoOutHint={t("dashboard.dailyRegisterExpenseNoOutHint")}
                  className="mt-1.5"
                />
              </div>
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 shadow-sm">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
                  {t("dashboard.dailyRegisterTotal_net")}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-violet-950">
                  {formatLocaleAmount(totalsStrip.net, locale)}
                </p>
              </div>
            </div>
          ) : null}

          {state.kind === "ok" && visibleRows.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleRows.map((row) => {
                const { cash, card } = splitIncomeDisplay(row);
                const expenseDetails = branchExpenseDetailItems(row);
                return (
                  <article
                    key={row.branchId}
                    className="flex min-w-0 flex-col rounded-xl border border-zinc-200/85 bg-white p-4 shadow-sm ring-1 ring-zinc-950/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="min-w-0 text-base font-semibold leading-snug text-zinc-900">
                        {row.branchName}
                      </h2>
                    </div>
                    {row.financialHidden ? (
                      <p className="mt-2 text-xs text-zinc-500">{t("dashboard.branchTodayHiddenRow")}</p>
                    ) : (
                      <>
                        <dl className="mt-3 space-y-2 text-sm">
                          <div className="flex items-baseline justify-between gap-2">
                            <dt className="text-zinc-500">{t("dashboard.dailyRegisterCardCash")}</dt>
                            <dd className="tabular-nums font-medium text-emerald-900">
                              {formatLocaleAmount(cash, locale)}
                            </dd>
                          </div>
                          <div className="flex items-baseline justify-between gap-2">
                            <dt className="text-zinc-500">{t("dashboard.dailyRegisterCardPos")}</dt>
                            <dd className="tabular-nums font-medium text-sky-900">
                              {formatLocaleAmount(card, locale)}
                            </dd>
                          </div>
                          <div className="flex items-baseline justify-between gap-2 border-t border-zinc-100 pt-2">
                            <dt className="text-zinc-600">{t("dashboard.dailyRegisterCardIncomeTotal")}</dt>
                            <dd className="tabular-nums font-semibold text-zinc-900">
                              {formatLocaleAmount(row.income, locale)}
                            </dd>
                          </div>
                          <div className="space-y-1.5 border-t border-zinc-100 pt-2">
                            <div className="flex items-baseline justify-between gap-2">
                              <dt className="text-zinc-600">{t("dashboard.dailyRegisterCardExpenseHeadline")}</dt>
                              <dd className="tabular-nums font-semibold text-orange-950">
                                {formatLocaleAmount(row.totalExpenseOut, locale)}
                              </dd>
                            </div>
                            <DailyRegisterExpenseSplit
                              totalOut={row.totalExpenseOut}
                              fromRegister={row.expenseFromRegister}
                              locale={locale}
                              labelRegister={t("dashboard.dailyRegisterExpenseShareRegister")}
                              labelOutside={t("dashboard.dailyRegisterExpenseShareOutside")}
                              labelNoOutHint={t("dashboard.dailyRegisterExpenseNoOutHint")}
                              className="pl-0.5"
                            />
                            <p className="text-[0.65rem] leading-snug text-zinc-400">
                              {t("dashboard.dailyRegisterCardExpenseFootnote")}
                            </p>
                          </div>
                          <div className="flex items-baseline justify-between gap-2 border-t border-zinc-100 pt-2">
                            <dt className="font-medium text-zinc-800">{t("dashboard.dailyRegisterCardNet")}</dt>
                            <dd className="tabular-nums font-bold text-violet-950">
                              {formatLocaleAmount(row.netCash, locale)}
                            </dd>
                          </div>
                        </dl>
                        {expenseDetails.length > 0 ? (
                          <details className="mt-3 rounded-lg border border-zinc-200/90 bg-zinc-50/60 px-2 py-1.5 text-xs text-zinc-800">
                            <summary className="cursor-pointer select-none list-none py-1 font-semibold text-zinc-700 outline-none [&::-webkit-details-marker]:hidden">
                              {t("dashboard.dailyRegisterExpenseDetailToggle")}
                            </summary>
                            <dl className="mt-2 space-y-1.5 border-t border-zinc-200/80 pt-2">
                              {expenseDetails.map((line) => (
                                <div
                                  key={line.labelKey}
                                  className="flex items-baseline justify-between gap-2"
                                >
                                  <dt className="min-w-0 flex-1 pr-1 leading-snug text-zinc-600">
                                    {t(line.labelKey)}
                                  </dt>
                                  <dd className="shrink-0 tabular-nums font-medium text-zinc-900">
                                    {formatLocaleAmount(line.v, locale)}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </details>
                        ) : null}
                        <Link
                          href={`/branches?openBranch=${row.branchId}&branchTab=income`}
                          className="mt-3 text-xs font-semibold text-violet-800 underline-offset-2 hover:underline"
                        >
                          {t("dashboard.dailyRegisterOpenBranch")}
                        </Link>
                      </>
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
