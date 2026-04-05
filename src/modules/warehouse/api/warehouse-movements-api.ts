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
};

export async function registerWarehouseMovement(input: {
  warehouseId: number;
  productId: number;
  quantity: number;
  movementDate: string;
  description?: string | null;
  direction: "in" | "out";
}): Promise<WarehouseMovementResponse> {
  const path = input.direction === "in" ? "/warehouse/in" : "/warehouse/out";
  return apiRequest<WarehouseMovementResponse>(path, {
    method: "POST",
    body: JSON.stringify({
      warehouseId: input.warehouseId,
      productId: input.productId,
      quantity: input.quantity,
      movementDate: input.movementDate,
      description: input.description ?? null,
    }),
  });
}
