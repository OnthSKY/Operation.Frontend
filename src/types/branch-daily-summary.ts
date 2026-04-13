/** Backend: BranchDailySummaryResponse */
export type BranchDailySummary = {
  hideFinancialTotals?: boolean;
  branchId: number;
  date: string;
  totalIncome: number;
  /** IN lines: cash portion (same rules as branch register day breakdown). */
  incomeCash?: number;
  /** IN lines: card/POS portion. */
  incomeCard?: number;
  totalExpense: number;
  netCash: number;
  /** Same-day OUT paid from personnel pocket (register debt). */
  registerOwesPersonnelToday?: number;
  personnelPocketRepaidFromRegisterToday?: number;
  personnelPocketRepaidFromPatronToday?: number;
  netRegisterOwesPersonnelPocketToday?: number;
  /** Same-day OUT paid by owner (register owes patron). */
  registerOwesPatronToday?: number;
  patronDebtRepaidFromRegisterToday?: number;
  netRegisterOwesPatronToday?: number;
  tourismSeasonPeriodMissing?: boolean;
  tourismSeasonOpenedOn?: string | null;
  tourismSeasonClosedOn?: string | null;
};
