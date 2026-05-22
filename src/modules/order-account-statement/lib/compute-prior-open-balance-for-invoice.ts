import type { OutboundInvoiceResponse } from "@/modules/order-account-statement/api/outbound-invoices-api";

function isPriorInvoice(
  candidate: OutboundInvoiceResponse,
  target: OutboundInvoiceResponse
): boolean {
  const candidateDate = String(candidate.issueDate ?? "");
  const targetDate = String(target.issueDate ?? "");
  if (candidateDate < targetDate) return true;
  if (candidateDate > targetDate) return false;
  return candidate.id < target.id;
}

/** PDF’teki «önceki cari» satırı: bu faturadan önce kesilen açık bakiyelerin güncel toplamı. */
export function computePriorOpenBalanceForInvoice(
  allInvoices: readonly OutboundInvoiceResponse[],
  target: OutboundInvoiceResponse
): number {
  return allInvoices
    .filter(
      (inv) =>
        inv.id !== target.id &&
        inv.counterpartyType === target.counterpartyType &&
        inv.counterpartyId === target.counterpartyId &&
        inv.currencyCode === target.currencyCode &&
        isPriorInvoice(inv, target)
    )
    .reduce((sum, inv) => sum + Math.max(0, Number(inv.openAmount) || 0), 0);
}
