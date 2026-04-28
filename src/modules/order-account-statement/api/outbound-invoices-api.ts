import { apiRequest } from "@/shared/api/client";

export type OutboundInvoicePaymentInfoRequest = {
  iban?: string | null;
  accountHolder?: string | null;
  bankName?: string | null;
  paymentNote?: string | null;
  showOnPdf?: boolean;
};

export type OutboundInvoiceLineRequest = {
  productId?: number | null;
  description: string;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  lineAmount?: number;
  lineSource?: "shipment" | "manual";
  manualReasonCode?: string | null;
  sourceShipmentLineId?: number | null;
};

export type CreateOutboundInvoiceRequest = {
  counterpartyType: "branch" | "customer";
  counterpartyId: number;
  issueDate: string;
  currencyCode: string;
  shipmentLinkMode: "strict" | "partial";
  autoPostLedger: boolean;
  notes?: string | null;
  paymentInfo?: OutboundInvoicePaymentInfoRequest | null;
  lines: OutboundInvoiceLineRequest[];
};

export type OutboundInvoiceShipmentLinkRequest = {
  warehouseMovementId: number;
  quantity: number;
};

export type OutboundInvoiceResponse = {
  id: number;
  documentNumber: string;
  counterpartyType: "branch" | "customer";
  counterpartyId: number;
  counterpartyName: string;
  issueDate: string;
  currencyCode: string;
  status: string;
  ledgerPosted: boolean;
  linesTotal: number;
  paidTotal: number;
  openAmount: number;
};

export type OutboundInvoiceReceiptRequest = {
  receiptDate: string;
  amount: number;
  currencyCode: string;
  notes?: string | null;
};

export type OutboundInvoiceReceiptResponse = {
  id: number;
  outboundInvoiceId: number;
  receiptDate: string;
  amount: number;
  currencyCode: string;
  notes?: string | null;
};

export type ShipmentInvoiceabilityLine = {
  warehouseMovementId: number;
  productId: number;
  productName: string;
  quantity: number;
  alreadyInvoicedQuantity: number;
  remainingQuantity: number;
  movementDate: string;
};

export type CreateShipmentInvoiceRequest = Omit<CreateOutboundInvoiceRequest, "lines"> & {
  lines: OutboundInvoiceLineRequest[];
  shipmentLinks?: OutboundInvoiceShipmentLinkRequest[];
};

