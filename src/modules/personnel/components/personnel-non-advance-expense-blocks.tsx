"use client";

import type { Locale } from "@/i18n/messages";
import {
  expensePaymentSourceLabel,
  txCategoryLine,
} from "@/modules/branch/lib/branch-transaction-options";
import type { BranchTransaction } from "@/types/branch-transaction";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import type { ReactNode } from "react";

export function expenseAttributionPersonnelId(
  row: BranchTransaction
): number | null {
  if (row.linkedPersonnelId != null && row.linkedPersonnelId > 0)
    return row.linkedPersonnelId;
  if (row.linkedSalaryPersonnelId != null && row.linkedSalaryPersonnelId > 0)
    return row.linkedSalaryPersonnelId;
  if (row.expensePocketPersonnelId != null && row.expensePocketPersonnelId > 0)
    return row.expensePocketPersonnelId;
  return null;
}

export function filterNonAdvanceExpenseRows(
  rows: BranchTransaction[],
  opts: { branchId?: number; personnelId?: number; year?: number }
): BranchTransaction[] {
  return rows.filter((r) => {
    if (opts.branchId != null && opts.branchId > 0) {
      if (r.branchId !== opts.branchId) return false;
    }
    if (opts.personnelId != null && opts.personnelId > 0) {
      const pid = expenseAttributionPersonnelId(r);
      if (pid !== opts.personnelId) return false;
    }
    if (opts.year != null && opts.year >= 1900 && opts.year <= 9999) {
      const y = parseInt(String(r.transactionDate).slice(0, 4), 10);
      if (!Number.isFinite(y) || y !== opts.year) return false;
    }
    return true;
  });
}

export function resolveNonAdvanceRow(
  row: BranchTransaction,
  dash: string
): { employeeName: string; linkTypeKey: "direct" | "salary" | "pocket" } {
  if (row.linkedPersonnelId != null && row.linkedPersonnelId > 0) {
    return {
      employeeName: row.linkedPersonnelFullName?.trim() || dash,
      linkTypeKey: "direct",
    };
  }
  if (row.linkedSalaryPaymentId != null && row.linkedSalaryPaymentId > 0) {
    return {
      employeeName: row.linkedSalaryPersonnelFullName?.trim() || dash,
      linkTypeKey: "salary",
    };
  }
  if (row.expensePocketPersonnelId != null && row.expensePocketPersonnelId > 0) {
    return {
      employeeName: row.expensePocketPersonnelFullName?.trim() || dash,
      linkTypeKey: "pocket",
    };
  }
  return { employeeName: dash, linkTypeKey: "direct" };
}

export function linkTypeLabel(
  key: "direct" | "salary" | "pocket",
  t: (k: string) => string
): string {
  if (key === "salary") return t("personnel.nonAdvanceExpenseLinkSalary");
  if (key === "pocket") return t("personnel.nonAdvanceExpenseLinkPocket");
  return t("personnel.nonAdvanceExpenseLinkDirect");
}

export function ExpenseCard({
  row,
  locale,
  t,
  branchLabel,
}: {
  row: BranchTransaction;
  locale: Locale;
  t: (k: string) => string;
  branchLabel: string;
}) {
  const dash = t("personnel.dash");
  const { employeeName, linkTypeKey } = resolveNonAdvanceRow(row, dash);
  const pay = expensePaymentSourceLabel(row.expensePaymentSource, t);
  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: ReactNode;
  }) => (
    <div className="flex min-w-0 items-start justify-between gap-3 py-2">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="min-w-0 text-right text-sm text-zinc-900">{children}</span>
    </div>
  );

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-zinc-900">
            {employeeName}
          </p>
          <p className="mt-0.5 truncate text-sm text-zinc-600">{branchLabel}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold tabular-nums text-zinc-900">
            {formatMoneyDash(row.amount, dash, locale)}
          </p>
          <p className="text-xs text-zinc-500">{row.currencyCode}</p>
        </div>
      </div>
      <div className="divide-y divide-zinc-100">
        <Field label={t("personnel.nonAdvanceExpensesColDate")}>
          {formatLocaleDate(row.transactionDate, locale, dash)}
        </Field>
        <Field label={t("personnel.nonAdvanceExpenseLinkType")}>
          {linkTypeLabel(linkTypeKey, t)}
        </Field>
        <Field label={t("personnel.nonAdvanceExpensesColCategory")}>
          {txCategoryLine(row.mainCategory, row.category, t) || dash}
        </Field>
        <Field label={t("branch.txColExpensePayment")}>{pay || dash}</Field>
        <Field label={t("personnel.note")}>
          {row.description?.trim() ? (
            <span className="whitespace-pre-wrap break-words text-left">
              {row.description.trim()}
            </span>
          ) : (
            dash
          )}
        </Field>
      </div>
    </article>
  );
}
