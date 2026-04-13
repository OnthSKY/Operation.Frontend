export type WarehouseScopeFiltersValue = {
  mainCategoryId: number | null;
  subCategoryId: number | null;
  parentProductId: number | null;
  productId: number | null;
};

export function warehouseScopeEffectiveCategoryId(
  v: WarehouseScopeFiltersValue
): number | null {
  if (v.subCategoryId != null && v.subCategoryId > 0) {
    return Math.trunc(v.subCategoryId);
  }
  if (v.mainCategoryId != null && v.mainCategoryId > 0) {
    return Math.trunc(v.mainCategoryId);
  }
  return null;
}

export function warehouseScopeFiltersActive(v: WarehouseScopeFiltersValue): boolean {
  return (
    warehouseScopeEffectiveCategoryId(v) != null ||
    (v.parentProductId != null && v.parentProductId > 0) ||
    (v.productId != null && v.productId > 0)
  );
}
