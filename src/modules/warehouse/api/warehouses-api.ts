import { apiRequest } from "@/shared/api/client";
import type {
  CreateWarehouseInput,
  WarehouseListItem,
  WarehouseUserOption,
} from "@/types/warehouse";

export async function fetchWarehouses(): Promise<WarehouseListItem[]> {
  return apiRequest<WarehouseListItem[]>("/warehouses");
}

export async function fetchWarehouseUserOptions(): Promise<WarehouseUserOption[]> {
  return apiRequest<WarehouseUserOption[]>("/warehouses/user-options");
}

export async function createWarehouse(input: CreateWarehouseInput): Promise<WarehouseListItem> {
  const responsibleManagerUserId =
    input.responsibleManagerUserId != null && input.responsibleManagerUserId > 0
      ? input.responsibleManagerUserId
      : null;
  const responsibleMasterUserId =
    input.responsibleMasterUserId != null && input.responsibleMasterUserId > 0
      ? input.responsibleMasterUserId
      : null;
  return apiRequest<WarehouseListItem>("/warehouses", {
    method: "POST",
    body: JSON.stringify({
      name: input.name.trim(),
      address: input.address?.trim() ? input.address.trim() : null,
      city: input.city?.trim() ? input.city.trim() : null,
      responsibleManagerUserId,
      responsibleMasterUserId,
    }),
  });
}

export async function updateWarehouse(
  id: number,
  input: CreateWarehouseInput
): Promise<WarehouseListItem> {
  const responsibleManagerUserId =
    input.responsibleManagerUserId != null && input.responsibleManagerUserId > 0
      ? input.responsibleManagerUserId
      : null;
  const responsibleMasterUserId =
    input.responsibleMasterUserId != null && input.responsibleMasterUserId > 0
      ? input.responsibleMasterUserId
      : null;
  return apiRequest<WarehouseListItem>(`/warehouses/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: input.name.trim(),
      address: input.address?.trim() ? input.address.trim() : null,
      city: input.city?.trim() ? input.city.trim() : null,
      responsibleManagerUserId,
      responsibleMasterUserId,
    }),
  });
}

export async function softDeleteWarehouse(id: number): Promise<void> {
  await apiRequest<null>(`/warehouses/${id}`, { method: "DELETE" });
}
