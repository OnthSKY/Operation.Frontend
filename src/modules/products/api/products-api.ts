import { apiRequest } from "@/shared/api/client";
import type {
  ProductCreated,
  ProductInventory,
  ProductListItem,
  ProductMovementsPageParams,
  ProductMovementsPaged,
} from "@/types/product";

export async function fetchProductsCatalog(): Promise<ProductListItem[]> {
  return apiRequest<ProductListItem[]>("/products");
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
}): Promise<ProductCreated> {
  return apiRequest<ProductCreated>("/products", {
    method: "POST",
    body: JSON.stringify({
      name: input.name.trim(),
      unit: input.unit?.trim() || null,
    }),
  });
}

export async function softDeleteProduct(id: number): Promise<void> {
  await apiRequest<null>(`/products/${id}`, { method: "DELETE" });
}
