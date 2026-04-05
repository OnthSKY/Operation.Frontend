import { apiRequest } from "@/shared/api/client";
import type { WarehouseListItem } from "@/types/warehouse";

export async function fetchWarehouses(): Promise<WarehouseListItem[]> {
  return apiRequest<WarehouseListItem[]>("/warehouses");
}

export async function createWarehouse(name: string): Promise<WarehouseListItem> {
  return apiRequest<WarehouseListItem>("/warehouses", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function softDeleteWarehouse(id: number): Promise<void> {
  await apiRequest<null>(`/warehouses/${id}`, { method: "DELETE" });
}
