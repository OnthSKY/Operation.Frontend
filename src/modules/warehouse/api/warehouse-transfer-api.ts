import { apiRequest } from "@/shared/api/client";

export type TransferWarehouseToBranchResponse = {
  warehouseMovementId: number;
  branchStockMovementId: number;
};

export async function transferWarehouseToBranch(input: {
  warehouseId: number;
  branchId: number;
  productId: number;
  quantity: number;
  movementDate: string;
  description?: string | null;
  checkedByPersonnelId: number;
  approvedByPersonnelId: number;
}): Promise<TransferWarehouseToBranchResponse> {
  return apiRequest<TransferWarehouseToBranchResponse>("/warehouse/transfer-to-branch", {
    method: "POST",
    body: JSON.stringify({
      warehouseId: input.warehouseId,
      branchId: input.branchId,
      productId: input.productId,
      quantity: input.quantity,
      movementDate: input.movementDate,
      description: input.description ?? null,
      checkedByPersonnelId: input.checkedByPersonnelId,
      approvedByPersonnelId: input.approvedByPersonnelId,
    }),
  });
}
