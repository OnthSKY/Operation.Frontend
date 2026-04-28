"use client";

import { categoryOptionLabel } from "@/modules/products/lib/category-labels";
import { useProductCategories, useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import {
  warehouseScopeEffectiveCategoryId,
  type WarehouseScopeFiltersValue,
} from "@/modules/warehouse/lib/warehouse-scope-filters";
import { useI18n } from "@/i18n/context";
import { Select } from "@/shared/ui/Select";
import type { ProductListItem } from "@/types/product";
import { useMemo } from "react";

export type { WarehouseScopeFiltersValue };
export { warehouseScopeEffectiveCategoryId } from "@/modules/warehouse/lib/warehouse-scope-filters";

function productInCategory(p: ProductListItem, catalog: ProductListItem[], cid: number | null): boolean {
  if (cid == null) return true;
  if (p.categoryId === cid) return true;
  if (p.parentProductId != null) {
    const par = catalog.find((x) => x.id === p.parentProductId);
    if (par?.categoryId === cid) return true;
  }
  return false;
}

type Props = {
  value: WarehouseScopeFiltersValue;
  onChange: (next: WarehouseScopeFiltersValue) => void;
  disabled?: boolean;
  /** Çekmece / modal içinde açılır liste z-index (ör. RightDrawer). */
  menuZIndex?: number;
};

export function WarehouseProductScopeFilters({
  value,
  onChange,
  disabled,
  menuZIndex,
}: Props) {
  const { t } = useI18n();
  const { data: categories = [], isPending: catLoading } = useProductCategories(true);
  const { data: catalog = [], isPending: prodLoading } = useProductsCatalog();

  const effectiveCat = warehouseScopeEffectiveCategoryId(value);

  const mainCategoryOptions = useMemo(() => {
    const roots = categories.filter((c) => c.parentCategoryId == null);
    const sorted = roots.slice().sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
    return [
      { value: "", label: t("warehouse.scopeAllMainCategories") },
      ...sorted.map((c) => ({ value: String(c.id), label: c.name })),
    ];
  }, [categories, t]);

  const subCategoryOptions = useMemo(() => {
    const mainId = value.mainCategoryId;
    if (mainId == null || mainId <= 0) {
      return [{ value: "", label: t("warehouse.scopeSubCategoryPlaceholder") }];
    }
    const subs = categories.filter((c) => c.parentCategoryId === mainId);
    const sorted = subs.slice().sort((a, b) =>
      categoryOptionLabel(categories, a).localeCompare(
        categoryOptionLabel(categories, b),
        undefined,
        { sensitivity: "base" }
      )
    );
    return [
      { value: "", label: t("warehouse.scopeAllUnderMain") },
      ...sorted.map((c) => ({
        value: String(c.id),
        label: categoryOptionLabel(categories, c),
      })),
    ];
  }, [categories, value.mainCategoryId, t]);

  const parentOptions = useMemo(() => {
    const cid = effectiveCat;
    const roots = catalog.filter((p) => p.parentProductId == null);
    const visible = roots.filter((r) => {
      if (cid == null) return true;
      if (productInCategory(r, catalog, cid)) return true;
      return catalog.some(
        (c) => c.parentProductId === r.id && productInCategory(c, catalog, cid)
      );
    });
    return [
      { value: "", label: t("warehouse.scopeAllGroups") },
      ...visible
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((p) => ({ value: String(p.id), label: p.name })),
    ];
  }, [catalog, effectiveCat, t]);

  const productOptions = useMemo(() => {
    const cid = effectiveCat;
    const pid = value.parentProductId;
    const rows = catalog.filter((p) => {
      if (!productInCategory(p, catalog, cid)) return false;
      if (pid != null) {
        if (p.id === pid) return true;
        if (p.parentProductId === pid) return true;
        return false;
      }
      return true;
    });
    return [
      { value: "", label: t("warehouse.scopeAllSkus") },
      ...rows
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        .map((p) => ({
          value: String(p.id),
          label: p.parentProductId != null ? `↳ ${p.name}` : p.name,
        })),
    ];
  }, [catalog, effectiveCat, value.parentProductId, t]);

  const loading = catLoading || prodLoading;
  const mainPick =
    value.mainCategoryId != null && value.mainCategoryId > 0 ? String(value.mainCategoryId) : "";
  const subPick =
    value.subCategoryId != null && value.subCategoryId > 0 ? String(value.subCategoryId) : "";
  const parPick =
    value.parentProductId != null && value.parentProductId > 0 ? String(value.parentProductId) : "";
  const prodPick = value.productId != null && value.productId > 0 ? String(value.productId) : "";

  const mainUnset = value.mainCategoryId == null || value.mainCategoryId <= 0;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {loading ? (
        <p className="text-sm text-zinc-500 sm:col-span-2 lg:col-span-4">{t("common.loading")}</p>
      ) : (
        <>
          <Select
            label={t("warehouse.scopeMainCategory")}
            name="wh-scope-main-category"
            options={mainCategoryOptions}
            menuZIndex={menuZIndex}
            value={mainPick}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                mainCategoryId: v !== "" && Number(v) > 0 ? Math.trunc(Number(v)) : null,
                subCategoryId: null,
                parentProductId: null,
                productId: null,
              });
            }}
            onBlur={() => {}}
            disabled={disabled}
            className="min-h-11 sm:min-h-[44px] sm:text-sm"
          />
          <Select
            label={t("warehouse.scopeSubCategory")}
            name="wh-scope-sub-category"
            options={subCategoryOptions}
            menuZIndex={menuZIndex}
            value={mainUnset ? "" : subPick}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...value,
                subCategoryId: v !== "" && Number(v) > 0 ? Math.trunc(Number(v)) : null,
                parentProductId: null,
                productId: null,
              });
            }}
            onBlur={() => {}}
            disabled={disabled || mainUnset}
            className="min-h-11 sm:min-h-[44px] sm:text-sm"
          />
          <Select
            label={t("warehouse.scopeMainProduct")}
            name="wh-scope-parent"
            options={parentOptions}
            menuZIndex={menuZIndex}
            value={parPick}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...value,
                parentProductId: v !== "" && Number(v) > 0 ? Math.trunc(Number(v)) : null,
                productId: null,
              });
            }}
            onBlur={() => {}}
            disabled={disabled}
            className="min-h-11 sm:min-h-[44px] sm:text-sm"
          />
          <Select
            label={t("warehouse.scopeSubProduct")}
            name="wh-scope-product"
            options={productOptions}
            menuZIndex={menuZIndex}
            value={prodPick}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...value,
                productId: v !== "" && Number(v) > 0 ? Math.trunc(Number(v)) : null,
              });
            }}
            onBlur={() => {}}
            disabled={disabled}
            className="min-h-11 sm:min-h-[44px] sm:text-sm"
          />
        </>
      )}
    </div>
  );
}
