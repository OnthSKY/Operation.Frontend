import { getApiBaseUrl } from "@/lib/env";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/shared/lib/image-upload-limits";
import { apiRequest } from "@/shared/api/client";

export type WarehouseMovementType = "IN" | "OUT";

export type WarehouseMovementResponse = {
  id: number;
  warehouseId: number;
  productId: number;
  type: WarehouseMovementType;
  quantity: number;
  movementDate: string;
  description: string | null;
  checkedByPersonnelId: number;
  approvedByPersonnelId: number;
  hasInvoicePhoto?: boolean;
};

export function warehouseMovementInvoicePhotoUrl(movementId: number): string {
  const base = getApiBaseUrl().replace(/\/$/, "");
  return `${base}/warehouse/movements/${movementId}/invoice-photo`;
}

export async function registerWarehouseMovement(input: {
  warehouseId: number;
  productId: number;
  quantity: number;
  movementDate: string;
  description?: string | null;
  checkedByPersonnelId: number;
  approvedByPersonnelId: number;
  direction: "in" | "out";
  invoicePhoto?: File | null;
}): Promise<WarehouseMovementResponse> {
  if (input.direction === "out") {
    return apiRequest<WarehouseMovementResponse>("/warehouse/out", {
      method: "POST",
      body: JSON.stringify({
        warehouseId: input.warehouseId,
        productId: input.productId,
        quantity: input.quantity,
        movementDate: input.movementDate,
        description: input.description ?? null,
        checkedByPersonnelId: input.checkedByPersonnelId,
        approvedByPersonnelId: input.approvedByPersonnelId,
      }),
    });
  }

  if (
    input.invoicePhoto &&
    input.invoicePhoto.size > 0 &&
    input.invoicePhoto.size > MAX_IMAGE_UPLOAD_BYTES
  ) {
    throw new Error("image too large");
  }

  const fd = new FormData();
  fd.append("warehouseId", String(input.warehouseId));
  fd.append("productId", String(input.productId));
  fd.append("quantity", String(input.quantity));
  fd.append("movementDate", input.movementDate);
  fd.append("description", input.description ?? "");
  fd.append("checkedByPersonnelId", String(input.checkedByPersonnelId));
  fd.append("approvedByPersonnelId", String(input.approvedByPersonnelId));
  if (input.invoicePhoto && input.invoicePhoto.size > 0) {
    fd.append("invoicePhoto", input.invoicePhoto);
  }

  return apiRequest<WarehouseMovementResponse>("/warehouse/in-with-invoice", {
    method: "POST",
    body: fd,
  });
}
