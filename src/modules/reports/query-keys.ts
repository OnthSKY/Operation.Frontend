import type {
  BranchComparisonParams,
  CashPositionParams,
  FinancialReportParams,
  FinancialSummaryParams,
  PatronFlowParams,
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
  cashPosition: (p: CashPositionParams) => [...reportsKeys.all, "cashPosition", p] as const,
  branchComparison: (p: BranchComparisonParams) =>
    [...reportsKeys.all, "branchComparison", p] as const,
  patronFlow: (p: PatronFlowParams) =>
    [...reportsKeys.all, "patronFlow", p] as const,
  patronFlowPosProfiles: ["reports", "patronFlowPosProfiles"] as const,
};
