import type { AdvanceListItem } from "@/types/advance";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { NonAdvanceExpenseSort } from "@/modules/personnel/lib/non-advance-expense-sort";
import { DEFAULT_NON_ADVANCE_EXPENSE_SORT } from "@/modules/personnel/lib/non-advance-expense-sort";

export type PersonnelCostRow =
  | { kind: "advance"; key: string; advance: AdvanceListItem }
  | { kind: "expense"; key: string; expense: BranchTransaction };

export type CostsTab = "all" | "advances" | "expenses";

function rowDateIso(row: PersonnelCostRow): string {
  return row.kind === "advance"
    ? row.advance.advanceDate
    : row.expense.transactionDate;
}

function rowAmount(row: PersonnelCostRow): number {
  return row.kind === "advance" ? row.advance.amount : row.expense.amount;
}

export function sortPersonnelCostRows(
  rows: PersonnelCostRow[],
  sort: NonAdvanceExpenseSort
): PersonnelCostRow[] {
  const out = rows.slice();
  if (sort === "categoryTotalDesc") {
    return out;
  }
  out.sort((a, b) => {
    if (sort === "dateDesc" || sort === "dateAsc") {
      const desc = sort === "dateDesc";
      const c = rowDateIso(a).localeCompare(rowDateIso(b));
      return desc ? -c : c;
    }
    const desc = sort === "amountDesc";
    return compareAmount(rowAmount(a), rowAmount(b), desc);
  });
  return out;
}

function compareAmount(a: number, b: number, desc: boolean): number {
  if (a === b) return 0;
  if (desc) return a > b ? -1 : 1;
  return a < b ? -1 : 1;
}

export function buildPersonnelCostRows(
  advances: AdvanceListItem[],
  expenses: BranchTransaction[],
  tab: CostsTab
): PersonnelCostRow[] {
  const adv = advances.map(
    (advance): PersonnelCostRow => ({
      kind: "advance",
      key: `a-${advance.id}`,
      advance,
    })
  );
  const exp = expenses.map(
    (expense): PersonnelCostRow => ({
      kind: "expense",
      key: `e-${expense.id}`,
      expense,
    })
  );
  if (tab === "advances") return adv;
  if (tab === "expenses") return exp;
  return [...adv, ...exp];
}

export function clampSortForTab(
  tab: CostsTab,
  sort: NonAdvanceExpenseSort
): NonAdvanceExpenseSort {
  if (sort === "categoryTotalDesc" && tab !== "expenses") {
    return DEFAULT_NON_ADVANCE_EXPENSE_SORT;
  }
  return sort;
}

export function expenseApiSortForTab(
  tab: CostsTab,
  sort: NonAdvanceExpenseSort
): NonAdvanceExpenseSort {
  if (tab === "expenses") return clampSortForTab(tab, sort);
  return DEFAULT_NON_ADVANCE_EXPENSE_SORT;
}
