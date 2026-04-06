import { getApiBaseUrl } from "@/lib/env";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/shared/lib/image-upload-limits";
import { apiRequest } from "@/shared/api/client";
import type {
  BranchTransaction,
  CreateBranchTransactionInput,
} from "@/types/branch-transaction";

function normalizeCurrency(v: unknown): string {
  const s = String(v ?? "TRY").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : "TRY";
}

export function branchTransactionReceiptPhotoUrl(transactionId: number): string {
  const base = getApiBaseUrl().replace(/\/$/, "");
  return `${base}/branch-transactions/${transactionId}/receipt-photo`;
}

function normalizePositivePersonnelId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function normalizeOptionalPositiveId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

type BranchTxApiRow = Omit<
  BranchTransaction,
  | "currencyCode"
  | "cashSettlementParty"
  | "cashSettlementPersonnelId"
  | "cashSettlementPersonnelFullName"
  | "cashSettlementPersonnelJobTitle"
  | "expensePaymentSource"
  | "expensePocketPersonnelId"
  | "expensePocketPersonnelFullName"
  | "expensePocketPersonnelJobTitle"
  | "hasReceiptPhoto"
  | "linkedAdvanceId"
  | "linkedSalaryPaymentId"
  | "linkedAdvancePersonnelId"
  | "linkedSalaryPersonnelId"
  | "linkedAdvancePersonnelFullName"
  | "linkedSalaryPersonnelFullName"
> & {
  currencyCode?: string;
  cashAmount?: number | null;
  cardAmount?: number | null;
  cashSettlementParty?: string | null;
  cashSettlementPersonnelId?: number | null;
  cashSettlementPersonnelFullName?: string | null;
  cashSettlementPersonnelJobTitle?: string | null;
  expensePaymentSource?: string | null;
  expensePocketPersonnelId?: number | null;
  expensePocketPersonnelFullName?: string | null;
  expensePocketPersonnelJobTitle?: string | null;
  hasReceiptPhoto?: boolean;
  linkedAdvanceId?: number | null;
  linkedSalaryPaymentId?: number | null;
  linkedAdvancePersonnelId?: number | null;
  linkedSalaryPersonnelId?: number | null;
  linkedAdvancePersonnelFullName?: string | null;
  linkedSalaryPersonnelFullName?: string | null;
};

function normalizeBranchTxRow(r: BranchTxApiRow): BranchTransaction {
  const pid = normalizePositivePersonnelId(r.cashSettlementPersonnelId);
  const fn =
    typeof r.cashSettlementPersonnelFullName === "string" && r.cashSettlementPersonnelFullName.trim()
      ? r.cashSettlementPersonnelFullName.trim()
      : null;
  const jt =
    typeof r.cashSettlementPersonnelJobTitle === "string" && r.cashSettlementPersonnelJobTitle.trim()
      ? r.cashSettlementPersonnelJobTitle.trim().toUpperCase()
      : null;
  const advId = normalizeOptionalPositiveId(r.linkedAdvanceId);
  const salId = normalizeOptionalPositiveId(r.linkedSalaryPaymentId);
  const advPid = normalizeOptionalPositiveId(r.linkedAdvancePersonnelId);
  const salPid = normalizeOptionalPositiveId(r.linkedSalaryPersonnelId);
  const advName =
    typeof r.linkedAdvancePersonnelFullName === "string" && r.linkedAdvancePersonnelFullName.trim()
      ? r.linkedAdvancePersonnelFullName.trim()
      : null;
  const salName =
    typeof r.linkedSalaryPersonnelFullName === "string" && r.linkedSalaryPersonnelFullName.trim()
      ? r.linkedSalaryPersonnelFullName.trim()
      : null;
  const pocketPid = normalizeOptionalPositiveId(r.expensePocketPersonnelId);
  const pocketFn =
    typeof r.expensePocketPersonnelFullName === "string" && r.expensePocketPersonnelFullName.trim()
      ? r.expensePocketPersonnelFullName.trim()
      : null;
  const pocketJt =
    typeof r.expensePocketPersonnelJobTitle === "string" && r.expensePocketPersonnelJobTitle.trim()
      ? r.expensePocketPersonnelJobTitle.trim().toUpperCase()
      : null;
  return {
    ...r,
    currencyCode: normalizeCurrency(r.currencyCode),
    cashAmount: r.cashAmount ?? null,
    cardAmount: r.cardAmount ?? null,
    cashSettlementParty:
      r.cashSettlementParty != null && String(r.cashSettlementParty).trim()
        ? String(r.cashSettlementParty).trim().toUpperCase()
        : null,
    cashSettlementPersonnelId: pid,
    cashSettlementPersonnelFullName: fn,
    cashSettlementPersonnelJobTitle: jt,
    expensePaymentSource:
      r.expensePaymentSource != null && String(r.expensePaymentSource).trim()
        ? String(r.expensePaymentSource).trim().toUpperCase()
        : null,
    expensePocketPersonnelId: pocketPid,
    expensePocketPersonnelFullName: pocketFn,
    expensePocketPersonnelJobTitle: pocketJt,
    hasReceiptPhoto: Boolean(r.hasReceiptPhoto),
    linkedAdvanceId: advId,
    linkedSalaryPaymentId: salId,
    linkedAdvancePersonnelId: advPid,
    linkedSalaryPersonnelId: salPid,
    linkedAdvancePersonnelFullName: advName,
    linkedSalaryPersonnelFullName: salName,
  };
}

