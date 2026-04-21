import type { Locale } from "@/i18n/messages";
import { parseLocaleAmount } from "@/shared/lib/locale-amount";

export type LinePriceCalcMode = "piece" | "kg";

export type LineCalcFields = {
  readonly priceCalcMode: LinePriceCalcMode;
  readonly qtyText: string;
  readonly unitPriceText: string;
  readonly kgText: string;
  readonly tryPerKgText: string;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Adet modu: Adet × birim tutar. Kg modu: Kg × (₺/kg). */
export function computeSuggestedLineTotal(line: LineCalcFields, locale: Locale): number | null {
  if (line.priceCalcMode === "piece") {
    const qty = parseLocaleAmount(line.qtyText, locale);
    const birim = parseLocaleAmount(line.unitPriceText, locale);
    if (Number.isFinite(qty) && qty > 0 && Number.isFinite(birim) && birim >= 0) {
      return roundMoney(qty * birim);
    }
    return null;
  }
  const kg = parseLocaleAmount(line.kgText, locale);
  const tlKg = parseLocaleAmount(line.tryPerKgText, locale);
  if (Number.isFinite(kg) && kg > 0 && Number.isFinite(tlKg) && tlKg >= 0) {
    return roundMoney(kg * tlKg);
  }
  return null;
}
