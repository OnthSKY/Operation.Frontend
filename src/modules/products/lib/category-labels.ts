import type { ProductCategory } from "@/modules/products/api/product-categories-api";

export function categoryOptionLabel(categories: ProductCategory[], cat: ProductCategory): string {
  if (cat.parentCategoryId == null) return cat.name;
  const parent = categories.find((x) => x.id === cat.parentCategoryId);
  return parent ? `${parent.name} › ${cat.name}` : cat.name;
}
