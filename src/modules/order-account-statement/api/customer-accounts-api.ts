import { apiRequest } from "@/shared/api/client";

export type CustomerAccountReceiptKind =
  | "cash"
  | "bank_transfer"
  | "check"
  | "promo_discount"
  | "advance_payment"
  | "other";

export type CustomerAccountReceiptResponse = {
  id: number;
  counterpartyType: "branch" | "customer";
  counterpartyId: number;
  receiptDate: string;
  amount: number;
  currencyCode: string;
  receiptKind: CustomerAccountReceiptKind;
  linkedOutboundInvoiceId?: number | null;
  branchId?: number | null;
  notes?: string | null;
  createdAt: string;
  createdByUserId?: number | null;
};

export type CustomerAccountBalanceResponse = {
  counterpartyType: "branch" | "customer";
  counterpartyId: number;
  totalCharged: number;
  totalPaid: number;
  openBalance: number;
  currencyCode: string;
  receipts: CustomerAccountReceiptResponse[];
};

export type CreateCustomerAccountReceiptRequest = {
  counterpartyType: "branch" | "customer";
  counterpartyId: number;
  receiptDate: string;
  amount: number;
  currencyCode: string;
  receiptKind: CustomerAccountReceiptKind;
  linkedOutboundInvoiceId?: number | null;
  branchId?: number | null;
  notes?: string | null;
};

export async function fetchCustomerAccountBalance(
  counterpartyType: "branch" | "customer",
  counterpartyId: number
): Promise<CustomerAccountBalanceResponse> {
  return apiRequest<CustomerAccountBalanceResponse>(
    `/customer-accounts/${counterpartyType}/${counterpartyId}/balance`
  );
}

export async function addCustomerAccountReceipt(
  request: CreateCustomerAccountReceiptRequest
): Promise<CustomerAccountReceiptResponse> {
  return apiRequest<CustomerAccountReceiptResponse>("/customer-accounts/receipts", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function deleteCustomerAccountReceipt(receiptId: number): Promise<void> {
  await apiRequest<null>(`/customer-accounts/receipts/${receiptId}`, { method: "DELETE" });
}

export async function fetchCustomerAccountReceiptsByInvoice(
  invoiceId: number
): Promise<CustomerAccountReceiptResponse[]> {
  return apiRequest<CustomerAccountReceiptResponse[]>(
    `/customer-accounts/receipts/by-invoice/${invoiceId}`
  );
}

export type UpdateCustomerAccountReceiptRequest = {
  receiptDate: string;
  amount: number;
  receiptKind: CustomerAccountReceiptKind;
  notes?: string | null;
};

export async function updateCustomerAccountReceipt(
  receiptId: number,
  request: UpdateCustomerAccountReceiptRequest
): Promise<CustomerAccountReceiptResponse> {
  return apiRequest<CustomerAccountReceiptResponse>(`/customer-accounts/receipts/${receiptId}`, {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export type CounterpartyLedgerSummaryItem = {
  counterpartyType: "branch" | "customer";
  counterpartyId: number;
  counterpartyName: string;
  currencyCode: string;
  invoicedTotal: number;
  paidTotal: number;
  openAmount: number;
  lastInvoiceDate?: string | null;
  lastDocumentNumber?: string | null;
};

export type CounterpartyLedgerSummaryTotals = {
  invoicedTotal: number;
  paidTotal: number;
  openAmountTotal: number;
  counterpartyCount: number;
  invoiceCount: number;
};

export type CounterpartyLedgerSummaryResponse = {
  items: CounterpartyLedgerSummaryItem[];
  totals: CounterpartyLedgerSummaryTotals;
};

export type CounterpartyLedgerSummaryFilters = {
  counterpartyType?: "branch" | "customer" | "";
  currencyCode?: string;
  search?: string;
  issueDateFrom?: string;
  issueDateTo?: string;
  onlyWithOpenBalance?: boolean;
  limit?: number;
};

export async function fetchCounterpartyLedgerSummary(
  filters: CounterpartyLedgerSummaryFilters = {}
): Promise<CounterpartyLedgerSummaryResponse> {
  const q = new URLSearchParams();
  if (filters.counterpartyType) q.set("counterpartyType", filters.counterpartyType);
  if (filters.currencyCode) q.set("currencyCode", filters.currencyCode);
  if (filters.search) q.set("search", filters.search);
  if (filters.issueDateFrom) q.set("issueDateFrom", filters.issueDateFrom);
  if (filters.issueDateTo) q.set("issueDateTo", filters.issueDateTo);
  if (filters.onlyWithOpenBalance) q.set("onlyWithOpenBalance", "true");
  if (filters.limit != null) q.set("limit", String(filters.limit));
  const qs = q.toString();
  return apiRequest<CounterpartyLedgerSummaryResponse>(
    `/customer-accounts/summary${qs ? `?${qs}` : ""}`
  );
}
