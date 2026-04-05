import { apiRequest } from "@/shared/api/client";
import type { BranchDailySummary } from "@/types/branch-daily-summary";

export async function fetchBranchDailySummary(
  branchId: number,
  date: string
): Promise<BranchDailySummary> {
  const q = new URLSearchParams({
    branchId: String(branchId),
    date,
  });
  return apiRequest<BranchDailySummary>(
    `/branch-transactions/daily-summary?${q}`
  );
}
