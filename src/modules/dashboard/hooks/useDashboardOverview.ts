"use client";

import { fetchDashboardOverview } from "@/modules/dashboard/api/overview-api";
import { dashboardOverviewKeys } from "@/modules/dashboard/query-keys";
import { useQuery } from "@tanstack/react-query";

export function useDashboardOverview() {
  return useQuery({
    queryKey: dashboardOverviewKeys.all,
    queryFn: fetchDashboardOverview,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
