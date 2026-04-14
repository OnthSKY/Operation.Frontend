"use client";

import {
  branchKeys,
  useBranchesList,
} from "@/modules/branch/hooks/useBranchQueries";
import { fetchDashboardDailySummaries } from "@/modules/dashboard/api/daily-summary-api";
import type { BranchTodayRow, SummaryAggregateState } from "@/modules/dashboard/hooks/useTodayBranchesSummary";
import {
  dashboardOverviewKeys,
  dashboardSummaryKeys,
} from "@/modules/dashboard/query-keys";
import { enumerateLocalIsoDatesInclusive } from "@/shared/lib/local-iso-date";
import type { BranchDailySummary } from "@/types/branch-daily-summary";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

/** Max calendar days fetched in one range (client aggregates daily bulk API). */
export const DAILY_REGISTER_RANGE_MAX_DAYS = 93;

function buildStateFromSummaries(
  branches: { id: number; name: string }[],
  rowsByDay: BranchDailySummary[][]
): SummaryAggregateState {
  if (branches.length === 0) return { kind: "empty" };

  type Acc = {
    hidden: boolean;
    income: number;
    incomeCash: number;
    incomeCard: number;
    net: number;
    expenseAllOut: number;
    registerOwesPatronToday: number;
    personnelPocketRepaidFromPatronToday: number;
    registerOwesPersonnelToday: number;
    personnelPocketRepaidFromRegisterToday: number;
    patronDebtRepaidFromRegisterToday: number;
  };

  const accByBranch = new Map<number, Acc>();

  for (const b of branches) {
    accByBranch.set(b.id, {
      hidden: false,
      income: 0,
      incomeCash: 0,
      incomeCard: 0,
      net: 0,
      expenseAllOut: 0,
      registerOwesPatronToday: 0,
      personnelPocketRepaidFromPatronToday: 0,
      registerOwesPersonnelToday: 0,
      personnelPocketRepaidFromRegisterToday: 0,
      patronDebtRepaidFromRegisterToday: 0,
    });
  }

  for (const dayRows of rowsByDay) {
    const byId = new Map(dayRows.map((s) => [s.branchId, s] as const));
    for (const b of branches) {
      const d = byId.get(b.id);
      const acc = accByBranch.get(b.id);
      if (!acc) continue;
      if (!d) continue;
      if (d.hideFinancialTotals) {
        acc.hidden = true;
        continue;
      }
      acc.income += Number(d.totalIncome);
      acc.incomeCash += Number(d.incomeCash ?? 0);
      acc.incomeCard += Number(d.incomeCard ?? 0);
      acc.net += Number(d.netCash);
      acc.expenseAllOut += Number(d.totalExpense);
      acc.registerOwesPatronToday += Number(d.registerOwesPatronToday ?? 0);
      acc.personnelPocketRepaidFromPatronToday += Number(
        d.personnelPocketRepaidFromPatronToday ?? 0
      );
      acc.registerOwesPersonnelToday += Number(d.registerOwesPersonnelToday ?? 0);
      acc.personnelPocketRepaidFromRegisterToday += Number(
        d.personnelPocketRepaidFromRegisterToday ?? 0
      );
      acc.patronDebtRepaidFromRegisterToday += Number(d.patronDebtRepaidFromRegisterToday ?? 0);
    }
  }

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
    const acc = accByBranch.get(b.id);
    if (!acc) continue;
    if (acc.hidden) {
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
    const income = acc.income;
    const net = acc.net;
    const expenseFromRegister = income - net;
    const totalExpenseOut = acc.expenseAllOut;
    totalIncome += income;
    totalIncomeCash += acc.incomeCash;
    totalIncomeCard += acc.incomeCard;
    totalExpenseAllOut += acc.expenseAllOut;
    totalRegisterOwesPatronToday += acc.registerOwesPatronToday;
    totalPersonnelPocketRepaidFromPatronToday += acc.personnelPocketRepaidFromPatronToday;
    totalRegisterOwesPersonnelToday += acc.registerOwesPersonnelToday;
    netCashSum += net;
    branchTodayRows.push({
      branchId: b.id,
      branchName: b.name,
      income,
      incomeCash: acc.incomeCash,
      incomeCard: acc.incomeCard,
      totalExpenseOut,
      expenseFromRegister,
      netCash: net,
      financialHidden: false,
      registerOwesPatronToday: acc.registerOwesPatronToday,
      registerOwesPersonnelToday: acc.registerOwesPersonnelToday,
      personnelPocketRepaidFromPatronToday: acc.personnelPocketRepaidFromPatronToday,
      personnelPocketRepaidFromRegisterToday: acc.personnelPocketRepaidFromRegisterToday,
      patronDebtRepaidFromRegisterToday: acc.patronDebtRepaidFromRegisterToday,
    });
  }

  branchTodayRows.sort((a, b) => {
    if (a.financialHidden !== b.financialHidden) return a.financialHidden ? 1 : -1;
    const activity = (r: BranchTodayRow) =>
      r.financialHidden ? 0 : r.income + r.expenseFromRegister;
    return (
      activity(b) - activity(a) ||
      a.branchName.localeCompare(b.branchName, undefined, { sensitivity: "base" })
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
}

export function useDailyRangeBranchesSummary(
  dateFrom: string,
  dateTo: string,
  enabled: boolean
) {
  const qc = useQueryClient();
  const { data: branches = [], isPending: branchesPending, isError: branchesError, error: branchesErr } =
    useBranchesList();

  const { dates, truncated } = useMemo(
    () => enumerateLocalIsoDatesInclusive(dateFrom, dateTo, DAILY_REGISTER_RANGE_MAX_DAYS),
    [dateFrom, dateTo]
  );

  const rangeEnabled =
    enabled &&
    !branchesPending &&
    !branchesError &&
    branches.length > 0 &&
    dates.length > 0;

  const results = useQueries({
    queries: dates.map((date) => ({
      queryKey: dashboardSummaryKeys.bulk({ kind: "day", date }),
      queryFn: () => fetchDashboardDailySummaries({ kind: "day", date }),
      enabled: rangeEnabled,
      staleTime: 0,
      refetchOnMount: "always" as const,
      refetchOnWindowFocus: true as const,
    })),
  });

  const state = useMemo((): SummaryAggregateState => {
    if (!enabled) return { kind: "empty" };
    if (branchesPending) return { kind: "loading" };
    if (branchesError) return { kind: "error", message: branchesErr };
    if (branches.length === 0) return { kind: "empty" };
    if (dates.length === 0) return { kind: "empty" };

    if (results.some((r) => r.isPending)) return { kind: "loading" };
    const err = results.find((r) => r.isError);
    if (err?.error) return { kind: "error", message: err.error };

    const rowsByDay: BranchDailySummary[][] = results.map((r) => r.data ?? []);
    return buildStateFromSummaries(branches, rowsByDay);
  }, [enabled, branches, branchesPending, branchesError, branchesErr, dates, results]);

  const refetch = useCallback(() => {
    void qc.invalidateQueries({ queryKey: branchKeys.list() });
    void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
    void qc.invalidateQueries({ queryKey: dashboardOverviewKeys.all });
  }, [qc]);

  return { state, refetch, truncated, dayCount: dates.length };
}
