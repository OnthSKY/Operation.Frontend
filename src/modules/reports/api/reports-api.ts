import { apiRequest } from "@/shared/api/client";
import type {
  BranchPosSettlementList,
  PatronFlowOverview,
} from "@/types/patron-flow";
import type {
  CashPositionReport,
  FinancialBranchMonthlyBreakdownRow,
  FinancialReport,
  FinancialSummaryReport,
  ReportPagedResponse,
  StockReport,
} from "@/types/reports";

export type FinancialReportParams = {
  dateFrom: string;
  dateTo: string;
  branchId?: number;
  currencyCode?: string;
  transactionType?: string;
  mainCategory?: string;
  category?: string;
  expensePaymentSource?: string;
};

export type FinancialReportFilterOptionsParams = {
  dateFrom: string;
  dateTo: string;
  branchId?: number;
  mainCategory?: string;
};

export type FinancialReportFilterOptions = {
  currencies: string[];
  mainCategories: string[];
  categories: string[];
};

export type StockReportParams = {
  dateFrom: string;
  dateTo: string;
  warehouseId?: number;
  branchId?: number;
  categoryId?: number;
  parentProductId?: number;
  productId?: number;
};

export type CashPositionParams = {
  asOfDate: string;
  openSeasonOnly: boolean;
};

export type PatronFlowParams = {
  dateFrom: string;
  dateTo: string;
  branchId?: number;
};

function toQuery(
  params: Record<string, string | number | boolean | undefined>
): string {
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
      currencyCode: params.currencyCode,
      transactionType: params.transactionType,
      mainCategory: params.mainCategory,
      category: params.category,
      expensePaymentSource: params.expensePaymentSource,
    })}`
  ).then((r) => ({
    ...r,
    byExpensePaymentSource: r.byExpensePaymentSource ?? [],
    supplierPayments: r.supplierPayments ?? [],
    vehicleExpensesOffRegister: r.vehicleExpensesOffRegister ?? [],
    vehicleExpensesByPlate: r.vehicleExpensesByPlate ?? [],
    branchExpenseResidualByCategory: r.branchExpenseResidualByCategory ?? [],
    personnelExpenseByCategory: r.personnelExpenseByCategory ?? [],
    incomeRegisterBreakdownByCurrency: r.incomeRegisterBreakdownByCurrency ?? [],
  }));
}

export function fetchFinancialReportFilterOptions(
  params: FinancialReportFilterOptionsParams
): Promise<FinancialReportFilterOptions> {
  return apiRequest<FinancialReportFilterOptions>(
    `/reports/financial/filter-options${toQuery({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      branchId: params.branchId,
      mainCategory: params.mainCategory,
    })}`
  ).then((r) => ({
    currencies: r.currencies ?? [],
    mainCategories: r.mainCategories ?? [],
    categories: r.categories ?? [],
  }));
}

export function fetchStockReport(params: StockReportParams): Promise<StockReport> {
  return apiRequest<StockReport>(
    `/reports/stock${toQuery({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      warehouseId: params.warehouseId,
      branchId: params.branchId,
      categoryId: params.categoryId,
      parentProductId: params.parentProductId,
      productId: params.productId,
    })}`
  ).then((r) => ({
    ...r,
    warehouseToBranchFlows: r.warehouseToBranchFlows ?? [],
    topOutboundProducts: r.topOutboundProducts ?? [],
  }));
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

/**
 * Lifetime varyantı — backend tek SQL'le 2020→today aralığını döner; 400 günlük chunk'lara
 * bölmek zorunda değiliz. Dashboard finansal kartları için kullanılır.
 */
export function fetchFinancialSummaryLifetime(
  dateTo?: string
): Promise<FinancialSummaryReport> {
  return apiRequest<FinancialSummaryReport>(
    `/reports/financial-summary/lifetime${toQuery({ dateTo })}`
  );
}

export function fetchFinancialLifetime(
  dateTo?: string
): Promise<FinancialReport> {
  return apiRequest<FinancialReport>(
    `/reports/financial/lifetime${toQuery({ dateTo })}`
  ).then((r) => ({
    ...r,
    byExpensePaymentSource: r.byExpensePaymentSource ?? [],
    supplierPayments: r.supplierPayments ?? [],
    vehicleExpensesOffRegister: r.vehicleExpensesOffRegister ?? [],
    vehicleExpensesByPlate: r.vehicleExpensesByPlate ?? [],
    branchExpenseResidualByCategory: r.branchExpenseResidualByCategory ?? [],
    personnelExpenseByCategory: r.personnelExpenseByCategory ?? [],
    incomeRegisterBreakdownByCurrency: r.incomeRegisterBreakdownByCurrency ?? [],
  }));
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

export function fetchCashPositionReport(params: CashPositionParams): Promise<CashPositionReport> {
  return apiRequest<CashPositionReport>(
    `/reports/cash-position${toQuery({
      asOfDate: params.asOfDate,
      openSeasonOnly: params.openSeasonOnly,
    })}`
  );
}

export function fetchPatronFlowOverview(
  params: PatronFlowParams
): Promise<PatronFlowOverview> {
  return apiRequest<PatronFlowOverview>(
    `/reports/patron-flow${toQuery({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      branchId: params.branchId,
    })}`
  ).then((r) => ({
    items: Array.isArray(r.items) ? r.items : [],
    totalsByKind: Array.isArray(r.totalsByKind) ? r.totalsByKind : [],
  }));
}

export function fetchPatronFlowPosProfiles(): Promise<BranchPosSettlementList> {
  return apiRequest<BranchPosSettlementList>("/reports/patron-flow/pos-profiles").then(
    (r) => ({
      profiles: Array.isArray(r.profiles) ? r.profiles : [],
      branchesWithoutProfile: Array.isArray(r.branchesWithoutProfile)
        ? r.branchesWithoutProfile
        : [],
    })
  );
}
