/**
 * Para birimi bazlı toplama yardımcıları (saf, yan etkisiz).
 */
import type { BranchStockReceiptRow } from "@/types/branch";
import type { BranchTransaction } from "@/types/branch-transaction";

export function sumByCurrency(
  rows: { amount: number; currencyCode?: string | null }[]
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const c = String(r.currencyCode ?? "TRY").trim().toUpperCase() || "TRY";
    m.set(c, (m.get(c) ?? 0) + Number(r.amount));
  }
  return m;
}

export function sumRegisterByType(
  rows: BranchTransaction[],
  typeNorm: "IN" | "OUT"
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (String(r.type ?? "").toUpperCase() !== typeNorm) continue;
    const c = String(r.currencyCode ?? "TRY").trim().toUpperCase() || "TRY";
    m.set(c, (m.get(c) ?? 0) + Number(r.amount));
  }
  return m;
}

export function sumStockValuationByCurrency(rows: BranchStockReceiptRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const est = r.valuationLineEstimate;
    if (est == null || !Number.isFinite(est)) continue;
    const c = String(r.valuationCurrencyCode ?? "TRY").trim().toUpperCase() || "TRY";
    m.set(c, (m.get(c) ?? 0) + est);
  }
  return m;
}
