import { apiRequest } from "@/lib/api/base-api";

export type PersonnelHeldCashReconciliationRow = {
  personnelId: number;
  fullName: string;
  branchId: number;
  branchName: string;
  currencyCode: string;
  inTotal: number;
  claimReceived: number;
  heldSpent: number;
  claimGiven: number;
  netBalance: number;
  oldBalanceEstimate: number;
  difference: number;
  hasClaimActivity: boolean;
  isNegative: boolean;
};

export type PersonnelHeldCashReconciliationSummary = {
  totalNetBalanceByCurrency: Record<string, number>;
  negativeBalanceRowCount: number;
  negativeBalancePersonnelCount: number;
  claimActivityPersonnelCount: number;
  affectedByFixRowCount: number;
  totalDifferenceByCurrency: Record<string, number>;
};

export type PersonnelHeldCashReconciliationResponse = {
  generatedAt: string;
  summary: PersonnelHeldCashReconciliationSummary;
  rows: PersonnelHeldCashReconciliationRow[];
};

export async function fetchPersonnelHeldCashReconciliation(): Promise<PersonnelHeldCashReconciliationResponse> {
  return apiRequest<PersonnelHeldCashReconciliationResponse>("/admin/personnel-held-cash-reconciliation", {
    method: "GET",
  });
}

export type HeldCashAutoFixTransfer = {
  personnelId: number;
  branchId: number;
  currencyCode: string;
  amount: number;
};

export type HeldCashAutoFixBatchRequest = {
  transfers: HeldCashAutoFixTransfer[];
};

export type HeldCashAutoFixResultRow = {
  personnelId: number;
  branchId: number;
  currencyCode: string;
  requestedAmount: number;
  success: boolean;
  errorMessage: string | null;
  createdTransactionId: number | null;
};

export type HeldCashAutoFixBatchResponse = {
  requestedCount: number;
  successCount: number;
  failureCount: number;
  results: HeldCashAutoFixResultRow[];
};

export async function postPersonnelHeldCashAutoFix(
  body: HeldCashAutoFixBatchRequest
): Promise<HeldCashAutoFixBatchResponse> {
  return apiRequest<HeldCashAutoFixBatchResponse>("/admin/personnel-held-cash-reconciliation/auto-fix", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
