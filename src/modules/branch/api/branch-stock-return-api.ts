import { apiRequest } from "@/shared/api/client";

export type ReturnBranchToWarehouseItem = {
  warehouseMovementId: number;
  branchStockMovementId: number;
  productId: number;
};

export type ReturnBranchToWarehouseResponse = {
  items: ReturnBranchToWarehouseItem[];
  movementBatchId: string;
};

export type ReturnBranchToWarehouseLineInput = {
  productId: number;
  quantity: number;
  /** Kullanıcının seçtiği birim (örn. "paket"); null = ürünün temel/legacy birimi. */
  unitName?: string | null;
};

/**
 * Doğrudan (anlık) Şube → Depo iade. Tek transaction: şube stoğu düşer, depo stoğu artar.
 * Sevkiyat/onay/lifecycle YOKTUR.
 *
 * <c>idempotencyKey</c> verilirse backend `IdempotencyMiddleware`'in AÇIK (explicit) yoluna girer:
 * 24 saat TTL ile (user, path, key) dedup; aynı key farklı gövdeyle gelirse 409. Anahtar TEK bir
 * mantıksal iade işlemine aittir ve tüm retry'larda AYNI kalmalıdır (çağıran sorumluluğu).
 */
export async function returnBranchToWarehouse(
  input: {
    branchId: number;
    warehouseId: number;
    lines: ReturnBranchToWarehouseLineInput[];
    description?: string | null;
  },
  idempotencyKey?: string
): Promise<ReturnBranchToWarehouseResponse> {
  return apiRequest<ReturnBranchToWarehouseResponse>("/warehouse/receive-from-branch", {
    method: "POST",
    ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
    body: JSON.stringify({
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      lines: input.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitName: l.unitName?.trim() || null,
      })),
      description: input.description ?? null,
    }),
  });
}
