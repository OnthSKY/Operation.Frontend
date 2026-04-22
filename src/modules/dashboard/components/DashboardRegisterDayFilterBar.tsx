"use client";

import type { DashboardCashFilterMode } from "@/modules/dashboard/types/dashboard-cash-filter";
import {
  REPORT_YEAR_QUICK_PLACEHOLDER,
  reportYearQuickSelectTopYear,
} from "@/modules/reports/lib/report-period-helpers";
import { cn } from "@/lib/cn";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { useMemo } from "react";

export function DashboardRegisterDayFilterBar({
  filterMode,
  setFilterMode,
  branchSummaryDate,
  setBranchSummaryDate,
  seasonYear,
  setSeasonYear,
  seasonYearFrom,
  setSeasonYearFrom,
  seasonYearTo,
  setSeasonYearTo,
  isCalendarToday,
  t,
}: {
  filterMode: DashboardCashFilterMode;
  setFilterMode: (m: DashboardCashFilterMode) => void;
  branchSummaryDate: string;
  setBranchSummaryDate: (v: string) => void;
  seasonYear: number;
  setSeasonYear: (y: number) => void;
  seasonYearFrom: number;
  setSeasonYearFrom: (y: number) => void;
  seasonYearTo: number;
  setSeasonYearTo: (y: number) => void;
  isCalendarToday: boolean;
  t: (key: string) => string;
}) {
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

  const modeBtn = (active: boolean) =>
    cn(
      "min-h-10 w-full min-w-[8rem] shrink-0 touch-manipulation rounded-lg px-3 py-2 text-center text-xs font-semibold whitespace-nowrap transition-all duration-200 ease-in-out sm:min-w-0 sm:text-sm",
      active
        ? "bg-white text-zinc-900 shadow-sm"
        : "text-zinc-600 active:bg-zinc-200/80 hover:text-zinc-900"
    );

  return (
    <div className="sticky top-2 z-[9] min-w-0 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm backdrop-blur-sm sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t("dashboard.scopeFilterBarTitle")}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600">
        {t("dashboard.scopeFilterBarHint")}
      </p>
      <div className="relative mt-3">
        <div
          className="flex w-full min-w-0 gap-1 overflow-x-auto rounded-lg bg-zinc-100 p-1 pr-14 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-4 sm:overflow-visible sm:pr-1"
          role="group"
          aria-label={t("dashboard.cashFilterModeAria")}
        >
          <button
            type="button"
            className={modeBtn(filterMode === "day")}
            onClick={() => setFilterMode("day")}
          >
            {t("dashboard.cashFilterModeDay")}
          </button>
          <button
            type="button"
            className={modeBtn(filterMode === "season_single")}
            onClick={() => setFilterMode("season_single")}
          >
            {t("dashboard.cashFilterModeSeasonSingle")}
          </button>
          <button
            type="button"
            className={modeBtn(filterMode === "season_range")}
            onClick={() => setFilterMode("season_range")}
          >
            {t("dashboard.cashFilterModeSeasonRange")}
          </button>
          <button
            type="button"
            className={modeBtn(filterMode === "all_data")}
            onClick={() => setFilterMode("all_data")}
          >
            {t("dashboard.cashFilterModeAllData")}
          </button>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center rounded-r-xl bg-gradient-to-l from-zinc-100/95 via-zinc-100/90 to-transparent pl-7 pr-2 sm:hidden">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200/80 bg-white/85 text-zinc-500 shadow-sm animate-pulse"
            aria-hidden
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </div>
      </div>

      {filterMode === "all_data" ? (
        <p className="mt-4 text-xs leading-relaxed text-zinc-600">
          {t("dashboard.cashFilterModeAllDataHint")}
        </p>
      ) : filterMode === "day" ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <DateField
              label={t("dashboard.registerSnapshotDateField")}
              value={branchSummaryDate}
              onChange={(e) => setBranchSummaryDate(e.target.value)}
            />
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
              {t("dashboard.registerDateShortHint")}
            </p>
          </div>
          <div className="flex min-h-11 items-end sm:justify-end">
            {!isCalendarToday ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full touch-manipulation sm:min-h-10 sm:w-auto sm:shrink-0"
                onClick={() => setBranchSummaryDate(localIsoDate())}
              >
                {t("dashboard.registerSnapshotResetToday")}
              </Button>
            ) : (
              <div className="hidden min-w-[6rem] sm:block" aria-hidden />
            )}
          </div>
        </div>
      ) : filterMode === "season_single" ? (
        <div className="mt-4 min-w-0">
          <Select
            name="dashboardCashSeasonYear"
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
      ) : filterMode === "season_range" ? (
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            name="dashboardCashSeasonYearFrom"
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
            name="dashboardCashSeasonYearTo"
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
          <p className="col-span-full mt-0 text-xs leading-relaxed text-zinc-500 sm:-mt-2">
            {t("dashboard.seasonRangeModeHint")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
