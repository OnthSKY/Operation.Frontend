"use client";

import type { Locale } from "@/i18n/messages";
import type { AdvanceListItem } from "@/types/advance";
import { MobileListCard } from "@/shared/components/MobileListCard";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import type { DataTableColumn } from "@/shared/tables";
import type { ReactNode } from "react";

export function sourceAbbrev(t: (k: string) => string, st: string): string {
  const u = st.toUpperCase();
  if (u === "PATRON") return t("personnel.advanceSourceAbbrPatron");
  if (u === "BANK") return t("personnel.advanceSourceAbbrBank");
  if (u === "PERSONNEL_POCKET")
    return t("personnel.advanceSourceAbbrPersonnelPocket");
  return t("personnel.advanceSourceAbbrCash");
}

/** Avans: gider satırlarıyla aynı «kasadan / patrondan» dilinde tam metin. */
export function advanceFundingSourceLabel(
  t: (k: string) => string,
  sourceType: string | null | undefined
): string {
  const u = String(sourceType ?? "").trim().toUpperCase();
  if (u === "PATRON") return t("branch.expensePayPatron");
  if (u === "BANK") return t("personnel.advancePaidFromBank");
  if (u === "PERSONNEL_POCKET") return t("branch.expensePayPersonnelPocket");
  if (u === "CASH" || u === "") return t("branch.expensePayRegister");
  return sourceAbbrev(t, u);
}

export function AdvanceCard({
  row,
  locale,
  t,
}: {
  row: AdvanceListItem;
  locale: Locale;
  t: (k: string) => string;
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

  return (
    <MobileListCard>
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-zinc-900">
            {row.personnelFullName?.trim() || dash}
          </p>
          <p className="mt-0.5 truncate text-sm text-zinc-600">
            {row.branchName?.trim() || dash}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-semibold tabular-nums text-zinc-900">
            {formatMoneyDash(row.amount, dash, locale)}
          </p>
          <p className="text-xs text-zinc-500">{row.currencyCode}</p>
        </div>
      </div>
      <div className="divide-y divide-zinc-100">
        <Field label={t("personnel.advanceDate")}>
          {formatLocaleDate(row.advanceDate, locale, dash)}
        </Field>
        <Field label={t("personnel.sourceType")}>
          {sourceAbbrev(t, row.sourceType)}
        </Field>
        <Field label={t("personnel.effectiveYear")}>{row.effectiveYear}</Field>
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
    </MobileListCard>
  );
}

export function createAdvanceListColumns(
  t: (k: string) => string,
  locale: Locale
): DataTableColumn<AdvanceListItem>[] {
  const dash = t("personnel.dash");
  return [
    {
      id: "date",
      header: t("personnel.advanceDate"),
      tdClassName: "whitespace-nowrap text-sm",
      cell: (row) => formatLocaleDate(row.advanceDate, locale, dash),
    },
    {
      id: "name",
      header: t("personnel.tableName"),
      tdClassName: "min-w-[8rem] text-sm font-medium text-zinc-900",
      cell: (row) => row.personnelFullName?.trim() || dash,
    },
    {
      id: "branch",
      header: t("personnel.tableBranch"),
      tdClassName: "min-w-[6rem] text-sm text-zinc-700",
      cell: (row) => row.branchName?.trim() || dash,
    },
    {
      id: "amount",
      header: t("personnel.amount"),
      thClassName: "text-right",
      tdClassName: "whitespace-nowrap text-right text-sm tabular-nums",
      cell: (row) => formatMoneyDash(row.amount, dash, locale),
    },
    {
      id: "currency",
      header: t("personnel.advanceCurrency"),
      tdClassName: "whitespace-nowrap text-sm text-zinc-600",
      cell: (row) => row.currencyCode,
    },
    {
      id: "source",
      header: t("personnel.sourceType"),
      tdClassName: "whitespace-nowrap text-sm text-zinc-600",
      cell: (row) => sourceAbbrev(t, row.sourceType),
    },
    {
      id: "year",
      header: t("personnel.effectiveYear"),
      tdClassName: "whitespace-nowrap text-sm tabular-nums text-zinc-600",
      cell: (row) => row.effectiveYear,
    },
    {
      id: "note",
      header: t("personnel.note"),
      tdClassName: "max-w-[14rem] truncate text-sm text-zinc-600",
      cell: (row) => row.description?.trim() || dash,
    },
  ];
}
