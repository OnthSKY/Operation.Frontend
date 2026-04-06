"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsRootKey, warehouseRootKey } from "@/modules/stock/query-keys";
import {
  createProduct,
  fetchProductInventory,
  fetchProductMovementsPage,
  fetchProductsCatalog,
  softDeleteProduct,
} from "@/modules/products/api/products-api";
import type { ProductMovementsPageParams } from "@/types/product";

export const productKeys = {
  all: productsRootKey,
  catalog: () => [...productKeys.all, "catalog"] as const,
  inventory: (id: number) => [...productKeys.all, "inventory", id] as const,
  movementsPage: (id: number, params: ProductMovementsPageParams) =>
    [
      ...productKeys.all,
      "movements-paged",
      id,
      params.page,
      params.pageSize,
      params.warehouseId ?? 0,
      params.type ?? "",
      params.dateFrom ?? "",
      params.dateTo ?? "",
    ] as const,
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

export function useProductMovementsPage(
  productId: number | null,
  params: ProductMovementsPageParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: productKeys.movementsPage(productId ?? 0, params),
    queryFn: () => fetchProductMovementsPage(productId!, params),
    enabled: enabled && productId != null && productId > 0,
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
