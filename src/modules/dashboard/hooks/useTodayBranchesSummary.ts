"use client";

import {
  branchKeys,
  useBranchesList,
} from "@/modules/branch/hooks/useBranchQueries";
import { fetchDailySummariesForDate } from "@/modules/dashboard/api/daily-summary-api";
import {
  dashboardOverviewKeys,
  dashboardSummaryKeys,
} from "@/modules/dashboard/query-keys";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

export type BranchTodayRow = {
  branchId: number;
  branchName: string;
  income: number;
  expenseFromRegister: number;
  netCash: number;
  financialHidden: boolean;
};

export type SummaryAggregateState =
  | { kind: "loading" }
  | { kind: "error"; message: unknown }
  | { kind: "empty" }
  | {
      kind: "ok";
      totalIncome: number;
      totalIncomeCash: number;
      totalIncomeCard: number;
      totalExpenseFromRegister: number;
      totalExpenseAllOut: number;
      netCash: number;
      branchCount: number;
      branchTodayRows: BranchTodayRow[];
    };

export function useTodayBranchesSummary(asOfDate: string) {
  const qc = useQueryClient();
  const dateKey = String(asOfDate ?? "").trim().slice(0, 10) || localIsoDate();
  const {
    data: branches = [],
    isPending: branchesPending,
    isError: branchesError,
    error: branchesErr,
  } = useBranchesList();

  const bulkEnabled =
    !branchesPending && !branchesError && branches.length > 0;

  const bulkQuery = useQuery({
    queryKey: dashboardSummaryKeys.bulk(dateKey),
    queryFn: () => fetchDailySummariesForDate(dateKey),
    enabled: bulkEnabled,
  });

  const state = useMemo((): SummaryAggregateState => {
    if (branchesPending) return { kind: "loading" };
    if (branchesError) return { kind: "error", message: branchesErr };
    if (branches.length === 0) return { kind: "empty" };
    if (bulkQuery.isPending) return { kind: "loading" };
    if (bulkQuery.isError) return { kind: "error", message: bulkQuery.error };

    const byId = new Map(
      (bulkQuery.data ?? []).map((s) => [s.branchId, s] as const)
    );

    let totalIncome = 0;
    let totalIncomeCash = 0;
    let totalIncomeCard = 0;
    let totalExpenseAllOut = 0;
    let netCashSum = 0;
    let counted = 0;
    const branchTodayRows: BranchTodayRow[] = [];

    for (const b of branches) {
      const d = byId.get(b.id);
      if (!d) continue;
      if (d.hideFinancialTotals) {
        branchTodayRows.push({
          branchId: b.id,
          branchName: b.name,
          income: 0,
          expenseFromRegister: 0,
          netCash: 0,
          financialHidden: true,
        });
        continue;
      }
      counted++;
      const income = Number(d.totalIncome);
      const net = Number(d.netCash);
      const expenseFromRegister = income - net;
      totalIncome += income;
      totalIncomeCash += Number(d.incomeCash ?? 0);
      totalIncomeCard += Number(d.incomeCard ?? 0);
      totalExpenseAllOut += Number(d.totalExpense);
      netCashSum += net;
      branchTodayRows.push({
        branchId: b.id,
        branchName: b.name,
        income,
        expenseFromRegister,
        netCash: net,
        financialHidden: false,
      });
    }

    branchTodayRows.sort((a, b) => {
      if (a.financialHidden !== b.financialHidden)
        return a.financialHidden ? 1 : -1;
      const activity = (r: BranchTodayRow) =>
        r.financialHidden ? 0 : r.income + r.expenseFromRegister;
      return (
        activity(b) - activity(a) ||
        a.branchName.localeCompare(b.branchName, undefined, {
          sensitivity: "base",
        })
      );
    });

    const totalExpenseFromRegister = totalIncome - netCashSum;
    if (counted === 0 && branches.length > 0) {
      return { kind: "empty" };
    }
    if (counted > 0 && totalIncome > 0.005) {
      const split = totalIncomeCash + totalIncomeCard;
      if (split < 0.005) {
        totalIncomeCash = totalIncome;
        totalIncomeCard = 0;
      }
    }
    return {
      kind: "ok",
      totalIncome,
      totalIncomeCash,
      totalIncomeCard,
      totalExpenseFromRegister,
      totalExpenseAllOut,
      netCash: netCashSum,
      branchCount: branches.length,
      branchTodayRows,
    };
  }, [
    branches,
    branchesPending,
    branchesError,
    branchesErr,
    bulkQuery.data,
    bulkQuery.isPending,
    bulkQuery.isError,
    bulkQuery.error,
    dateKey,
  ]);

  const refetch = useCallback(() => {
    void qc.invalidateQueries({ queryKey: branchKeys.list() });
    void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
    void qc.invalidateQueries({ queryKey: dashboardOverviewKeys.all });
  }, [qc]);

  return { state, refetch };
}
