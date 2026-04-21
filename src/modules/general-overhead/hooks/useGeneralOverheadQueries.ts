"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
import { reportsKeys } from "@/modules/reports/query-keys";
import {
  allocateGeneralOverheadPool,
  createGeneralOverheadPool,
  fetchGeneralOverheadPool,
  fetchGeneralOverheadPools,
  fetchGeneralOverheadReversePreview,
  reverseGeneralOverheadAllocation,
  type CreateGeneralOverheadPoolInput,
  type GeneralOverheadAllocateLine,
} from "@/modules/general-overhead/api/general-overhead-api";

export const generalOverheadKeys = {
  all: ["general-overhead"] as const,
  list: (status?: string) => [...generalOverheadKeys.all, "list", status ?? ""] as const,
  detail: (id: number) => [...generalOverheadKeys.all, "detail", id] as const,
  reversePreview: (id: number) => [...generalOverheadKeys.all, "reverse-preview", id] as const,
};

/** Denetim günlüğü: `GET /api/audit-logs?tableName=general_overhead_pools&recordId=` ile aynı anahtar. */
export const generalOverheadPoolAuditKey = (poolId: number) => ["audit-logs", "general_overhead_pools", poolId] as const;

export function useGeneralOverheadPools(statusFilter: string | undefined, enabled = true) {
  return useQuery({
    queryKey: generalOverheadKeys.list(statusFilter),
    queryFn: () => fetchGeneralOverheadPools(statusFilter),
    enabled,
  });
}

export function useGeneralOverheadPoolDetail(poolId: number | null) {
  return useQuery({
    queryKey: generalOverheadKeys.detail(poolId ?? 0),
    queryFn: () => fetchGeneralOverheadPool(poolId!),
    enabled: poolId != null && poolId > 0,
  });
}

export function useGeneralOverheadReversePreview(poolId: number | null) {
  return useQuery({
    queryKey: generalOverheadKeys.reversePreview(poolId ?? 0),
    queryFn: () => fetchGeneralOverheadReversePreview(poolId!),
    enabled: poolId != null && poolId > 0,
  });
}

export function useCreateGeneralOverheadPool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateGeneralOverheadPoolInput) => createGeneralOverheadPool(body),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: generalOverheadKeys.all });
      void qc.invalidateQueries({ queryKey: generalOverheadPoolAuditKey(data.id) });
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
      void qc.invalidateQueries({ queryKey: generalOverheadPoolAuditKey(vars.poolId) });
      void qc.invalidateQueries({ queryKey: reportsKeys.all });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}

export function useReverseGeneralOverheadAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      poolId,
      acknowledgeReverseRisks,
    }: {
      poolId: number;
      acknowledgeReverseRisks?: boolean;
    }) => reverseGeneralOverheadAllocation(poolId, { acknowledgeReverseRisks }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: generalOverheadKeys.all });
      void qc.invalidateQueries({ queryKey: generalOverheadKeys.detail(vars.poolId) });
      void qc.invalidateQueries({ queryKey: generalOverheadKeys.reversePreview(vars.poolId) });
      void qc.invalidateQueries({ queryKey: generalOverheadPoolAuditKey(vars.poolId) });
      void qc.invalidateQueries({ queryKey: reportsKeys.all });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}
