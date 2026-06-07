"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productsRootKey, warehouseRootKey } from "@/modules/stock/query-keys";
import {
  addProductUnit,
  applyProductUnitMigration,
  createProduct,
  deleteProductUnit,
  fetchProductCatalogPaged,
  fetchProductInventory,
  fetchProductMovementsPage,
  fetchProductsCatalog,
  fetchProductUnitMigrationPreview,
  fetchProductUnits,
  setProductCategory,
  setProductStockUnit,
  softDeleteProduct,
  updateProduct,
  updateProductUnit,
  type ApplyProductUnitMigrationInput,
} from "@/modules/products/api/products-api";
import {
  createProductCategory,
  deleteProductCategory,
  fetchProductCategories,
  updateProductCategory,
} from "@/modules/products/api/product-categories-api";
import type {
  AddProductUnitInput,
  ProductMovementsPageParams,
  UpdateProductUnitInput,
} from "@/types/product";

export const productKeys = {
  all: productsRootKey,
  categories: () => [...productKeys.all, "categories"] as const,
  catalog: () => [...productKeys.all, "catalog"] as const,
  catalogPaged: (page: number, pageSize: number, search: string) =>
    [...productKeys.all, "catalog-paged", page, pageSize, search] as const,
  catalogPagedOrderable: (page: number, pageSize: number, search: string, orderableOnly: boolean) =>
    [...productKeys.all, "catalog-paged", page, pageSize, search, orderableOnly ? 1 : 0] as const,
  inventory: (id: number) => [...productKeys.all, "inventory", id] as const,
  units: (id: number) => [...productKeys.all, "units", id] as const,
  unitMigration: (id: number) => [...productKeys.all, "unit-migration", id] as const,
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
    // Stale cache kullanıcıyı eksik liste görmüş gibi gösterebiliyor — modal/dropdown her açılışta
    // taze veri çek (catalog küçük, maliyeti düşük; mutation'lardan sonra invalidasyon zaten var).
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useProductsCatalogPaged(
  page: number,
  pageSize: number,
  search: string,
  enabled = true,
  /** Sayfa veya arama değişince önceki yanıtı tutar (varsayılan). Sonsuz kaydırma gibi birleştirme senaryolarında false verin. */
  keepPreviousData = true,
  orderableOnly = false
) {
  const q = search.trim();
  return useQuery({
    queryKey: productKeys.catalogPagedOrderable(page, pageSize, q, orderableOnly),
    queryFn: () => fetchProductCatalogPaged({ page, pageSize, search: q, orderableOnly }),
    enabled,
    placeholderData: keepPreviousData ? (previousData) => previousData : undefined,
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
      isOrderable,
      stockUnit,
      stockTrackingMode,
    }: {
      id: number;
      name: string;
      unit?: string | null;
      categoryId?: number | null;
      parentProductId?: number | null;
      isOrderable?: boolean;
      stockUnit?: string | null;
      stockTrackingMode?: import("@/types/product").StockTrackingMode;
    }) =>
      updateProduct(id, {
        name,
        unit,
        categoryId,
        parentProductId,
        isOrderable,
        stockUnit,
        stockTrackingMode,
      }),
    onSuccess: (_data, vars) => {
      invalidateProductCatalogQueries(qc);
      void qc.invalidateQueries({ queryKey: productKeys.inventory(vars.id) });
      void qc.invalidateQueries({ queryKey: warehouseRootKey });
    },
  });
}

export function useProductUnits(productId: number | null) {
  return useQuery({
    queryKey: productKeys.units(productId ?? 0),
    queryFn: () => fetchProductUnits(productId!),
    enabled: productId != null && productId > 0,
  });
}

export function useAddProductUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, input }: { productId: number; input: AddProductUnitInput }) =>
      addProductUnit(productId, input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: productKeys.units(vars.productId) });
    },
  });
}

export function useUpdateProductUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      productId,
      unitId,
      input,
    }: {
      productId: number;
      unitId: number;
      input: UpdateProductUnitInput;
    }) => updateProductUnit(productId, unitId, input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: productKeys.units(vars.productId) });
    },
  });
}

export function useDeleteProductUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, unitId }: { productId: number; unitId: number }) =>
      deleteProductUnit(productId, unitId),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: productKeys.units(vars.productId) });
    },
  });
}

export function useProductUnitMigrationPreview(productId: number | null, enabled = true) {
  return useQuery({
    queryKey: productKeys.unitMigration(productId ?? 0),
    queryFn: () => fetchProductUnitMigrationPreview(productId!),
    enabled: enabled && productId != null && productId > 0,
    staleTime: 0,
  });
}

export function useSetProductStockUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, baseUnit }: { productId: number; baseUnit: string }) =>
      setProductStockUnit(productId, baseUnit),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: productKeys.unitMigration(vars.productId) });
      void qc.invalidateQueries({ queryKey: productKeys.units(vars.productId) });
      void qc.invalidateQueries({ queryKey: productKeys.inventory(vars.productId) });
      invalidateProductCatalogQueries(qc);
    },
  });
}

export function useApplyProductUnitMigration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, input }: { productId: number; input: ApplyProductUnitMigrationInput }) =>
      applyProductUnitMigration(productId, input),
    onSuccess: (_data, vars) => {
      // Migrasyon sonrası: ürün kartı, birim listesi ve hareket bakiyeleri hepsi
      // değişebilir — geniş invalidate.
      void qc.invalidateQueries({ queryKey: productKeys.units(vars.productId) });
      void qc.invalidateQueries({ queryKey: productKeys.unitMigration(vars.productId) });
      void qc.invalidateQueries({ queryKey: productKeys.inventory(vars.productId) });
      invalidateProductCatalogQueries(qc);
      void qc.invalidateQueries({ queryKey: warehouseRootKey });
    },
  });
}
