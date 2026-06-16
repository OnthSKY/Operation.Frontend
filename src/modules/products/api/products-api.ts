import { apiRequest } from "@/shared/api/client";
import type {
  AddProductUnitInput,
  ProductCatalogPaged,
  ProductCreated,
  ProductInventory,
  ProductListItem,
  ProductMovementsPageParams,
  ProductMovementsPaged,
  ProductUnit,
  ProductUnitType,
  ProductWarehouseQty,
  StockTrackingMode,
  UpdateProductUnitInput,
} from "@/types/product";

const TRACKING_MODES: readonly StockTrackingMode[] = ["INHERIT", "REALTIME", "END_OF_DAY"];
const UNIT_TYPES: readonly ProductUnitType[] = ["ANY", "PURCHASE", "TRANSFER", "SALE"];

function normalizeTrackingMode(v: unknown): StockTrackingMode {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  return (TRACKING_MODES as readonly string[]).includes(s)
    ? (s as StockTrackingMode)
    : "INHERIT";
}

function normalizeStockUnit(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function normalizeUnitType(v: unknown): ProductUnitType {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  return (UNIT_TYPES as readonly string[]).includes(s)
    ? (s as ProductUnitType)
    : "ANY";
}

export async function fetchProductsCatalog(): Promise<ProductListItem[]> {
  return apiRequest<ProductListItem[]>("/products");
}

function normalizeWarehouseQty(x: unknown): ProductWarehouseQty {
  const o = x as Record<string, unknown>;
  return {
    warehouseId: Number(o.warehouseId ?? o.WarehouseId) || 0,
    warehouseName: String(o.warehouseName ?? o.WarehouseName ?? "").trim(),
    quantity: Number(o.quantity ?? o.Quantity ?? 0) || 0,
  };
}

function normalizeProductListItem(r: Record<string, unknown>): ProductListItem {
  const bwRaw = r.byWarehouse ?? r.ByWarehouse;
  const byWarehouse = Array.isArray(bwRaw) ? bwRaw.map(normalizeWarehouseQty) : [];
  return {
    id: Number(r.id ?? r.Id) || 0,
    name: String(r.name ?? r.Name ?? ""),
    unit: r.unit != null && String(r.unit).trim() ? String(r.unit).trim() : null,
    parentProductId:
      r.parentProductId != null || r.ParentProductId != null
        ? Number(r.parentProductId ?? r.ParentProductId) || null
        : null,
    parentProductName:
      r.parentProductName != null || r.ParentProductName != null
        ? String(r.parentProductName ?? r.ParentProductName ?? "").trim() || null
        : null,
    categoryId:
      r.categoryId != null || r.CategoryId != null
        ? Number(r.categoryId ?? r.CategoryId) || null
        : null,
    categoryName:
      r.categoryName != null && String(r.categoryName ?? r.CategoryName).trim()
        ? String(r.categoryName ?? r.CategoryName).trim()
        : null,
    isOrderable: Boolean(r.isOrderable ?? r.IsOrderable ?? true),
    hasChildren: Boolean(r.hasChildren ?? r.HasChildren),
    totalQuantity: Number(r.totalQuantity ?? r.TotalQuantity ?? 0) || 0,
    byWarehouse,
    stockUnit: normalizeStockUnit(r.stockUnit ?? r.StockUnit),
    stockTrackingMode: normalizeTrackingMode(r.stockTrackingMode ?? r.StockTrackingMode),
  };
}

export async function fetchProductCatalogPaged(params: {
  page: number;
  pageSize: number;
  search?: string;
  orderableOnly?: boolean;
}): Promise<ProductCatalogPaged> {
  const q = new URLSearchParams();
  q.set("page", String(Math.max(1, params.page)));
  q.set("pageSize", String(Math.max(1, params.pageSize)));
  const s = params.search?.trim();
  if (s) q.set("search", s);
  if (params.orderableOnly) q.set("orderableOnly", "true");
  const raw = await apiRequest<Record<string, unknown>>(`/products/paged?${q.toString()}`);
  const itemsRaw = raw.items ?? raw.Items;
  const items = Array.isArray(itemsRaw)
    ? (itemsRaw as Record<string, unknown>[]).map(normalizeProductListItem)
    : [];
  const totalRaw = raw.totalCount ?? raw.TotalCount ?? 0;
  const pageRaw = raw.page ?? raw.Page ?? params.page;
  const pageSizeRaw = raw.pageSize ?? raw.PageSize ?? params.pageSize;
  return {
    items,
    totalCount: Number.isFinite(Number(totalRaw)) ? Math.trunc(Number(totalRaw)) : 0,
    page: Number.isFinite(Number(pageRaw)) ? Math.max(1, Math.trunc(Number(pageRaw))) : 1,
    pageSize: Number.isFinite(Number(pageSizeRaw))
      ? Math.max(1, Math.trunc(Number(pageSizeRaw)))
      : params.pageSize,
  };
}

export async function fetchProductInventory(productId: number): Promise<ProductInventory> {
  return apiRequest<ProductInventory>(`/products/${productId}/inventory`);
}

export async function fetchProductMovementsPage(
  productId: number,
  params: ProductMovementsPageParams
): Promise<ProductMovementsPaged> {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  q.set("pageSize", String(params.pageSize));
  if (params.warehouseId != null && params.warehouseId > 0) {
    q.set("warehouseId", String(params.warehouseId));
  }
  if (params.type === "IN" || params.type === "OUT") {
    q.set("type", params.type);
  }
  if (params.dateFrom?.length === 10) q.set("dateFrom", params.dateFrom);
  if (params.dateTo?.length === 10) q.set("dateTo", params.dateTo);
  return apiRequest<ProductMovementsPaged>(
    `/products/${productId}/movements?${q.toString()}`
  );
}

export async function createProduct(input: {
  name: string;
  unit?: string | null;
  parentProductId?: number | null;
  categoryId?: number | null;
  isOrderable?: boolean;
  stockUnit?: string | null;
  stockTrackingMode?: StockTrackingMode;
}): Promise<ProductCreated> {
  return apiRequest<ProductCreated>("/products", {
    method: "POST",
    body: JSON.stringify({
      name: input.name.trim(),
      unit: input.unit?.trim() || null,
      parentProductId:
        input.parentProductId != null && input.parentProductId > 0
          ? input.parentProductId
          : null,
      categoryId:
        input.categoryId != null && input.categoryId > 0 ? input.categoryId : null,
      isOrderable: input.isOrderable ?? true,
      stockUnit: input.stockUnit?.trim() || null,
      stockTrackingMode: input.stockTrackingMode ?? "INHERIT",
    }),
  });
}

export async function setProductCategory(
  productId: number,
  categoryId: number | null
): Promise<ProductCreated> {
  return apiRequest<ProductCreated>(`/products/${productId}/category`, {
    method: "PUT",
    body: JSON.stringify({
      categoryId,
    }),
  });
}

export async function softDeleteProduct(id: number): Promise<void> {
  await apiRequest<null>(`/products/${id}`, { method: "DELETE" });
}

export async function updateProduct(
  id: number,
  input: {
    name: string;
    unit?: string | null;
    categoryId?: number | null;
    parentProductId?: number | null;
    isOrderable?: boolean;
    stockUnit?: string | null;
    stockTrackingMode?: StockTrackingMode;
    rowVersion?: number;
  }
): Promise<ProductCreated> {
  return apiRequest<ProductCreated>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: input.name.trim(),
      unit: input.unit?.trim() || null,
      categoryId:
        input.categoryId != null && input.categoryId > 0 ? input.categoryId : null,
      parentProductId:
        input.parentProductId != null && input.parentProductId > 0
          ? input.parentProductId
          : null,
      isOrderable: input.isOrderable ?? true,
      stockUnit: input.stockUnit?.trim() || null,
      stockTrackingMode: input.stockTrackingMode ?? "INHERIT",
      rowVersion: input.rowVersion ?? null,
    }),
  });
}

