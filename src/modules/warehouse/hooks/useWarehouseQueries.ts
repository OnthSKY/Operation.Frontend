"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsRootKey, warehouseRootKey } from "@/modules/stock/query-keys";
import {
  fetchWarehouseAuditPage,
  fetchWarehouseDetail,
  fetchWarehouseMovementsPage,
  fetchWarehouseStock,
} from "@/modules/warehouse/api/warehouse-stock-api";
import {
  appendWarehouseOutboundShipmentLine,
  createWarehouse,
  fetchWarehouseInboundMovementForEdit,
  fetchWarehouseOutboundShipmentMovementForEdit,
  fetchWarehousePeopleOptions,
  fetchWarehouseUserOptions,
  fetchWarehouses,
  patchWarehouseInboundMovementDates,
  softDeleteWarehouse,
  softDeleteWarehouseInboundMovement,
  softDeleteWarehouseOutboundShipmentMovement,
  updateWarehouse,
  updateWarehouseInboundMovement,
  updateWarehouseOutboundShipmentMovement,
  uploadWarehouseInboundMovementInvoicePhoto,
  type PatchWarehouseInboundMovementDatesInput,
  type AppendWarehouseOutboundShipmentLineBody,
  type UpdateWarehouseInboundMovementBody,
  type UpdateWarehouseOutboundShipmentMovementBody,
} from "@/modules/warehouse/api/warehouses-api";
import { registerWarehouseMovement } from "@/modules/warehouse/api/warehouse-movements-api";
import {
  previewWarehouseTransferToBranch,
  transferWarehouseToBranch,
} from "@/modules/warehouse/api/warehouse-transfer-api";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
import { dashboardOverviewKeys } from "@/modules/dashboard/query-keys";
import type {
  CreateWarehouseInput,
  WarehouseAuditPageParams,
  WarehouseMovementsPageParams,
  WarehouseStockFilters,
} from "@/types/warehouse";

function stockQueryKey(warehouseId: number, filters: WarehouseStockFilters) {
  const c = filters.categoryId != null && filters.categoryId > 0 ? filters.categoryId : 0;
  const p = filters.parentProductId != null && filters.parentProductId > 0 ? filters.parentProductId : 0;
  const r = filters.productId != null && filters.productId > 0 ? filters.productId : 0;
  return [...warehouseKeys.all, "stock", warehouseId, c, p, r] as const;
}

export const warehouseKeys = {
  all: warehouseRootKey,
  list: () => [...warehouseKeys.all, "list"] as const,
  stock: stockQueryKey,
};

function invalidateWarehouseQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: warehouseRootKey, exact: false });
  void qc.invalidateQueries({ queryKey: dashboardOverviewKeys.all });
}

export function useWarehousesList() {
  return useQuery({
    queryKey: warehouseKeys.list(),
    queryFn: fetchWarehouses,
  });
}

export function useWarehouseUserOptions(enabled: boolean) {
  return useQuery({
    queryKey: [...warehouseKeys.all, "userOptions"] as const,
    queryFn: fetchWarehouseUserOptions,
    enabled,
  });
}

export function useWarehousePeopleOptions(enabled: boolean) {
  return useQuery({
    queryKey: [...warehouseKeys.all, "peopleOptions"] as const,
    queryFn: fetchWarehousePeopleOptions,
    enabled,
  });
}

export function useWarehouseDetail(warehouseId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: [...warehouseKeys.all, "detail", warehouseId ?? 0],
    queryFn: () => fetchWarehouseDetail(warehouseId!),
    enabled: enabled && warehouseId != null && warehouseId > 0,
  });
}

export function useWarehouseStock(
  warehouseId: number | null,
  filters: WarehouseStockFilters = {}
) {
  const id = warehouseId ?? 0;
  return useQuery({
    queryKey: warehouseKeys.stock(id, filters),
    queryFn: () => fetchWarehouseStock(warehouseId!, filters),
    enabled: warehouseId != null && warehouseId > 0,
  });
}

export function useWarehouseMovementsPage(
  warehouseId: number | null,
  params: WarehouseMovementsPageParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: [...warehouseKeys.all, "movementsPage", warehouseId, params] as const,
    queryFn: () => fetchWarehouseMovementsPage(warehouseId!, params),
    enabled: enabled && warehouseId != null && warehouseId > 0,
    placeholderData: (p) => p,
  });
}

export function useWarehouseAuditPage(
  warehouseId: number | null,
  params: WarehouseAuditPageParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: [...warehouseKeys.all, "auditPage", warehouseId, params] as const,
    queryFn: () => fetchWarehouseAuditPage(warehouseId!, params),
    enabled: enabled && warehouseId != null && warehouseId > 0,
    placeholderData: (p) => p,
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWarehouseInput) => createWarehouse(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.list() });
      invalidateWarehouseQueries(qc);
    },
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: CreateWarehouseInput }) =>
      updateWarehouse(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.list() });
      invalidateWarehouseQueries(qc);
    },
  });
}

export function useSoftDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeleteWarehouse(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.list() });
      invalidateWarehouseQueries(qc);
    },
  });
}

