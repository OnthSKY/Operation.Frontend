"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBranch,
  fetchBranches,
} from "@/modules/branch/api/branches-api";
import {
  createBranchTransaction,
  fetchBranchTransactions,
} from "@/modules/branch/api/branch-transactions-api";
import { dashboardSummaryKeys } from "@/modules/dashboard/query-keys";
import type { CreateBranchInput } from "@/types/branch";
import type { CreateBranchTransactionInput } from "@/types/branch-transaction";

export const branchKeys = {
  all: ["branches"] as const,
  list: () => [...branchKeys.all, "list"] as const,
  transactions: (branchId: number, date: string) =>
    [...branchKeys.all, "tx", branchId, date] as const,
};

export function useBranchesList() {
  return useQuery({
    queryKey: branchKeys.list(),
    queryFn: fetchBranches,
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBranchInput) => createBranch(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: branchKeys.list() });
    },
  });
}

export function useBranchTransactions(branchId: number | null, date: string) {
  return useQuery({
    queryKey:
      branchId != null
        ? branchKeys.transactions(branchId, date)
        : [...branchKeys.all, "tx", "none", date],
    queryFn: () => fetchBranchTransactions(branchId!, date),
    enabled: branchId != null && branchId > 0 && date.length >= 10,
  });
}

export function useCreateBranchTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBranchTransactionInput) =>
      createBranchTransaction(input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({
        queryKey: [...branchKeys.all, "tx", variables.branchId],
        exact: false,
      });
      void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
    },
  });
}
