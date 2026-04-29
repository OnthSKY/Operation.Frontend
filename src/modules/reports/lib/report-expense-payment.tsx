"use client";

import { expensePaymentSourceLabel } from "@/modules/branch/lib/branch-transaction-options";
import type { FinancialExpensePaymentSourceRow } from "@/types/reports";
import type { Locale } from "@/i18n/messages";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";

const ORDER = [
  "REGISTER",
  "PATRON",
  "PERSONNEL_POCKET",
  "PERSONNEL_HELD_REGISTER_CASH",
  "UNSET",
] as const;

function sortKey(code: string): number {
  const u = code.trim().toUpperCase();
  const i = (ORDER as readonly string[]).indexOf(u);
  return i >= 0 ? i : 99;
}

export function sortExpensePaymentRows<T extends { expensePaymentSource: string }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => sortKey(a.expensePaymentSource) - sortKey(b.expensePaymentSource));
}

export function expensePaymentSourceTagClass(code: string): string {
  const u = code.trim().toUpperCase();
  if (u === "REGISTER") {
    return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/90";
  }
  if (u === "PATRON") {
    return "bg-violet-100 text-violet-900 ring-1 ring-violet-200/90";
  }
  if (u === "PERSONNEL_POCKET") {
    return "bg-amber-100 text-amber-950 ring-1 ring-amber-200/90";
  }
  if (u === "PERSONNEL_HELD_REGISTER_CASH") {
    return "bg-sky-100 text-sky-950 ring-1 ring-sky-200/90";
  }
  return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/90";
}

export function expensePaymentSourceBarClass(code: string): string {
  const u = code.trim().toUpperCase();
  if (u === "REGISTER") return "bg-emerald-500";
  if (u === "PATRON") return "bg-violet-500";
  if (u === "PERSONNEL_POCKET") return "bg-amber-500";
  if (u === "PERSONNEL_HELD_REGISTER_CASH") return "bg-sky-500";
  return "bg-zinc-400";
}

export function expensePaymentSourceReportLabel(
  code: string,
  t: (key: string) => string
): string {
  const u = code.trim().toUpperCase();
  if (u === "UNSET") return t("branch.expensePaymentUnset");
  const full = expensePaymentSourceLabel(code, t);
  return full || code;
}

export function ExpensePaymentSourceTag({
  code,
  label,
}: {
  code: string;
  label: string;
}) {
  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center rounded-full px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ring-inset sm:text-xs ${expensePaymentSourceTagClass(code)}`}
    >
      <span className="truncate">{label}</span>
    </span>
  );
}

function tpl(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ""));
}

export function ReportExpensePaymentMix({
  rows,
  currencyCode,
  t,
  locale,
}: {
  rows: FinancialExpensePaymentSourceRow[];
  currencyCode: string;
  t: (key: string) => string;
  locale: Locale;
}) {
  const forCcy = rows.filter((r) => r.currencyCode === currencyCode);
  const total = forCcy.reduce((s, r) => s + r.totalAmount, 0);
  if (total <= 0) return null;

  const ordered = sortExpensePaymentRows(forCcy);

  return (
    <div className="mb-4 space-y-3 rounded-xl border border-zinc-200/90 bg-zinc-50/60 p-3 sm:p-4">
      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500">
          {t("reports.chartExpensePayBlockTitle")}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600">
          {t("reports.chartExpensePayHint")}
        </p>
      </div>
      <div
        className="flex h-2.5 w-full max-w-md overflow-hidden rounded-full bg-zinc-200/80 ring-1 ring-zinc-200/80"
        role="img"
        aria-label={t("reports.chartExpensePayBlockTitle")}
      >
        {ordered.map((r) => {
          const w = Math.max(0, (r.totalAmount / total) * 100);
          if (w <= 0) return null;
          return (
            <div
              key={r.expensePaymentSource}
              className={`min-w-0 ${expensePaymentSourceBarClass(r.expensePaymentSource)}`}
              style={{ width: `${w}%` }}
              title={expensePaymentSourceReportLabel(r.expensePaymentSource, t)}
            />
          );
        })}
      </div>
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
        {ordered.map((r) => {
          const pct = Math.round((r.totalAmount / total) * 100);
          const short =
            r.expensePaymentSource.trim().toUpperCase() === "REGISTER"
              ? t("branch.expensePayRegisterShort")
              : r.expensePaymentSource.trim().toUpperCase() === "PATRON"
                ? t("branch.expensePayPatronShort")
                : r.expensePaymentSource.trim().toUpperCase() === "PERSONNEL_POCKET"
                  ? t("branch.expensePayPersonnelPocketShort")
                  : r.expensePaymentSource.trim().toUpperCase() === "PERSONNEL_HELD_REGISTER_CASH"
                    ? t("branch.expensePayPersonnelHeldRegisterCashShort")
                  : t("branch.expensePaymentUnset");
          return (
            <li
              key={r.expensePaymentSource}
              className="flex min-w-0 flex-wrap items-center gap-2 sm:inline-flex sm:max-w-none"
            >
              <ExpensePaymentSourceTag code={r.expensePaymentSource} label={short} />
              <span className="text-xs tabular-nums text-zinc-700 sm:text-sm">
                {tpl(t("reports.expensePayTagAmount"), {
                  pct: String(pct),
                  amt: formatLocaleAmount(r.totalAmount, locale, currencyCode),
                })}
              </span>
              <span className="hidden text-xs text-zinc-500 sm:inline">
                ({r.lineCount} {t("reports.expensePayLineCountAbbr")})
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
