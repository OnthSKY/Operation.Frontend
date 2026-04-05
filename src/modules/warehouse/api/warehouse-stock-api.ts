import { apiRequest } from "@/shared/api/client";
import type { WarehouseProductStockRow } from "@/types/product";

export async function fetchWarehouseStock(warehouseId: number): Promise<WarehouseProductStockRow[]> {
  return apiRequest<WarehouseProductStockRow[]>(`/warehouses/${warehouseId}/stock`);
}
