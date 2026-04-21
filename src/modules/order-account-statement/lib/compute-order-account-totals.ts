export type OrderAccountLine = {
  id: string;
  description: string;
  /** PDF / önizleme: isteğe bağlı adet veya birim metni (ör. "12", "3 koli"). */
  quantityText?: string;
  /** PDF / önizleme: isteğe bağlı birim adı (ör. "kg", "koli", "adet"). */
  unitText?: string;
  /** PDF / önizleme: isteğe bağlı birim fiyat metni. */
  unitPriceText?: string;
  amount: number;
  isGift: boolean;
};

/** Promosyonda veya indirimde gösterilecek kalem; tutar brütten düşülür (pozitif girilir). */
export type PromoDeductionLine = {
  id: string;
  description: string;
  amount: number;
};

export type PaidOnBehalfLine = {
  id: string;
  description: string;
  amount: number;
};

export type OrderAccountTotals = {
  grossTotal: number;
  /** Hediye işaretli satırların tutarı toplamı (brütten düşülür). */
  giftLinesSum: number;
  /** Promosyon / indirim kalemleri toplamı (brütten düşülür). */
  promoLinesSum: number;
  subtotal: number;
  paidOnBehalfSum: number;
  netDue: number;
};

function finite(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

export function computeOrderAccountTotals(
  lines: readonly OrderAccountLine[],
  promoLines: readonly PromoDeductionLine[],
  advanceDeduction: number,
  paidOnBehalf: readonly PaidOnBehalfLine[]
): OrderAccountTotals {
  const grossTotal = lines.reduce((s, l) => s + finite(l.amount), 0);
  const giftLinesSum = lines.filter((l) => l.isGift).reduce((s, l) => s + finite(l.amount), 0);
  const promoLinesSum = promoLines.reduce((s, p) => s + finite(p.amount), 0);
  const adv = Math.max(0, finite(advanceDeduction));
  const subtotal = grossTotal - giftLinesSum - promoLinesSum - adv;
  const paidOnBehalfSum = paidOnBehalf.reduce((s, l) => s + finite(l.amount), 0);
  const netDue = subtotal + paidOnBehalfSum;
  return { grossTotal, giftLinesSum, promoLinesSum, subtotal, paidOnBehalfSum, netDue };
}
