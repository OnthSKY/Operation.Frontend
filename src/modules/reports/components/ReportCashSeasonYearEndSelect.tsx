"use client";

import { useI18n } from "@/i18n/context";
import {
  inferYearFromDec31AsOf,
  REPORT_YEAR_QUICK_PLACEHOLDER,
  reportYearQuickSelectTopYear,
} from "@/modules/reports/lib/report-period-helpers";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { useMemo } from "react";

type Props = {
  asOfDate: string;
  onApplyAsOf: (isoYmd: string) => void;
  disabled?: boolean;
  className?: string;
  /** Shown under the default hint (e.g. cross-tab sync on the main reports hub). */
  extraHint?: string;
  /** Overrides `reports.cashAsOfSeasonYearQuickPick` for the select label. */
  label?: string;
  /** When false, hides `reports.cashAsOfSeasonYearHint` (parent can supply copy). Default true. */
  showDefaultHint?: boolean;
};

export function ReportCashSeasonYearEndSelect({
  asOfDate,
  onApplyAsOf,
  disabled = false,
  className,
  extraHint,
  label,
  showDefaultHint = true,
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
        label: t("reports.cashAsOfSeasonYearOption").replace("{year}", String(y)),
      });
    }
    return opts;
  }, [t]);

  const matched = inferYearFromDec31AsOf(asOfDate);
  const value =
    matched != null ? String(matched) : REPORT_YEAR_QUICK_PLACEHOLDER;

  return (
    <div className={className}>
      <Select
        name="reportCashSeasonYearEnd"
        label={label ?? t("reports.cashAsOfSeasonYearQuickPick")}
        options={options}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value.trim();
          if (!v || v === REPORT_YEAR_QUICK_PLACEHOLDER) return;
          const y = parseInt(v, 10);
          if (!Number.isFinite(y)) return;
          onApplyAsOf(`${y}-12-31`);
        }}
        onBlur={() => {}}
        className="min-h-11 sm:min-h-10 sm:text-sm"
      />
      {showDefaultHint ? (
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          {t("reports.cashAsOfSeasonYearHint")}
        </p>
      ) : null}
      {extraHint ? (
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{extraHint}</p>
      ) : null}
    </div>
  );
}
