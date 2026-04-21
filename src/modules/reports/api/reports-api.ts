import { apiRequest } from "@/shared/api/client";
import type {
  BranchPosSettlementList,
  PatronFlowOverview,
} from "@/types/patron-flow";
import type {
  CashPositionReport,
  FinancialBranchBreakdownRow,
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

export type BranchComparisonParams = {
  dateFrom: string;
  dateTo: string;
  branchId?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDescending?: boolean;
};

function asFiniteMoney(n: unknown): number {
  if (typeof n === "number" && Number.isFinite(n)) return n;
  if (typeof n === "string" && n.trim() !== "") {
    const v = Number(n);
    if (Number.isFinite(v)) return v;
  }
  return 0;
}

type BranchBreakdownApiRow = Partial<FinancialBranchBreakdownRow> &
  Pick<FinancialBranchBreakdownRow, "branchId">;

function normalizeFinancialBranchBreakdownRow(row: BranchBreakdownApiRow): FinancialBranchBreakdownRow {
  const income = asFiniteMoney(row.totalIncome);
  const expense = asFiniteMoney(row.totalExpense);
  const sup = asFiniteMoney(row.totalSupplierRegisterCashPaid);
  const sal = asFiniteMoney(row.totalSalaryPaid);
  const adv = asFiniteMoney(row.totalAdvanceGiven);
  const netRaw = row.netCash;
  const net =
    typeof netRaw === "number" && Number.isFinite(netRaw)
      ? netRaw
      : income - expense - sup - sal - adv;
  return {
    branchId: row.branchId,
    branchName: row.branchName ?? "",
    currencyCode: (row.currencyCode ?? "").trim(),
    totalIncome: income,
    totalIncomeCash: asFiniteMoney(row.totalIncomeCash),
    totalIncomeCard: asFiniteMoney(row.totalIncomeCard),
    totalIncomeCashTaggedPatron: asFiniteMoney(row.totalIncomeCashTaggedPatron),
    totalExpense: expense,
    totalExpenseRegister: asFiniteMoney(row.totalExpenseRegister),
    totalExpensePatron: asFiniteMoney(row.totalExpensePatron),
    totalExpensePersonnelPocket: asFiniteMoney(row.totalExpensePersonnelPocket),
    totalExpensePersonnelHeldRegisterCash: asFiniteMoney(row.totalExpensePersonnelHeldRegisterCash),
    totalExpenseUnset: asFiniteMoney(row.totalExpenseUnset),
    totalSupplierRegisterCashPaid: sup,
    totalSalaryPaid: sal,
    totalAdvanceGiven: adv,
    netCash: net,
  };
}

export function fetchBranchComparison(
  params: BranchComparisonParams
): Promise<ReportPagedResponse<FinancialBranchBreakdownRow>> {
  return apiRequest<ReportPagedResponse<FinancialBranchBreakdownRow>>(
    `/reports/branch-comparison${toQuery({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      branchId: params.branchId,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50,
      sortBy: params.sortBy,
      sortDescending: params.sortDescending,
    })}`
  ).then((r) => ({
    ...r,
    items: Array.isArray(r.items)
      ? r.items.map((x) => normalizeFinancialBranchBreakdownRow(x as BranchBreakdownApiRow))
      : [],
    totalCount: typeof r.totalCount === "number" ? r.totalCount : 0,
    page: typeof r.page === "number" ? r.page : params.page ?? 1,
    pageSize: typeof r.pageSize === "number" ? r.pageSize : params.pageSize ?? 50,
  }));
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
