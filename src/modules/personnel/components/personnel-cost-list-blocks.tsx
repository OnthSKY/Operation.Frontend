"use client";

import { cn } from "@/lib/cn";
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
import {
  rowDateIso,
  rowDateTemporal,
  type PersonnelCostRow,
  type RowDateTemporal,
} from "@/modules/personnel/lib/personnel-cost-unified";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { CreatedByMeta } from "@/shared/components/CreatedByMeta";
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
  if (row.kind === "contractorPayment") {
    const p = row.payment;
    const branchPart =
      p.branchId != null && p.branchId > 0
        ? p.branchName?.trim() || branchNameById.get(p.branchId)?.trim() || `#${p.branchId}`
        : t("personnel.nonAdvanceExpenseBranchOrg");
    const pay = t(`contractors.source.${p.paymentSource}`);
    return `${t("personnel.costsOriginContractor")} · ${branchPart} · ${pay}`;
  }
  const e = row.expense;
  const branchPart =
    e.branchId != null && e.branchId > 0
      ? branchNameById.get(e.branchId)?.trim() || dash
      : t("personnel.nonAdvanceExpenseBranchOrg");
  const pay = expensePaymentSourceLabel(e.expensePaymentSource, t) || dash;
  return `${t("personnel.costsOriginExpense")} · ${branchPart} · ${pay}`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 py-2">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="min-w-0 text-right text-sm text-zinc-900">{children}</span>
    </div>
  );
}

const TEMPORAL_TONE: Record<RowDateTemporal, string> = {
  future: "border-violet-300/90 bg-violet-100 text-violet-800 ring-1 ring-violet-200/70",
  today: "border-emerald-300/90 bg-emerald-100 text-emerald-800",
  thisMonth: "border-sky-200 bg-sky-50 text-sky-700",
  past: "border-zinc-200 bg-zinc-50 text-zinc-500",
};

const TEMPORAL_KEY: Record<RowDateTemporal, string> = {
  future: "personnel.costsTagFuture",
  today: "personnel.costsTagToday",
  thisMonth: "personnel.costsTagThisMonth",
  past: "personnel.costsTagPast",
};

/** Satır tarihinin dönemini gösteren compact etiket (ileri tarihli öne çıkar). */
export function RowDateTag({
  row,
  todayIso,
  t,
}: {
  row: PersonnelCostRow;
  todayIso: string;
  t: (k: string) => string;
}) {
  const bucket = rowDateTemporal(rowDateIso(row), todayIso);
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-md border px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase leading-none tracking-wide",
        TEMPORAL_TONE[bucket]
      )}
    >
      {t(TEMPORAL_KEY[bucket])}
    </span>
  );
}