export function useWarehouseInboundMovementForEdit(
  warehouseId: number | null,
  movementId: number | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: [...warehouseKeys.all, "inboundEdit", warehouseId, movementId] as const,
    queryFn: () => fetchWarehouseInboundMovementForEdit(warehouseId!, movementId!),
    enabled: enabled && warehouseId != null && warehouseId > 0 && movementId != null && movementId > 0,
  });
}

export function useUpdateWarehouseInboundMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      warehouseId: number;
      movementId: number;
      body: UpdateWarehouseInboundMovementBody;
    }) => updateWarehouseInboundMovement(vars.warehouseId, vars.movementId, vars.body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "movementsPage", vars.warehouseId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "auditPage", vars.warehouseId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "inboundEdit", vars.warehouseId, vars.movementId],
      });
      invalidateWarehouseQueries(qc);
      void qc.invalidateQueries({ queryKey: productsRootKey });
    },
  });
}

export function useUploadWarehouseInboundMovementInvoicePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { warehouseId: number; movementId: number; file: File }) =>
      uploadWarehouseInboundMovementInvoicePhoto(vars.warehouseId, vars.movementId, vars.file),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "movementsPage", vars.warehouseId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "auditPage", vars.warehouseId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "inboundEdit", vars.warehouseId, vars.movementId],
      });
      invalidateWarehouseQueries(qc);
      void qc.invalidateQueries({ queryKey: productsRootKey });
    },
  });
}

export function useSoftDeleteWarehouseInboundMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { warehouseId: number; movementId: number }) =>
      softDeleteWarehouseInboundMovement(vars.warehouseId, vars.movementId),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "movementsPage", vars.warehouseId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "auditPage", vars.warehouseId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "inboundEdit", vars.warehouseId, vars.movementId],
      });
      invalidateWarehouseQueries(qc);
      void qc.invalidateQueries({ queryKey: productsRootKey });
    },
  });
}

export function useWarehouseOutboundShipmentMovementForEdit(
  warehouseId: number | null,
  movementId: number | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: [...warehouseKeys.all, "outboundShipmentEdit", warehouseId, movementId] as const,
    queryFn: () => fetchWarehouseOutboundShipmentMovementForEdit(warehouseId!, movementId!),
    enabled: enabled && warehouseId != null && warehouseId > 0 && movementId != null && movementId > 0,
  });
}

export function useUpdateWarehouseOutboundShipmentMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      warehouseId: number;
      movementId: number;
      body: UpdateWarehouseOutboundShipmentMovementBody;
    }) => updateWarehouseOutboundShipmentMovement(vars.warehouseId, vars.movementId, vars.body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "movementsPage", vars.warehouseId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "auditPage", vars.warehouseId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "outboundShipmentEdit", vars.warehouseId, vars.movementId],
      });
      invalidateWarehouseQueries(qc);
      void qc.invalidateQueries({ queryKey: productsRootKey });
      void qc.invalidateQueries({ queryKey: branchKeys.list() });
    },
  });
}

export function useSoftDeleteWarehouseOutboundShipmentMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { warehouseId: number; movementId: number }) =>
      softDeleteWarehouseOutboundShipmentMovement(vars.warehouseId, vars.movementId),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "movementsPage", vars.warehouseId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "auditPage", vars.warehouseId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "outboundShipmentEdit", vars.warehouseId, vars.movementId],
      });
      invalidateWarehouseQueries(qc);
      void qc.invalidateQueries({ queryKey: productsRootKey });
      void qc.invalidateQueries({ queryKey: branchKeys.list() });
    },
  });
}

export function useAppendWarehouseOutboundShipmentLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      warehouseId: number;
      movementId: number;
      body: AppendWarehouseOutboundShipmentLineBody;
    }) => appendWarehouseOutboundShipmentLine(vars.warehouseId, vars.movementId, vars.body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "movementsPage", vars.warehouseId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "auditPage", vars.warehouseId],
        exact: false,
      });
      invalidateWarehouseQueries(qc);
      void qc.invalidateQueries({ queryKey: productsRootKey });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}

export function usePatchWarehouseInboundMovementDates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { warehouseId: number; body: PatchWarehouseInboundMovementDatesInput }) =>
      patchWarehouseInboundMovementDates(vars.warehouseId, vars.body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "movementsPage", vars.warehouseId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "auditPage", vars.warehouseId],
        exact: false,
      });
      invalidateWarehouseQueries(qc);
      void qc.invalidateQueries({ queryKey: productsRootKey });
    },
  });
}

export function useRegisterWarehouseMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: registerWarehouseMovement,
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "stock", vars.warehouseId],
        exact: false,
      });
      invalidateWarehouseQueries(qc);
      void qc.invalidateQueries({ queryKey: productsRootKey });
    },
  });
}

export function useTransferWarehouseToBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: transferWarehouseToBranch,
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({
        queryKey: [...warehouseKeys.all, "stock", vars.warehouseId],
        exact: false,
      });
      invalidateWarehouseQueries(qc);
      void qc.invalidateQueries({ queryKey: productsRootKey });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}

export function usePreviewWarehouseTransferToBranch() {
  return useMutation({
    mutationFn: previewWarehouseTransferToBranch,
  });
}
