"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createVehicle,
  createVehicleExpense,
  createVehicleInsurance,
  createVehicleMaintenance,
  deleteVehicle,
  deleteVehicleExpense,
  deleteVehicleInsurance,
  deleteVehicleMaintenance,
  deleteVehiclePhoto,
  fetchVehicle,
  fetchVehicleAuditPage,
  fetchVehicleExpenseSummary,
  fetchVehicles,
  patchVehicleOdometer,
  patchVehicleAssignment,
  updateVehicle,
  updateVehicleExpense,
  updateVehicleInsurance,
  updateVehicleMaintenance,
  uploadVehiclePhoto,
} from "@/modules/vehicles/api/vehicles-api";
import {
  deleteVehicleDocument,
  fetchVehicleDocuments,
  uploadVehicleDocument,
} from "@/modules/vehicles/api/vehicle-documents-api";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
import type { UploadVehicleDocumentInput } from "@/types/vehicle-document";
import type { VehicleAuditPageParams } from "@/types/vehicle";

export const vehicleKeys = {
  all: ["vehicles"] as const,
  list: () => [...vehicleKeys.all, "list"] as const,
  detail: (id: number) => [...vehicleKeys.all, "detail", id] as const,
  documents: (id: number) => [...vehicleKeys.all, "documents", id] as const,
  auditPage: (vehicleId: number, params: VehicleAuditPageParams) =>
    [...vehicleKeys.all, "auditPage", vehicleId, params] as const,
  expenseSummary: (p: {
    year?: number;
    month?: number;
    vehicleId?: number;
    branchId?: number;
  }) => [...vehicleKeys.all, "expense-summary", p] as const,
};

export function useVehicles() {
  return useQuery({
    queryKey: vehicleKeys.list(),
    queryFn: fetchVehicles,
  });
}

export function useVehicle(id: number | null, enabled: boolean) {
  return useQuery({
    queryKey: vehicleKeys.detail(id ?? 0),
    queryFn: () => fetchVehicle(id!),
    enabled: enabled && id != null && id > 0,
  });
}

export function useVehicleDocuments(vehicleId: number | null, enabled: boolean) {
  return useQuery({
    queryKey:
      vehicleId != null && vehicleId > 0
        ? vehicleKeys.documents(vehicleId)
        : ([...vehicleKeys.all, "documents", 0] as const),
    queryFn: () => fetchVehicleDocuments(vehicleId!),
    enabled: Boolean(enabled && vehicleId != null && vehicleId > 0),
  });
}

export function useUploadVehicleDocument(vehicleId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadVehicleDocumentInput) => uploadVehicleDocument(vehicleId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.documents(vehicleId) });
    },
  });
}

export function useDeleteVehicleDocument(vehicleId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentId: number) => deleteVehicleDocument(vehicleId, documentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.documents(vehicleId) });
    },
  });
}

export function useVehicleExpenseSummary(
  filters: {
    year?: number;
    month?: number;
    vehicleId?: number;
    branchId?: number;
  },
  enabled = true
) {
  return useQuery({
    queryKey: vehicleKeys.expenseSummary(filters),
    queryFn: () => fetchVehicleExpenseSummary(filters),
    enabled,
  });
}

export function useVehicleAuditPage(
  vehicleId: number,
  params: VehicleAuditPageParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: vehicleKeys.auditPage(vehicleId, params),
    queryFn: () => fetchVehicleAuditPage(vehicleId, params),
    enabled: enabled && vehicleId > 0,
  });
}

export function usePatchVehicleAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      vehicleId: number;
      assignedPersonnelId?: number | null;
      assignedBranchId?: number | null;
    }) => {
      const { vehicleId, ...body } = input;
      return patchVehicleAssignment(vehicleId, body);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(vars.vehicleId) });
      void qc.invalidateQueries({ queryKey: vehicleKeys.list() });
    },
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: number) => deleteVehicle(vehicleId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
    },
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: number;
      plateNumber: string;
      brand: string;
      model: string;
      year?: number | null;
      status: string;
      assignedPersonnelId?: number | null;
      assignedBranchId?: number | null;
      odometerKm?: number | null;
      inspectionValidUntil?: string | null;
      notes?: string | null;
      driverSrcValidUntil?: string | null;
      driverPsychotechnicalValidUntil?: string | null;
      serviceIntervalKm?: number | null;
      serviceIntervalMonths?: number | null;
    }) => {
      const { id, ...body } = input;
      return updateVehicle(id, body);
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(v.id) });
    },
  });
}

