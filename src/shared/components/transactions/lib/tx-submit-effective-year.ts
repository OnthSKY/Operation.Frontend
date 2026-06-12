/**
 * Yeni avans için "effective year" hesabı:
 *  1) Form'daki effectiveYear geçerliyse (1990–2100) kullan
 *  2) Aksi halde transaction date'in yıl bölümünü kullan
 *  3) O da geçersizse takvim yılı (Date.now)
 */
export function resolveEffectiveYear(
  effectiveYearRaw: string,
  transactionDate: string,
  fallbackNow: Date = new Date()
): number {
  const parsed = parseInt(effectiveYearRaw.trim(), 10);
  if (Number.isFinite(parsed) && parsed >= 1990 && parsed <= 2100) {
    return parsed;
  }
  const ymd = transactionDate.slice(0, 10);
  if (/^\d{4}/.test(ymd)) {
    return parseInt(ymd.slice(0, 4), 10);
  }
  return fallbackNow.getFullYear();
}
