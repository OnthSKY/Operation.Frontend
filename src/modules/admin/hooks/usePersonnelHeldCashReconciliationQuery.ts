"use client";

import {
  fetchPersonnelHeldCashDrillDown,
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

export function usePersonnelHeldCashDrillDownQuery(
  personnelId: number | null,
  branchId: number | null,
  currency: string | null,
  enabled: boolean
) {
  const ready = Boolean(enabled && personnelId && branchId && currency);
  return useQuery({
    queryKey: ready
      ? personnelHeldCashReconciliationKeys.drillDown(personnelId!, branchId!, currency!)
      : ["admin", "personnel-held-cash-reconciliation", "drill-down", "disabled"],
    queryFn: () => fetchPersonnelHeldCashDrillDown(personnelId!, branchId!, currency!),
    enabled: ready,
    staleTime: 15_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
