import { apiRequest } from "@/shared/api/client";

export type ProductCategory = {
  id: number;
  name: string;
  parentCategoryId: number | null;
  productCount: number;
  childCount: number;
};

export async function fetchProductCategories(): Promise<ProductCategory[]> {
  return apiRequest<ProductCategory[]>("/product-categories");
}

export async function createProductCategory(body: {
  name: string;
  parentCategoryId?: number | null;
}): Promise<ProductCategory> {
  return apiRequest<ProductCategory>("/product-categories", {
    method: "POST",
    body: JSON.stringify({
      name: body.name.trim(),
      parentCategoryId: body.parentCategoryId ?? null,
    }),
  });
}

export async function updateProductCategory(id: number, name: string): Promise<ProductCategory> {
  return apiRequest<ProductCategory>(`/product-categories/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name: name.trim() }),
  });
}

export async function deleteProductCategory(id: number): Promise<void> {
  await apiRequest<null>(`/product-categories/${id}`, { method: "DELETE" });
}
