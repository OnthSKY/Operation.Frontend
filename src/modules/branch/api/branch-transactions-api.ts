import { apiRequest } from "@/shared/api/client";
import type {
  BranchTransaction,
  CreateBranchTransactionInput,
} from "@/types/branch-transaction";

export async function fetchBranchTransactions(
  branchId: number,
  date: string
): Promise<BranchTransaction[]> {
  const q = new URLSearchParams({
    branchId: String(branchId),
    date,
  });
  return apiRequest<BranchTransaction[]>(`/branch-transactions?${q}`);
}

export async function createBranchTransaction(
  input: CreateBranchTransactionInput
): Promise<BranchTransaction> {
  return apiRequest<BranchTransaction>("/branch-transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
