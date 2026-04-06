"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchFinancialBranchMonthly,
  fetchFinancialReport,
  fetchFinancialSummaryReport,
  fetchStockReport,
  type FinancialReportParams,
  type FinancialSummaryParams,
  type StockReportParams,
} from "@/modules/reports/api/reports-api";
import { reportsKeys } from "@/modules/reports/query-keys";

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
