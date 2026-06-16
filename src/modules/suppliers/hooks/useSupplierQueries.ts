"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSupplier,
  createSupplierInvoice,
  createSupplierPayment,
  deleteSupplier,
  deleteSupplierInvoicePhoto,
  fetchSupplierInvoice,
  fetchSupplierInvoiceLineBranchAllocations,
  fetchSupplierInvoices,
  fetchSupplierPayments,
  fetchSupplierView,
  fetchSuppliers,
  postSupplierInvoiceLineBranchAllocations,
  setSupplierInvoiceLineBranchAllocations,
  updateSupplier,
  updateSupplierInvoice,
  uploadSupplierInvoicePhoto,
  type SupplierInvoiceListQuery,
} from "@/modules/suppliers/api/suppliers-api";
import { fetchAuditLogs } from "@/lib/api/audit-logs-api";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
import { dashboardSummaryKeys } from "@/modules/dashboard/query-keys";
import { reportsKeys } from "@/modules/reports/query-keys";
import { createOptimisticListDelete } from "@/shared/lib/optimistic-list-delete";

export const supplierKeys = {
  all: ["suppliers"] as const,
  list: (includeDeleted: boolean) => [...supplierKeys.all, "list", includeDeleted] as const,
  invoices: (f: SupplierInvoiceListQuery) =>
    [
      ...supplierKeys.all,
      "invoices",
      f.supplierId ?? "all",
      f.dateFrom ?? "",
      f.dateTo ?? "",
      f.minLinesTotal ?? "",
      f.maxLinesTotal ?? "",
      f.paymentStatus ?? "all",
    ] as const,
  invoice: (id: number) => [...supplierKeys.all, "invoice", id] as const,
  invoiceAudit: (id: number) => [...supplierKeys.all, "invoice-audit", id] as const,
  payments: (supplierId: number) => [...supplierKeys.all, "payments", supplierId] as const,
  lineAlloc: (lineId: number) => [...supplierKeys.all, "line-alloc", lineId] as const,
  view: (id: number) => [...supplierKeys.all, "view", id] as const,
};

export function useSuppliers(includeDeleted = false, enabled: boolean = true) {
  return useQuery({
    queryKey: supplierKeys.list(includeDeleted),
    queryFn: () => fetchSuppliers(includeDeleted),
    enabled,
  });
}

export function useSupplierView(supplierId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: supplierKeys.view(supplierId ?? 0),
    queryFn: () => fetchSupplierView(supplierId!),
    enabled: enabled && supplierId != null && supplierId > 0,
  });
}

export function useSupplierInvoices(filters: SupplierInvoiceListQuery) {
  return useQuery({
    queryKey: supplierKeys.invoices(filters),
    queryFn: () => fetchSupplierInvoices(filters),
  });
}

export function useSupplierInvoice(id: number | null, enabled: boolean) {
  return useQuery({
    queryKey: supplierKeys.invoice(id ?? 0),
    queryFn: () => fetchSupplierInvoice(id!),
    enabled: enabled && id != null && id > 0,
  });
}

export function useSupplierInvoiceAuditLogs(invoiceId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: supplierKeys.invoiceAudit(invoiceId ?? 0),
    queryFn: () =>
      fetchAuditLogs({
        tableName: "supplier_invoices",
        recordId: invoiceId!,
      }),
    enabled: enabled && invoiceId != null && invoiceId > 0,
  });
}

export function useSupplierPayments(supplierId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: supplierKeys.payments(supplierId ?? 0),
    queryFn: () => fetchSupplierPayments(supplierId!),
    enabled: enabled && supplierId != null && supplierId > 0,
  });
}

/** Tedarikçinin açık (ödenmemiş) faturaları — FIFO dağıtım için. */
export function useSupplierOpenInvoices(supplierId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: supplierKeys.invoices({ supplierId: supplierId ?? undefined, paymentStatus: "unpaid" }),
    queryFn: () => fetchSupplierInvoices({ supplierId: supplierId!, paymentStatus: "unpaid" }),
    enabled: enabled && supplierId != null && supplierId > 0,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: number;
      name: string;
      taxId?: string | null;
      phone?: string | null;
      email?: string | null;
      notes?: string | null;
      defaultPaymentTermsDays?: number | null;
      currencyCode?: string;
      rowVersion?: number;
    }) => {
      const { id, ...body } = input;
      return updateSupplier(id, body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  const optimistic = createOptimisticListDelete<{ id: number }>({
    qc,
    queryKeyPrefix: supplierKeys.all,
    extractId: (s) => s.id,
  });
  return useMutation({
    mutationFn: deleteSupplier,
    ...optimistic((id) => id as number),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useCreateSupplierInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSupplierInvoice,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useUpdateSupplierInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; body: Parameters<typeof updateSupplierInvoice>[1] }) =>
      updateSupplierInvoice(input.id, input.body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: supplierKeys.invoice(vars.id) });
      void qc.invalidateQueries({ queryKey: supplierKeys.invoiceAudit(vars.id) });
      void qc.invalidateQueries({ queryKey: supplierKeys.all });
      // paymentMarkedComplete / line content may shift downstream summaries.
      void qc.invalidateQueries({ queryKey: branchKeys.all });
      void qc.invalidateQueries({ queryKey: reportsKeys.all });
      void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
    },
  });
}

export function useCreateSupplierPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSupplierPayment,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supplierKeys.all });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
      void qc.invalidateQueries({ queryKey: reportsKeys.all });
      void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
    },
  });
}

export function useUploadSupplierInvoicePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; file: File }) => uploadSupplierInvoicePhoto(input.id, input.file),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: supplierKeys.invoice(vars.id) });
      void qc.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useDeleteSupplierInvoicePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSupplierInvoicePhoto(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: supplierKeys.invoice(id) });
      void qc.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function useSupplierInvoiceLineAllocations(lineId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: supplierKeys.lineAlloc(lineId ?? 0),
    queryFn: () => fetchSupplierInvoiceLineBranchAllocations(lineId!),
    enabled: enabled && lineId != null && lineId > 0,
  });
}

export function useSetSupplierInvoiceLineBranchAllocations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { lineId: number; shares: Array<{ branchId: number; amount: number }> }) =>
      setSupplierInvoiceLineBranchAllocations(input.lineId, { shares: input.shares }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: supplierKeys.lineAlloc(vars.lineId) });
      void qc.invalidateQueries({ queryKey: supplierKeys.all });
    },
  });
}

export function usePostSupplierInvoiceLineBranchAllocations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      lineId: number;
      transactionDate: string;
      expenseMainCategory?: string | null;
      expenseCategory?: string | null;
      expensePaymentSource?: "PATRON" | "REGISTER";
    }) =>
      postSupplierInvoiceLineBranchAllocations(input.lineId, {
        transactionDate: input.transactionDate,
        expenseMainCategory: input.expenseMainCategory,
        expenseCategory: input.expenseCategory,
        expensePaymentSource: input.expensePaymentSource,
      }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: supplierKeys.lineAlloc(vars.lineId) });
      void qc.invalidateQueries({ queryKey: supplierKeys.all });
      // Post creates branch_transactions rows; refresh every downstream cache.
      void qc.invalidateQueries({ queryKey: branchKeys.all });
      void qc.invalidateQueries({ queryKey: reportsKeys.all });
      void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
    },
  });
}
