import type {
  ExpenseLinkAdvanceOption,
  ExpenseLinkSalaryPaymentOption,
} from "@/modules/branch/api/branches-api";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import type { Locale } from "@/i18n/messages";
import type { SelectOption } from "@/shared/ui/Select";

/**
 * Avans bağlama dropdown'ı için seçenek listesi: `adv:{id}` value + (tutar · tarih) label.
 */
export function buildAdvanceLinkSelectOptions(
  advances: ExpenseLinkAdvanceOption[],
  locale: Locale
): SelectOption[] {
  return advances.map((r) => ({
    value: `adv:${r.id}`,
    label: `${formatLocaleAmount(r.amount, locale, r.currencyCode)} · ${formatLocaleDate(r.advanceDate, locale)}`,
  }));
}

/**
 * Maaş/prim bağlama dropdown'ı için seçenek listesi: `sal:{id}` value + (tutar · tarih) label.
 */
export function buildSalaryLinkSelectOptions(
  salaries: ExpenseLinkSalaryPaymentOption[],
  locale: Locale
): SelectOption[] {
  return salaries.map((r) => ({
    value: `sal:${r.id}`,
    label: `${formatLocaleAmount(r.amount, locale, r.currencyCode)} · ${formatLocaleDate(r.paymentDate, locale)}`,
  }));
}