function normalizeProductUnit(r: Record<string, unknown>): ProductUnit {
  return {
    id: Number(r.id ?? r.Id) || 0,
    productId: Number(r.productId ?? r.ProductId) || 0,
    unitName: String(r.unitName ?? r.UnitName ?? "").trim(),
    toBaseFactor: Number(r.toBaseFactor ?? r.ToBaseFactor ?? 0) || 0,
    unitType: normalizeUnitType(r.unitType ?? r.UnitType),
    isDefault: Boolean(r.isDefault ?? r.IsDefault),
    displayOrder: Number(r.displayOrder ?? r.DisplayOrder ?? 0) || 0,
  };
}

export async function fetchProductUnits(productId: number): Promise<ProductUnit[]> {
  const raw = await apiRequest<unknown>(`/products/${productId}/units`);
  return Array.isArray(raw) ? raw.map((r) => normalizeProductUnit(r as Record<string, unknown>)) : [];
}

export async function addProductUnit(
  productId: number,
  input: AddProductUnitInput
): Promise<ProductUnit> {
  const raw = await apiRequest<unknown>(`/products/${productId}/units`, {
    method: "POST",
    body: JSON.stringify({
      unitName: input.unitName.trim(),
      toBaseFactor: input.toBaseFactor,
      unitType: input.unitType ?? "ANY",
      isDefault: input.isDefault ?? false,
      displayOrder: input.displayOrder ?? 0,
    }),
  });
  return normalizeProductUnit(raw as Record<string, unknown>);
}

