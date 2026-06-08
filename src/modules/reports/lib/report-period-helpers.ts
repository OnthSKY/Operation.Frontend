import { localIsoDate } from "@/shared/lib/local-iso-date";

/**
 * Custom Select placeholder — `value=""` breaks the combobox (collides with “empty” state and
 * `options.find(o => o.value === value)` matching the placeholder row incorrectly in edge cases).
 */
export const REPORT_YEAR_QUICK_PLACEHOLDER = "__report_year_quick_none__";

/** List up to calendar year + 1 so the next season / fiscal year is pickable before 1 Jan. */
export function reportYearQuickSelectTopYear(d = new Date()): number {
  return Math.min(2100, d.getFullYear() + 1);
}

export function startOfMonthIso(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** Yılın 1 Ocak tarihi (ISO); patron/ dar kapsamlı raporlarda «bu ay boş» hissini azaltır. */
export function startOfCalendarYearIso(d = new Date()): string {
  return `${d.getFullYear()}-01-01`;
}

export function addDaysFromIso(iso: string, deltaDays: number): string {
  const [y, mo, da] = iso.split("-").map(Number);
  const dt = new Date(y, mo - 1, da);
  dt.setDate(dt.getDate() + deltaDays);
  return localIsoDate(dt);
}

/** Takvim sezon yılı (1 Oca – 31 Ara) — rapor API’leri dateFrom/dateTo ile uyumlu. */
export function calendarYearRangeIso(year: number): {
  dateFrom: string;
  dateTo: string;
} {
  const y = Math.trunc(year);
  return { dateFrom: `${y}-01-01`, dateTo: `${y}-12-31` };
}

/** dateFrom/dateTo tam takvim yılı ise yılı döndürür; aksi halde null. */
export function inferCalendarSeasonYearFromRange(
  dateFrom: string,
  dateTo: string
): number | null {
  const a = String(dateFrom ?? "").trim().slice(0, 10);
  const b = String(dateTo ?? "").trim().slice(0, 10);
  const m = /^(\d{4})-01-01$/.exec(a);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  if (!Number.isFinite(y) || y < 1990 || y > 2100) return null;
  if (b !== `${y}-12-31`) return null;
  return y;
}

export type ReportDatePresetKey =
  | "today"
  | "thisWeek"
  | "month"
  | "lastMonth"
  | "thisYear"
  | "d30"
  | "d7";

/**
 * Rapor tarih aralığı preset hesabı. `ReportHubDateRangeControls.onPreset`
 * callback'leri için tek doğruluk kaynağı — her tüketici aynı helper'ı kullanır
 * → preset eklemek için yalnız bu fonksiyon ve i18n etiketi güncellenir.
 */
export function resolveReportDatePreset(
  key: ReportDatePresetKey,
  now: Date = new Date(),
): { dateFrom: string; dateTo: string } {
  const today = localIsoDate(now);
  if (key === "today") return { dateFrom: today, dateTo: today };
  if (key === "thisWeek") {
    const dow = (now.getDay() + 6) % 7; // Mon=0..Sun=6
    return { dateFrom: addDaysFromIso(today, -dow), dateTo: today };
  }
  if (key === "month") return { dateFrom: startOfMonthIso(now), dateTo: today };
  if (key === "lastMonth") {
    const firstOfLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastOfLast = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      dateFrom: localIsoDate(firstOfLast),
      dateTo: localIsoDate(lastOfLast),
    };
  }
  if (key === "thisYear")
    return { dateFrom: startOfCalendarYearIso(now), dateTo: today };
  if (key === "d30")
    return { dateFrom: addDaysFromIso(today, -29), dateTo: today };
  return { dateFrom: addDaysFromIso(today, -6), dateTo: today };
}

/** Rapor tarihi tam yıl sonu (YYYY-12-31) ise yılı döndürür. */
export function inferYearFromDec31AsOf(asOf: string): number | null {
  const s = String(asOf ?? "").trim().slice(0, 10);
  const m = /^(\d{4})-12-31$/.exec(s);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  if (!Number.isFinite(y) || y < 1990 || y > 2100) return null;
  return y;
}
