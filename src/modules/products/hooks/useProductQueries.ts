"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsRootKey, warehouseRootKey } from "@/modules/stock/query-keys";
import {
  createProduct,
  fetchProductCatalogPaged,
  fetchProductInventory,
  fetchProductMovementsPage,
  fetchProductsCatalog,
  setProductCategory,
  softDeleteProduct,
  updateProduct,
} from "@/modules/products/api/products-api";
import {
  createProductCategory,
  deleteProductCategory,
  fetchProductCategories,
  updateProductCategory,
} from "@/modules/products/api/product-categories-api";
import type { ProductMovementsPageParams } from "@/types/product";

export const productKeys = {
  all: productsRootKey,
  categories: () => [...productKeys.all, "categories"] as const,
  catalog: () => [...productKeys.all, "catalog"] as const,
  catalogPaged: (page: number, pageSize: number, search: string) =>
    [...productKeys.all, "catalog-paged", page, pageSize, search] as const,
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

export function useProductsCatalog(enabled = true) {
  return useQuery({
    queryKey: productKeys.catalog(),
    queryFn: fetchProductsCatalog,
    enabled,
  });
}

export function useProductsCatalogPaged(
  page: number,
  pageSize: number,
  search: string,
  enabled = true
) {
  const q = search.trim();
  return useQuery({
    queryKey: productKeys.catalogPaged(page, pageSize, q),
    queryFn: () => fetchProductCatalogPaged({ page, pageSize, search: q }),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

function invalidateProductCatalogQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: productKeys.catalog() });
  void qc.invalidateQueries({ queryKey: [...productKeys.all, "catalog-paged"], exact: false });
}

export function useProductCategories(enabled = true) {
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn: fetchProductCategories,
    enabled,
  });
}

export function useCreateProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; parentCategoryId?: number | null }) => createProductCategory(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.categories() });
      invalidateProductCatalogQueries(qc);
    },
  });
}

export function useUpdateProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateProductCategory(id, name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.categories() });
      invalidateProductCatalogQueries(qc);
    },
  });
}

export function useDeleteProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProductCategory(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.categories() });
      invalidateProductCatalogQueries(qc);
    },
  });
}

export function useSetProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, categoryId }: { productId: number; categoryId: number | null }) =>
      setProductCategory(productId, categoryId),
    onSuccess: (_data, vars) => {
      invalidateProductCatalogQueries(qc);
      void qc.invalidateQueries({ queryKey: productKeys.inventory(vars.productId) });
      void qc.invalidateQueries({ queryKey: warehouseRootKey });
    },
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
      invalidateProductCatalogQueries(qc);
      void qc.invalidateQueries({ queryKey: warehouseRootKey });
    },
  });
}

export function useSoftDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeleteProduct(id),
    onSuccess: () => {
      invalidateProductCatalogQueries(qc);
      void qc.invalidateQueries({ queryKey: warehouseRootKey });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      name,
      unit,
      categoryId,
      parentProductId,
    }: {
      id: number;
      name: string;
      unit?: string | null;
      categoryId?: number | null;
      parentProductId?: number | null;
    }) => updateProduct(id, { name, unit, categoryId, parentProductId }),
    onSuccess: (_data, vars) => {
      invalidateProductCatalogQueries(qc);
      void qc.invalidateQueries({ queryKey: productKeys.inventory(vars.id) });
      void qc.invalidateQueries({ queryKey: warehouseRootKey });
    },
  });
}
