import { apiRequest } from "@/shared/api/client";
import type { DashboardOverview } from "@/types/dashboard-overview";

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const data = await apiRequest<DashboardOverview>("/dashboard/overview");
  const fe = data.financeExtras;
  return {
    ...data,
    financeExtras: {
      advanceRecordCount: fe?.advanceRecordCount ?? 0,
      advanceTotalsByCurrency: fe?.advanceTotalsByCurrency ?? [],
      registerCashHeldByPersonnelTotalsByCurrency:
        fe?.registerCashHeldByPersonnelTotalsByCurrency ?? [],
      registerCashHeldByPersonnelBreakdown:
        fe?.registerCashHeldByPersonnelBreakdown ?? [],
    },
  };
}
