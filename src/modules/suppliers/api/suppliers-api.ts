import { apiRequest } from "@/shared/api/client";

export type Supplier = {
  id: number;
  name: string;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  defaultPaymentTermsDays: number | null;
  currencyCode: string;
  /** Sunucu listesinde silinmiş kayıtlar için true; silme aksiyonu gösterilmez. */
  isDeleted?: boolean;
};

export type SupplierView = {
  supplier: Supplier;
  isDeleted: boolean;
  invoiceCount: number;
  totalInvoiced: number;
  totalPaidOnInvoices: number;
  totalOpenBalance: number;
  paymentRecordCount: number;
  totalPaymentAmounts: number;
};

export type SupplierInvoiceLine = {
  id: number;
  lineNo: number;
  productId: number | null;
  productName: string | null;
  description: string | null;
  quantity: number | null;
  unitPrice: number | null;
  lineAmount: number;
  warehouseMovementId: number | null;
  receiveBranchId: number | null;
  receiveBranchName: string | null;
};

export type SupplierInvoiceListItem = {
  id: number;
  supplierId: number;
  supplierName: string;
  documentNumber: string | null;
  documentDate: string;
  dueDate: string | null;
  currencyCode: string;
  description: string | null;
  paymentMarkedComplete: boolean;
  formalSupplierInvoiceIssued: boolean;
  linesTotal: number;
  paidTotal: number;
  openAmount: number;
};

export type SupplierInvoiceDetail = SupplierInvoiceListItem & {
  lines: SupplierInvoiceLine[];
};

export type SupplierPayment = {
  id: number;
  paymentDate: string;
  amount: number;
  currencyCode: string;
  sourceType: string;
  branchId: number | null;
  branchName: string | null;
  description: string | null;
};

export async function fetchSuppliers(includeDeleted = false): Promise<Supplier[]> {
  const q = includeDeleted ? "?includeDeleted=true" : "";
  return apiRequest<Supplier[]>(`/suppliers${q}`);
}

export async function fetchSupplierView(id: number): Promise<SupplierView> {
  return apiRequest<SupplierView>(`/suppliers/${id}/view`);
}

export async function createSupplier(body: {
  name: string;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  defaultPaymentTermsDays?: number | null;
  currencyCode?: string;
}): Promise<Supplier> {
  return apiRequest<Supplier>("/suppliers", {
    method: "POST",
    body: JSON.stringify({
      name: body.name.trim(),
      taxId: body.taxId ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      notes: body.notes ?? null,
      defaultPaymentTermsDays: body.defaultPaymentTermsDays ?? null,
      currencyCode: body.currencyCode ?? "TRY",
    }),
  });
}

