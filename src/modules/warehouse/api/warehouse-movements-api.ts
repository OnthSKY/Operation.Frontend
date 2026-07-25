import { MAX_IMAGE_UPLOAD_BYTES } from "@/shared/lib/image-upload-limits";
import { apiFetch, apiRequest, apiUrl } from "@/shared/api/client";

function warehouseInLinesForApi(
  lines: {
    productId: number;
    quantity: number;
    inboundUnitCost?: number | null;
    inboundCurrencyCode?: string | null;
    unitName?: string | null;
  }[],
) {
  return lines.map((l) => {
    const base: Record<string, unknown> = { productId: l.productId, quantity: l.quantity };
    if (l.unitName && l.unitName.trim()) {
      base.unitName = l.unitName.trim();
    }
    if (l.inboundUnitCost != null && Number.isFinite(l.inboundUnitCost) && l.inboundUnitCost > 0) {
      base.inboundUnitCost = l.inboundUnitCost;
      base.inboundCurrencyCode = (l.inboundCurrencyCode?.trim() || "TRY").toUpperCase();
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

export type WarehouseStockCountResultLine = {
  productId: number;
  /** Düzeltme öncesi net bakiye (temel birim). */
  previousQuantity: number;
  /** Sayılan miktar (temel birim). */
  countedQuantity: number;
  /** countedQuantity - previousQuantity. */
  delta: number;
  /** Oluşturulan düzeltme hareketi Id'si; fark 0 ise null. */
  movementId: number | null;
  /** "IN" (artış) / "OUT" (azalış) / null (değişiklik yok). */
  type: WarehouseMovementType | null;
};

export type WarehouseStockCountResponse = {
  lines: WarehouseStockCountResultLine[];
};

/**
 * Toplu stok sayımı / düzeltme. Her satır için sayılan gerçek miktar gönderilir;
 * backend mevcut net bakiye ile farkı kadar düzeltme hareketi oluşturur.
 */
export async function registerWarehouseStockCount(input: {
  warehouseId: number;
  countDate: string;
  description: string;
  checkedByPersonnelId: number;
  approvedByPersonnelId: number;
  lines: { productId: number; actualCount: number }[];
}): Promise<WarehouseStockCountResponse> {
  return apiRequest<WarehouseStockCountResponse>("/warehouse/stock-count", {
    method: "POST",
    body: JSON.stringify({
      warehouseId: input.warehouseId,
      countDate: input.countDate,
      description: input.description.trim(),
      checkedByPersonnelId: input.checkedByPersonnelId,
      approvedByPersonnelId: input.approvedByPersonnelId,
      lines: input.lines.map((l) => ({ productId: l.productId, actualCount: l.actualCount })),
    }),
  });
}

export function warehouseMovementInvoicePhotoUrl(movementId: number): string {
  return apiUrl(`/warehouse/movements/${movementId}/invoice-photo`);
}

export async function downloadWarehouseMovementInvoicePhoto(
  movementId: number,
  preferredFileName?: string
): Promise<void> {
  const res = await apiFetch(`/warehouse/movements/${movementId}/invoice-photo`);
  if (!res.ok) throw new Error("Invoice photo download failed");
  const blob = await res.blob();
  const mime = (res.headers.get("Content-Type") ?? "").toLowerCase();
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const fileName = preferredFileName?.trim() || `warehouse-movement-${movementId}-invoice.${ext}`;
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(blobUrl);
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
    unitName?: string | null;
  }[];
  /** Depo çıkışı: tek ürün */
  productId?: number;
  quantity?: number;
  /** Tek-ürün (OUT veya tekil IN) akışı için kullanıcının seçtiği birim. */
  unitName?: string | null;
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
        unitName: input.unitName?.trim() || null,
      }),
    });
  }

  const lines =
    input.lines && input.lines.length > 0
      ? input.lines
      : input.productId != null && input.quantity != null
        ? [{ productId: input.productId, quantity: input.quantity, unitName: input.unitName ?? null }]
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
