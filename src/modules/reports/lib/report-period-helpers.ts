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

/** Rapor tarihi tam yıl sonu (YYYY-12-31) ise yılı döndürür. */
export function inferYearFromDec31AsOf(asOf: string): number | null {
  const s = String(asOf ?? "").trim().slice(0, 10);
  const m = /^(\d{4})-12-31$/.exec(s);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  if (!Number.isFinite(y) || y < 1990 || y > 2100) return null;
  return y;
}
