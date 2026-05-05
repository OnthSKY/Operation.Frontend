"use client";

import { cn } from "@/lib/cn";
import {
  ExpensePaymentSourceTag,
  expensePaymentSourceShortReportLabel,
} from "@/modules/reports/lib/report-expense-payment";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type { Locale } from "@/i18n/messages";
import type {
  FinancialBranchBreakdownRow,
  FinancialExpensePaymentSourceRow,
} from "@/types/reports";

export type ExpensePayFiveBucket = {
  register: number;
  patron: number;
  personnelPocket: number;
  heldRegister: number;
  unset: number;
};

export function expenseBucketsFromBranchRow(row: FinancialBranchBreakdownRow): ExpensePayFiveBucket {
  return {
    register: row.totalExpenseRegister ?? 0,
    patron: row.totalExpensePatron ?? 0,
    personnelPocket: row.totalExpensePersonnelPocket ?? 0,
    heldRegister: row.totalExpensePersonnelHeldRegisterCash ?? 0,
    unset: row.totalExpenseUnset ?? 0,
  };
}

/** Günlük şube kasası / dashboard özet API satırı. */
export type DailyRegisterExpenseBucketsInput = {
  expenseOperationalRegister?: number | null;
  expenseOperationalPatron?: number | null;
  expenseOperationalPersonnelPocket?: number | null;
  expenseOperationalHeldRegisterCash?: number | null;
  expenseOperationalUnset?: number | null;
};

export function expenseBucketsFromDailyRegisterRow(row: DailyRegisterExpenseBucketsInput): ExpensePayFiveBucket {
  return {
    register: Number(row.expenseOperationalRegister ?? 0) || 0,
    patron: Number(row.expenseOperationalPatron ?? 0) || 0,
    personnelPocket: Number(row.expenseOperationalPersonnelPocket ?? 0) || 0,
    heldRegister: Number(row.expenseOperationalHeldRegisterCash ?? 0) || 0,
    unset: Number(row.expenseOperationalUnset ?? 0) || 0,
  };
}

export function expenseBucketsFromPaySourceRows(
  rows: FinancialExpensePaymentSourceRow[]
): ExpensePayFiveBucket {
  const b: ExpensePayFiveBucket = {
    register: 0,
    patron: 0,
    personnelPocket: 0,
    heldRegister: 0,
    unset: 0,
  };
  for (const r of rows) {
    const u = r.expensePaymentSource.trim().toUpperCase();
    const a = Number(r.totalAmount) || 0;
    if (u === "REGISTER") b.register += a;
    else if (u === "PATRON") b.patron += a;
    else if (u === "PERSONNEL_POCKET") b.personnelPocket += a;
    else if (u === "PERSONNEL_HELD_REGISTER_CASH") b.heldRegister += a;
    else if (u === "UNSET") b.unset += a;
  }
  return b;
}

const BUCKET_ORDER = [
  { code: "REGISTER" as const, pick: (x: ExpensePayFiveBucket) => x.register },
  { code: "PATRON" as const, pick: (x: ExpensePayFiveBucket) => x.patron },
  { code: "PERSONNEL_POCKET" as const, pick: (x: ExpensePayFiveBucket) => x.personnelPocket },
  { code: "PERSONNEL_HELD_REGISTER_CASH" as const, pick: (x: ExpensePayFiveBucket) => x.heldRegister },
  { code: "UNSET" as const, pick: (x: ExpensePayFiveBucket) => x.unset },
];

/** Gider hücresinin altında ödeme kaynağı miktarları (sıfır olanlar gösterilmez). */
export function FinancialExpensePaySourceSubline({
  buckets,
  currencyCode,
  locale,
  t,
  align = "start",
}: {
  buckets: ExpensePayFiveBucket;
  currencyCode: string;
  locale: Locale;
  t: (key: string) => string;
  align?: "start" | "end";
}) {
  const entries = BUCKET_ORDER.map((o) => ({ code: o.code, v: o.pick(buckets) })).filter(
    (x) => Math.abs(x.v) > 1e-9
  );
  if (entries.length === 0) return null;
  return (
    <ul
      className={cn(
        "mt-1 space-y-0.5 text-[11px] leading-tight",
        align === "end" ? "text-right" : "text-left"
      )}
      aria-label={t("reports.expensePaySourceSublineAria")}
    >
      {entries.map((e) => (
        <li
          key={e.code}
          className={cn(
            "flex flex-wrap items-center gap-x-1.5 gap-y-0.5",
            align === "end" ? "justify-end" : "justify-start"
          )}
        >
          <ExpensePaymentSourceTag
            code={e.code}
            label={expensePaymentSourceShortReportLabel(e.code, t)}
          />
          <span className="tabular-nums font-medium text-zinc-800">
            {formatLocaleAmount(e.v, locale, currencyCode)}
          </span>
        </li>
      ))}
    </ul>
  );
}
