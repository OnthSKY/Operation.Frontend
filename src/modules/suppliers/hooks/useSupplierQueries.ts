"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSupplier,
  createSupplierInvoice,
  createSupplierPayment,
  deleteSupplier,
  fetchSupplierInvoice,
  fetchSupplierInvoiceLineBranchAllocations,
  fetchSupplierInvoices,
  fetchSupplierPayments,
  fetchSupplierView,
  fetchSuppliers,
  postSupplierInvoiceLineBranchAllocations,
  setSupplierInvoiceLineBranchAllocations,
  updateSupplier,
  type SupplierInvoiceListQuery,
} from "@/modules/suppliers/api/suppliers-api";

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
  payments: (supplierId: number) => [...supplierKeys.all, "payments", supplierId] as const,
  lineAlloc: (lineId: number) => [...supplierKeys.all, "line-alloc", lineId] as const,
  view: (id: number) => [...supplierKeys.all, "view", id] as const,
};

export function useSuppliers(includeDeleted = false) {
  return useQuery({
    queryKey: supplierKeys.list(includeDeleted),
    queryFn: () => fetchSuppliers(includeDeleted),
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

export function useSupplierPayments(supplierId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: supplierKeys.payments(supplierId ?? 0),
    queryFn: () => fetchSupplierPayments(supplierId!),
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
  return useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
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

export function useCreateSupplierPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createSupplierPayment,
    onSuccess: () => {
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
    },
  });
}
