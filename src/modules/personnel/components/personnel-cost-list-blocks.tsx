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
import { useState, type ReactNode } from "react";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
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
    <div className="flex min-w-0 items-start justify-between gap-3 py-1">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="min-w-0 text-right text-[13px] leading-tight text-zinc-900">{children}</span>
    </div>
  );
}

const TEMPORAL_TONE: Record<RowDateTemporal, string> = {
  future: "border-violet-300/90 bg-violet-100 text-violet-800 ring-1 ring-violet-200/70",
  today: "border-emerald-300/90 bg-emerald-100 text-emerald-800",
  thisMonth: "border-sky-200 bg-sky-50 text-sky-700",
  past: "border-zinc-200 bg-zinc-50 text-zinc-600",
};

const TEMPORAL_KEY: Record<RowDateTemporal, string> = {
  future: "personnel.costsRowDateFuture",
  today: "personnel.costsRowDateToday",
  thisMonth: "personnel.costsRowDateThisMonth",
  past: "personnel.costsRowDatePast",
};

function RowDateTag({
  row,
  todayIso,
  t,
}: {
  row: PersonnelCostRow;
  todayIso: string;
  t: (k: string) => string;
}) {
  const bucket = rowDateTemporal(rowDateIso(row), todayIso);
  if (bucket === "past") return null;
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

type CardData = {
  id: number;
  name: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  metaPills: string[];
  expandedMeta: { label: string; value: ReactNode }[];
};

function buildAdvanceCardData(
  row: Extract<PersonnelCostRow, { kind: "advance" }>,
  t: (k: string) => string,
  locale: Locale,
  branchNameById: Map<number, string>,
  dash: string
): CardData {
  const a = row.advance;
  const branchPart =
    a.branchId != null && a.branchId > 0
      ? a.branchName?.trim() || branchNameById.get(a.branchId)?.trim() || `#${a.branchId}`
      : t("personnel.nonAdvanceExpenseBranchOrg");
  return {
    id: a.id,
    name: a.personnelFullName?.trim() || dash,
    date: formatLocaleDate(a.advanceDate, locale, dash),
    amount: a.amount,
    currency: a.currencyCode,
    description: a.description?.trim() || "",
    metaPills: [branchPart, advanceFundingSourceLabel(t, a.sourceType)].filter(Boolean),
    expandedMeta: [
      { label: t("personnel.effectiveYear"), value: a.effectiveYear ?? dash },
      {
        label: t("personnel.detailCostsCreatedBy"),
        value: <CreatedByMeta row={a} locale={locale} dash={dash} compact />,
      },
    ],
  };
}

function buildExpenseCardData(
  row: Extract<PersonnelCostRow, { kind: "expense" }>,
  t: (k: string) => string,
  locale: Locale,
  branchNameById: Map<number, string>,
  dash: string
): CardData {
  const e = row.expense;
  const { employeeName, linkTypeKey } = resolveNonAdvanceRow(e, dash);
  const branchLabel =
    e.branchId != null && e.branchId > 0
      ? branchNameById.get(e.branchId)?.trim() || dash
      : t("personnel.nonAdvanceExpenseBranchOrg");
  const pay = expensePaymentSourceLabel(e.expensePaymentSource, t);
  const category = txCategoryLine(e.mainCategory, e.category, t);
  return {
    id: e.id,
    name: employeeName,
    date: formatLocaleDate(e.transactionDate, locale, dash),
    amount: e.amount,
    currency: e.currencyCode,
    description: e.description?.trim() || "",
    metaPills: [branchLabel, category || "", pay || ""].filter(Boolean),
    expandedMeta: [
      { label: t("personnel.nonAdvanceExpenseLinkType"), value: linkTypeLabel(linkTypeKey, t) },
      {
        label: t("personnel.detailCostsCreatedBy"),
        value: <CreatedByMeta row={e} locale={locale} dash={dash} compact />,
      },
    ],
  };
}

function buildContractorPaymentCardData(
  row: Extract<PersonnelCostRow, { kind: "contractorPayment" }>,
  t: (k: string) => string,
  locale: Locale,
  branchNameById: Map<number, string>,
  dash: string
): CardData {
  const p = row.payment;
  const branchLabel =
    p.branchId != null && p.branchId > 0
      ? p.branchName?.trim() || branchNameById.get(p.branchId)?.trim() || dash
      : t("personnel.nonAdvanceExpenseBranchOrg");
  const source = t(`contractors.source.${p.paymentSource}`);
  const paidBy = p.paidByPersonnelName?.trim()
    ? `${t("personnel.costsColPaymentFrom")}: ${p.paidByPersonnelName.trim()}`
    : "";
  return {
    id: p.id,
    name: p.contractorDisplayName?.trim() || dash,
    date: formatLocaleDate(p.paymentDate, locale, dash),
    amount: p.amount,
    currency: p.currencyCode,
    description: p.description?.trim() || "",
    metaPills: [branchLabel, source, paidBy].filter(Boolean),
    expandedMeta: [],
  };
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
  const [open, setOpen] = useState(false);
  const data =
    row.kind === "advance"
      ? buildAdvanceCardData(row, t, locale, branchNameById, dash)
      : row.kind === "expense"
        ? buildExpenseCardData(row, t, locale, branchNameById, dash)
        : buildContractorPaymentCardData(row, t, locale, branchNameById, dash);
  const hasDescription = data.description.length > 0;
  const hasExpandedExtra = data.expandedMeta.length > 0;
  const canExpand = hasDescription || hasExpandedExtra;
  return (
    <MobileListCard>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] font-semibold text-zinc-500">
              #{data.id}
            </span>
            <PersonnelCostTypeBadge kind={row.kind} t={t} />
            <RowDateTag row={row} todayIso={todayIso} t={t} />
          </div>
          <p className="truncate text-[13px] font-semibold leading-tight text-zinc-900">
            {data.name}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-zinc-600">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          <span className="tabular-nums">{data.date}</span>
        </div>
      </div>

      {data.metaPills.length > 0 ? (
        <p className="mt-1 truncate text-[11px] leading-tight text-zinc-500">
          {data.metaPills.join(" · ")}
        </p>
      ) : null}

      {open && canExpand ? (
        <div className="mt-2 space-y-1 border-t border-zinc-100 pt-2">
          {hasDescription ? (
            <p className="whitespace-pre-wrap break-words text-[12px] leading-snug text-zinc-700">
              {data.description}
            </p>
          ) : null}
          {data.expandedMeta.map((m, idx) => (
            <div key={idx} className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                {m.label}
              </span>
              <span className="text-right text-[12px] text-zinc-800">{m.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex items-end justify-between gap-2">
        {canExpand ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
            aria-expanded={open}
          >
            {open ? (
              <ChevronUp className="h-3 w-3" aria-hidden />
            ) : (
              <ChevronDown className="h-3 w-3" aria-hidden />
            )}
            <span>{t("personnel.note")}</span>
          </button>
        ) : (
          <span />
        )}
        <div className="text-right leading-tight">
          <p className="font-mono text-[15px] font-semibold tabular-nums text-zinc-900">
            {formatMoneyDash(data.amount, dash, locale)}
          </p>
          <p className="text-[10px] text-zinc-500">{data.currency}</p>
        </div>
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