export function usePatchVehicleOdometer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { vehicleId: number; odometerKm?: number | null }) =>
      patchVehicleOdometer(input.vehicleId, { odometerKm: input.odometerKm }),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(vars.vehicleId) });
    },
  });
}

export function useUploadVehiclePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { vehicleId: number; file: File }) =>
      uploadVehiclePhoto(input.vehicleId, input.file),
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(vars.vehicleId) });
    },
  });
}

export function useDeleteVehiclePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: number) => deleteVehiclePhoto(vehicleId),
    onSuccess: (_d, vehicleId) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(vehicleId) });
    },
  });
}

export function useCreateVehicleInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      vehicleId: number;
      insuranceType: string;
      provider?: string | null;
      policyNumber?: string | null;
      startDate: string;
      endDate: string;
      amount?: number | null;
    }) => {
      const { vehicleId, ...body } = input;
      return createVehicleInsurance(vehicleId, body);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(vars.vehicleId) });
      void qc.invalidateQueries({ queryKey: vehicleKeys.list() });
    },
  });
}

export function useUpdateVehicleInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      vehicleId: number;
      insuranceId: number;
      insuranceType: string;
      provider?: string | null;
      policyNumber?: string | null;
      startDate: string;
      endDate: string;
      amount?: number | null;
    }) => {
      const { vehicleId, insuranceId, ...body } = input;
      return updateVehicleInsurance(vehicleId, insuranceId, body);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(vars.vehicleId) });
      void qc.invalidateQueries({ queryKey: vehicleKeys.list() });
    },
  });
}

export function useDeleteVehicleInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { vehicleId: number; insuranceId: number }) =>
      deleteVehicleInsurance(input.vehicleId, input.insuranceId),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(vars.vehicleId) });
      void qc.invalidateQueries({ queryKey: vehicleKeys.list() });
    },
  });
}

export function useCreateVehicleExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      vehicleId: number;
      expenseType: string;
      amount: number;
      currencyCode: string;
      expenseDate: string;
      description?: string | null;
      branchId?: number | null;
      branchExpensePaymentSource?: string | null;
      patronPaymentMethod?: string | null;
    }) => {
      const { vehicleId, ...body } = input;
      return createVehicleExpense(vehicleId, body);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(vars.vehicleId) });
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}

export function useUpdateVehicleExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      vehicleId: number;
      expenseId: number;
      expenseType: string;
      amount: number;
      currencyCode: string;
      expenseDate: string;
      description?: string | null;
      branchId?: number | null;
      branchExpensePaymentSource?: string | null;
      patronPaymentMethod?: string | null;
    }) => {
      const { vehicleId, expenseId, ...body } = input;
      return updateVehicleExpense(vehicleId, expenseId, body);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(vars.vehicleId) });
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}

export function useDeleteVehicleExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { vehicleId: number; expenseId: number }) =>
      deleteVehicleExpense(input.vehicleId, input.expenseId),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(vars.vehicleId) });
      void qc.invalidateQueries({ queryKey: vehicleKeys.all });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}

export function useCreateVehicleMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      vehicleId: number;
      serviceDate: string;
      odometerKm?: number | null;
      maintenanceType: string;
      workshop?: string | null;
      description?: string | null;
      cost?: number | null;
      currencyCode: string;
      nextDueDate?: string | null;
      nextDueKm?: number | null;
    }) => {
      const { vehicleId, ...body } = input;
      return createVehicleMaintenance(vehicleId, body);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(vars.vehicleId) });
      void qc.invalidateQueries({ queryKey: vehicleKeys.list() });
    },
  });
}

export function useUpdateVehicleMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      vehicleId: number;
      maintenanceId: number;
      serviceDate: string;
      odometerKm?: number | null;
      maintenanceType: string;
      workshop?: string | null;
      description?: string | null;
      cost?: number | null;
      currencyCode: string;
      nextDueDate?: string | null;
      nextDueKm?: number | null;
    }) => {
      const { vehicleId, maintenanceId, ...body } = input;
      return updateVehicleMaintenance(vehicleId, maintenanceId, body);
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(vars.vehicleId) });
      void qc.invalidateQueries({ queryKey: vehicleKeys.list() });
    },
  });
}

export function useDeleteVehicleMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { vehicleId: number; maintenanceId: number }) =>
      deleteVehicleMaintenance(input.vehicleId, input.maintenanceId),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: vehicleKeys.detail(vars.vehicleId) });
      void qc.invalidateQueries({ queryKey: vehicleKeys.list() });
    },
  });
}