export type CounterpartySuggestionRow = {
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

export type CounterpartySummaryFilters = {
  counterpartyType?: "branch" | "customer" | "";
  currencyCode?: string;
  search?: string;
  issueDateFrom?: string;
  issueDateTo?: string;
  onlyWithOpenBalance?: boolean;
  limit?: number;
};

export type CounterpartySummaryTotals = {
  invoicedTotal: number;
  paidTotal: number;
  openAmountTotal: number;
  counterpartyCount: number;
  invoiceCount: number;
};

export type CounterpartySummaryReport = {
  items: CounterpartySuggestionRow[];
  totals: CounterpartySummaryTotals;
};

export type SalesPriceSuggestion = {
  suggestedUnitPrice: number;
  avgUnitPrice: number;
  lastUnitPrice: number;
  sampleCount: number;
  basis: "counterparty_90d" | "counterparty_all" | "product_global" | string;
  currencyCode: string;
};

export type SalesPriceHistoryRow = {
  id: number;
  productId: number;
  productName: string;
  counterpartyType: "branch" | "customer";
  counterpartyId: number;
  counterpartyName: string;
  currencyCode: string;
  unit?: string | null;
  unitPrice: number;
  issueDate: string;
  sourceOutboundInvoiceId?: number | null;
  sourceOutboundInvoiceLineId?: number | null;
  createdAt: string;
};

export async function createOutboundInvoice(input: CreateOutboundInvoiceRequest): Promise<OutboundInvoiceResponse> {
  return apiRequest<OutboundInvoiceResponse>("/outbound-invoices", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createShipmentInvoice(
  warehouseMovementId: number,
  input: CreateShipmentInvoiceRequest
): Promise<OutboundInvoiceResponse> {
  return apiRequest<OutboundInvoiceResponse>(`/shipments/${warehouseMovementId}/create-invoice`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchShipmentInvoiceability(
  warehouseMovementId: number
): Promise<ShipmentInvoiceabilityLine[]> {
  return apiRequest<ShipmentInvoiceabilityLine[]>(`/shipments/${warehouseMovementId}/invoiceability`);
}

export async function fetchOutboundInvoices(): Promise<OutboundInvoiceResponse[]> {
  return apiRequest<OutboundInvoiceResponse[]>("/outbound-invoices");
}

export async function addOutboundInvoiceReceipt(
  invoiceId: number,
  input: OutboundInvoiceReceiptRequest
): Promise<OutboundInvoiceResponse> {
  return apiRequest<OutboundInvoiceResponse>(`/outbound-invoices/${invoiceId}/receipts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchOutboundInvoiceReceipts(
  invoiceId: number
): Promise<OutboundInvoiceReceiptResponse[]> {
  return apiRequest<OutboundInvoiceReceiptResponse[]>(`/outbound-invoices/${invoiceId}/receipts`);
}

export async function deleteOutboundInvoice(invoiceId: number): Promise<void> {
  await apiRequest<null>(`/outbound-invoices/${invoiceId}`, {
    method: "DELETE",
  });
}

export async function fetchCounterpartySuggestions(): Promise<CounterpartySuggestionRow[]> {
  return apiRequest<CounterpartySuggestionRow[]>("/outbound-invoices/suggestions/counterparties");
}

export async function deleteCustomerAccount(customerAccountId: number): Promise<void> {
  await apiRequest<null>(`/customer-accounts/${customerAccountId}`, { method: "DELETE" });
}

export async function fetchCounterpartySummaryReport(
  filters: CounterpartySummaryFilters = {}
): Promise<CounterpartySummaryReport> {
  const params = new URLSearchParams();
  const type = (filters.counterpartyType ?? "").trim();
  const currency = (filters.currencyCode ?? "").trim().toUpperCase();
  const search = (filters.search ?? "").trim();
  const dateFrom = (filters.issueDateFrom ?? "").trim();
  const dateTo = (filters.issueDateTo ?? "").trim();
  const limit = Number.isFinite(filters.limit) ? Math.max(1, Math.min(500, Number(filters.limit))) : 100;
  if (type === "branch" || type === "customer") params.set("counterpartyType", type);
  if (currency) params.set("currencyCode", currency);
  if (search) params.set("search", search);
  if (dateFrom.length === 10) params.set("issueDateFrom", dateFrom);
  if (dateTo.length === 10) params.set("issueDateTo", dateTo);
  if (filters.onlyWithOpenBalance) params.set("onlyWithOpenBalance", "true");
  params.set("limit", String(limit));
  return apiRequest<CounterpartySummaryReport>(
    `/outbound-invoices/reports/counterparty-summary?${params.toString()}`
  );
}

export async function fetchSalesPriceSuggestion(params: {
  productId: number;
  counterpartyType: "branch" | "customer";
  counterpartyId: number;
  currencyCode?: string;
  lookbackDays?: number;
}): Promise<SalesPriceSuggestion | null> {
  const q = new URLSearchParams({
    productId: String(params.productId),
    counterpartyType: params.counterpartyType,
    counterpartyId: String(params.counterpartyId),
    currencyCode: (params.currencyCode ?? "TRY").trim().toUpperCase(),
    lookbackDays: String(Math.max(1, params.lookbackDays ?? 90)),
  });
  return apiRequest<SalesPriceSuggestion | null>(`/outbound-invoices/price-suggestions?${q.toString()}`);
}

export async function fetchSalesPriceHistory(params: {
  productId?: number | null;
  counterpartyType?: "branch" | "customer" | "";
  counterpartyId?: number | null;
  currencyCode?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<SalesPriceHistoryRow[]> {
  const q = new URLSearchParams();
  if (params.productId != null && params.productId > 0) q.set("productId", String(params.productId));
  if (params.counterpartyType === "branch" || params.counterpartyType === "customer") {
    q.set("counterpartyType", params.counterpartyType);
  }
  if (params.counterpartyId != null && params.counterpartyId > 0) {
    q.set("counterpartyId", String(params.counterpartyId));
  }
  if ((params.currencyCode ?? "").trim()) q.set("currencyCode", params.currencyCode!.trim().toUpperCase());
  if ((params.dateFrom ?? "").length === 10) q.set("dateFrom", params.dateFrom!);
  if ((params.dateTo ?? "").length === 10) q.set("dateTo", params.dateTo!);
  q.set("limit", String(Math.max(1, Math.min(1000, params.limit ?? 200))));
  return apiRequest<SalesPriceHistoryRow[]>(`/outbound-invoices/price-history?${q.toString()}`);
}
