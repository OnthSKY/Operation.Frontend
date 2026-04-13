import { apiRequest } from "@/shared/api/client";

export type TransferWarehouseToBranchItemResponse = {
  warehouseMovementId: number;
  branchStockMovementId: number;
  productId: number;
};

export type TransferWarehouseToBranchResponse = {
  items: TransferWarehouseToBranchItemResponse[];
  freightBranchTransactionId?: number | null;
};

export type TransferWarehouseToBranchLineInput = {
  productId: number;
  quantity: number;
};

export type WarehouseTransferGoodsValuation = {
  estimatedGoodsValue: number;
  currencyCode: string;
  suggestedFreightAmount: number;
  mixedCurrency: boolean;
  linesWithoutValuation: number;
};

export async function estimateWarehouseTransferGoodsValuation(
  input: { warehouseId: number; lines: TransferWarehouseToBranchLineInput[] },
  signal?: AbortSignal
): Promise<WarehouseTransferGoodsValuation> {
  return apiRequest<WarehouseTransferGoodsValuation>("/warehouse/estimate-transfer-goods-valuation", {
    method: "POST",
    body: JSON.stringify({
      warehouseId: input.warehouseId,
      lines: input.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    }),
    signal,
  });
}

export async function transferWarehouseToBranch(input: {
  warehouseId: number;
  branchId: number;
  lines: TransferWarehouseToBranchLineInput[];
  movementDate: string;
  description?: string | null;
  checkedByPersonnelId: number;
  approvedByPersonnelId: number;
  freightAmount?: number | null;
  freightCurrencyCode?: string | null;
  freightExpensePaymentSource?: string | null;
  freightExpensePocketPersonnelId?: number | null;
  freightNote?: string | null;
}): Promise<TransferWarehouseToBranchResponse> {
  return apiRequest<TransferWarehouseToBranchResponse>("/warehouse/transfer-to-branch", {
    method: "POST",
    body: JSON.stringify({
      warehouseId: input.warehouseId,
      branchId: input.branchId,
      lines: input.lines,
      movementDate: input.movementDate,
      description: input.description ?? null,
      checkedByPersonnelId: input.checkedByPersonnelId,
      approvedByPersonnelId: input.approvedByPersonnelId,
      freightAmount: input.freightAmount ?? null,
      freightCurrencyCode: input.freightCurrencyCode ?? null,
      freightExpensePaymentSource: input.freightExpensePaymentSource ?? null,
      freightExpensePocketPersonnelId: input.freightExpensePocketPersonnelId ?? null,
      freightNote: input.freightNote ?? null,
    }),
  });
}
