"use client";

import {
  branchKeys,
  useBranchesList,
} from "@/modules/branch/hooks/useBranchQueries";
import { fetchDashboardDailySummaries } from "@/modules/dashboard/api/daily-summary-api";
import type { DashboardBulkCashParams } from "@/modules/dashboard/types/dashboard-cash-filter";
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
  /** IN lines — cash (same day, branch register rules). */
  incomeCash: number;
  /** IN lines — card/POS. */
  incomeCard: number;
  /** All OUT lines total (API totalExpense). */
  totalExpenseOut: number;
  expenseFromRegister: number;
  netCash: number;
  financialHidden: boolean;
  registerOwesPatronToday: number;
  registerOwesPersonnelToday: number;
  personnelPocketRepaidFromPatronToday: number;
  personnelPocketRepaidFromRegisterToday: number;
  patronDebtRepaidFromRegisterToday: number;
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
      /** OUT karşılanan: patron cebi (kasa patrona borçlanır). */
      totalRegisterOwesPatronToday: number;
      /** Personel cebi iadesi patron tarafından (kasadan düşmez). */
      totalPersonnelPocketRepaidFromPatronToday: number;
      /** OUT doğrudan personel cebinden (kasadan düşmez). */
      totalRegisterOwesPersonnelToday: number;
      netCash: number;
      branchCount: number;
      branchTodayRows: BranchTodayRow[];
    };

export function useTodayBranchesSummary(
  params: DashboardBulkCashParams,
  /** When false, no bulk request runs (e.g. date-range mode uses separate queries). */
  queryEnabled = true
) {
  const qc = useQueryClient();
  const stableParams: DashboardBulkCashParams =
    params.kind === "all_data"
      ? { kind: "all_data" }
      : params.kind === "day"
        ? { kind: "day", date: String(params.date ?? "").trim().slice(0, 10) || localIsoDate() }
        : params.kind === "season_single"
          ? { kind: "season_single", seasonYear: params.seasonYear }
          : {
              kind: "season_range",
              fromYear: params.fromYear,
              toYear: params.toYear,
            };
  const {
    data: branches = [],
    isPending: branchesPending,
    isError: branchesError,
    error: branchesErr,
  } = useBranchesList();

  const bulkEnabled =
    queryEnabled &&
    !branchesPending &&
    !branchesError &&
    branches.length > 0 &&
    stableParams.kind !== "all_data";

  const bulkQuery = useQuery({
    queryKey: dashboardSummaryKeys.bulk(stableParams),
    queryFn: () => fetchDashboardDailySummaries(stableParams),
    enabled: bulkEnabled,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const state = useMemo((): SummaryAggregateState => {
    if (stableParams.kind === "all_data") {
      return { kind: "empty" };
    }
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
    let totalRegisterOwesPatronToday = 0;
    let totalPersonnelPocketRepaidFromPatronToday = 0;
    let totalRegisterOwesPersonnelToday = 0;
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
          incomeCash: 0,
          incomeCard: 0,
          totalExpenseOut: 0,
          expenseFromRegister: 0,
          netCash: 0,
          financialHidden: true,
          registerOwesPatronToday: 0,
          registerOwesPersonnelToday: 0,
          personnelPocketRepaidFromPatronToday: 0,
          personnelPocketRepaidFromRegisterToday: 0,
          patronDebtRepaidFromRegisterToday: 0,
        });
        continue;
      }
      counted++;
      const income = Number(d.totalIncome);
      const net = Number(d.netCash);
      const expenseFromRegister = income - net;
      const totalExpenseOut = Number(d.totalExpense);
      const registerOwesPatronToday = Number(d.registerOwesPatronToday ?? 0);
      const registerOwesPersonnelToday = Number(d.registerOwesPersonnelToday ?? 0);
      const personnelPocketRepaidFromPatronToday = Number(
        d.personnelPocketRepaidFromPatronToday ?? 0
      );
      const personnelPocketRepaidFromRegisterToday = Number(
        d.personnelPocketRepaidFromRegisterToday ?? 0
      );
      const patronDebtRepaidFromRegisterToday = Number(d.patronDebtRepaidFromRegisterToday ?? 0);
      totalIncome += income;
      totalIncomeCash += Number(d.incomeCash ?? 0);
      totalIncomeCard += Number(d.incomeCard ?? 0);
      totalExpenseAllOut += totalExpenseOut;
      totalRegisterOwesPatronToday += registerOwesPatronToday;
      totalPersonnelPocketRepaidFromPatronToday += personnelPocketRepaidFromPatronToday;
      totalRegisterOwesPersonnelToday += registerOwesPersonnelToday;
      netCashSum += net;
      branchTodayRows.push({
        branchId: b.id,
        branchName: b.name,
        income,
        incomeCash: Number(d.incomeCash ?? 0),
        incomeCard: Number(d.incomeCard ?? 0),
        totalExpenseOut,
        expenseFromRegister,
        netCash: net,
        financialHidden: false,
        registerOwesPatronToday,
        registerOwesPersonnelToday,
        personnelPocketRepaidFromPatronToday,
        personnelPocketRepaidFromRegisterToday,
        patronDebtRepaidFromRegisterToday,
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
      totalRegisterOwesPatronToday,
      totalPersonnelPocketRepaidFromPatronToday,
      totalRegisterOwesPersonnelToday,
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
    stableParams,
    queryEnabled,
  ]);

  const refetch = useCallback(() => {
    void qc.invalidateQueries({ queryKey: branchKeys.list() });
    void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
    void qc.invalidateQueries({ queryKey: dashboardOverviewKeys.all });
  }, [qc]);

  return { state, refetch };
}
