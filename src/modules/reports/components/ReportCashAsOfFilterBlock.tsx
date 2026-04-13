"use client";

import { ReportCashSeasonYearEndSelect } from "@/modules/reports/components/ReportCashSeasonYearEndSelect";
import { inferYearFromDec31AsOf } from "@/modules/reports/lib/report-period-helpers";
import { DateField } from "@/shared/ui/DateField";

export type ReportCashAsOfFilterMode = "calendarYearEnd" | "customDate";

type Props = {
  t: (key: string) => string;
  asOfDate: string;
  onAsOfChange: (isoYmd: string) => void;
  openSeasonOnly: boolean;
  onOpenSeasonOnlyChange: (next: boolean) => void;
  mode: ReportCashAsOfFilterMode;
  onModeChange: (next: ReportCashAsOfFilterMode) => void;
  /** Hub: sync Financial/Stock range when user picks a calendar year end. */
  onSyncHubCalendarYear?: (year: number) => void;
  cashYearSelectExtraHint?: string;
};

const segBtn = (active: boolean) =>
  `min-h-10 flex-1 rounded-md px-2 py-2 text-xs font-semibold transition sm:text-sm ${
    active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
  }`;

export function ReportCashAsOfFilterBlock({
  t,
  asOfDate,
  onAsOfChange,
  openSeasonOnly,
  onOpenSeasonOnlyChange,
  mode,
  onModeChange,
  onSyncHubCalendarYear,
  cashYearSelectExtraHint,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:max-w-md">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 touch-manipulation sm:min-h-10">
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 rounded border-zinc-300"
          checked={openSeasonOnly}
          onChange={(e) => onOpenSeasonOnlyChange(e.target.checked)}
        />
        <span>{t("reports.cashOpenSeasonOnly")}</span>
      </label>

      <div>
        <p className="text-xs font-medium text-zinc-600">{t("reports.cashFilterPeriodModeLabel")}</p>
        <div
          className="mt-1.5 flex rounded-lg border border-zinc-200 bg-zinc-100/80 p-0.5"
          role="group"
          aria-label={t("reports.cashFilterPeriodModeLabel")}
        >
          <button
            type="button"
            className={segBtn(mode === "calendarYearEnd")}
            aria-pressed={mode === "calendarYearEnd"}
            onClick={() => {
              if (mode === "calendarYearEnd") return;
              onModeChange("calendarYearEnd");
              const y = inferYearFromDec31AsOf(asOfDate) ?? new Date().getFullYear();
              const iso = `${y}-12-31`;
              onAsOfChange(iso);
              onSyncHubCalendarYear?.(y);
            }}
          >
            {t("reports.cashFilterModeCalendarYearEnd")}
          </button>
          <button
            type="button"
            className={segBtn(mode === "customDate")}
            aria-pressed={mode === "customDate"}
            onClick={() => {
              if (mode === "customDate") return;
              onModeChange("customDate");
            }}
          >
            {t("reports.cashFilterModeCustomAsOf")}
          </button>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{t("reports.cashFilterPeriodModeHint")}</p>
      </div>

      {mode === "calendarYearEnd" ? (
        <ReportCashSeasonYearEndSelect
          asOfDate={asOfDate}
          label={t("reports.cashCalendarYearQuickPick")}
          extraHint={cashYearSelectExtraHint}
          onApplyAsOf={(iso) => {
            onAsOfChange(iso);
            const y = inferYearFromDec31AsOf(iso);
            if (y != null) {
              onSyncHubCalendarYear?.(y);
            }
          }}
        />
      ) : (
        <DateField
          label={t("reports.cashAsOfDate")}
          value={asOfDate}
          onChange={(e) => onAsOfChange(e.target.value)}
        />
      )}
    </div>
  );
}
