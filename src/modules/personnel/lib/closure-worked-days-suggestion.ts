import {
  enumerateLocalIsoDatesInclusive,
  localIsoDate,
} from "@/shared/lib/local-iso-date";

export type ClosureWorkedDaysFromSeason = {
  days: number;
  /** Inclusive lower bound used for counting (within the calendar year). */
  periodStart: string;
  /** Inclusive upper bound used for counting. */
  periodEnd: string;
  /** Normalized YYYY-MM-DD from personnel card. */
  seasonArrivalIso: string;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Inclusive calendar days in `calendarYear` from max(season arrival, Jan 1)
 * through min(year end, "today" when closing the current year).
 */
export function suggestClosureWorkedDaysFromSeasonStart(
  calendarYear: number,
  seasonArrivalIso: string | null | undefined,
  now = new Date()
): ClosureWorkedDaysFromSeason | null {
  if (!Number.isFinite(calendarYear) || calendarYear < 1990 || calendarYear > 2100) {
    return null;
  }
  const raw = typeof seasonArrivalIso === "string" ? seasonArrivalIso.trim().slice(0, 10) : "";
  if (!YMD.test(raw)) return null;

  const yearStart = `${calendarYear}-01-01`;
  const yearEnd = `${calendarYear}-12-31`;
  const today = localIsoDate(now);
  const cy = now.getFullYear();

  const periodStart = raw > yearStart ? raw : yearStart;
  const periodEnd =
    calendarYear < cy ? yearEnd : calendarYear > cy ? yearEnd : today <= yearEnd ? today : yearEnd;

  if (periodStart > periodEnd) return null;

  const { dates, truncated } = enumerateLocalIsoDatesInclusive(periodStart, periodEnd, 400);
  if (truncated || dates.length < 1) return null;

  return {
    days: dates.length,
    periodStart,
    periodEnd,
    seasonArrivalIso: raw,
  };
}
