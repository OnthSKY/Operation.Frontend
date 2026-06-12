"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchBranchExpenseLinkAdvances,
  fetchBranchExpenseLinkSalaryPayments,
  fetchPersonnelOrgExpenseLinkAdvances,
  fetchPersonnelOrgExpenseLinkSalaryPayments,
} from "@/modules/branch/api/branches-api";

/**
 * Personel gideri formunda «var olan avans / maaş ödemesini bağla» seçenekleri.
 * `useOrgExpenseLinks` true ise merkez (şubesiz) eşleştirmesi, aksi halde şube bazlı.
 */
export type UseExpenseLinkOptionsInput = {
  open: boolean;
  resolvedBranchId: number | null;
  useOrgExpenseLinks: boolean;
  expenseLinkPidNum: number;
  needsAdvanceExisting: boolean;
  needsSalaryPick: boolean;
};

export function useExpenseLinkOptions(input: UseExpenseLinkOptionsInput) {
  const {
    open,
    resolvedBranchId,
    useOrgExpenseLinks,
    expenseLinkPidNum,
    needsAdvanceExisting,
    needsSalaryPick,
  } = input;

  const branchOk =
    useOrgExpenseLinks || (resolvedBranchId != null && resolvedBranchId > 0);

  const { data: advances = [], isFetching: advFetching } = useQuery({
    queryKey: useOrgExpenseLinks
      ? ["personnel", expenseLinkPidNum, "org-expense-link-advances"]
      : ["branches", resolvedBranchId, "expense-link-advances", expenseLinkPidNum],
    queryFn: () =>
      useOrgExpenseLinks
        ? fetchPersonnelOrgExpenseLinkAdvances(expenseLinkPidNum)
        : fetchBranchExpenseLinkAdvances(resolvedBranchId!, expenseLinkPidNum),
    enabled: open && needsAdvanceExisting && expenseLinkPidNum > 0 && branchOk,
  });

  const { data: salary = [], isFetching: salFetching } = useQuery({
    queryKey: useOrgExpenseLinks
      ? ["personnel", expenseLinkPidNum, "org-expense-link-salary"]
      : ["branches", resolvedBranchId, "expense-link-salary", expenseLinkPidNum],
    queryFn: () =>
      useOrgExpenseLinks
        ? fetchPersonnelOrgExpenseLinkSalaryPayments(expenseLinkPidNum)
        : fetchBranchExpenseLinkSalaryPayments(resolvedBranchId!, expenseLinkPidNum),
    enabled: open && needsSalaryPick && expenseLinkPidNum > 0 && branchOk,
  });

  return {
    expenseLinkAdvances: advances,
    expenseLinkAdvFetching: advFetching,
    expenseLinkSalary: salary,
    expenseLinkSalaryFetching: salFetching,
  };
}
