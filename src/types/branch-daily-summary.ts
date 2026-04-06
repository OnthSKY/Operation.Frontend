/** Backend: BranchDailySummaryResponse */
export type BranchDailySummary = {
  hideFinancialTotals?: boolean;
  branchId: number;
  date: string;
  totalIncome: number;
  totalExpense: number;
  netCash: number;
  /** Same-day OUT paid from personnel pocket (register debt). */
  registerOwesPersonnelToday?: number;
  /** Same-day OUT paid by owner (register owes patron). */
  registerOwesPatronToday?: number;
};
