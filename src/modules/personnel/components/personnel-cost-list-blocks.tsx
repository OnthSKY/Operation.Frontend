"use client";

import type { Locale } from "@/i18n/messages";
import {
  expensePaymentSourceLabel,
  txCategoryLine,
} from "@/modules/branch/lib/branch-transaction-options";
import { advanceFundingSourceLabel } from "@/modules/personnel/components/personnel-advance-list-blocks";
import {
  linkTypeLabel,
  resolveNonAdvanceRow,
} from "@/modules/personnel/components/personnel-non-advance-expense-blocks";
import type { PersonnelCostRow } from "@/modules/personnel/lib/personnel-cost-unified";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import type { DataTableColumn } from "@/shared/tables";
import type { ReactNode } from "react";
import { PersonnelCostTypeBadge } from "./PersonnelCostTypeBadge";

export function personnelCostRowWrittenFrom(
  row: PersonnelCostRow,
  t: (key: string) => string,
  branchNameById: Map<number, string>,
  dash: string
): string {
  if (row.kind === "advance") {
    const a = row.advance;
    const branchPart =
      a.branchId != null && a.branchId > 0
        ? a.branchName?.trim() ||
          branchNameById.get(a.branchId)?.trim() ||
          `#${a.branchId}`
        : t("personnel.nonAdvanceExpenseBranchOrg");
    const pay = advanceFundingSourceLabel(t, a.sourceType);
    return `${t("personnel.costsOriginAdvance")} · ${branchPart} · ${pay}`;
  }
  const e = row.expense;
  const branchPart =
    e.branchId != null && e.branchId > 0
      ? branchNameById.get(e.branchId)?.trim() || dash
      : t("personnel.nonAdvanceExpenseBranchOrg");
  const pay = expensePaymentSourceLabel(e.expensePaymentSource, t) || dash;
  return `${t("personnel.costsOriginExpense")} · ${branchPart} · ${pay}`;
}

export function PersonnelCostMobileCard({
  row,
  locale,
  t,
  branchNameById,
}: {
  row: PersonnelCostRow;
  locale: Locale;
  t: (k: string) => string;
  branchNameById: Map<number, string>;
}) {
  const dash = t("personnel.dash");
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

  if (row.kind === "advance") {
    const a = row.advance;
    return (
      <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 pb-3">
          <PersonnelCostTypeBadge kind="advance" t={t} />
          <div className="text-right">
            <p className="text-base font-semibold tabular-nums text-zinc-900">
              {formatMoneyDash(a.amount, dash, locale)}
            </p>
            <p className="text-xs text-zinc-500">{a.currencyCode}</p>
          </div>
        </div>
        <div className="divide-y divide-zinc-100">
          <Field label={t("personnel.costsColWrittenFrom")}>
            {personnelCostRowWrittenFrom(row, t, branchNameById, dash)}
          </Field>
          <Field label={t("personnel.tableName")}>
            {a.personnelFullName?.trim() || dash}
          </Field>
          <Field label={t("personnel.tableBranch")}>
            {a.branchName?.trim() || dash}
          </Field>
          <Field label={t("personnel.advanceDate")}>
            {formatLocaleDate(a.advanceDate, locale, dash)}
          </Field>
          <Field label={t("personnel.costsColPaymentFrom")}>
            {advanceFundingSourceLabel(t, a.sourceType)}
          </Field>
          <Field label={t("personnel.effectiveYear")}>{a.effectiveYear}</Field>
          <Field label={t("personnel.note")}>
            {a.description?.trim() ? (
              <span className="whitespace-pre-wrap break-words text-left">
                {a.description.trim()}
              </span>
            ) : (
              dash
            )}
          </Field>
        </div>
      </article>
    );
  }

  const e = row.expense;
  const { employeeName, linkTypeKey } = resolveNonAdvanceRow(e, dash);
  const bid = e.branchId;
  const branchLabel =
    bid != null && bid > 0
      ? branchNameById.get(bid)?.trim() || dash
      : t("personnel.nonAdvanceExpenseBranchOrg");
  const pay = expensePaymentSourceLabel(e.expensePaymentSource, t);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 pb-3">
        <PersonnelCostTypeBadge kind="expense" t={t} />
        <div className="text-right">
          <p className="text-base font-semibold tabular-nums text-zinc-900">
            {formatMoneyDash(e.amount, dash, locale)}
          </p>
          <p className="text-xs text-zinc-500">{e.currencyCode}</p>
        </div>
      </div>
      <div className="divide-y divide-zinc-100">
        <Field label={t("personnel.costsColWrittenFrom")}>
          {personnelCostRowWrittenFrom(row, t, branchNameById, dash)}
        </Field>
        <Field label={t("personnel.nonAdvanceExpensesColEmployee")}>{employeeName}</Field>
        <Field label={t("personnel.tableBranch")}>{branchLabel}</Field>
        <Field label={t("personnel.nonAdvanceExpensesColDate")}>
          {formatLocaleDate(e.transactionDate, locale, dash)}
        </Field>
        <Field label={t("personnel.nonAdvanceExpenseLinkType")}>
          {linkTypeLabel(linkTypeKey, t)}
        </Field>
        <Field label={t("personnel.nonAdvanceExpensesColCategory")}>
          {txCategoryLine(e.mainCategory, e.category, t) || dash}
        </Field>
        <Field label={t("personnel.costsColPaymentFrom")}>{pay || dash}</Field>
        <Field label={t("personnel.note")}>
          {e.description?.trim() ? (
            <span className="whitespace-pre-wrap break-words text-left">
              {e.description.trim()}
            </span>
          ) : (
            dash
          )}
        </Field>
      </div>
    </article>
  );
}