export function PersonnelCostMobileCard({
  row,
  locale,
  t,
  branchNameById,
  todayIso,
}: {
  row: PersonnelCostRow;
  locale: Locale;
  t: (k: string) => string;
  branchNameById: Map<number, string>;
  todayIso: string;
}) {
  const dash = t("personnel.dash");

  if (row.kind === "advance") {
    const a = row.advance;
    return (
      <MobileListCard>
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <PersonnelCostTypeBadge kind="advance" t={t} />
            <RowDateTag row={row} todayIso={todayIso} t={t} />
          </div>
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
          <Field label={t("personnel.detailCostsCreatedBy")}>
            <CreatedByMeta row={a} locale={locale} dash={dash} compact />
          </Field>
        </div>
      </MobileListCard>
    );
  }

  if (row.kind === "contractorPayment") {
    const p = row.payment;
    const branchLabel =
      p.branchId != null && p.branchId > 0
        ? p.branchName?.trim() || branchNameById.get(p.branchId)?.trim() || dash
        : t("personnel.nonAdvanceExpenseBranchOrg");
    return (
      <MobileListCard>
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <PersonnelCostTypeBadge kind="contractorPayment" t={t} />
            <RowDateTag row={row} todayIso={todayIso} t={t} />
          </div>
          <div className="text-right">
            <p className="text-base font-semibold tabular-nums text-zinc-900">
              {formatMoneyDash(p.amount, dash, locale)}
            </p>
            <p className="text-xs text-zinc-500">{p.currencyCode}</p>
          </div>
        </div>
        <div className="divide-y divide-zinc-100">
          <Field label={t("personnel.costsColWrittenFrom")}>
            {personnelCostRowWrittenFrom(row, t, branchNameById, dash)}
          </Field>
          <Field label={t("personnel.tableName")}>
            {p.contractorDisplayName?.trim() || dash}
          </Field>
          <Field label={t("personnel.tableBranch")}>{branchLabel}</Field>
          <Field label={t("personnel.nonAdvanceExpensesColDate")}>
            {formatLocaleDate(p.paymentDate, locale, dash)}
          </Field>
          <Field label={t("personnel.costsColPaymentFrom")}>
            {t(`contractors.source.${p.paymentSource}`)}
            {p.paidByPersonnelName?.trim() ? ` · ${p.paidByPersonnelName.trim()}` : ""}
          </Field>
          <Field label={t("personnel.note")}>
            {p.description?.trim() ? (
              <span className="whitespace-pre-wrap break-words text-left">
                {p.description.trim()}
              </span>
            ) : (
              dash
            )}
          </Field>
        </div>
      </MobileListCard>
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
    <MobileListCard>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-100 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <PersonnelCostTypeBadge kind="expense" t={t} />
          <RowDateTag row={row} todayIso={todayIso} t={t} />
        </div>
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
        <Field label={t("personnel.detailCostsCreatedBy")}>
          <CreatedByMeta row={e} locale={locale} dash={dash} compact />
        </Field>
      </div>
    </MobileListCard>
  );
}

export function createPersonnelCostColumns(
  t: (k: string) => string,
  locale: Locale,
  branchNameById: Map<number, string>,
  todayIso: string
): DataTableColumn<PersonnelCostRow>[] {
  const dash = t("personnel.dash");
  return [
    {
      id: "kind",
      header: t("personnel.costsColType"),
      tdClassName: "whitespace-nowrap",
      cell: (row) => <PersonnelCostTypeBadge kind={row.kind} t={t} />,
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
      cell: (row) => (
        <div className="flex flex-col items-start gap-1">
          <span>{formatLocaleDate(rowDateIso(row), locale, dash)}</span>
          <RowDateTag row={row} todayIso={todayIso} t={t} />
        </div>
      ),
    },
    {
      id: "name",
      header: t("personnel.tableName"),
      tdClassName: "min-w-[8rem] text-sm font-medium text-zinc-900",
      cell: (row) => {
        if (row.kind === "advance") {
          return row.advance.personnelFullName?.trim() || dash;
        }
        if (row.kind === "contractorPayment") {
          return row.payment.contractorDisplayName?.trim() || dash;
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
        if (row.kind === "contractorPayment") {
          const pbid = row.payment.branchId;
          if (pbid != null && pbid > 0) {
            return row.payment.branchName?.trim() || branchNameById.get(pbid)?.trim() || dash;
          }
          return t("personnel.nonAdvanceExpenseBranchOrg");
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
        if (row.kind === "contractorPayment") {
          const pn = row.payment.paidByPersonnelName?.trim();
          return (
            <span className="text-sm text-zinc-700">
              {t(`contractors.source.${row.payment.paymentSource}`)}
              {pn ? <span className="text-zinc-500"> · {pn}</span> : null}
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
        if (row.kind === "contractorPayment") {
          return t(`contractors.source.${row.payment.paymentSource}`);
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
          : row.kind === "contractorPayment"
            ? formatMoneyDash(row.payment.amount, dash, locale)
            : formatMoneyDash(row.expense.amount, dash, locale),
    },
    {
      id: "currency",
      header: t("personnel.nonAdvanceExpensesColCurrency"),
      tdClassName: "whitespace-nowrap text-sm text-zinc-600",
      cell: (row) =>
        row.kind === "advance"
          ? row.advance.currencyCode
          : row.kind === "contractorPayment"
            ? row.payment.currencyCode
            : row.expense.currencyCode,
    },
    {
      id: "note",
      header: t("personnel.note"),
      tdClassName: "max-w-[14rem] truncate text-sm text-zinc-600",
      cell: (row) =>
        row.kind === "advance"
          ? row.advance.description?.trim() || dash
          : row.kind === "contractorPayment"
            ? row.payment.description?.trim() || dash
            : row.expense.description?.trim() || dash,
    },
    {
      id: "createdBy",
      header: t("personnel.detailCostsCreatedBy"),
      tdClassName: "whitespace-nowrap",
      cell: (row) =>
        row.kind === "advance" ? (
          <CreatedByMeta row={row.advance} locale={locale} dash={dash} />
        ) : row.kind === "contractorPayment" ? (
          <span className="text-sm text-zinc-400">{dash}</span>
        ) : (
          <CreatedByMeta row={row.expense} locale={locale} dash={dash} />
        ),
    },
  ];
}
