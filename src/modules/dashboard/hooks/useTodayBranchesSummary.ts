"use client";

import {
  branchKeys,
  useBranchesList,
} from "@/modules/branch/hooks/useBranchQueries";
import { fetchBranchDailySummary } from "@/modules/dashboard/api/daily-summary-api";
import {
  dashboardOverviewKeys,
  dashboardSummaryKeys,
} from "@/modules/dashboard/query-keys";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

export type SummaryAggregateState =
  | { kind: "loading" }
  | { kind: "error"; message: unknown }
  | { kind: "empty" }
  | {
      kind: "ok";
      totalIncome: number;
      totalExpense: number;
      netCash: number;
      branchCount: number;
    };

export function useTodayBranchesSummary() {
  const qc = useQueryClient();
  const today = localIsoDate();
  const {
    data: branches = [],
    isPending: branchesPending,
    isError: branchesError,
    error: branchesErr,
  } = useBranchesList();

  const summaries = useQueries({
    queries: branches.map((b) => ({
      queryKey: [...dashboardSummaryKeys.today(today), b.id] as const,
      queryFn: () => fetchBranchDailySummary(b.id, today),
      enabled: branches.length > 0,
    })),
  });

  const state = useMemo((): SummaryAggregateState => {
    if (branchesPending) return { kind: "loading" };
    if (branchesError) return { kind: "error", message: branchesErr };
    if (branches.length === 0) return { kind: "empty" };
    const pending = summaries.some((q) => q.isPending);
    if (pending) return { kind: "loading" };
    const failed = summaries.find((q) => q.isError);
    if (failed?.error) return { kind: "error", message: failed.error };
    let totalIncome = 0;
    let totalExpense = 0;
    let counted = 0;
    for (const q of summaries) {
      const d = q.data;
      if (!d) continue;
      if (d.hideFinancialTotals) continue;
      counted++;
      totalIncome += Number(d.totalIncome);
      totalExpense += Number(d.totalExpense);
    }
    const allDataReady =
      summaries.length > 0 &&
      summaries.every((q) => !q.isPending && q.data != null);
    if (allDataReady && counted === 0 && branches.length > 0) {
      return { kind: "empty" };
    }
    return {
      kind: "ok",
      totalIncome,
      totalExpense,
      netCash: totalIncome - totalExpense,
      branchCount: branches.length,
    };
  }, [branches.length, branchesPending, branchesError, branchesErr, summaries]);

  const refetch = useCallback(() => {
    void qc.invalidateQueries({ queryKey: branchKeys.list() });
    void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
    void qc.invalidateQueries({ queryKey: dashboardOverviewKeys.all });
  }, [qc]);

  return { today, state, refetch };
}
