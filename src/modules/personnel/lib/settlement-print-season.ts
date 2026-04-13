import type { SelectOption } from "@/shared/ui/Select";

const MIN_Y = 1990;
const MAX_Y = 2100;

/** ISO datetime veya date → takvim yılı; ayrıştırılamazsa null. */
export function isoCalendarYear(iso: string | null | undefined): number | null {
  const s = String(iso ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const y = parseInt(s.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

export function parseSettlementSeasonYearChoice(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n) || n < MIN_Y || n > MAX_Y) return null;
  return n;
}

export function settlementSeasonYearSelectOptions(t: (k: string) => string): SelectOption[] {
  const y = new Date().getFullYear();
  /** Sezon belgeleri için bir sonraki takvim yılı da seçilebilsin. */
  const hi = Math.min(MAX_Y, y + 1);
  const opts: SelectOption[] = [
    { value: "", label: t("personnel.settlementPrintSeasonAll") },
  ];
  for (let i = hi; i >= MIN_Y; i--) {
    opts.push({
      value: String(i),
      label: t("personnel.settlementPrintSeasonYearLabel").replace("{year}", String(i)),
    });
  }
  return opts;
}

/**
 * Sadece takvim yılı (value/label = yıl); yazılabilir combobox (`Select`) ile kullanım için.
 * Yıl kapatma gibi akışlarda gelecek yıllar API ile uyumlu olması için üst sınır genelde bugünün yılıdır.
 */
export function calendarYearNumericSelectOptions(options?: {
  capAtCurrentYear?: boolean;
}): SelectOption[] {
  const cap = options?.capAtCurrentYear !== false;
  const y = new Date().getFullYear();
  const hi = cap ? Math.min(MAX_Y, y) : MAX_Y;
  const opts: SelectOption[] = [];
  for (let i = hi; i >= MIN_Y; i--) {
    opts.push({ value: String(i), label: String(i) });
  }
  return opts;
}
