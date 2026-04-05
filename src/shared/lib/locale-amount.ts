import type { Locale } from "@/i18n/messages";

const locTag = (locale: Locale) => (locale === "tr" ? "tr-TR" : "en-US");

function isIso4217(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

/** Yerel tutar; `currencyCode` verilirse Intl currency, yoksa düz sayı. */
export function formatLocaleAmount(
  n: number,
  locale: Locale,
  currencyCode?: string
): string {
  if (!Number.isFinite(n)) return "";
  const tag = locTag(locale);
  const c = currencyCode?.trim().toUpperCase();
  if (c && isIso4217(c)) {
    try {
      return new Intl.NumberFormat(tag, {
        style: "currency",
        currency: c,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      /* invalid for Intl */
    }
  }
  return new Intl.NumberFormat(tag, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Form / input metnini sayıya çevirir.
 * tr: binlik `.`, ondalık `,` — en: binlik `,`, ondalık `.`
 */
export function parseLocaleAmount(raw: string, locale: Locale): number {
  const s = raw.trim().replace(/\s/g, "");
  if (!s) return NaN;

  if (locale === "tr") {
    const ci = s.lastIndexOf(",");
    const intRaw = ci >= 0 ? s.slice(0, ci) : s;
    const decRaw = ci >= 0 ? s.slice(ci + 1) : "";
    const intPart = intRaw.replace(/\./g, "").replace(/[^\d]/g, "");
    const decPart = decRaw.replace(/[^\d]/g, "").slice(0, 2);
    if (!intPart && !decPart) return NaN;
    const numStr = decPart ? `${intPart || "0"}.${decPart}` : intPart;
    return Number(numStr);
  }

  const di = s.lastIndexOf(".");
  const intRaw = di >= 0 ? s.slice(0, di) : s;
  const decRaw = di >= 0 ? s.slice(di + 1) : "";
  const intPart = intRaw.replace(/,/g, "").replace(/[^\d]/g, "");
  const decPart = decRaw.replace(/[^\d]/g, "").slice(0, 2);
  if (!intPart && !decPart) return NaN;
  const numStr = decPart ? `${intPart || "0"}.${decPart}` : intPart;
  return Number(numStr);
}

export function formatMoneyDash(
  n: number,
  dash: string,
  locale: Locale,
  currencyCode?: string
): string {
  if (n == null || Number.isNaN(n)) return dash;
  return formatLocaleAmount(n, locale, currencyCode);
}
