"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { upsertBranchPosSettlementProfile } from "@/modules/branch/api/branches-api";
import {
  fetchBranchComparison,
  fetchCashPositionReport,
  fetchFinancialBranchMonthly,
  fetchFinancialReport,
  fetchFinancialReportFilterOptions,
  fetchFinancialSummaryReport,
  fetchPatronFlowOverview,
  fetchPatronFlowPosProfiles,
  fetchStockReport,
  type BranchComparisonParams,
  type CashPositionParams,
  type FinancialReportFilterOptionsParams,
  type FinancialReportParams,
  type FinancialSummaryParams,
  type PatronFlowParams,
  type StockReportParams,
} from "@/modules/reports/api/reports-api";
import { reportsKeys } from "@/modules/reports/query-keys";
import type { UpsertBranchPosSettlementInput } from "@/types/patron-flow";

export function useFinancialReport(
  params: FinancialReportParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: reportsKeys.financial(params),
    queryFn: () => fetchFinancialReport(params),
    enabled:
      enabled &&
      Boolean(params.dateFrom) &&
      Boolean(params.dateTo) &&
      params.dateFrom <= params.dateTo,
  });
}

export function useFinancialReportFilterOptions(
  params: FinancialReportFilterOptionsParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: [...reportsKeys.all, "financialFilterOptions", params] as const,
    queryFn: () => fetchFinancialReportFilterOptions(params),
    enabled:
      enabled &&
      Boolean(params.dateFrom) &&
      Boolean(params.dateTo) &&
      params.dateFrom <= params.dateTo,
    staleTime: 60_000,
  });
}

export function useStockReport(params: StockReportParams, enabled: boolean) {
  return useQuery({
    queryKey: reportsKeys.stock(params),
    queryFn: () => fetchStockReport(params),
    enabled:
      enabled &&
      Boolean(params.dateFrom) &&
      Boolean(params.dateTo) &&
      params.dateFrom <= params.dateTo,
  });
}

export function useFinancialSummaryMonthly(
  params: FinancialReportParams,
  enabled: boolean
) {
  const q: FinancialSummaryParams = { ...params, groupBy: "month" };
  return useQuery({
    queryKey: reportsKeys.financialSummary(q),
    queryFn: () => fetchFinancialSummaryReport(q),
    enabled:
      enabled &&
      Boolean(params.dateFrom) &&
      Boolean(params.dateTo) &&
      params.dateFrom <= params.dateTo,
  });
}

export function useFinancialBranchMonthly(
  params: FinancialReportParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: reportsKeys.financialBranchMonthly(params),
    queryFn: () => fetchFinancialBranchMonthly(params),
    enabled:
      enabled &&
      Boolean(params.dateFrom) &&
      Boolean(params.dateTo) &&
      params.dateFrom <= params.dateTo,
  });
}

export function useCashPositionReport(params: CashPositionParams, enabled: boolean) {
  return useQuery({
    queryKey: reportsKeys.cashPosition(params),
    queryFn: () => fetchCashPositionReport(params),
    enabled: enabled && Boolean(params.asOfDate),
  });
}

export function useBranchComparisonReport(
  params: BranchComparisonParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: reportsKeys.branchComparison(params),
    queryFn: () => fetchBranchComparison(params),
    enabled:
      enabled &&
      Boolean(params.dateFrom) &&
      Boolean(params.dateTo) &&
      params.dateFrom <= params.dateTo,
  });
}

export function usePatronFlowOverview(params: PatronFlowParams, enabled: boolean) {
  return useQuery({
    queryKey: reportsKeys.patronFlow(params),
    queryFn: () => fetchPatronFlowOverview(params),
    enabled:
      enabled &&
      Boolean(params.dateFrom) &&
      Boolean(params.dateTo) &&
      params.dateFrom <= params.dateTo,
  });
}

export function usePatronFlowPosProfiles(enabled = true) {
  return useQuery({
    queryKey: reportsKeys.patronFlowPosProfiles,
    queryFn: fetchPatronFlowPosProfiles,
    enabled,
    staleTime: 60_000,
  });
}

export function useUpsertBranchPosSettlementProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      branchId: number;
      body: UpsertBranchPosSettlementInput;
    }) => upsertBranchPosSettlementProfile(vars.branchId, vars.body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: reportsKeys.patronFlowPosProfiles });
      await qc.invalidateQueries({ queryKey: [...reportsKeys.all, "patronFlow"] });
    },
  });
}
