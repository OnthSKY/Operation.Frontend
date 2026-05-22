import type { Locale } from "@/i18n/messages";
import type { OutboundInvoiceLineResponse } from "@/modules/order-account-statement/api/outbound-invoices-api";
import {
  type OrderAccountLine,
  type PaidOnBehalfLine,
  type PromoDeductionLine,
} from "@/modules/order-account-statement/lib/compute-order-account-totals";
import { formatLocaleAmountInput } from "@/shared/lib/locale-amount";

function mapLine(
  line: OutboundInvoiceLineResponse,
  locale: Locale,
  asPaidOnBehalf: boolean
): OrderAccountLine | PaidOnBehalfLine {
  const qty = Number(line.quantity);
  const unitPrice = Number(line.unitPrice);
  const amount = Math.max(0, Number(line.lineAmount) || 0);
  const base = {
    id: `inv-line-${line.id}`,
    description: line.description,
    amount,
    quantityText: Number.isFinite(qty) && qty > 0 ? String(qty) : "",
    unitText: (line.unit ?? "").trim(),
    unitPriceText:
      Number.isFinite(unitPrice) && unitPrice > 0
        ? formatLocaleAmountInput(unitPrice, locale)
        : "",
    lineSource: line.lineSource === "shipment" ? ("shipment" as const) : ("manual" as const),
    manualReasonCode: line.manualReasonCode ?? null,
    sourceShipmentLineId: line.sourceShipmentLineId ?? null,
    isGift: false,
  };
  if (asPaidOnBehalf) {
    return { id: base.id, description: base.description, amount: base.amount };
  }
  return base;
}

export function mapInvoiceToOrderAccountPdfModel(input: {
  locale: Locale;
  lines: readonly OutboundInvoiceLineResponse[];
  giftAmount: number;
  promoAmount: number;
  advanceAmount: number;
  promoFallbackLabel: string;
  giftLineLabel: string;
}): {
  productLines: OrderAccountLine[];
  promoLines: PromoDeductionLine[];
  paidOnBehalf: PaidOnBehalfLine[];
  advanceDeduction: number;
  showQuantityColumn: boolean;
} {
  const productLines: OrderAccountLine[] = [];
  const paidOnBehalf: PaidOnBehalfLine[] = [];

  for (const line of input.lines) {
    if (line.lineSource === "shipment") {
      productLines.push(mapLine(line, input.locale, false) as OrderAccountLine);
    } else {
      paidOnBehalf.push(mapLine(line, input.locale, true) as PaidOnBehalfLine);
    }
  }

  const gift = Math.max(0, Number(input.giftAmount) || 0);
  if (gift > 0) {
    productLines.push({
      id: "gift-total",
      description: input.giftLineLabel,
      amount: gift,
      isGift: true,
      lineSource: "manual",
    });
  }

  const promo = Math.max(0, Number(input.promoAmount) || 0);
  const promoLines: PromoDeductionLine[] =
    promo > 0
      ? [
          {
            id: "promo-total",
            description: input.promoFallbackLabel,
            amount: promo,
          },
        ]
      : [];

  const showQuantityColumn = productLines.some(
    (l) => (l.quantityText ?? "").trim().length > 0 || (l.unitText ?? "").trim().length > 0
  );

  return {
    productLines,
    promoLines,
    paidOnBehalf,
    advanceDeduction: Math.max(0, Number(input.advanceAmount) || 0),
    showQuantityColumn,
  };
}
