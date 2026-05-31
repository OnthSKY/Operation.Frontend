"use client";

import {
  fetchBranchStockBalancePolicy,
  putBranchStockBalancePolicy,
  type BranchStockBalancePolicyPayload,
  type UpdateBranchStockBalancePolicyBody,
} from "@/modules/admin/api/branch-stock-balance-policy-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const branchStockBalancePolicyKeys = {
  all: ["branch-stock-balance-policy"] as const,
};

export function useBranchStockBalancePolicyQuery(enabled: boolean) {
  return useQuery({
    queryKey: branchStockBalancePolicyKeys.all,
    queryFn: fetchBranchStockBalancePolicy,
    staleTime: 60_000,
    enabled,
  });
}

export function useUpdateBranchStockBalancePolicyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateBranchStockBalancePolicyBody) => putBranchStockBalancePolicy(body),
    onSuccess: (data: BranchStockBalancePolicyPayload) => {
      qc.setQueryData(branchStockBalancePolicyKeys.all, data);
      void qc.invalidateQueries({ queryKey: branchStockBalancePolicyKeys.all });
    },
  });
}
