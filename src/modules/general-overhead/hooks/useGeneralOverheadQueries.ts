"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
import { reportsKeys } from "@/modules/reports/query-keys";
import {
  allocateGeneralOverheadPool,
  createGeneralOverheadPool,
  fetchGeneralOverheadPool,
  fetchGeneralOverheadPools,
  reverseGeneralOverheadAllocation,
  type CreateGeneralOverheadPoolInput,
  type GeneralOverheadAllocateLine,
} from "@/modules/general-overhead/api/general-overhead-api";

export const generalOverheadKeys = {
  all: ["general-overhead"] as const,
  list: (status?: string) => [...generalOverheadKeys.all, "list", status ?? ""] as const,
  detail: (id: number) => [...generalOverheadKeys.all, "detail", id] as const,
};

export function useGeneralOverheadPools(statusFilter: string | undefined, enabled = true) {
  return useQuery({
    queryKey: generalOverheadKeys.list(statusFilter),
    queryFn: () => fetchGeneralOverheadPools(statusFilter),
    enabled,
  });
}

export function useGeneralOverheadPoolDetail(poolId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: generalOverheadKeys.detail(poolId ?? 0),
    queryFn: () => fetchGeneralOverheadPool(poolId!),
    enabled: enabled && poolId != null && poolId > 0,
  });
}

export function useCreateGeneralOverheadPool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGeneralOverheadPoolInput) => createGeneralOverheadPool(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: generalOverheadKeys.all });
    },
  });
}

export function useAllocateGeneralOverheadPool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      poolId,
      lines,
      expensePaymentSource,
    }: {
      poolId: number;
      lines: GeneralOverheadAllocateLine[];
      expensePaymentSource?: "PATRON" | "REGISTER";
    }) => allocateGeneralOverheadPool(poolId, lines, { expensePaymentSource }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: generalOverheadKeys.all });
      void qc.invalidateQueries({
        queryKey: generalOverheadKeys.detail(vars.poolId),
      });
      void qc.invalidateQueries({ queryKey: reportsKeys.all });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}

export function useReverseGeneralOverheadAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (poolId: number) => reverseGeneralOverheadAllocation(poolId),
    onSuccess: (_data, poolId) => {
      void qc.invalidateQueries({ queryKey: generalOverheadKeys.all });
      void qc.invalidateQueries({ queryKey: generalOverheadKeys.detail(poolId) });
      void qc.invalidateQueries({ queryKey: reportsKeys.all });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}