export async function updateSupplier(
  id: number,
  body: {
    name: string;
    taxId?: string | null;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    defaultPaymentTermsDays?: number | null;
    currencyCode?: string;
  }
): Promise<Supplier> {
  return apiRequest<Supplier>(`/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: body.name.trim(),
      taxId: body.taxId ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      notes: body.notes ?? null,
      defaultPaymentTermsDays: body.defaultPaymentTermsDays ?? null,
      currencyCode: body.currencyCode ?? "TRY",
    }),
  });
}

export async function deleteSupplier(id: number): Promise<void> {
  await apiRequest<null>(`/suppliers/${id}`, { method: "DELETE" });
}

export type SupplierInvoiceListQuery = {
  supplierId?: number;
  dateFrom?: string;
  dateTo?: string;
  /** Invoice lines total (fatura tutarı) min inclusive */
  minLinesTotal?: number;
  maxLinesTotal?: number;
  paymentStatus?: "paid" | "unpaid";
};

export async function fetchSupplierInvoices(params: SupplierInvoiceListQuery): Promise<SupplierInvoiceListItem[]> {
  const q = new URLSearchParams();
  if (params.supplierId != null) q.set("supplierId", String(params.supplierId));
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  if (params.minLinesTotal != null && Number.isFinite(params.minLinesTotal)) {
    q.set("minLinesTotal", String(params.minLinesTotal));
  }
  if (params.maxLinesTotal != null && Number.isFinite(params.maxLinesTotal)) {
    q.set("maxLinesTotal", String(params.maxLinesTotal));
  }
  if (params.paymentStatus) q.set("paymentStatus", params.paymentStatus);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return apiRequest<SupplierInvoiceListItem[]>(`/suppliers/invoices${suffix}`);
}

export async function fetchSupplierInvoice(id: number): Promise<SupplierInvoiceDetail> {
  return apiRequest<SupplierInvoiceDetail>(`/suppliers/invoices/${id}`);
}

export async function createSupplierInvoice(body: {
  supplierId: number;
  documentNumber?: string | null;
  documentDate: string;
  dueDate?: string | null;
  currencyCode?: string;
  description?: string | null;
  paymentMarkedComplete?: boolean;
  formalSupplierInvoiceIssued?: boolean;
  autoWarehouseCheckedByPersonnelId?: number | null;
  autoWarehouseApprovedByPersonnelId?: number | null;
  lines: Array<{
    productId?: number | null;
    description?: string | null;
    quantity?: number | null;
    unitPrice?: number | null;
    lineAmount: number;
    warehouseMovementId?: number | null;
    receiveWarehouseId?: number | null;
    receiveBranchId?: number | null;
  }>;
}): Promise<SupplierInvoiceDetail> {
  return apiRequest<SupplierInvoiceDetail>("/suppliers/invoices", {
    method: "POST",
    body: JSON.stringify({
      supplierId: body.supplierId,
      documentNumber: body.documentNumber ?? null,
      documentDate: body.documentDate,
      dueDate: body.dueDate ?? null,
      currencyCode: body.currencyCode ?? "TRY",
      description: body.description ?? null,
      paymentMarkedComplete: body.paymentMarkedComplete ?? false,
      formalSupplierInvoiceIssued: body.formalSupplierInvoiceIssued ?? false,
      autoWarehouseCheckedByPersonnelId: body.autoWarehouseCheckedByPersonnelId ?? null,
      autoWarehouseApprovedByPersonnelId: body.autoWarehouseApprovedByPersonnelId ?? null,
      lines: body.lines.map((l) => ({
        productId: l.productId ?? null,
        description: l.description ?? null,
        quantity: l.quantity ?? null,
        unitPrice: l.unitPrice ?? null,
        lineAmount: l.lineAmount,
        warehouseMovementId: l.warehouseMovementId ?? null,
        receiveWarehouseId: l.receiveWarehouseId ?? null,
        receiveBranchId: l.receiveBranchId ?? null,
      })),
    }),
  });
}

export async function createSupplierPayment(body: {
  paymentDate: string;
  amount: number;
  currencyCode?: string;
  sourceType: string;
  branchId?: number | null;
  description?: string | null;
  allocations: Array<{ invoiceId: number; amount: number }>;
}): Promise<SupplierPayment> {
  return apiRequest<SupplierPayment>("/suppliers/payments", {
    method: "POST",
    body: JSON.stringify({
      paymentDate: body.paymentDate,
      amount: body.amount,
      currencyCode: body.currencyCode ?? "TRY",
      sourceType: body.sourceType,
      branchId: body.sourceType === "CASH" ? body.branchId ?? null : null,
      description: body.description ?? null,
      allocations: body.allocations,
    }),
  });
}

export async function fetchSupplierPayments(supplierId: number): Promise<SupplierPayment[]> {
  return apiRequest<SupplierPayment[]>(`/suppliers/payments?supplierId=${supplierId}`);
}

/** Depo hareketi olmayan satırlar şubelere bölünebilir; post’ta varsayılan PATRON, isteğe REGISTER (şube ödedi). */
export type SupplierInvoiceLineBranchShare = {
  id: number;
  branchId: number;
  amount: number;
  branchTransactionId: number | null;
};

export type SupplierInvoiceLineBranchAllocationsState = {
  lineId: number;
  invoiceId: number;
  lineAmount: number;
  currencyCode: string;
  canAllocateToBranches: boolean;
  isPosted: boolean;
  documentNumber: string | null;
  lineNo: number;
  supplierName: string;
  lineDescription: string | null;
  shares: SupplierInvoiceLineBranchShare[];
};

export async function fetchSupplierInvoiceLineBranchAllocations(
  lineId: number
): Promise<SupplierInvoiceLineBranchAllocationsState> {
  return apiRequest<SupplierInvoiceLineBranchAllocationsState>(
    `/suppliers/invoice-lines/${lineId}/branch-allocations`
  );
}

export async function setSupplierInvoiceLineBranchAllocations(
  lineId: number,
  body: { shares: Array<{ branchId: number; amount: number }> }
): Promise<SupplierInvoiceLineBranchAllocationsState> {
  return apiRequest<SupplierInvoiceLineBranchAllocationsState>(
    `/suppliers/invoice-lines/${lineId}/branch-allocations`,
    {
      method: "PUT",
      body: JSON.stringify({
        shares: body.shares.map((s) => ({
          branchId: s.branchId,
          amount: s.amount,
        })),
      }),
    }
  );
}

export async function postSupplierInvoiceLineBranchAllocations(
  lineId: number,
  body: {
    transactionDate: string;
    expenseMainCategory?: string | null;
    expenseCategory?: string | null;
    expensePaymentSource?: "PATRON" | "REGISTER";
  }
): Promise<{ createdBranchTransactionIds: number[] }> {
  return apiRequest<{ createdBranchTransactionIds: number[] }>(
    `/suppliers/invoice-lines/${lineId}/branch-allocations/post`,
    {
      method: "POST",
      body: JSON.stringify({
        transactionDate: body.transactionDate,
        expenseMainCategory: body.expenseMainCategory ?? null,
        expenseCategory: body.expenseCategory ?? null,
        expensePaymentSource: body.expensePaymentSource ?? "PATRON",
      }),
    }
  );
}
