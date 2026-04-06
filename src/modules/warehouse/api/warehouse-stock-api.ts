import { apiRequest } from "@/shared/api/client";
import type { WarehouseProductStockRow } from "@/types/product";
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

export async function fetchWarehouseStock(warehouseId: number): Promise<WarehouseProductStockRow[]> {
  return apiRequest<WarehouseProductStockRow[]>(`/warehouses/${warehouseId}/stock`);
}

export async function fetchWarehouseMovementsPage(
  warehouseId: number,
  params: WarehouseMovementsPageParams
): Promise<WarehouseMovementsPaged> {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  q.set("pageSize", String(params.pageSize));
  if (params.type === "IN" || params.type === "OUT") q.set("type", params.type);
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
