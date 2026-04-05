"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsRootKey, warehouseRootKey } from "@/modules/stock/query-keys";
import {
  createProduct,
  fetchProductInventory,
  fetchProductMovements,
  fetchProductsCatalog,
  softDeleteProduct,
} from "@/modules/products/api/products-api";

export const productKeys = {
  all: productsRootKey,
  catalog: () => [...productKeys.all, "catalog"] as const,
  inventory: (id: number) => [...productKeys.all, "inventory", id] as const,
  movements: (id: number, warehouseId?: number) =>
    [...productKeys.all, "movements", id, warehouseId ?? "all"] as const,
};

export function useProductsCatalog() {
  return useQuery({
    queryKey: productKeys.catalog(),
    queryFn: fetchProductsCatalog,
  });
}

export function useProductInventory(productId: number | null) {
  return useQuery({
    queryKey: productKeys.inventory(productId ?? 0),
    queryFn: () => fetchProductInventory(productId!),
    enabled: productId != null && productId > 0,
  });
}

export function useProductMovements(
  productId: number | null,
  warehouseId?: number | null
) {
  return useQuery({
    queryKey: productKeys.movements(productId ?? 0, warehouseId ?? undefined),
    queryFn: () =>
      fetchProductMovements(productId!, {
        warehouseId: warehouseId ?? undefined,
        limit: 200,
      }),
    enabled: productId != null && productId > 0,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.catalog() });
      void qc.invalidateQueries({ queryKey: warehouseRootKey });
    },
  });
}

export function useSoftDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeleteProduct(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.catalog() });
      void qc.invalidateQueries({ queryKey: warehouseRootKey });
    },
  });
}
