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
  /** Eski akış: OUT_POCKET_CLAIM_* (patron/personele direkt devir tx). */
  claimGiven: number;
  /** Yeni akış: handover settlement junction üzerinden patrona iade. NetBalance hesabına dahildir. */
  handoverSettled: number;
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

export type PersonnelHeldCashDrillDownRow = {
  transactionId: number;
  transactionDate: string; // ISO date
  classificationCode: string;
  effectDirection: "IN" | "OUT";
  amount: number;
  runningBalance: number;
  description: string | null;
  counterpartyPersonnelId: number | null;
  counterpartyName: string | null;
  linkedAdvanceId: number | null;
};

export type PersonnelHeldCashDrillDownResponse = {
  personnelId: number;
  fullName: string;
  branchId: number;
  branchName: string;
  currencyCode: string;
  totalReceived: number;
  totalSpent: number;
  totalTransferredIn: number;
  totalTransferredOut: number;
  netBalance: number;
  transactions: PersonnelHeldCashDrillDownRow[];
};

export async function fetchPersonnelHeldCashDrillDown(
  personnelId: number,
  branchId: number,
  currency: string
): Promise<PersonnelHeldCashDrillDownResponse> {
  const params = new URLSearchParams({
    personnelId: String(personnelId),
    branchId: String(branchId),
    currency,
  });
  return apiRequest<PersonnelHeldCashDrillDownResponse>(
    `/admin/personnel-held-cash-reconciliation/drill-down?${params.toString()}`,
    { method: "GET" }
  );
}
