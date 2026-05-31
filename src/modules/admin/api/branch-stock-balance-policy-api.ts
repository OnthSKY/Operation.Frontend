import { apiRequest } from "@/shared/api/client";

export type BranchStockBalancePolicyPayload = {
  allowNegativeBalance: boolean;
  updatedAtUtc: string | null;
  updatedByUserId: number | null;
};

export type UpdateBranchStockBalancePolicyBody = Partial<{
  allowNegativeBalance: boolean;
}>;

export function fetchBranchStockBalancePolicy() {
  return apiRequest<BranchStockBalancePolicyPayload>("/system/branch-stock-balance-policy");
}

export function putBranchStockBalancePolicy(body: UpdateBranchStockBalancePolicyBody) {
  return apiRequest<BranchStockBalancePolicyPayload>("/system/branch-stock-balance-policy", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
