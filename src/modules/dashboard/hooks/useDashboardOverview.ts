"use client";

import { fetchDashboardOverview } from "@/modules/dashboard/api/overview-api";
import { dashboardOverviewKeys } from "@/modules/dashboard/query-keys";
import { useQuery } from "@tanstack/react-query";

export function useDashboardOverview(enabled: boolean = true) {
  return useQuery({
    queryKey: dashboardOverviewKeys.all,
    queryFn: fetchDashboardOverview,
    // Dashboard KPI'ları yavaş net'te her mount'ta yeniden çekilmek istemiyor.
    // 15s pencere içindeki dönüşler cache'ten anlık servis edilir; sonrası refetch.
    staleTime: 15_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled,
  });
}
