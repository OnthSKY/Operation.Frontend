"use client";

import {
  fetchTourismSeasonClosedPolicy,
  putTourismSeasonClosedPolicy,
  type TourismSeasonClosedPolicyPayload,
  type UpdateTourismSeasonClosedPolicyBody,
} from "@/modules/admin/api/tourism-season-closed-policy-api";
import { tourismSeasonClosedPolicyKeys } from "@/modules/admin/tourism-season-closed-policy-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useTourismSeasonClosedPolicyQuery(enabled: boolean) {
  return useQuery({
    queryKey: tourismSeasonClosedPolicyKeys.all,
    queryFn: fetchTourismSeasonClosedPolicy,
    staleTime: 60_000,
    enabled,
  });
}

export function useUpdateTourismSeasonClosedPolicyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTourismSeasonClosedPolicyBody) => putTourismSeasonClosedPolicy(body),
    onSuccess: (data: TourismSeasonClosedPolicyPayload) => {
      qc.setQueryData(tourismSeasonClosedPolicyKeys.all, data);
      void qc.invalidateQueries({ queryKey: tourismSeasonClosedPolicyKeys.all });
    },
  });
}
