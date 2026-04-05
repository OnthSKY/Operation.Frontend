import { apiRequest } from "@/shared/api/client";
import type { DashboardOverview } from "@/types/dashboard-overview";

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  return apiRequest<DashboardOverview>("/dashboard/overview");
}
