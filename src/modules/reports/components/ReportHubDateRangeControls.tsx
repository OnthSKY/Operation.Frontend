"use client";

import { ReportSeasonYearQuickSelect } from "@/modules/reports/components/ReportSeasonYearQuickSelect";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";

export type ReportHubRangeLock = "preset" | "calendarYear" | "manual";

type PresetKey = "month" | "d30" | "d7";

type Props = {
  t: (key: string) => string;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onPreset: (key: PresetKey) => void;
  onCalendarYearRange: (dateFrom: string, dateTo: string) => void;
  rangeLock: ReportHubRangeLock;
  onUnlockCalendarYear: () => void;
  className?: string;
};

export function ReportHubDateRangeControls({
  t,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onPreset,
  onCalendarYearRange,
  rangeLock,
  onUnlockCalendarYear,
  className,
}: Props) {
  const presetsDisabled = rangeLock === "calendarYear";
  const yearDisabled = rangeLock === "preset";
  const datesDisabled = rangeLock === "calendarYear";

  return (
    <div className={className ?? "flex flex-col gap-4"}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 touch-manipulation text-xs sm:min-h-10"
          disabled={presetsDisabled}
          onClick={() => onPreset("month")}
        >
          {t("reports.presetThisMonth")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 touch-manipulation text-xs sm:min-h-10"
          disabled={presetsDisabled}
          onClick={() => onPreset("d30")}
        >
          {t("reports.presetLast30")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 touch-manipulation text-xs sm:min-h-10"
          disabled={presetsDisabled}
          onClick={() => onPreset("d7")}
        >
          {t("reports.presetLast7")}
        </Button>
      </div>
      <ReportSeasonYearQuickSelect
        dateFrom={dateFrom}
        dateTo={dateTo}
        disabled={yearDisabled}
        onApplyRange={onCalendarYearRange}
        className="max-w-full sm:max-w-sm"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DateField
          label={t("reports.dateFrom")}
          value={dateFrom}
          disabled={datesDisabled}
          onChange={(e) => onDateFromChange(e.target.value)}
        />
        <DateField
          label={t("reports.dateTo")}
          value={dateTo}
          disabled={datesDisabled}
          onChange={(e) => onDateToChange(e.target.value)}
        />
      </div>
      {rangeLock === "calendarYear" ? (
        <button
          type="button"
          className="w-fit text-left text-xs font-semibold text-violet-800 underline-offset-2 hover:underline"
          onClick={onUnlockCalendarYear}
        >
          {t("reports.dateRangeUnlockManual")}
        </button>
      ) : null}
    </div>
  );
}
