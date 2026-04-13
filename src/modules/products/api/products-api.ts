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
