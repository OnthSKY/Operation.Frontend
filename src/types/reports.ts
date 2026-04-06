export type FinancialCurrencyTotalsRow = {
  currencyCode: string;
  totalIncome: number;
  totalExpense: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
  netCash: number;
};

export type FinancialBranchBreakdownRow = {
  branchId: number;
  branchName: string;
  currencyCode: string;
  totalIncome: number;
  totalExpense: number;
  netCash: number;
};

export type FinancialCategoryBreakdownRow = {
  type: string;
  mainCategory: string | null;
  category: string;
  currencyCode: string;
  totalAmount: number;
  lineCount: number;
  typeLabelKey?: string;
  categoryLabelKey?: string;
};

export type FinancialAdvanceSummaryRow = {
  currencyCode: string;
  totalAmount: number;
  recordCount: number;
};

export type FinancialCurrencyCompareRow = {
  currencyCode: string;
  netCurrent: number;
  netPrevious: number;
  netDelta: number;
};

export type FinancialBranchTrendRow = {
  branchId: number;
  branchName: string;
  currencyCode: string;
  netCurrent: number;
  netPrevious: number;
  netDelta: number;
};

export type FinancialReport = {
  dateFrom: string;
  dateTo: string;
  branchIdFilter: number | null;
  comparePeriodFrom?: string | null;
  comparePeriodTo?: string | null;
  totalsByCurrency: FinancialCurrencyTotalsRow[];
  netCompareByCurrency?: FinancialCurrencyCompareRow[];
  byBranch: FinancialBranchBreakdownRow[];
  branchTrends?: FinancialBranchTrendRow[];
  byCategory: FinancialCategoryBreakdownRow[];
  advancesByCurrency: FinancialAdvanceSummaryRow[];
};

export type WarehousePeriodSummaryRow = {
  warehouseId: number;
  warehouseName: string;
  quantityIn: number;
  quantityOut: number;
  movementCount: number;
  netQuantity: number;
};

export type WarehouseProductFlowRow = {
  warehouseId: number;
  warehouseName: string;
  productId: number | null;
  productName: string | null;
  quantityIn: number;
  quantityOut: number;
  netQuantity: number;
  turnover: number;
};

export type BranchReceiptSummaryRow = {
  branchId: number;
  branchName: string;
  totalQuantityReceived: number;
  receiptLineCount: number;
};

export type StockReport = {
  dateFrom: string;
  dateTo: string;
  warehouseIdFilter: number | null;
  branchIdFilter: number | null;
  warehousePeriod: WarehousePeriodSummaryRow[];
  topProductFlows: WarehouseProductFlowRow[];
  branchReceipts: BranchReceiptSummaryRow[];
};

export type FinancialSummaryCurrencyBucket = {
  currencyCode: string;
  totalIncome: number;
  totalExpense: number;
  totalSalaryPaid: number;
  totalAdvanceGiven: number;
  netCash: number;
};

export type FinancialMonthlyBreakdownRow = {
  monthStart: string;
  currencyCode: string;
  totalIncome: number;
  totalExpense: number;
  totalSalaryPaid: number;
  totalAdvanceGiven: number;
  netCash: number;
};

export type FinancialSummaryReport = {
  dateFrom: string;
  dateTo: string;
  branchIdFilter: number | null;
  labelKeys: Record<string, string>;
  byCurrency: FinancialSummaryCurrencyBucket[];
  monthly: FinancialMonthlyBreakdownRow[] | null;
  insights: unknown[];
};

export type FinancialBranchMonthlyBreakdownRow = {
  branchId: number;
  branchName: string;
  monthStart: string;
  currencyCode: string;
  totalIncome: number;
  totalExpense: number;
  totalSalaryPaid: number;
  totalAdvanceGiven: number;
  netCash: number;
};
