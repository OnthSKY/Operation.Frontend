import { apiRequest } from "@/shared/api/client";
import type {
  ProductCatalogPaged,
  ProductCreated,
  ProductInventory,
  ProductListItem,
  ProductMovementsPageParams,
  ProductMovementsPaged,
  ProductWarehouseQty,
} from "@/types/product";

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
    categoryId:
      r.categoryId != null || r.CategoryId != null
        ? Number(r.categoryId ?? r.CategoryId) || null
        : null,
    categoryName:
      r.categoryName != null && String(r.categoryName ?? r.CategoryName).trim()
        ? String(r.categoryName ?? r.CategoryName).trim()
        : null,
    hasChildren: Boolean(r.hasChildren ?? r.HasChildren),
    totalQuantity: Number(r.totalQuantity ?? r.TotalQuantity ?? 0) || 0,
    byWarehouse,
  };
}

export async function fetchProductCatalogPaged(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<ProductCatalogPaged> {
  const q = new URLSearchParams();
  q.set("page", String(Math.max(1, params.page)));
  q.set("pageSize", String(Math.max(1, params.pageSize)));
  const s = params.search?.trim();
  if (s) q.set("search", s);
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
    }),
  });
}
