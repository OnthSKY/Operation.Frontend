import type { Locale } from "@/i18n/messages";
import type { SelectOption } from "@/shared/ui/Select";

const CODES = [
  "TRY",
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "SAR",
  "AED",
  "JPY",
  "BGN",
  "RON",
  "CNY",
  "RUB",
] as const;

export function currencySelectOptions(locale: Locale): SelectOption[] {
  const tag = locale === "tr" ? "tr-TR" : "en-US";
  let dn: Intl.DisplayNames;
  try {
    dn = new Intl.DisplayNames(tag, { type: "currency" });
  } catch {
    dn = new Intl.DisplayNames("en-US", { type: "currency" });
  }
  return CODES.map((code) => {
    let name: string;
    try {
      name = dn.of(code) ?? code;
    } catch {
      name = code;
    }
    return { value: code, label: `${code} — ${name}` };
  });
}
