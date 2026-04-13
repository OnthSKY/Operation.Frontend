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
      "min-h-10 flex-1 touch-manipulation rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm",
      active
        ? "bg-white text-zinc-900 shadow-sm"
        : "text-zinc-600 active:bg-zinc-200/80 hover:text-zinc-900"
    );

  return (
    <div className="sticky top-2 z-[9] rounded-xl border border-zinc-200/90 bg-white/95 p-3 shadow-sm ring-1 ring-zinc-950/[0.04] backdrop-blur-sm sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {t("dashboard.scopeFilterBarTitle")}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600">
        {t("dashboard.scopeFilterBarHint")}
      </p>
      <div
        className="mt-3 flex w-full flex-wrap gap-1 rounded-xl border border-zinc-200/90 bg-zinc-100/85 p-1"
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
