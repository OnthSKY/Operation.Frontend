import { apiRequest } from "@/shared/api/client";
import type {
  ProductCreated,
  ProductInventory,
  ProductListItem,
  ProductMovementLine,
} from "@/types/product";

export async function fetchProductsCatalog(): Promise<ProductListItem[]> {
  return apiRequest<ProductListItem[]>("/products");
}

export async function fetchProductInventory(productId: number): Promise<ProductInventory> {
  return apiRequest<ProductInventory>(`/products/${productId}/inventory`);
}

export async function fetchProductMovements(
  productId: number,
  options?: { warehouseId?: number; limit?: number }
): Promise<ProductMovementLine[]> {
  const q = new URLSearchParams();
  if (options?.warehouseId != null && options.warehouseId > 0) {
    q.set("warehouseId", String(options.warehouseId));
  }
  if (options?.limit != null) q.set("limit", String(options.limit));
  const qs = q.toString();
  return apiRequest<ProductMovementLine[]>(
    `/products/${productId}/movements${qs ? `?${qs}` : ""}`
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
