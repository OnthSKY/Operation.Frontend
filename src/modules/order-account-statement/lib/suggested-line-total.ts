import type { Locale } from "@/i18n/messages";
import { parseLocaleAmount } from "@/shared/lib/locale-amount";

export type LineCalcFields = {
  readonly quantityText: string;
  readonly unitPriceText: string;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Tek mod: Miktar × birim fiyat. (kg da burada — `unitText="kg"`.) */
export function computeSuggestedLineTotal(line: LineCalcFields, locale: Locale): number | null {
  const qty = parseLocaleAmount(line.quantityText, locale);
  const unitPrice = parseLocaleAmount(line.unitPriceText, locale);
  if (Number.isFinite(qty) && qty > 0 && Number.isFinite(unitPrice) && unitPrice >= 0) {
    return roundMoney(qty * unitPrice);
  }
  return null;
}
