import { apiRequest } from "@/shared/api/client";
import type { BranchDailySummary } from "@/types/branch-daily-summary";

function normalizeDailySummary(r: BranchDailySummary): BranchDailySummary {
  const row = r as BranchDailySummary & {
    IncomeCash?: number;
    IncomeCard?: number;
  };
  return {
    ...r,
    incomeCash: Number(row.incomeCash ?? row.IncomeCash ?? 0) || 0,
    incomeCard: Number(row.incomeCard ?? row.IncomeCard ?? 0) || 0,
    registerOwesPersonnelToday: Number(r.registerOwesPersonnelToday ?? 0) || 0,
    personnelPocketRepaidFromRegisterToday:
      Number(r.personnelPocketRepaidFromRegisterToday ?? 0) || 0,
    personnelPocketRepaidFromPatronToday:
      Number(r.personnelPocketRepaidFromPatronToday ?? 0) || 0,
    netRegisterOwesPersonnelPocketToday: Number(r.netRegisterOwesPersonnelPocketToday ?? 0) || 0,
    registerOwesPatronToday: Number(r.registerOwesPatronToday ?? 0) || 0,
    patronDebtRepaidFromRegisterToday: Number(r.patronDebtRepaidFromRegisterToday ?? 0) || 0,
    netRegisterOwesPatronToday: Number(r.netRegisterOwesPatronToday ?? 0) || 0,
  };
}

/** Tüm erişilebilir şubeler için tek istek (dashboard). */
export async function fetchDailySummariesForDate(
  date: string
): Promise<BranchDailySummary[]> {
  const q = new URLSearchParams({ date });
  const rows = await apiRequest<BranchDailySummary[]>(
    `/branch-transactions/daily-summaries?${q}`
  );
  return rows.map((r) => normalizeDailySummary(r));
}

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
  return normalizeDailySummary(r);
}
