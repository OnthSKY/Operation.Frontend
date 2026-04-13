import type { BranchTransaction } from "@/types/branch-transaction";

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
