import { apiRequest } from "@/shared/api/client";
import type {
  FinancialBranchMonthlyBreakdownRow,
  FinancialReport,
  FinancialSummaryReport,
  StockReport,
} from "@/types/reports";

export type FinancialReportParams = {
  dateFrom: string;
  dateTo: string;
  branchId?: number;
};

export type StockReportParams = {
  dateFrom: string;
  dateTo: string;
  warehouseId?: number;
  branchId?: number;
};

function toQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export function fetchFinancialReport(
  params: FinancialReportParams
): Promise<FinancialReport> {
  return apiRequest<FinancialReport>(
    `/reports/financial${toQuery({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      branchId: params.branchId,
    })}`
  );
}

export function fetchStockReport(params: StockReportParams): Promise<StockReport> {
  return apiRequest<StockReport>(
    `/reports/stock${toQuery({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      warehouseId: params.warehouseId,
      branchId: params.branchId,
    })}`
  );
}

export type FinancialSummaryParams = FinancialReportParams & {
  groupBy?: "month";
};

export function fetchFinancialSummaryReport(
  params: FinancialSummaryParams
): Promise<FinancialSummaryReport> {
  return apiRequest<FinancialSummaryReport>(
    `/reports/financial-summary${toQuery({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      branchId: params.branchId,
      groupBy: params.groupBy,
    })}`
  );
}

export function fetchFinancialBranchMonthly(
  params: FinancialReportParams
): Promise<FinancialBranchMonthlyBreakdownRow[]> {
  return apiRequest<FinancialBranchMonthlyBreakdownRow[]>(
    `/reports/financial-branch-monthly${toQuery({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      branchId: params.branchId,
    })}`
  );
}
