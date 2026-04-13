import { apiRequest } from "@/shared/api/client";
import type { WarehouseProductStockRow } from "@/types/product";
import type { WarehouseStockFilters } from "@/types/warehouse";
import type {
  WarehouseAuditPageParams,
  WarehouseAuditPaged,
  WarehouseDetail,
  WarehouseMovementsPageParams,
  WarehouseMovementsPaged,
} from "@/types/warehouse";

export async function fetchWarehouseDetail(warehouseId: number): Promise<WarehouseDetail> {
  return apiRequest<WarehouseDetail>(`/warehouses/${warehouseId}`);
}

export async function fetchWarehouseStock(
  warehouseId: number,
  filters?: WarehouseStockFilters
): Promise<WarehouseProductStockRow[]> {
  const q = new URLSearchParams();
  if (filters?.categoryId != null && filters.categoryId > 0) {
    q.set("categoryId", String(filters.categoryId));
  }
  if (filters?.parentProductId != null && filters.parentProductId > 0) {
    q.set("parentProductId", String(filters.parentProductId));
  }
  if (filters?.productId != null && filters.productId > 0) {
    q.set("productId", String(filters.productId));
  }
  const qs = q.toString();
  return apiRequest<WarehouseProductStockRow[]>(
    `/warehouses/${warehouseId}/stock${qs ? `?${qs}` : ""}`
  );
}

export async function fetchWarehouseMovementsPage(
  warehouseId: number,
  params: WarehouseMovementsPageParams
): Promise<WarehouseMovementsPaged> {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  q.set("pageSize", String(params.pageSize));
  if (params.type === "IN" || params.type === "OUT") q.set("type", params.type);
  if (params.branchId != null && params.branchId > 0) {
    q.set("branchId", String(params.branchId));
  }
  if (params.categoryId != null && params.categoryId > 0) {
    q.set("categoryId", String(params.categoryId));
  }
  if (params.productId != null && params.productId > 0) q.set("productId", String(params.productId));
  if (params.dateFrom?.length === 10) q.set("dateFrom", params.dateFrom);
  if (params.dateTo?.length === 10) q.set("dateTo", params.dateTo);
  return apiRequest<WarehouseMovementsPaged>(`/warehouses/${warehouseId}/movements?${q.toString()}`);
}

export async function fetchWarehouseAuditPage(
  warehouseId: number,
  params: WarehouseAuditPageParams
): Promise<WarehouseAuditPaged> {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  q.set("pageSize", String(params.pageSize));
  if (params.scope === "warehouses" || params.scope === "warehouse_movements") {
    q.set("scope", params.scope);
  }
  return apiRequest<WarehouseAuditPaged>(`/warehouses/${warehouseId}/audit?${q.toString()}`);
}
