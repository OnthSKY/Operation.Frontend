"use client";

import {
  fetchPersonnelHeldCashReconciliation,
  postPersonnelHeldCashAutoFix,
} from "@/modules/admin/api/personnel-held-cash-reconciliation-api";
import { personnelHeldCashReconciliationKeys } from "@/modules/admin/personnel-held-cash-reconciliation-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function usePersonnelHeldCashReconciliationQuery(enabled: boolean) {
  return useQuery({
    queryKey: personnelHeldCashReconciliationKeys.all,
    queryFn: fetchPersonnelHeldCashReconciliation,
    staleTime: 30_000,
    enabled,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function usePersonnelHeldCashAutoFixMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postPersonnelHeldCashAutoFix,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelHeldCashReconciliationKeys.all });
    },
  });
}
