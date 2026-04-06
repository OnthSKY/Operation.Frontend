import type { BranchTransaction } from "@/types/branch-transaction";

/** GET /branches — turizm sezonu sunucu CURRENT_DATE ile. */
export type BranchSeasonStatus = "OPEN" | "PLANNED" | "CLOSED" | "NONE";

export type Branch = {
  id: number;
  name: string;
  personnelAssignedCount: number;
  personnelStartedCount: number;
  personnelNotStartedCount: number;
  seasonStatus: BranchSeasonStatus;
};

export type CreateBranchInput = {
  name: string;
};

export type BranchRegisterSummary = {
  hideFinancialTotals?: boolean;
  asOfDate: string;
  cumulativeCashBalance: number;
  dayTotalIncome: number;
  dayIncomeCash: number;
  dayIncomeCard: number;
  dayCashOutFromRegister: number;
  dayNonRegisterAdvanceExpense: number;
  dayAccountingExpense: number;
  dayNetAccounting: number;
  dayNetCash: number;
  /** OUT PERSONNEL_POCKET that day — register owes staff (no cash left drawer). */
  dayRegisterOwesPersonnel?: number;
  /** OUT PATRON that day — branch register owes owner. */
  dayRegisterOwesPatron?: number;
  /** Sum of all OUT lines that day (any payment source). */
  dayTotalOutExpense?: number;
  /** Income minus all OUT (same-day branch_transactions). */
  dayNetAfterAllRegisterOut?: number;
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
};

export type BranchTransactionsPaged = {
  items: BranchTransaction[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type BranchStockReceiptRow = {
  id: number;
  productId: number;
  productName: string;
  unit: string | null;
  quantity: number;
  movementDate: string;
  warehouseId: number | null;
  warehouseName: string | null;
};

export type BranchStockReceiptsPaged = {
  items: BranchStockReceiptRow[];
  totalCount: number;
  page: number;
  pageSize: number;
};