export async function updateProductUnit(
  productId: number,
  unitId: number,
  input: UpdateProductUnitInput
): Promise<ProductUnit> {
  const raw = await apiRequest<unknown>(`/products/${productId}/units/${unitId}`, {
    method: "PUT",
    body: JSON.stringify({
      unitName: input.unitName.trim(),
      toBaseFactor: input.toBaseFactor,
      unitType: input.unitType ?? "ANY",
      isDefault: input.isDefault ?? false,
      displayOrder: input.displayOrder ?? 0,
    }),
  });
  return normalizeProductUnit(raw as Record<string, unknown>);
}

export async function deleteProductUnit(productId: number, unitId: number): Promise<void> {
  await apiRequest<null>(`/products/${productId}/units/${unitId}`, { method: "DELETE" });
}

export type ProductUnitMigrationPreview = {
  productId: number;
  currentStockUnit: string | null;
  legacyUnitLabel: string | null;
  legacyWarehouseMovementCount: number;
  legacyBranchStockMovementCount: number;
  legacyBranchStockConsumptionCount: number;
  requiresMigration: boolean;
};

export type ApplyProductUnitMigrationInput = {
  baseUnit: string;
  legacyUnitName: string;
  legacyToBaseFactor: number;
  legacyUnitType?: ProductUnitType;
};

export type ApplyProductUnitMigrationResponse = {
  updatedWarehouseMovements: number;
  updatedBranchStockMovements: number;
  updatedBranchStockConsumptions: number;
};

export async function fetchProductUnitMigrationPreview(productId: number): Promise<ProductUnitMigrationPreview> {
  const raw = await apiRequest<Record<string, unknown>>(`/products/${productId}/unit-migration/preview`);
  return {
    productId: Number(raw.productId ?? raw.ProductId) || 0,
    currentStockUnit: normalizeStockUnit(raw.currentStockUnit ?? raw.CurrentStockUnit),
    legacyUnitLabel: normalizeStockUnit(raw.legacyUnitLabel ?? raw.LegacyUnitLabel),
    legacyWarehouseMovementCount: Number(raw.legacyWarehouseMovementCount ?? raw.LegacyWarehouseMovementCount ?? 0) || 0,
    legacyBranchStockMovementCount: Number(raw.legacyBranchStockMovementCount ?? raw.LegacyBranchStockMovementCount ?? 0) || 0,
    legacyBranchStockConsumptionCount: Number(raw.legacyBranchStockConsumptionCount ?? raw.LegacyBranchStockConsumptionCount ?? 0) || 0,
    requiresMigration: Boolean(raw.requiresMigration ?? raw.RequiresMigration ?? false),
  };
}

export async function setProductStockUnit(productId: number, baseUnit: string): Promise<void> {
  await apiRequest<null>(`/products/${productId}/stock-unit`, {
    method: "POST",
    body: JSON.stringify({ baseUnit: baseUnit.trim() }),
  });
}

export async function applyProductUnitMigration(
  productId: number,
  input: ApplyProductUnitMigrationInput
): Promise<ApplyProductUnitMigrationResponse> {
  const raw = await apiRequest<Record<string, unknown>>(`/products/${productId}/unit-migration`, {
    method: "POST",
    body: JSON.stringify({
      baseUnit: input.baseUnit.trim(),
      legacyUnitName: input.legacyUnitName.trim(),
      legacyToBaseFactor: input.legacyToBaseFactor,
      legacyUnitType: input.legacyUnitType ?? "ANY",
    }),
  });
  return {
    updatedWarehouseMovements: Number(raw.updatedWarehouseMovements ?? raw.UpdatedWarehouseMovements ?? 0) || 0,
    updatedBranchStockMovements: Number(raw.updatedBranchStockMovements ?? raw.UpdatedBranchStockMovements ?? 0) || 0,
    updatedBranchStockConsumptions: Number(raw.updatedBranchStockConsumptions ?? raw.UpdatedBranchStockConsumptions ?? 0) || 0,
  };
}
