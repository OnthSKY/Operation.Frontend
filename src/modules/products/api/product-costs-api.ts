import { apiRequest } from "@/shared/api/client";
import type {
  CreateProductCostInput,
  ProductCostHistoryQueryParams,
  ProductCostHistoryRow,
  UpdateProductCostInput,
} from "@/types/product-cost";

export async function fetchProductCostHistory(
  params: ProductCostHistoryQueryParams
): Promise<ProductCostHistoryRow[]> {
  const q = new URLSearchParams();
  if (params.productId != null && params.productId > 0) {
    q.set("productId", String(params.productId));
  }
  if (params.dateFrom?.length === 10) q.set("dateFrom", params.dateFrom);
  if (params.dateTo?.length === 10) q.set("dateTo", params.dateTo);
  return apiRequest<ProductCostHistoryRow[]>(`/products/cost-history?${q.toString()}`);
}

export async function createProductCostEntry(input: CreateProductCostInput): Promise<ProductCostHistoryRow> {
  return apiRequest<ProductCostHistoryRow>("/products/cost-history", {
    method: "POST",
    body: JSON.stringify({
      productId: input.productId,
      effectiveDate: input.effectiveDate,
      unit: input.unit.trim(),
      currencyCode: input.currencyCode.trim().toUpperCase(),
      vatRate: input.vatRate,
      unitCostExcludingVat: input.unitCostExcludingVat,
      unitCostIncludingVat: input.unitCostIncludingVat,
      note: input.note?.trim() || null,
    }),
  });
}

export async function updateProductCostEntry(input: UpdateProductCostInput): Promise<ProductCostHistoryRow> {
  return apiRequest<ProductCostHistoryRow>(`/products/cost-history/${input.id}`, {
    method: "PUT",
    body: JSON.stringify({
      effectiveDate: input.effectiveDate,
      unit: input.unit.trim(),
      currencyCode: input.currencyCode.trim().toUpperCase(),
      vatRate: input.vatRate,
      unitCostExcludingVat: input.unitCostExcludingVat,
      unitCostIncludingVat: input.unitCostIncludingVat,
      note: input.note?.trim() || null,
    }),
  });
}

export async function deleteProductCostEntry(id: number): Promise<void> {
  await apiRequest(`/products/cost-history/${id}`, { method: "DELETE" });
}
