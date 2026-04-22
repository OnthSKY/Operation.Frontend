export type FinancialCurrencyTotalsRow = {
  currencyCode: string;
  /** Faaliyet geliri KPI (iç nakit IN’ler hariç); API `totalIncome` ile aynı. */
  totalIncome: number;
  totalExpense: number;
  incomeTransactionCount: number;
  expenseTransactionCount: number;
  /** Şube kasasından tedarikçi (CASH); netCash buna göre düşülmüş. */
  totalSupplierRegisterCashPaid?: number;
  totalSalaryPaid?: number;
  totalAdvanceGiven?: number;
  netCash: number;
};

/** Faaliyet geliri KPI: kart / nakit ve nakit tarafında kasa–patron–personel dağılımı (iç nakit IN’ler hariç; API ile aynı). */
export type FinancialIncomeRegisterBreakdownRow = {
  currencyCode: string;
  incomeCard: number;
  incomeCash: number;
  cashPatron: number;
  cashBranchManager: number;
  cashRemainsAtBranch: number;
  cashUnspecified: number;
};

export type FinancialBranchBreakdownRow = {
  /** 0 = merkez (kasa dışı OUT). */
  branchId: number;
  branchName: string;
  currencyCode: string;
  /** Faaliyet geliri KPI toplamı. */
  totalIncome: number;
  /** Şube karşılaştırma: faaliyet geliri nakit bacağı */
  totalIncomeCash?: number;
  /** Şube karşılaştırma: faaliyet geliri kart bacağı */
  totalIncomeCard?: number;
  /** Şube karşılaştırma: faaliyet geliri nakit içinden patrona yazılan */
  totalIncomeCashTaggedPatron?: number;
  totalExpense: number;
  totalExpenseRegister?: number;
  totalExpensePatron?: number;
  totalExpensePersonnelPocket?: number;
  totalExpensePersonnelHeldRegisterCash?: number;
  totalExpenseUnset?: number;
  totalSupplierRegisterCashPaid?: number;
  totalSalaryPaid?: number;
  totalAdvanceGiven?: number;
  netCash: number;
};

export type ReportPagedResponse<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
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

/** OUT gider ödeme kaynağı: REGISTER | PATRON | PERSONNEL_POCKET | UNSET */
export type FinancialExpensePaymentSourceRow = {
  expensePaymentSource: string;
  currencyCode: string;
  totalAmount: number;
  lineCount: number;
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

export type FinancialSupplierPaymentBreakdownRow = {
  currencyCode: string;
  sourceType: string;
  totalAmount: number;
  recordCount: number;
};

export type FinancialVehicleExpenseOffRegisterRow = {
  currencyCode: string;
  totalAmount: number;
  recordCount: number;
};

export type FinancialGeneralOverheadAllocatedRow = {
  poolId: number;
  title: string;
  poolExpenseDate: string;
  currencyCode: string;
  totalAmount: number;
  lineCount: number;
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
  /** Sunucu yanıtında yoksa API katmanı [] doldurur. */
  byExpensePaymentSource?: FinancialExpensePaymentSourceRow[];
  advancesByCurrency: FinancialAdvanceSummaryRow[];
  supplierPayments?: FinancialSupplierPaymentBreakdownRow[];
  vehicleExpensesOffRegister?: FinancialVehicleExpenseOffRegisterRow[];
  generalOverheadAllocated?: FinancialGeneralOverheadAllocatedRow[];
  incomeRegisterBreakdownByCurrency?: FinancialIncomeRegisterBreakdownRow[];
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
  unit?: string | null;
  quantityIn: number;
  quantityOut: number;
  netQuantity: number;
  turnover: number;
};

export type BranchReceiptSummaryRow = {
  branchId: number;
  branchName: string;
  productId?: number | null;
  productName?: string | null;
  unit?: string | null;
  totalQuantityReceived: number;
  receiptLineCount: number;
};

export type WarehouseToBranchFlowRow = {
  warehouseId: number;
  warehouseName: string;
  branchId: number;
  branchName: string;
  productId?: number | null;
  productName?: string | null;
  unit?: string | null;
  totalQuantity: number;
  movementLineCount: number;
};

export type WarehouseOutboundProductRow = {
  warehouseId: number;
  warehouseName: string;
  productId: number | null;
  productName: string | null;
  unit?: string | null;
  quantityOut: number;
};

export type StockReport = {
  dateFrom: string;
  dateTo: string;
  warehouseIdFilter: number | null;
  branchIdFilter: number | null;
  categoryIdFilter?: number | null;
  parentProductIdFilter?: number | null;
  productIdFilter?: number | null;
  warehousePeriod: WarehousePeriodSummaryRow[];
  topProductFlows: WarehouseProductFlowRow[];
  branchReceipts: BranchReceiptSummaryRow[];
  warehouseToBranchFlows: WarehouseToBranchFlowRow[];
  topOutboundProducts: WarehouseOutboundProductRow[];
};

export type FinancialSummaryCurrencyBucket = {
  currencyCode: string;
  totalIncome: number;
  totalExpense: number;
  totalSalaryPaid: number;
  totalAdvanceGiven: number;
  totalSupplierPayments?: number;
  totalSupplierRegisterCashPaid?: number;
  totalVehicleExpenseOffRegister?: number;
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

export type CashPositionBranchRow = {
  branchId: number;
  branchName: string;
  seasonStatus: string;
  cumulativeCashBalance: number;
  cumulativeNetRegisterOwesPersonnelPocket: number;
  cumulativeNetRegisterOwesPatron: number;
  cumulativeRegisterCashHeldByPersonnel: number;
};

export type CashPositionTotalsRow = {
  cumulativeCashBalance: number;
  cumulativeNetRegisterOwesPersonnelPocket: number;
  cumulativeNetRegisterOwesPatron: number;
  cumulativeRegisterCashHeldByPersonnel: number;
};

export type CashPositionHeldRegisterCashLine = {
  branchId: number;
  branchName: string;
  personnelId: number | null;
  fullName: string;
  amount: number;
};

export type CashPositionReport = {
  asOfDate: string;
  openSeasonOnly: boolean;
  branches: CashPositionBranchRow[];
  totals: CashPositionTotalsRow;
  registerCashHeldByPersonnelLines: CashPositionHeldRegisterCashLine[];
};
