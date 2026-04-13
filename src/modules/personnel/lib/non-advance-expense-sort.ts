export const NON_ADVANCE_EXPENSE_SORTS = [
  "dateDesc",
  "dateAsc",
  "amountDesc",
  "amountAsc",
  "categoryTotalDesc",
] as const;

export type NonAdvanceExpenseSort = (typeof NON_ADVANCE_EXPENSE_SORTS)[number];

export const DEFAULT_NON_ADVANCE_EXPENSE_SORT: NonAdvanceExpenseSort = "dateDesc";
