import { apiRequest } from "@/shared/api/client";
import type {
  BranchTransaction,
  CreateBranchTransactionInput,
} from "@/types/branch-transaction";

function normalizeCurrency(v: unknown): string {
  const s = String(v ?? "TRY").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : "TRY";
}

export async function fetchBranchTransactions(
  branchId: number,
  date: string
): Promise<BranchTransaction[]> {
  const q = new URLSearchParams({
    branchId: String(branchId),
    date,
  });
  const rows = await apiRequest<
    Array<
      Omit<BranchTransaction, "currencyCode"> & {
        currencyCode?: string;
        cashAmount?: number | null;
        cardAmount?: number | null;
      }
    >
  >(`/branch-transactions?${q}`);
  return rows.map((r) => ({
    ...r,
    currencyCode: normalizeCurrency(r.currencyCode),
    cashAmount: r.cashAmount ?? null,
    cardAmount: r.cardAmount ?? null,
  }));
}

export async function createBranchTransaction(
  input: CreateBranchTransactionInput
): Promise<BranchTransaction> {
  return apiRequest<BranchTransaction>("/branch-transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
