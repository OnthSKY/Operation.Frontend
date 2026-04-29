import type { BranchTransaction } from "@/types/branch-transaction";

/** GET /branches — sunucu sıralaması (sayfalı isteklerde `sort` ile). */
export type BranchListSort =
  | "nameAsc"
  | "nameDesc"
  | "idAsc"
  | "idDesc"
  | "staffDesc";

/** GET /branches — turizm sezonu sunucu CURRENT_DATE ile. */
export type BranchSeasonStatus = "OPEN" | "PLANNED" | "CLOSED" | "NONE";

export type BranchResponsiblePerson = {
  personnelId: number;
  fullName: string;
};

export type Branch = {
  id: number;
  name: string;
  address: string | null;
  responsibles: BranchResponsiblePerson[];
  personnelAssignedCount: number;
  personnelStartedCount: number;
  personnelNotStartedCount: number;
  seasonStatus: BranchSeasonStatus;
};

/** GET /branches — `items` + `totalCount` (sayfalama opsiyonel). */
export type BranchListResponse = {
  items: Branch[];
  totalCount: number;
};

/** POST /branches — POS / kart tahsilatı lehtarı (zorunlu). */
export type BranchPosSettlementBeneficiaryType =
  | "PATRON"
  | "FRANCHISE"
  | "JOINT_VENTURE"
  | "BRANCH_PERSONNEL"
  | "OTHER";

export type CreateBranchInput = {
  name: string;
  address?: string | null;
  posSettlementBeneficiaryType: BranchPosSettlementBeneficiaryType;
  posSettlementBeneficiaryPersonnelId?: number | null;
  posSettlementNotes?: string | null;
};

export type UpdateBranchInput = {
  name: string;
  address?: string | null;
  responsiblePersonnelIds: number[];
};

/** IN nakit tarafında BRANCH_MANAGER; satırda seçilen sorumlu personele göre gruplanır. */
export type IncomeCashBranchManagerPersonRow = {
  personnelId: number | null;
  fullName: string;
  amount: number;
};

/** GET /branches/{id}/income-period-summary */
export type ExpenseGeneralOverheadLine = {
  branchTransactionId: number;
  poolId: number;
  poolTitle: string;
  amount: number;
  transactionDate: string;
  description?: string | null;
  mainCategory?: string | null;
  category?: string | null;
  expensePaymentSource?: string | null;
  invoicePaymentStatus?: string | null;
};

/** İşletme ana türü kartı (OUT_GOODS/OPS/TAX/OTHER) ile uyumlu OUT satırı. */
export type ExpenseTabBranchOperatingLine = {
  branchTransactionId: number;
  amount: number;
  transactionDate: string;
  description?: string | null;
  mainCategory?: string | null;
  category?: string | null;
  expensePaymentSource?: string | null;
  invoicePaymentStatus?: string | null;
  poolId: number | null;
  poolTitle: string;
  isGeneralOverheadShare: boolean;
};

export type ExpenseTabPeriodInsights = {
  topExpenseMainCategory: string | null;
  topExpenseAmount: number;
  economicOutTransactionCount: number;
  generalOverheadLines: ExpenseGeneralOverheadLine[];
  branchOperatingExpenseLines?: ExpenseTabBranchOperatingLine[];
  /** Genel gider payı satırlarında patron ödemeli tutar (kartlar çakışır). */
  generalOverheadPaidByPatronAmount?: number;
  generalOverheadPaidFromRegisterAmount?: number;
  generalOverheadPaidFromPersonnelPocketAmount?: number;
  generalOverheadAmountInBranchOperatingMains?: number;
};

/** Gider sekmesi kartları (tek tarih aralığı); API: register-summary içinde. */
export type ExpenseTabPeriodBreakdown = {
  totalIncome: number;
  outPaidFromRegister: number;
  outPaidFromPatron: number;
  outPaidFromPersonnelPocket: number;
  outPersonnelExpense: number;
  outBranchExpense: number;
  outAdvanceNonPnl: number;
  /** OUT_NON_PNL — kasadan (REGISTER). */
  outAdvanceNonPnlFromRegister: number;
  /** OUT_NON_PNL — patron ödemeli. */
  outAdvanceNonPnlFromPatron: number;
  /** OUT_NON_PNL — personel cebi. */
  outAdvanceNonPnlFromPersonnelPocket: number;
  /** Genel gider havuzundan bu şubeye yansıyan OUT tutarı. */
  outGeneralOverheadAllocated: number;
  insights?: ExpenseTabPeriodInsights;
};

export type BranchIncomePeriodSummary = {
  hideFinancialTotals?: boolean;
  from: string;
  to: string;
  totalIncome: number;
  incomeCash: number;
  incomeCard: number;
  incomeCashPatron?: number;
  incomeCashBranchManager?: number;
  incomeCashRemainsAtBranch?: number;
  incomeCashUnspecified?: number;
  incomeCashBranchManagerByPerson?: IncomeCashBranchManagerPersonRow[];
};