export async function fetchBranchTransactions(
  branchId: number,
  date: string
): Promise<BranchTransaction[]> {
  const q = new URLSearchParams({
    branchId: String(branchId),
    date,
  });
  const rows = await apiRequest<Array<BranchTxApiRow>>(`/branch-transactions?${q}`);
  return rows.map(normalizeBranchTxRow);
}

export async function createBranchTransaction(
  input: CreateBranchTransactionInput
): Promise<BranchTransaction> {
  const useReceipt =
    String(input.type ?? "").toUpperCase() === "OUT" &&
    input.receiptPhoto != null &&
    input.receiptPhoto.size > 0;

  if (useReceipt && input.receiptPhoto!.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("image too large");
  }

  if (useReceipt) {
    const fd = new FormData();
    fd.append("branchId", String(input.branchId));
    fd.append("type", input.type);
    if (input.mainCategory != null && String(input.mainCategory).trim())
      fd.append("mainCategory", String(input.mainCategory).trim());
    if (input.category != null && String(input.category).trim())
      fd.append("category", String(input.category).trim());
    fd.append("amount", String(input.amount));
    if (input.cashAmount != null) fd.append("cashAmount", String(input.cashAmount));
    if (input.cardAmount != null) fd.append("cardAmount", String(input.cardAmount));
    fd.append("currencyCode", (input.currencyCode ?? "TRY").trim() || "TRY");
    fd.append("transactionDate", input.transactionDate);
    if (input.description != null) fd.append("description", input.description);
    if (input.cashSettlementParty != null && String(input.cashSettlementParty).trim())
      fd.append("cashSettlementParty", String(input.cashSettlementParty).trim());
    if (input.cashSettlementPersonnelId != null && input.cashSettlementPersonnelId > 0)
      fd.append("cashSettlementPersonnelId", String(input.cashSettlementPersonnelId));
    if (input.expensePaymentSource != null && String(input.expensePaymentSource).trim())
      fd.append("expensePaymentSource", String(input.expensePaymentSource).trim());
    if (input.expensePocketPersonnelId != null && input.expensePocketPersonnelId > 0)
      fd.append("expensePocketPersonnelId", String(input.expensePocketPersonnelId));
    if (input.linkedAdvanceId != null && input.linkedAdvanceId > 0)
      fd.append("linkedAdvanceId", String(input.linkedAdvanceId));
    if (input.linkedSalaryPaymentId != null && input.linkedSalaryPaymentId > 0)
      fd.append("linkedSalaryPaymentId", String(input.linkedSalaryPaymentId));
    if (input.linkedFinancialPersonnelId != null && input.linkedFinancialPersonnelId > 0)
      fd.append("linkedFinancialPersonnelId", String(input.linkedFinancialPersonnelId));
    fd.append("receiptPhoto", input.receiptPhoto!);
    const r = await apiRequest<BranchTxApiRow>("/branch-transactions/with-receipt", {
      method: "POST",
      body: fd,
    });
    return normalizeBranchTxRow(r);
  }

  const { receiptPhoto: _rp, ...jsonBody } = input;
  const r = await apiRequest<BranchTxApiRow>("/branch-transactions", {
    method: "POST",
    body: JSON.stringify(jsonBody),
  });
  return normalizeBranchTxRow(r);
}

export async function deleteBranchTransaction(transactionId: number): Promise<void> {
  await apiRequest<null>(`/branch-transactions/${transactionId}`, {
    method: "DELETE",
  });
}
