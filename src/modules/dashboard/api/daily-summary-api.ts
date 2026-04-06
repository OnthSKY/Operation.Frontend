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
  const r = await apiRequest<BranchDailySummary>(
    `/branch-transactions/daily-summary?${q}`
  );
  return {
    ...r,
    registerOwesPersonnelToday: Number(r.registerOwesPersonnelToday ?? 0) || 0,
    registerOwesPatronToday: Number(r.registerOwesPatronToday ?? 0) || 0,
  };
}
