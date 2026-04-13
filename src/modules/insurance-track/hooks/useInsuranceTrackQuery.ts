"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchInsuranceTrack } from "@/modules/insurance-track/api/insurance-track-api";
import { insuranceTrackKeys } from "@/modules/insurance-track/query-keys";
import type { InsuranceTrackQueryParams } from "@/types/insurance-track";

export function useInsuranceTrackQuery(
  params: InsuranceTrackQueryParams,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: insuranceTrackKeys.list(params),
    queryFn: () => fetchInsuranceTrack(params),
    enabled: enabled && Boolean(params.asOf),
    staleTime: 30_000,
  });
}