export function createPersonnelCostColumns(
  t: (k: string) => string,
  locale: Locale,
  branchNameById: Map<number, string>
): DataTableColumn<PersonnelCostRow>[] {
  const dash = t("personnel.dash");
  return [
    {
      id: "kind",
      header: t("personnel.costsColType"),
      tdClassName: "whitespace-nowrap",
      cell: (row) => (
        <PersonnelCostTypeBadge kind={row.kind === "advance" ? "advance" : "expense"} t={t} />
      ),
    },
    {
      id: "writtenFrom",
      header: t("personnel.costsColWrittenFrom"),
      tdClassName: "min-w-[14rem] max-w-[22rem] text-sm leading-snug text-zinc-700",
      cell: (row) => personnelCostRowWrittenFrom(row, t, branchNameById, dash),
    },
    {
      id: "date",
      header: t("personnel.costsColDate"),
      tdClassName: "whitespace-nowrap text-sm",
      cell: (row) =>
        row.kind === "advance"
          ? formatLocaleDate(row.advance.advanceDate, locale, dash)
          : formatLocaleDate(row.expense.transactionDate, locale, dash),
    },
    {
      id: "name",
      header: t("personnel.tableName"),
      tdClassName: "min-w-[8rem] text-sm font-medium text-zinc-900",
      cell: (row) => {
        if (row.kind === "advance") {
          return row.advance.personnelFullName?.trim() || dash;
        }
        const { employeeName } = resolveNonAdvanceRow(row.expense, dash);
        return employeeName;
      },
    },
    {
      id: "branch",
      header: t("personnel.tableBranch"),
      tdClassName: "min-w-[6rem] text-sm text-zinc-700",
      cell: (row) => {
        if (row.kind === "advance") {
          return row.advance.branchName?.trim() || dash;
        }
        const bid = row.expense.branchId;
        if (bid != null && bid > 0) {
          return branchNameById.get(bid)?.trim() || dash;
        }
        return t("personnel.nonAdvanceExpenseBranchOrg");
      },
    },
    {
      id: "detail",
      header: t("personnel.costsColDetail"),
      tdClassName: "min-w-[10rem] text-sm text-zinc-700",
      cell: (row) => {
        if (row.kind === "advance") {
          return (
            <span className="text-sm text-zinc-700">
              <span className="text-zinc-500">{t("personnel.effectiveYear")}: </span>
              <span className="tabular-nums font-medium">{row.advance.effectiveYear}</span>
            </span>
          );
        }
        const { linkTypeKey } = resolveNonAdvanceRow(row.expense, dash);
        const cat =
          txCategoryLine(row.expense.mainCategory, row.expense.category, t) || dash;
        return (
          <span>
            <span className="text-zinc-600">{linkTypeLabel(linkTypeKey, t)}</span>
            <span className="text-zinc-400"> · </span>
            {cat}
          </span>
        );
      },
    },
    {
      id: "payment",
      header: t("personnel.costsColPaymentFrom"),
      tdClassName: "min-w-[9rem] text-sm text-zinc-600",
      cell: (row) => {
        if (row.kind === "advance") {
          return advanceFundingSourceLabel(t, row.advance.sourceType);
        }
        return expensePaymentSourceLabel(row.expense.expensePaymentSource, t) || dash;
      },
    },
    {
      id: "amount",
      header: t("personnel.nonAdvanceExpensesColAmount"),
      thClassName: "text-right",
      tdClassName: "whitespace-nowrap text-right text-sm tabular-nums",
      cell: (row) =>
        row.kind === "advance"
          ? formatMoneyDash(row.advance.amount, dash, locale)
          : formatMoneyDash(row.expense.amount, dash, locale),
    },
    {
      id: "currency",
      header: t("personnel.nonAdvanceExpensesColCurrency"),
      tdClassName: "whitespace-nowrap text-sm text-zinc-600",
      cell: (row) =>
        row.kind === "advance" ? row.advance.currencyCode : row.expense.currencyCode,
    },
    {
      id: "note",
      header: t("personnel.note"),
      tdClassName: "max-w-[14rem] truncate text-sm text-zinc-600",
      cell: (row) =>
        row.kind === "advance"
          ? row.advance.description?.trim() || dash
          : row.expense.description?.trim() || dash,
    },
  ];
}
