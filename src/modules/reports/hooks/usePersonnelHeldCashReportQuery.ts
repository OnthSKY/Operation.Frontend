"use client";

import { fetchPersonnelHeldCashReport } from "@/modules/reports/api/personnel-held-cash-report-api";
import { reportsKeys } from "@/modules/reports/query-keys";
import { useQuery } from "@tanstack/react-query";

export function usePersonnelHeldCashReportQuery(enabled: boolean) {
  return useQuery({
    queryKey: reportsKeys.personnelHeldCash(),
    queryFn: fetchPersonnelHeldCashReport,
    staleTime: 30_000,
    enabled,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
