"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsRootKey, warehouseRootKey } from "@/modules/stock/query-keys";
import { fetchWarehouseStock } from "@/modules/warehouse/api/warehouse-stock-api";
import {
  createWarehouse,
  fetchWarehouses,
  softDeleteWarehouse,
} from "@/modules/warehouse/api/warehouses-api";
import { registerWarehouseMovement } from "@/modules/warehouse/api/warehouse-movements-api";

export const warehouseKeys = {
  all: warehouseRootKey,
  list: () => [...warehouseKeys.all, "list"] as const,
  stock: (warehouseId: number) => [...warehouseKeys.all, "stock", warehouseId] as const,
};

export function useWarehousesList() {
  return useQuery({
    queryKey: warehouseKeys.list(),
    queryFn: fetchWarehouses,
  });
}

export function useWarehouseStock(warehouseId: number | null) {
  return useQuery({
    queryKey: warehouseKeys.stock(warehouseId ?? 0),
    queryFn: () => fetchWarehouseStock(warehouseId!),
    enabled: warehouseId != null && warehouseId > 0,
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createWarehouse(name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.list() });
    },
  });
}

export function useSoftDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeleteWarehouse(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.list() });
    },
  });
}

export function useRegisterWarehouseMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: registerWarehouseMovement,
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: warehouseKeys.stock(vars.warehouseId) });
      void qc.invalidateQueries({ queryKey: productsRootKey });
    },
  });
}
