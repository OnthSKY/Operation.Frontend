"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth/AuthContext";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { fetchAllNonAdvancePersonnelAttributedExpenses } from "@/modules/branch/api/branch-transactions-api";
import { NonAdvanceExpenseSortBar } from "@/modules/personnel/components/NonAdvanceExpenseSortBar";
import {
  DEFAULT_NON_ADVANCE_EXPENSE_SORT,
  type NonAdvanceExpenseSort,
} from "@/modules/personnel/lib/non-advance-expense-sort";
import {
  expensePaymentSourceLabel,
  txCategoryLine,
} from "@/modules/branch/lib/branch-transaction-options";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { personnelKeys } from "@/modules/personnel/hooks/usePersonnelQueries";
import { Card } from "@/shared/components/Card";
import { CollapsibleMobileFilters } from "@/shared/components/CollapsibleMobileFilters";
import { Button } from "@/shared/ui/Button";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ExpenseCard,
  filterNonAdvanceExpenseRows,
  linkTypeLabel,
  resolveNonAdvanceRow,
} from "./personnel-non-advance-expense-blocks";

export function AllNonAdvancePersonnelExpensesScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const { data: branches = [] } = useBranchesList();
  const [branchValue, setBranchValue] = useState("");
  const [expenseSort, setExpenseSort] = useState<NonAdvanceExpenseSort>(
    DEFAULT_NON_ADVANCE_EXPENSE_SORT
  );

  const q = useQuery({
    queryKey: personnelKeys.nonAdvanceAttributedExpenses(expenseSort),
    queryFn: () => fetchAllNonAdvancePersonnelAttributedExpenses(expenseSort),
    enabled: !personnelPortal,
  });

  const branchOptions = useMemo(
    () => [
      { value: "", label: t("personnel.allAdvancesAnyBranch") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const branchNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const b of branches) m.set(b.id, b.name);
    return m;
  }, [branches]);

  const filtered = useMemo(() => {
    const raw = q.data ?? [];
    const bid = branchValue.trim() ? parseInt(branchValue, 10) : 0;
    return filterNonAdvanceExpenseRows(raw, {
      branchId: Number.isFinite(bid) && bid > 0 ? bid : undefined,
    });
  }, [q.data, branchValue]);

  const filtersActive = branchValue.trim() !== "";

  const secondaryBtn =
    "inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-base font-medium text-zinc-900 transition-colors hover:bg-zinc-50 active:bg-zinc-100 sm:w-auto";

  if (personnelPortal) {
    return (
      <div className="mx-auto flex w-full app-page-max flex-col gap-4 p-4 pb-8">
        <h1 className="text-xl font-semibold text-zinc-900">
          {t("personnel.nonAdvanceExpensesTitle")}
        </h1>
        <p className="text-sm text-zinc-600">{t("personnel.nonAdvanceExpensesPortalDenied")}</p>
        <Link href="/personnel/costs?tab=advances" className={cn(secondaryBtn, "w-fit text-center")}>
          {t("nav.personnelCosts")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full app-page-max flex-col gap-4 p-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
            {t("personnel.nonAdvanceExpensesTitle")}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{t("personnel.nonAdvanceExpensesDesc")}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={() => void q.refetch()}
            disabled={q.isFetching}
          >
            {t("common.retry")}
          </Button>
          <Link href="/personnel" className={cn(secondaryBtn, "shrink-0 text-center")}>
            {t("personnel.heading")}
          </Link>
        </div>
      </div>

      <CollapsibleMobileFilters
        title={t("personnel.allAdvancesFilters")}
        toggleAriaLabel={t("common.filters")}
        active={filtersActive}
        expandLabel={t("common.filtersShow")}
        collapseLabel={t("common.filtersHide")}
      >
        <div className="grid gap-4 sm:max-w-md">
          <Select
            name="nonAdvanceBranch"
            label={t("personnel.fieldBranch")}
            value={branchValue}
            onChange={(e) => setBranchValue(e.target.value)}
            onBlur={() => {}}
            options={branchOptions}
          />
        </div>
      </CollapsibleMobileFilters>

      {q.isError ? (
        <Card className="border-red-200 bg-red-50/80 p-4 text-sm text-red-900">
          {toErrorMessage(q.error)}
        </Card>
      ) : null}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-800">
          {t("personnel.nonAdvanceExpensesTableTitle")}
        </h2>
        <NonAdvanceExpenseSortBar
          className="mb-3"
          value={expenseSort}
          onChange={setExpenseSort}
          t={t}
        />
        <p className="mb-3 text-xs text-zinc-500">{t("personnel.nonAdvanceSortServerHint")}</p>
        {q.isPending ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-zinc-500">{t("personnel.nonAdvanceExpensesEmpty")}</p>
        ) : (
          <>
            <div className="flex flex-col gap-3 md:hidden">
              {filtered.map((row) => {
                const dash = t("personnel.dash");
                const bid = row.branchId;
                const branchLabel =
                  bid != null && bid > 0
                    ? branchNameById.get(bid)?.trim() || dash
                    : t("personnel.nonAdvanceExpenseBranchOrg");
                return (
                  <ExpenseCard
                    key={row.id}
                    row={row}
                    locale={locale}
                    t={t}
                    branchLabel={branchLabel}
                  />
                );
              })}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm md:block">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader className="whitespace-nowrap">
                      {t("personnel.nonAdvanceExpensesColDate")}
                    </TableHeader>
                    <TableHeader className="min-w-[8rem]">
                      {t("personnel.nonAdvanceExpensesColEmployee")}
                    </TableHeader>
                    <TableHeader className="min-w-[10rem]">
                      {t("personnel.nonAdvanceExpenseLinkType")}
                    </TableHeader>
                    <TableHeader className="min-w-[6rem]">
                      {t("personnel.tableBranch")}
                    </TableHeader>
                    <TableHeader className="min-w-[12rem]">
                      {t("personnel.nonAdvanceExpensesColCategory")}
                    </TableHeader>
                    <TableHeader className="whitespace-nowrap">
                      {t("branch.txColExpensePayment")}
                    </TableHeader>
                    <TableHeader className="text-right whitespace-nowrap">
                      {t("personnel.nonAdvanceExpensesColAmount")}
                    </TableHeader>
                    <TableHeader className="whitespace-nowrap">
                      {t("personnel.nonAdvanceExpensesColCurrency")}
                    </TableHeader>
                    <TableHeader className="max-w-[14rem]">
                      {t("personnel.note")}
                    </TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((row) => {
                    const dash = t("personnel.dash");
                    const { employeeName, linkTypeKey } = resolveNonAdvanceRow(row, dash);
                    const bid = row.branchId;
                    const branchCell =
                      bid != null && bid > 0
                        ? branchNameById.get(bid)?.trim() || dash
                        : t("personnel.nonAdvanceExpenseBranchOrg");
                    const pay = expensePaymentSourceLabel(row.expensePaymentSource, t);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatLocaleDate(row.transactionDate, locale, dash)}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-zinc-900">
                          {employeeName}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-700">
                          {linkTypeLabel(linkTypeKey, t)}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-700">{branchCell}</TableCell>
                        <TableCell className="text-sm text-zinc-700">
                          {txCategoryLine(row.mainCategory, row.category, t) || dash}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-zinc-600">
                          {pay || dash}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {formatMoneyDash(row.amount, dash, locale)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-zinc-600">
                          {row.currencyCode}
                        </TableCell>
                        <TableCell className="max-w-[14rem] truncate text-sm text-zinc-600">
                          {row.description?.trim() || dash}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="mt-2 text-xs text-zinc-500">{t("personnel.nonAdvanceExpensesFootnote")}</p>
          </>
        )}
      </div>
    </div>
  );
}
