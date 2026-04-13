"use client";

import type { Locale } from "@/i18n/messages";
import type { BranchTodayRow } from "@/modules/dashboard/hooks/useTodayBranchesSummary";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import Link from "next/link";

export function BranchTodaySnapshot({
  rows,
  locale,
  t,
  titleBadge,
  tableBlurb,
}: {
  rows: BranchTodayRow[];
  locale: Locale;
  t: (key: string) => string;
  titleBadge: string | null;
  tableBlurb: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-200/50 bg-gradient-to-b from-emerald-50/40 to-white p-3 shadow-sm ring-1 ring-emerald-100/40 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-emerald-950">
            {t("dashboard.branchTodayTitle")}
            {titleBadge ? (
              <span className="font-medium text-emerald-900/90">
                {" · "}
                {titleBadge}
              </span>
            ) : null}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-emerald-900/75">
            {tableBlurb}
          </p>
        </div>
        <Link
          href="/branches"
          className="shrink-0 text-sm font-semibold text-emerald-800 underline-offset-2 hover:underline"
        >
          {t("dashboard.branchTodayOpenBranches")}
        </Link>
      </div>

      <div className="mt-3 hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[28rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="border-b border-zinc-200 pb-2 pr-3">
                {t("dashboard.branchTodayColBranch")}
              </th>
              <th className="border-b border-zinc-200 pb-2 pr-3 text-right">
                {t("dashboard.branchTodayColIncome")}
              </th>
              <th className="border-b border-zinc-200 pb-2 pr-3 text-right">
                {t("dashboard.branchTodayColRegisterOut")}
              </th>
              <th className="border-b border-zinc-200 pb-2 text-right">
                {t("dashboard.branchTodayColNet")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.branchId} className="text-zinc-800">
                <td className="border-b border-zinc-100 py-2.5 pr-3 font-medium text-zinc-900">
                  {row.branchName}
                </td>
                <td className="border-b border-zinc-100 py-2.5 pr-3 text-right tabular-nums">
                  {row.financialHidden ? (
                    <span className="text-zinc-400">—</span>
                  ) : (
                    formatLocaleAmount(row.income, locale)
                  )}
                </td>
                <td className="border-b border-zinc-100 py-2.5 pr-3 text-right tabular-nums text-red-800/90">
                  {row.financialHidden ? (
                    <span className="text-zinc-400">—</span>
                  ) : (
                    formatLocaleAmount(row.expenseFromRegister, locale)
                  )}
                </td>
                <td className="border-b border-zinc-100 py-2.5 text-right tabular-nums font-semibold text-zinc-900">
                  {row.financialHidden ? (
                    <span className="text-zinc-400">—</span>
                  ) : (
                    formatLocaleAmount(row.netCash, locale)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.some((r) => r.financialHidden) ? (
          <p className="mt-2 text-xs text-zinc-500">
            {t("dashboard.branchTodayHiddenRow")}
          </p>
        ) : null}
      </div>

      <ul className="mt-3 space-y-2 sm:hidden">
        {rows.map((row) => (
          <li
            key={row.branchId}
            className="rounded-xl border border-zinc-200/80 bg-white/90 px-3 py-2.5 shadow-sm"
          >
            <p className="text-sm font-semibold text-zinc-900">{row.branchName}</p>
            {row.financialHidden ? (
              <p className="mt-1 text-xs text-zinc-500">
                {t("dashboard.branchTodayHiddenRow")}
              </p>
            ) : (
              <dl className="mt-2 grid grid-cols-1 gap-1.5 text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-zinc-500">{t("dashboard.branchTodayColIncome")}</dt>
                  <dd className="tabular-nums font-medium text-zinc-900">
                    {formatLocaleAmount(row.income, locale)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-zinc-500">
                    {t("dashboard.branchTodayColRegisterOut")}
                  </dt>
                  <dd className="tabular-nums font-medium text-red-800/90">
                    {formatLocaleAmount(row.expenseFromRegister, locale)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-2 border-t border-zinc-100 pt-1.5">
                  <dt className="font-medium text-zinc-700">
                    {t("dashboard.branchTodayColNet")}
                  </dt>
                  <dd className="tabular-nums font-semibold text-zinc-900">
                    {formatLocaleAmount(row.netCash, locale)}
                  </dd>
                </div>
              </dl>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
