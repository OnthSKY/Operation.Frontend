import { MAX_IMAGE_UPLOAD_BYTES } from "@/shared/lib/image-upload-limits";
import { apiRequest, apiUrl } from "@/shared/api/client";

function warehouseInLinesForApi(
  lines: {
    productId: number;
    quantity: number;
    inboundUnitCost?: number | null;
    inboundCurrencyCode?: string | null;
  }[],
) {
  return lines.map((l) => {
    const base = { productId: l.productId, quantity: l.quantity };
    if (l.inboundUnitCost != null && Number.isFinite(l.inboundUnitCost) && l.inboundUnitCost > 0) {
      return {
        ...base,
        inboundUnitCost: l.inboundUnitCost,
        inboundCurrencyCode: (l.inboundCurrencyCode?.trim() || "TRY").toUpperCase(),
      };
    }
    return base;
  });
}

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
  inBatchGroupId?: string | null;
};

export type WarehouseInBatchMovementResponse = {
  items: WarehouseMovementResponse[];
};

export function warehouseMovementInvoicePhotoUrl(movementId: number): string {
  return apiUrl(`/warehouse/movements/${movementId}/invoice-photo`);
}

export async function registerWarehouseMovement(input: {
  warehouseId: number;
  movementDate: string;
  description?: string | null;
  checkedByPersonnelId: number;
  approvedByPersonnelId: number;
  direction: "in" | "out";
  /** Depo girişi: bir veya daha fazla ürün satırı */
  lines?: {
    productId: number;
    quantity: number;
    inboundUnitCost?: number | null;
    inboundCurrencyCode?: string | null;
  }[];
  /** Depo çıkışı: tek ürün */
  productId?: number;
  quantity?: number;
  invoicePhoto?: File | null;
}): Promise<WarehouseMovementResponse | WarehouseInBatchMovementResponse> {
  if (input.direction === "out") {
    const pid = input.productId;
    const q = input.quantity;
    if (pid == null || q == null) {
      throw new Error("productId and quantity required for OUT");
    }
    return apiRequest<WarehouseMovementResponse>("/warehouse/out", {
      method: "POST",
      body: JSON.stringify({
        warehouseId: input.warehouseId,
        productId: pid,
        quantity: q,
        movementDate: input.movementDate,
        description: input.description ?? null,
        checkedByPersonnelId: input.checkedByPersonnelId,
        approvedByPersonnelId: input.approvedByPersonnelId,
      }),
    });
  }

  const lines =
    input.lines && input.lines.length > 0
      ? input.lines
      : input.productId != null && input.quantity != null
        ? [{ productId: input.productId, quantity: input.quantity }]
        : [];

  if (lines.length === 0) {
    throw new Error("lines or productId+quantity required for IN");
  }

  const linesPayload = warehouseInLinesForApi(lines);

  if (
    input.invoicePhoto &&
    input.invoicePhoto.size > 0 &&
    input.invoicePhoto.size > MAX_IMAGE_UPLOAD_BYTES
  ) {
    throw new Error("image too large");
  }

  if (input.invoicePhoto && input.invoicePhoto.size > 0) {
    const fd = new FormData();
    fd.append("warehouseId", String(input.warehouseId));
    fd.append("movementDate", input.movementDate);
    fd.append("description", input.description ?? "");
    fd.append("checkedByPersonnelId", String(input.checkedByPersonnelId));
    fd.append("approvedByPersonnelId", String(input.approvedByPersonnelId));
    fd.append("lines", JSON.stringify(linesPayload));
    fd.append("invoicePhoto", input.invoicePhoto);
    return apiRequest<WarehouseInBatchMovementResponse>("/warehouse/in-with-invoice-batch", {
      method: "POST",
      body: fd,
    });
  }

  return apiRequest<WarehouseInBatchMovementResponse>("/warehouse/in-batch", {
    method: "POST",
    body: JSON.stringify({
      warehouseId: input.warehouseId,
      lines: linesPayload,
      movementDate: input.movementDate,
      description: input.description?.trim() ? input.description.trim() : null,
      checkedByPersonnelId: input.checkedByPersonnelId,
      approvedByPersonnelId: input.approvedByPersonnelId,
    }),
  });
}
