"use client";

import { useI18n } from "@/i18n/context";
import {
  calendarYearRangeIso,
  inferCalendarSeasonYearFromRange,
  REPORT_YEAR_QUICK_PLACEHOLDER,
  reportYearQuickSelectTopYear,
} from "@/modules/reports/lib/report-period-helpers";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { useMemo } from "react";

type Props = {
  dateFrom: string;
  dateTo: string;
  onApplyRange: (dateFrom: string, dateTo: string) => void;
  className?: string;
};

export function ReportSeasonYearQuickSelect({
  dateFrom,
  dateTo,
  onApplyRange,
  className,
}: Props) {
  const { t } = useI18n();
  const options = useMemo((): SelectOption[] => {
    const start = Math.max(1990, reportYearQuickSelectTopYear());
    const opts: SelectOption[] = [
      {
        value: REPORT_YEAR_QUICK_PLACEHOLDER,
        label: t("reports.seasonYearPickPlaceholder"),
      },
    ];
    for (let y = start; y >= 1990; y--) {
      opts.push({
        value: String(y),
        label: t("reports.seasonYearOption").replace("{year}", String(y)),
      });
    }
    return opts;
  }, [t]);

  const matched = inferCalendarSeasonYearFromRange(dateFrom, dateTo);
  const value =
    matched != null ? String(matched) : REPORT_YEAR_QUICK_PLACEHOLDER;

  return (
    <div className={className}>
      <Select
        name="reportSeasonYearRange"
        label={t("reports.seasonYearQuickPick")}
        options={options}
        value={value}
        onChange={(e) => {
          const v = e.target.value.trim();
          if (!v || v === REPORT_YEAR_QUICK_PLACEHOLDER) return;
          const y = parseInt(v, 10);
          if (!Number.isFinite(y)) return;
          const { dateFrom: f, dateTo: d } = calendarYearRangeIso(y);
          onApplyRange(f, d);
        }}
        onBlur={() => {}}
        className="min-h-11 sm:min-h-10 sm:text-sm"
      />
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        {t("reports.seasonYearHint")}
      </p>
    </div>
  );
}
