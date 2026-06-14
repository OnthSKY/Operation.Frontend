import type { Locale } from "@/i18n/messages";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import type { Personnel } from "@/types/personnel";

/** ISO tarih (boş/geçersizse `dash`) → lokalize edilmiş kısa biçim. */
export function formatOptionalIso(
  iso: string | null | undefined,
  dash: string,
  locale: Locale,
): string {
  if (iso == null || String(iso).trim() === "") return dash;
  return formatLocaleDate(String(iso), locale, dash);
}

/** Personel işe başlama tarihini lokalize biçimde döndürür; yoksa `dash`. */
export function formatHireDate(
  p: Personnel,
  dash: string,
  locale: Locale,
): string {
  if (!p.hireDate) return dash;
  return formatLocaleDate(p.hireDate, locale, dash);
}

/** Personel maaşını lokalize para biçiminde döndürür; yoksa `dash`. */
export function formatSalary(
  p: Personnel,
  dash: string,
  locale: Locale,
): string {
  if (p.salary == null) return dash;
  return formatMoneyDash(p.salary, dash, locale);
}
