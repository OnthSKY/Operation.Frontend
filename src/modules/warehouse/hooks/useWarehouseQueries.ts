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
  createWarehouse,
  fetchWarehousePeopleOptions,
  fetchWarehouseUserOptions,
  fetchWarehouses,
  softDeleteWarehouse,
  updateWarehouse,
} from "@/modules/warehouse/api/warehouses-api";
import { registerWarehouseMovement } from "@/modules/warehouse/api/warehouse-movements-api";
import { transferWarehouseToBranch } from "@/modules/warehouse/api/warehouse-transfer-api";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
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
