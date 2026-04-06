import type {
  FinancialReportParams,
  FinancialSummaryParams,
  StockReportParams,
} from "./api/reports-api";

export const reportsKeys = {
  all: ["reports"] as const,
  financial: (p: FinancialReportParams) =>
    [...reportsKeys.all, "financial", p] as const,
  financialSummary: (p: FinancialSummaryParams) =>
    [...reportsKeys.all, "financialSummary", p] as const,
  financialBranchMonthly: (p: FinancialReportParams) =>
    [...reportsKeys.all, "financialBranchMonthly", p] as const,
  stock: (p: StockReportParams) => [...reportsKeys.all, "stock", p] as const,
};