export type BranchRegisterSummary = {
  hideFinancialTotals?: boolean;
  asOfDate: string;
  cumulativeCashBalance: number;
  cumulativeNetRegisterOwesPersonnelPocket?: number;
  cumulativeNetRegisterOwesPatron?: number;
  dayTotalIncome: number;
  dayIncomeCash: number;
  dayIncomeCard: number;
  /** IN amount sums from first branch tx through asOfDate inclusive. */
  cumulativeIncomeTotalThroughAsOf?: number;
  cumulativeIncomeCashThroughAsOf?: number;
  cumulativeIncomeCardThroughAsOf?: number;
  dayCashOutFromRegister: number;
  dayNonRegisterAdvanceExpense: number;
  /** Kasa dışı avans kaydı — patron kaynaklı (PATRON), henüz kasa OUT yok. */
  dayNonRegisterAdvancePatron: number;
  /** Kasa dışı avans kaydı — banka (BANK). */
  dayNonRegisterAdvanceBank: number;
  dayAccountingExpense: number;
  dayNetAccounting: number;
  dayNetCash: number;
  /** OUT PERSONNEL_POCKET that day — register owes staff (no cash left drawer). */
  dayRegisterOwesPersonnel?: number;
  dayPersonnelPocketRepaidFromRegister?: number;
  dayPersonnelPocketRepaidFromPatron?: number;
  dayNetRegisterOwesPersonnelPocket?: number;
  /** OUT PATRON that day — branch register owes owner. */
  dayRegisterOwesPatron?: number;
  dayPatronDebtRepaidFromRegister?: number;
  dayNetRegisterOwesPatron?: number;
  /** Sum of all OUT lines that day (any payment source). */
  dayTotalOutExpense?: number;
  /** Income minus all OUT (same-day branch_transactions). */
  dayNetAfterAllRegisterOut?: number;
  /** Main category code with largest economic OUT sum that day; null if none. */
  dayTopExpenseMainCategory?: string | null;
  dayTopExpenseAmount?: number;
  hasActiveTourismSeasonForAsOf?: boolean;
  activeTourismSeasonYear?: number | null;
  activeTourismSeasonOpenedOn?: string | null;
  activeTourismSeasonClosedOn?: string | null;
  seasonCumulativeIncomeTotalThroughAsOf?: number;
  seasonCumulativeIncomeCashThroughAsOf?: number;
  seasonCumulativeIncomeCardThroughAsOf?: number;
  cumulativeIncomeCashPatronThroughAsOf?: number;
  cumulativeIncomeCashBranchManagerThroughAsOf?: number;
  cumulativeIncomeCashRemainsAtBranchThroughAsOf?: number;
  cumulativeIncomeCashUnspecifiedThroughAsOf?: number;
  seasonCumulativeIncomeCashPatronThroughAsOf?: number;
  seasonCumulativeIncomeCashBranchManagerThroughAsOf?: number;
  seasonCumulativeIncomeCashRemainsAtBranchThroughAsOf?: number;
  seasonCumulativeIncomeCashUnspecifiedThroughAsOf?: number;
  dayIncomeCashPatron?: number;
  dayIncomeCashBranchManager?: number;
  dayIncomeCashRemainsAtBranch?: number;
  dayIncomeCashUnspecified?: number;
  cumulativeIncomeCashBranchManagerByPersonThroughAsOf?: IncomeCashBranchManagerPersonRow[];
  seasonCumulativeIncomeCashBranchManagerByPersonThroughAsOf?: IncomeCashBranchManagerPersonRow[];
  dayIncomeCashBranchManagerByPerson?: IncomeCashBranchManagerPersonRow[];
  expenseOverviewLifetimeThroughAsOf?: ExpenseTabPeriodBreakdown;
  expenseOverviewSeasonThroughAsOf?: ExpenseTabPeriodBreakdown | null;
  expenseOverviewOnAsOfDay?: ExpenseTabPeriodBreakdown;
};

export type BranchDashboard = {
  hideFinancialTotals?: boolean;
  personnelCount: number;
  month: string;
  monthIncomeTotal: number;
  monthExpenseTotal: number;
  allTimeIncomeTotal: number;
  allTimeExpenseTotal: number;
  cashRegisterBalance: number;
  todayIncomeTotal: number;
  todayExpenseTotal: number;
  /** null = PERSONNEL veya API yok */
  allTimeNetProfit?: number | null;
  /** İstekte kategori/ürün kapsamı yoksa null */
  stockInboundScopeTotal?: number | null;
};

export type BranchPatronIncomeSummary = {
  total: number;
  cash: number;
  card: number;
  unspecified: number;
};

export type BranchTransactionsPaged = {
  items: BranchTransaction[];
  totalCount: number;
  page: number;
  pageSize: number;
  /** Liste filtreleriyle eşleşen satırların tutar toplamı (IN veya OUT). */
  filteredAmountTotal?: number;
  /** OUT listesi + filtreler: ödeme kaynağı PATRON gider toplamı */
  patronExpenseTotal?: number;
  /** IN listesi: kasa tahsilatında «Patron» seçilen gelirler */
  patronIncomeToPatron?: BranchPatronIncomeSummary | null;
};

export type BranchStockReceiptRow = {
  id: number;
  productId: number;
  productName: string;
  unit: string | null;
  parentProductId?: number | null;
  parentProductName?: string | null;
  quantity: number;
  movementDate: string;
  warehouseId: number | null;
  warehouseName: string | null;
  warehouseMovementId?: number | null;
  inBatchGroupId?: string | null;
  /** Son depo giriş faturasından tahmini birim fiyat (API). */
  supplierUnitPrice?: number | null;
  valuationCurrencyCode?: string | null;
  valuationLineEstimate?: number | null;
};

export type BranchStockReceiptsPaged = {
  items: BranchStockReceiptRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filteredTotalQuantity?: number;
};

export type BranchStockReceiptsSummary = {
  filteredTotalQuantity: number;
  parentBreakdown: Array<{
    productId: number;
    productName: string;
    quantity: number;
  }>;
};
