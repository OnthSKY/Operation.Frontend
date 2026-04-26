import type { WarehouseMovementResponse } from "@/modules/warehouse/api/warehouse-movements-api";
import { apiRequest } from "@/shared/api/client";
import type {
  CreateWarehouseInput,
  WarehouseListItem,
  WarehousePeopleOption,
  WarehouseUserOption,
} from "@/types/warehouse";

export async function fetchWarehouses(): Promise<WarehouseListItem[]> {
  return apiRequest<WarehouseListItem[]>("/warehouses");
}

export async function fetchWarehouseUserOptions(): Promise<WarehouseUserOption[]> {
  return apiRequest<WarehouseUserOption[]>("/warehouses/user-options");
}

export async function fetchWarehousePeopleOptions(): Promise<WarehousePeopleOption[]> {
  return apiRequest<WarehousePeopleOption[]>("/warehouses/people-options");
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

export type PatchWarehouseInboundMovementDatesInput = {
  movementBatchId?: string | null;
  movementId?: number | null;
  businessDate: string;
  /** Verilmezse API businessDate ile aynı yazar. */
  date?: string | null;
};

export type WarehouseInboundDatesCorrection = {
  updatedMovementRows: number;
  updatedBranchStockRows: number;
};

export type WarehouseInboundMovementEditResponse = {
  id: number;
  productId: number;
  productName: string;
  unit: string | null;
  quantity: number;
  businessDate: string;
  legacyDate: string | null;
  description: string | null;
  checkedByPersonnelId: number | null;
  approvedByPersonnelId: number | null;
  hasInvoicePhoto: boolean;
  movementBatchId: string | null;
  supplierInvoiceLinked: boolean;
};

export type UpdateWarehouseInboundMovementBody = {
  productId: number;
  quantity: number;
  businessDate: string;
  date?: string | null;
  description?: string | null;
  checkedByPersonnelId: number;
  approvedByPersonnelId: number;
  clearInvoicePhoto: boolean;
};

export async function fetchWarehouseInboundMovementForEdit(
  warehouseId: number,
  movementId: number
): Promise<WarehouseInboundMovementEditResponse> {
  return apiRequest<WarehouseInboundMovementEditResponse>(
    `/warehouses/${warehouseId}/movements/inbound/${movementId}`
  );
}

export async function updateWarehouseInboundMovement(
  warehouseId: number,
  movementId: number,
  body: UpdateWarehouseInboundMovementBody
): Promise<WarehouseMovementResponse> {
  return apiRequest<WarehouseMovementResponse>(`/warehouses/${warehouseId}/movements/inbound/${movementId}`, {
    method: "PUT",
    body: JSON.stringify({
      productId: body.productId,
      quantity: body.quantity,
      businessDate: body.businessDate,
      date: body.date?.length === 10 ? body.date : null,
      description: body.description?.trim() ? body.description.trim() : null,
      checkedByPersonnelId: body.checkedByPersonnelId,
      approvedByPersonnelId: body.approvedByPersonnelId,
      clearInvoicePhoto: body.clearInvoicePhoto,
    }),
  });
}

export async function uploadWarehouseInboundMovementInvoicePhoto(
  warehouseId: number,
  movementId: number,
  file: File
): Promise<WarehouseMovementResponse> {
  const fd = new FormData();
  fd.append("invoicePhoto", file);
  return apiRequest<WarehouseMovementResponse>(
    `/warehouses/${warehouseId}/movements/inbound/${movementId}/invoice-photo`,
    { method: "POST", body: fd }
  );
}

export async function softDeleteWarehouseInboundMovement(
  warehouseId: number,
  movementId: number
): Promise<void> {
  await apiRequest<null>(`/warehouses/${warehouseId}/movements/inbound/${movementId}`, { method: "DELETE" });
}

export type WarehouseOutboundShipmentMovementEditResponse = {
  id: number;
  productId: number;
  productName: string;
  unit: string | null;
  quantity: number;
  businessDate: string;
  legacyDate: string | null;
  description: string | null;
  checkedByPersonnelId: number | null;
  approvedByPersonnelId: number | null;
  hasInvoicePhoto: boolean;
  movementBatchId: string | null;
  branchId: number;
  branchName: string;
  branchStockMovementId: number;
};

export type UpdateWarehouseOutboundShipmentMovementBody = {
  branchId: number;
  productId: number;
  quantity: number;
  businessDate: string;
  date?: string | null;
  description?: string | null;
  checkedByPersonnelId: number;
  approvedByPersonnelId: number;
  clearInvoicePhoto: boolean;
};

export async function fetchWarehouseOutboundShipmentMovementForEdit(
  warehouseId: number,
  movementId: number
): Promise<WarehouseOutboundShipmentMovementEditResponse> {
  return apiRequest<WarehouseOutboundShipmentMovementEditResponse>(
    `/warehouses/${warehouseId}/movements/outbound-shipment/${movementId}`
  );
}

export async function updateWarehouseOutboundShipmentMovement(
  warehouseId: number,
  movementId: number,
  body: UpdateWarehouseOutboundShipmentMovementBody
): Promise<WarehouseMovementResponse> {
  return apiRequest<WarehouseMovementResponse>(
    `/warehouses/${warehouseId}/movements/outbound-shipment/${movementId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        branchId: body.branchId,
        productId: body.productId,
        quantity: body.quantity,
        businessDate: body.businessDate,
        date: body.date?.length === 10 ? body.date : null,
        description: body.description?.trim() ? body.description.trim() : null,
        checkedByPersonnelId: body.checkedByPersonnelId,
        approvedByPersonnelId: body.approvedByPersonnelId,
        clearInvoicePhoto: body.clearInvoicePhoto,
      }),
    }
  );
}

export async function softDeleteWarehouseOutboundShipmentMovement(
  warehouseId: number,
  movementId: number
): Promise<void> {
  await apiRequest<null>(`/warehouses/${warehouseId}/movements/outbound-shipment/${movementId}`, {
    method: "DELETE",
  });
}

export async function patchWarehouseInboundMovementDates(
  warehouseId: number,
  body: PatchWarehouseInboundMovementDatesInput
): Promise<WarehouseInboundDatesCorrection> {
  const payload: Record<string, unknown> = {
    businessDate: body.businessDate,
  };
  if (body.date?.length === 10) payload.date = body.date;
  if (body.movementBatchId?.trim()) payload.movementBatchId = body.movementBatchId.trim();
  if (body.movementId != null && body.movementId > 0) payload.movementId = body.movementId;

  return apiRequest<WarehouseInboundDatesCorrection>(`/warehouses/${warehouseId}/movements/inbound-dates`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
