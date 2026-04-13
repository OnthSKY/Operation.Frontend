"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/cn";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { ReportCashSeasonYearEndSelect } from "@/modules/reports/components/ReportCashSeasonYearEndSelect";
import { normalizeWarehouseStock } from "@/modules/dashboard/api/overview-api";
import { useDashboardOverview } from "@/modules/dashboard/hooks/useDashboardOverview";
import {
  useTodayBranchesSummary,
  type BranchTodayRow,
  type SummaryAggregateState,
} from "@/modules/dashboard/hooks/useTodayBranchesSummary";
import { Card } from "@/shared/components/Card";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { DashboardOverview } from "@/types/dashboard-overview";

function fillDashboardTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => vars[key] ?? "—"
  );
}

const PERSONNEL_JOB_TITLE_KEYS = new Set([
  "GENERAL_MANAGER",
  "BRANCH_SUPERVISOR",
  "DRIVER",
  "CRAFTSMAN",
  "WAITER",
  "COMMIS",
  "CASHIER",
  "BRANCH_INTERNAL_HELP",
  "MANAGER",
  "BACK_HOUSE_HELPER",
]);

function personnelJobTitleLabel(
  t: (key: string) => string,
  code: string,
  fallback: string
): string {
  const u = code?.trim().toUpperCase() ?? "";
  if (PERSONNEL_JOB_TITLE_KEYS.has(u)) return t(`personnel.jobTitles.${u}`);
  return code?.trim() || fallback;
}

function formatTenure(years: number, months: number, locale: Locale): string {
  if (locale === "tr") {
    if (years > 0 && months > 0) return `${years} yıl ${months} ay`;
    if (years > 0) return `${years} yıl`;
    return `${months} ay`;
  }
  if (years > 0 && months > 0) return `${years} yr ${months} mo`;
  if (years > 0) return `${years} yr`;
  return `${months} mo`;
}

function StoryBlock({
  title,
  description,
  id: sectionId,
  children,
}: {
  title: string;
  description: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={sectionId}
      className={`flex flex-col gap-3 ${sectionId ? "scroll-mt-28 sm:scroll-mt-24" : ""}`}
    >
      <div>
        <h2 className="text-xl font-semibold leading-snug tracking-tight text-zinc-900 sm:text-lg">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600 sm:mt-0.5 sm:text-sm sm:text-zinc-500">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

type DashboardMainTab =
  | "summary"
  | "finance"
  | "personnel"
  | "operations"
  | "reports";

function BranchTodaySnapshot({
  rows,
  locale,
  t,
  isSnapshotToday,
  snapshotDateLabel,
}: {
  rows: BranchTodayRow[];
  locale: Locale;
  t: (key: string) => string;
  isSnapshotToday: boolean;
  snapshotDateLabel: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-200/50 bg-gradient-to-b from-emerald-50/40 to-white p-3 shadow-sm ring-1 ring-emerald-100/40 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-emerald-950">
            {t("dashboard.branchTodayTitle")}
            {!isSnapshotToday ? (
              <span className="font-medium text-emerald-900/90">
                {" · "}
                {snapshotDateLabel}
              </span>
            ) : null}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-emerald-900/75">
            {isSnapshotToday
              ? t("dashboard.branchTodayDesc")
              : fillDashboardTemplate(t("dashboard.branchTodayDescForDate"), {
                  date: snapshotDateLabel,
                })}
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

function DashboardDayStoryCard({
  t,
  locale,
  state,
  overview,
  onRegisterCashDetailClick,
  onCashRetry,
  sumBranchesFootnote,
}: {
  t: (key: string) => string;
  locale: Locale;
  state: SummaryAggregateState;
  overview: UseQueryResult<DashboardOverview>;
  onRegisterCashDetailClick: () => void;
  onCashRetry: () => void;
  sumBranchesFootnote: string;
}): ReactNode {
  const heldBreakdown =
    overview.data?.financeExtras.registerCashHeldByPersonnelBreakdown ?? [];
  const heldPreview = heldBreakdown.slice(0, 5);
  const heldMore = Math.max(0, heldBreakdown.length - heldPreview.length);

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/40 p-5 shadow-sm ring-1 ring-violet-200/25">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-zinc-900">
            {t("dashboard.storyCardTitle")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-600">
            {t("dashboard.storyCardDesc")}
          </p>
        </div>
        {state.kind === "error" ? (
          <p className="shrink-0 text-xs font-medium text-amber-900/90 sm:max-w-xs sm:text-right">
            {t("dashboard.storyNarrativeCashError")}
          </p>
        ) : null}
      </div>

      {state.kind === "ok" ||
      (!overview.isPending && !overview.isError && overview.data) ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-violet-200/70 bg-white/80 p-3 shadow-sm sm:p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-900/90">
              {t("dashboard.storyTwoMetricsTitle")}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
              {t("dashboard.storyTwoMetricsNote")}
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {state.kind === "ok" ? (
              <div
                className={cn(
                  "flex min-w-0 flex-col rounded-2xl border-2 p-4 shadow-sm",
                  state.netCash > 0.005
                    ? "border-emerald-300/80 bg-emerald-50/90"
                    : state.netCash < -0.005
                      ? "border-red-300/80 bg-red-50/90"
                      : "border-zinc-200/90 bg-zinc-50/90"
                )}
              >
                <span className="inline-flex w-fit rounded-full bg-white/90 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-zinc-700 ring-1 ring-zinc-200/80">
                  {t("dashboard.storyStep1Badge")}
                </span>
                <p className="mt-2 text-sm font-semibold text-zinc-900">
                  {t("dashboard.storyStep1Title")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                  {t("dashboard.storyStep1Formula")}
                </p>
                <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                  {t("dashboard.storyDayNetLabel")}
                </p>
                <p className="mt-0.5 text-sm font-semibold leading-snug text-zinc-800">
                  {state.netCash > 0.005
                    ? t("dashboard.storyDayAhead")
                    : state.netCash < -0.005
                      ? t("dashboard.storyDayShort")
                      : t("dashboard.storyDayEven")}
                </p>
                <p className="mt-2 tabular-nums text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
                  {formatLocaleAmount(state.netCash, locale)}
                </p>
              </div>
            ) : null}
            {!overview.isPending && !overview.isError && overview.data ? (
              <div
                className={cn(
                  "flex min-w-0 flex-col rounded-2xl border-2 p-4 shadow-sm",
                  (overview.data.financeExtras.allBranchesLifetimeEconomicNet ?? 0) >
                    0.005
                    ? "border-sky-300/80 bg-sky-50/90"
                    : (overview.data.financeExtras.allBranchesLifetimeEconomicNet ??
                        0) < -0.005
                      ? "border-orange-300/80 bg-orange-50/90"
                      : "border-zinc-200/90 bg-zinc-50/90"
                )}
              >
                <span className="inline-flex w-fit rounded-full bg-white/90 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-zinc-700 ring-1 ring-zinc-200/80">
                  {t("dashboard.storyStep2Badge")}
                </span>
                <p className="mt-2 text-sm font-semibold text-zinc-900">
                  {t("dashboard.storyStep2Title")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                  {t("dashboard.storyStep2Formula")}
                </p>
                <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                  {t("dashboard.storyLifetimeNetLabel")}
                </p>
                <p className="mt-0.5 text-sm font-semibold leading-snug text-zinc-800">
                  {(overview.data.financeExtras.allBranchesLifetimeEconomicNet ??
                    0) > 0.005
                    ? t("dashboard.storyLifetimeAhead")
                    : (overview.data.financeExtras.allBranchesLifetimeEconomicNet ??
                        0) < -0.005
                      ? t("dashboard.storyLifetimeShort")
                      : t("dashboard.storyLifetimeEven")}
                </p>
                <p className="mt-2 tabular-nums text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
                  {formatLocaleAmount(
                    overview.data.financeExtras.allBranchesLifetimeEconomicNet ?? 0,
                    locale
                  )}
                </p>
                <p className="mt-3 border-t border-zinc-200/70 pt-3 text-xs leading-relaxed text-zinc-600">
                  {t("dashboard.storyLifetimeNetHint")}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mt-6 border-t border-zinc-200/70 pt-5">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("dashboard.storyDetailSectionTitle")}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600 sm:text-sm">
          {t("dashboard.storyDetailSectionDesc")}
        </p>
      </div>

      <div
        className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        aria-busy={
          overview.isPending || state.kind === "loading" ? true : undefined
        }
      >
        <Card
          title={t("dashboard.netRegisterToday")}
          description={t("dashboard.netRegisterTodayDesc")}
          className="border-violet-200/40 bg-white/95 shadow-md shadow-violet-950/[0.04] ring-1 ring-violet-100/50"
        >
          <MetricValue
            state={state}
            dash="—"
            locale={locale}
            pick={(s) => s.netCash}
            valueClassName="text-violet-950 sm:text-3xl"
            footnote={sumBranchesFootnote}
            loadingLabel={t("common.loading")}
            emptyHint={t("dashboard.noBranches")}
            onRetry={onCashRetry}
            retryLabel={t("common.retry")}
          />
          {state.kind === "ok" ? (
            <div className="mt-4 border-t border-zinc-200/80 pt-3">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-zinc-500">
                {t("dashboard.summaryGrossIntakeIn")}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 sm:text-xl">
                {formatLocaleAmount(state.totalIncome, locale)}
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-zinc-500">{t("dashboard.summaryDayIncomeCash")}</dt>
                  <dd className="tabular-nums font-semibold text-zinc-900">
                    {formatLocaleAmount(state.totalIncomeCash, locale)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-zinc-500">{t("dashboard.summaryDayIncomePos")}</dt>
                  <dd className="tabular-nums font-semibold text-zinc-900">
                    {formatLocaleAmount(state.totalIncomeCard, locale)}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {t("dashboard.summaryIncomeSplitFootnote")}
              </p>
            </div>
          ) : null}
        </Card>

        <Card
          title={t("dashboard.storySummaryBranchesInDayTitle")}
          description={t("dashboard.storySummaryBranchesInDayDesc")}
          className="bg-white/90"
        >
          {state.kind === "loading" ? (
            <StatSkeleton />
          ) : state.kind === "error" ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">
                {toErrorMessage(state.message)}
              </p>
              <p className="text-xs text-red-900/80">{t("common.loadErrorHint")}</p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={onCashRetry}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : state.kind === "empty" ? (
            <>
              <p className="text-2xl font-semibold text-zinc-400 sm:text-3xl">—</p>
              <p className="mt-1 text-xs text-zinc-500">{t("dashboard.noBranches")}</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
                {state.branchCount}
              </p>
              <p className="mt-1 text-xs text-zinc-400">{sumBranchesFootnote}</p>
            </>
          )}
        </Card>

        <Card
          title={t("dashboard.statActivePersonnel")}
          description={t("dashboard.statActivePersonnelDesc")}
          className="bg-white/90"
        >
          {overview.isPending ? (
            <StatSkeleton />
          ) : overview.isError ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">
                {toErrorMessage(overview.error)}
              </p>
              <p className="text-xs text-red-900/80">{t("common.loadErrorHint")}</p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => void overview.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
              {overview.data?.personnel.activePersonnelCount ?? 0}
            </p>
          )}
        </Card>

        <Card
          title={t("dashboard.statBranches")}
          description={t("dashboard.statBranchesDesc")}
          className="bg-white/90"
        >
          {overview.isPending ? (
            <StatSkeleton />
          ) : overview.isError ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">
                {toErrorMessage(overview.error)}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => void overview.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
              {overview.data?.operations.activeBranchCount ?? 0}
            </p>
          )}
        </Card>

        <Card
          title={t("dashboard.statWarehouses")}
          description={t("dashboard.statWarehousesDesc")}
          className="bg-white/90"
        >
          {overview.isPending ? (
            <StatSkeleton />
          ) : overview.isError ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">
                {toErrorMessage(overview.error)}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => void overview.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
              {overview.data?.operations.activeWarehouseCount ?? 0}
            </p>
          )}
        </Card>

        <Card
          title={t("dashboard.statActiveSuppliers")}
          description={t("dashboard.statActiveSuppliersDesc")}
          className="bg-white/90"
        >
          {overview.isPending ? (
            <StatSkeleton />
          ) : overview.isError ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">
                {toErrorMessage(overview.error)}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => void overview.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
              {overview.data?.operations.activeSupplierCount ?? 0}
            </p>
          )}
        </Card>

        <Card
          title={t("dashboard.statActiveVehicles")}
          description={t("dashboard.statActiveVehiclesDesc")}
          className="bg-white/90"
        >
          {overview.isPending ? (
            <StatSkeleton />
          ) : overview.isError ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">
                {toErrorMessage(overview.error)}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => void overview.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
              {overview.data?.operations.activeVehicleCount ?? 0}
            </p>
          )}
        </Card>

        <Card
          title={t("dashboard.statActiveProducts")}
          description={t("dashboard.statActiveProductsDesc")}
          className="bg-white/90"
        >
          {overview.isPending ? (
            <StatSkeleton />
          ) : overview.isError ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">
                {toErrorMessage(overview.error)}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => void overview.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
              {overview.data?.operations.activeProductCount ?? 0}
            </p>
          )}
        </Card>
      </div>

      <div className="mt-4 rounded-xl border border-teal-200/70 bg-gradient-to-br from-teal-50/85 via-white to-emerald-50/30 p-4 shadow-sm ring-1 ring-teal-100/45 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900">
              {t("dashboard.warehouseStockStoryTitle")}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600 sm:text-sm">
              {t("dashboard.warehouseStockStoryDesc")}
            </p>
          </div>
          <Link
            href="/warehouses"
            className="shrink-0 text-sm font-semibold text-teal-900 underline-offset-2 hover:underline"
          >
            {t("dashboard.warehouseStockSeeWarehouses")}
          </Link>
        </div>
        {overview.isPending ? (
          <div className="mt-4 space-y-2">
            <StatSkeleton />
            <StatSkeleton />
          </div>
        ) : overview.isError ? (
          <p className="mt-4 text-sm text-red-600">{toErrorMessage(overview.error)}</p>
        ) : (
          (() => {
            const ws = normalizeWarehouseStock(
              overview.data?.operations?.warehouseStock
            );
            return (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-teal-100/90 bg-white/95 p-3 shadow-sm">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-teal-900/75">
                      {t("dashboard.warehouseStockKindsLabel")}
                    </p>
                    <p className="mt-1.5 text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
                      {ws.distinctProductCount}
                    </p>
                  </div>
                  <div className="rounded-lg border border-teal-100/90 bg-white/95 p-3 shadow-sm">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-teal-900/75">
                      {t("dashboard.warehouseStockTotalUnitsLabel")}
                    </p>
                    <p className="mt-1.5 text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
                      {formatLocaleAmount(ws.totalUnitsApprox, locale)}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                      {t("dashboard.warehouseStockTotalUnitsFootnote")}
                    </p>
                  </div>
                </div>
                {ws.distinctProductCount === 0 ? (
                  <p className="mt-4 text-sm text-zinc-600">
                    {t("dashboard.warehouseStockEmpty")}
                  </p>
                ) : ws.topByQuantity.length > 0 ? (
                  <>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      {t("dashboard.warehouseStockTopTitle")}
                    </p>
                    <ul className="mt-2 divide-y divide-zinc-200/80 overflow-hidden rounded-xl border border-zinc-200/80 bg-white/95 shadow-sm">
                      {ws.topByQuantity.map((row) => (
                        <li
                          key={row.productId}
                          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
                        >
                          <span className="min-w-0 font-medium text-zinc-900">
                            {row.productName || "—"}
                          </span>
                          <span className="shrink-0 tabular-nums font-semibold text-teal-950">
                            {formatLocaleAmount(row.quantity, locale)}
                            {row.unit ? (
                              <span className="ml-1.5 text-xs font-medium text-zinc-500">
                                {row.unit}
                              </span>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            );
          })()
        )}
      </div>

      {heldPreview.length > 0 ? (
        <div className="mt-4 rounded-xl border border-sky-200/60 bg-white/70 p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-900/85">
            {t("dashboard.registerCashHeroTitle")}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-800">
            {heldPreview.map((row, i) => {
              const b = row.registerBranchName?.trim();
              return (
                <li
                  key={`${row.personnelId}-${row.currencyCode}-${b ?? i}-${i}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5"
                >
                  <span className="min-w-0">
                    <span className="font-medium text-zinc-900">
                      {row.fullName}
                    </span>
                    {b ? (
                      <span className="text-zinc-500">
                        {" "}
                        · {b}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-sky-900">
                    {formatLocaleAmount(
                      row.totalAmount,
                      locale,
                      row.currencyCode
                    )}{" "}
                    <span className="text-xs font-medium text-zinc-500">
                      {row.currencyCode}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          {heldMore > 0 ? (
            <p className="mt-2 text-xs text-zinc-500">
              +{heldMore} {t("dashboard.registerCashMoreLines")}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onRegisterCashDetailClick}
            className="mt-2 inline-block text-sm font-semibold text-violet-700 underline-offset-2 hover:underline"
          >
            {t("dashboard.registerCashSeeDetail")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ReportLinkRow({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm ring-zinc-950/[0.02] transition hover:border-violet-300/50 hover:bg-violet-50/35"
    >
      <span className="min-w-0">{children}</span>
      <span
        className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600"
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}

function MetricValue({
  state,
  dash,
  locale,
  pick,
  valueClassName,
  footnote,
  loadingLabel,
  emptyHint,
  onRetry,
  retryLabel,
}: {
  state: SummaryAggregateState;
  dash: string;
  locale: Locale;
  pick: (s: Extract<SummaryAggregateState, { kind: "ok" }>) => number;
  valueClassName: string;
  footnote: string;
  loadingLabel: string;
  emptyHint: string;
  onRetry: () => void;
  retryLabel: string;
}): ReactNode {
  const { t } = useI18n();
  if (state.kind === "loading") {
    return <p className="text-sm text-zinc-500">{loadingLabel}</p>;
  }
  if (state.kind === "error") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-red-600">{toErrorMessage(state.message)}</p>
        <p className="text-xs text-red-900/80">{t("common.loadErrorHint")}</p>
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={onRetry}
        >
          {retryLabel}
        </Button>
      </div>
    );
  }
  if (state.kind === "empty") {
    return (
      <>
        <p className="text-2xl font-semibold text-zinc-400">{dash}</p>
        <p className="mt-1 text-xs text-zinc-500">{emptyHint}</p>
      </>
    );
  }
  return (
    <>
      <p className={`text-2xl font-semibold ${valueClassName}`}>
        {formatLocaleAmount(pick(state), locale)}
      </p>
      <p className="mt-1 text-xs text-zinc-400">{footnote}</p>
    </>
  );
}

function StatSkeleton() {
  return (
    <div className="h-9 w-24 animate-pulse rounded-md bg-zinc-100" aria-hidden />
  );
}

export function DashboardScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<DashboardMainTab>("summary");
  const [branchSummaryDate, setBranchSummaryDate] = useState(() =>
    localIsoDate()
  );
  useEffect(() => {
    if (isPersonnelPortalRole(user?.role)) router.replace("/branches");
  }, [user?.role, router]);
  const { state, refetch } = useTodayBranchesSummary(branchSummaryDate);
  const overview = useDashboardOverview();
  const dash = "—";
  const todayIso = localIsoDate();
  const isSnapshotToday = branchSummaryDate === todayIso;
  const snapshotDateLabel = formatLocaleDate(branchSummaryDate, locale);
  const sumBranchesFootnote = isSnapshotToday
    ? t("dashboard.sumAllBranchesToday")
    : fillDashboardTemplate(t("dashboard.sumAllBranchesForDate"), {
        date: snapshotDateLabel,
      });

  const tabBtn = (active: boolean) =>
    `min-h-11 touch-manipulation rounded-lg px-1.5 py-2 text-xs font-semibold transition sm:min-h-10 sm:flex-1 sm:px-2 sm:py-2 sm:text-sm ${
      active
        ? "bg-white text-zinc-900 shadow-sm"
        : "text-zinc-600 active:bg-zinc-200/80 sm:hover:text-zinc-900"
    }`;

  return (
    <div className="mx-auto flex w-full app-page-max flex-col gap-6 p-4 pb-6 sm:gap-8 sm:pb-4">
      <div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm text-zinc-500">{t("dashboard.subtitle")}</p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          {t("dashboard.storyFlowHint")}
        </p>
        <div className="mt-4 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 sm:p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("dashboard.registerSnapshotDayLabel")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">
            {t("dashboard.registerSnapshotToolbarHint")}
          </p>
          <div className="mt-3 grid max-w-lg grid-cols-1 gap-3 sm:max-w-none sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
            <ReportCashSeasonYearEndSelect
              asOfDate={branchSummaryDate}
              onApplyAsOf={setBranchSummaryDate}
            />
            <DateField
              label={t("dashboard.registerSnapshotDateField")}
              value={branchSummaryDate}
              onChange={(e) => setBranchSummaryDate(e.target.value)}
            />
            {!isSnapshotToday ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full touch-manipulation sm:min-h-10"
                onClick={() => setBranchSummaryDate(localIsoDate())}
              >
                {t("dashboard.registerSnapshotResetToday")}
              </Button>
            ) : (
              <div className="hidden lg:block" aria-hidden />
            )}
          </div>
        </div>
      </div>

      <div
        className="sticky top-2 z-10 flex w-full flex-wrap gap-1 rounded-xl border border-zinc-200/80 bg-zinc-50/95 p-1 shadow-sm backdrop-blur-sm sm:flex-nowrap sm:p-1.5"
        role="tablist"
        aria-label={t("dashboard.tabsAria")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "summary"}
          onClick={() => setMainTab("summary")}
          className={tabBtn(mainTab === "summary")}
        >
          {t("dashboard.storyFlowNavStory")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "finance"}
          onClick={() => setMainTab("finance")}
          className={tabBtn(mainTab === "finance")}
        >
          {t("dashboard.storyFlowNavFinance")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "personnel"}
          onClick={() => setMainTab("personnel")}
          className={tabBtn(mainTab === "personnel")}
        >
          {t("dashboard.storyFlowNavPersonnel")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "operations"}
          onClick={() => setMainTab("operations")}
          className={tabBtn(mainTab === "operations")}
        >
          {t("dashboard.storyFlowNavOps")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "reports"}
          onClick={() => setMainTab("reports")}
          className={tabBtn(mainTab === "reports")}
        >
          {t("dashboard.storyFlowNavReports")}
        </button>
      </div>

      {mainTab === "summary" ? (
        <div className="flex flex-col gap-6" role="tabpanel">
          <DashboardDayStoryCard
            t={t}
            locale={locale}
            state={state}
            overview={overview}
            onRegisterCashDetailClick={() => setMainTab("finance")}
            onCashRetry={refetch}
            sumBranchesFootnote={sumBranchesFootnote}
          />

          {state.kind === "empty" ? (
            <div
              role="note"
              className="rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm leading-relaxed text-amber-950"
            >
              <p className="font-semibold">{t("dashboard.emptyCalloutTitle")}</p>
              <p className="mt-1 text-amber-950/90">
                {t("dashboard.emptyCalloutBody")}
              </p>
              <Link
                href="/branches"
                className="mt-2 inline-block text-sm font-semibold text-violet-800 underline-offset-2 hover:underline"
              >
                {t("dashboard.emptyCalloutCta")}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {mainTab === "finance" ? (
        <div role="tabpanel">
      <StoryBlock
        title={t("dashboard.storyFinance")}
        description={t("dashboard.storyFinanceDesc")}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Card
              title={t("dashboard.income")}
              description={
                isSnapshotToday
                  ? t("dashboard.incomeTodayDesc")
                  : fillDashboardTemplate(t("dashboard.incomeForDateDesc"), {
                      date: snapshotDateLabel,
                    })
              }
            >
              <MetricValue
                state={state}
                dash={dash}
                locale={locale}
                pick={(s) => s.totalIncome}
                valueClassName="text-emerald-800"
                footnote={sumBranchesFootnote}
                loadingLabel={t("common.loading")}
                emptyHint={t("dashboard.noBranches")}
                onRetry={refetch}
                retryLabel={t("common.retry")}
              />
            </Card>
          </div>
          <div>
            <Card
              title={t("dashboard.expenseFromRegister")}
              description={t("dashboard.expenseFromRegisterDesc")}
            >
              <MetricValue
                state={state}
                dash={dash}
                locale={locale}
                pick={(s) => s.totalExpenseFromRegister}
                valueClassName="text-red-800"
                footnote={sumBranchesFootnote}
                loadingLabel={t("common.loading")}
                emptyHint={t("dashboard.noBranches")}
                onRetry={refetch}
                retryLabel={t("common.retry")}
              />
            </Card>
          </div>
          <div>
            <Card title={t("dashboard.netRegisterToday")} description={t("dashboard.netRegisterTodayDesc")}>
              <MetricValue
                state={state}
                dash={dash}
                locale={locale}
                pick={(s) => s.netCash}
                valueClassName="text-zinc-900"
                footnote={sumBranchesFootnote}
                loadingLabel={t("common.loading")}
                emptyHint={t("dashboard.noBranches")}
                onRetry={refetch}
                retryLabel={t("common.retry")}
              />
            </Card>
          </div>
        </div>

        {state.kind === "ok" && state.branchTodayRows.length > 1 ? (
          <BranchTodaySnapshot
            rows={state.branchTodayRows}
            locale={locale}
            t={t}
            isSnapshotToday={isSnapshotToday}
            snapshotDateLabel={snapshotDateLabel}
          />
        ) : null}
        {state.kind === "ok" &&
        state.branchTodayRows.length === 1 &&
        !state.branchTodayRows[0]?.financialHidden ? (
          <p className="rounded-lg border border-zinc-200/70 bg-zinc-50/60 px-3 py-2.5 text-xs leading-relaxed text-zinc-700">
            {fillDashboardTemplate(
              isSnapshotToday
                ? t("dashboard.singleBranchFinanceContext")
                : t("dashboard.singleBranchFinanceContextForDate"),
              {
                name: state.branchTodayRows[0]!.branchName,
                date: snapshotDateLabel,
              }
            )}
          </p>
        ) : null}

        {state.kind === "ok" ? (
          <p className="mt-3 rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2.5 text-xs leading-relaxed text-amber-950/90">
            <span className="font-medium text-amber-950">{t("dashboard.financeKpiNoteTitle")}</span>
            {" — "}
            {t("dashboard.financeKpiFootnote")}
            {Math.abs(state.totalExpenseAllOut - state.totalExpenseFromRegister) > 0.005 ? (
              <>
                {" "}
                <span className="mt-1 block font-medium text-zinc-800 sm:mt-0 sm:inline">
                  {isSnapshotToday
                    ? t("dashboard.financeKpiAllOutLabel")
                    : fillDashboardTemplate(t("dashboard.financeKpiAllOutForDate"), {
                        date: snapshotDateLabel,
                      })}
                  :{" "}
                  {formatLocaleAmount(state.totalExpenseAllOut, locale)}
                </span>
              </>
            ) : null}
          </p>
        ) : null}

        {overview.isError ? (
          <Card title={t("dashboard.statAdvanceByCurrency")}>
            <p className="text-sm text-red-600">
              {toErrorMessage(overview.error)}
            </p>
            <p className="mt-1 text-xs text-red-900/80">{t("common.loadErrorHint")}</p>
            <Button
              type="button"
              variant="secondary"
              className="mt-2"
              onClick={() => void overview.refetch()}
            >
              {t("common.retry")}
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Card
              title={t("dashboard.statAdvanceRecords")}
              description={t("dashboard.statAdvanceRecordsDesc")}
            >
              {overview.isPending ? (
                <StatSkeleton />
              ) : (
                <p className="text-2xl font-semibold text-zinc-900">
                  {overview.data?.financeExtras.advanceRecordCount ?? 0}
                </p>
              )}
            </Card>
            <Card
              title={t("dashboard.statAdvanceByCurrency")}
              description={t("dashboard.statAdvanceByCurrencyDesc")}
            >
              {overview.isPending ? (
                <StatSkeleton />
              ) : overview.data &&
                overview.data.financeExtras.advanceTotalsByCurrency.length >
                  0 ? (
                <ul className="flex flex-col gap-2">
                  {overview.data.financeExtras.advanceTotalsByCurrency.map(
                    (row) => (
                      <li
                        key={row.currencyCode}
                        className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-zinc-600">
                            {row.currencyCode}
                          </span>
                          <span className="text-base font-semibold tabular-nums text-zinc-900">
                            {formatLocaleAmount(
                              row.totalAmount,
                              locale,
                              row.currencyCode
                            )}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400">
                          {row.recordCount} {t("dashboard.advanceCountLabel")}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">{t("dashboard.noData")}</p>
              )}
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card
              title={t("dashboard.statRegisterCashWithPersonnel")}
              description={t("dashboard.statRegisterCashWithPersonnelDesc")}
            >
              {overview.isPending ? (
                <StatSkeleton />
              ) : overview.data &&
                overview.data.financeExtras.registerCashHeldByPersonnelTotalsByCurrency
                  .length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {overview.data.financeExtras.registerCashHeldByPersonnelTotalsByCurrency.map(
                    (row) => (
                      <li
                        key={row.currencyCode}
                        className="flex flex-col gap-0.5 border-b border-sky-100 pb-2 last:border-0 last:pb-0"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-zinc-600">
                            {row.currencyCode}
                          </span>
                          <span className="text-base font-semibold tabular-nums text-sky-900">
                            {formatLocaleAmount(
                              row.totalAmount,
                              locale,
                              row.currencyCode
                            )}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400">
                          {row.transactionCount}{" "}
                          {t("dashboard.registerCashTxCountLabel")}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm text-zinc-500">{t("dashboard.noData")}</p>
                  <p className="text-xs leading-relaxed text-zinc-500">
                    {t("dashboard.registerCashEmptyHint")}
                  </p>
                </div>
              )}
            </Card>
            <Card
              title={t("dashboard.statRegisterCashByPersonTitle")}
              description={t("dashboard.statRegisterCashByPersonDesc")}
            >
              {overview.isPending ? (
                <StatSkeleton />
              ) : overview.data &&
                overview.data.financeExtras.registerCashHeldByPersonnelBreakdown.length >
                  0 ? (
                <ul className="max-h-[min(28rem,55vh)] space-y-2 overflow-y-auto pr-1 [-webkit-overflow-scrolling:touch]">
                  {overview.data.financeExtras.registerCashHeldByPersonnelBreakdown.map(
                    (row, idx) => {
                      const regBr = row.registerBranchName?.trim();
                      return (
                        <li
                          key={`${row.personnelId}-${row.currencyCode}-${regBr ?? "x"}-${idx}`}
                          className="flex flex-col gap-0.5 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-semibold text-zinc-900">
                              {row.fullName}
                            </span>
                            <span className="text-sm font-semibold tabular-nums text-sky-900">
                              {formatLocaleAmount(
                                row.totalAmount,
                                locale,
                                row.currencyCode
                              )}{" "}
                              <span className="text-xs font-medium text-zinc-500">
                                {row.currencyCode}
                              </span>
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">
                            {personnelJobTitleLabel(t, row.jobTitle, dash)} ·{" "}
                            {row.personnelBranchName?.trim()
                              ? row.personnelBranchName.trim()
                              : t("personnel.branchNone")}
                          </p>
                          {regBr ? (
                            <p className="text-xs text-zinc-600">
                              <span className="font-medium text-zinc-700">
                                {t("dashboard.registerCashRegisterBranchLabel")}
                                :
                              </span>{" "}
                              {regBr}
                            </p>
                          ) : null}
                          <p className="text-xs text-zinc-400">
                            {row.transactionCount}{" "}
                            {t("dashboard.registerCashTxCountLabel")}
                          </p>
                        </li>
                      );
                    }
                  )}
                </ul>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm text-zinc-500">{t("dashboard.noData")}</p>
                  <p className="text-xs leading-relaxed text-zinc-500">
                    {t("dashboard.registerCashEmptyHint")}
                  </p>
                </div>
              )}
            </Card>
          </div>
          </div>
        )}
      </StoryBlock>
        </div>
      ) : null}

      {mainTab === "personnel" ? (
        <div role="tabpanel">
      <StoryBlock
        title={t("dashboard.storyPersonnel")}
        description={t("dashboard.storyPersonnelDesc")}
      >
        {overview.isError ? (
          <p className="text-sm text-red-600">{t("dashboard.overviewLoadError")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Card
              title={t("dashboard.statActivePersonnel")}
              description={t("dashboard.statActivePersonnelDesc")}
            >
              {overview.isPending ? (
                <StatSkeleton />
              ) : (
                <p className="text-2xl font-semibold text-zinc-900">
                  {overview.data?.personnel.activePersonnelCount ?? 0}
                </p>
              )}
            </Card>
            <Card
              title={t("dashboard.statLongestTenure")}
              description={t("dashboard.statLongestTenureDesc")}
            >
              {overview.isPending ? (
                <StatSkeleton />
              ) : overview.data?.personnel.longestTenure ? (
                <div className="flex flex-col gap-1">
                  <p className="text-lg font-semibold text-zinc-900">
                    {overview.data.personnel.longestTenure.fullName}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {formatTenure(
                      overview.data.personnel.longestTenure.tenureYears,
                      overview.data.personnel.longestTenure.tenureMonthsRemainder,
                      locale
                    )}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {t("dashboard.hireDateLabel")}:{" "}
                    {formatLocaleDate(
                      overview.data.personnel.longestTenure.hireDate,
                      locale
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">{t("dashboard.noData")}</p>
              )}
            </Card>
            <Card
              title={t("dashboard.statTopAdvance")}
              description={t("dashboard.statTopAdvanceDesc")}
            >
              {overview.isPending ? (
                <StatSkeleton />
              ) : overview.data?.personnel.topAdvanceRecipient ? (
                <div className="flex flex-col gap-1">
                  <p className="text-lg font-semibold text-zinc-900">
                    {overview.data.personnel.topAdvanceRecipient.fullName}
                  </p>
                  <p className="text-xl font-semibold tabular-nums text-violet-800">
                    {formatLocaleAmount(
                      overview.data.personnel.topAdvanceRecipient.totalAmount,
                      locale,
                      overview.data.personnel.topAdvanceRecipient.currencyCode
                    )}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {overview.data.personnel.topAdvanceRecipient.advanceCount}{" "}
                    {t("dashboard.advanceCountLabel")}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">{t("dashboard.noData")}</p>
              )}
            </Card>
          </div>
        )}
      </StoryBlock>
        </div>
      ) : null}

      {mainTab === "operations" ? (
        <div role="tabpanel">
      <StoryBlock
        title={t("dashboard.storyOperations")}
        description={t("dashboard.storyOperationsDesc")}
      >
        {overview.isError ? (
          <p className="text-sm text-red-600">{t("dashboard.overviewLoadError")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {!overview.isPending &&
            overview.data &&
            overview.data.operations.activeWarehouseCount > 1 ? (
              <Link
                href="/warehouses"
                className="block rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/30 px-4 py-3 shadow-sm ring-1 ring-violet-200/25 transition hover:border-violet-300/80 hover:shadow-md"
              >
                <p className="text-sm font-semibold text-violet-950">
                  {fillDashboardTemplate(t("dashboard.warehouseMultiCtaTitle"), {
                    count: String(overview.data.operations.activeWarehouseCount),
                  })}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-violet-900/80">
                  {t("dashboard.warehouseMultiCtaBody")}
                </p>
                <span className="mt-2 inline-block text-sm font-semibold text-violet-800 underline-offset-2 hover:underline">
                  {t("dashboard.warehouseMultiCtaLink")}
                </span>
              </Link>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
            <Card
              title={t("dashboard.statBranches")}
              description={t("dashboard.statBranchesDesc")}
            >
              {overview.isPending ? (
                <StatSkeleton />
              ) : (
                <p className="text-2xl font-semibold text-zinc-900">
                  {overview.data?.operations.activeBranchCount ?? 0}
                </p>
              )}
            </Card>
            <Card
              title={t("dashboard.statWarehouses")}
              description={t("dashboard.statWarehousesDesc")}
            >
              {overview.isPending ? (
                <StatSkeleton />
              ) : (
                <p className="text-2xl font-semibold text-zinc-900">
                  {overview.data?.operations.activeWarehouseCount ?? 0}
                </p>
              )}
            </Card>
            </div>
          </div>
        )}
      </StoryBlock>
        </div>
      ) : null}

      {mainTab === "reports" ? (
        <section className="flex flex-col gap-3" role="tabpanel">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            {t("dashboard.detailedReportsTitle")}
          </h2>
          <p className="text-sm text-zinc-500">
            {t("dashboard.detailedReportsDesc")}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <ReportLinkRow href="/reports">
            {t("dashboard.reportLinkReportsHub")}
          </ReportLinkRow>
          <ReportLinkRow href="/reports/branches">
            {t("dashboard.reportLinkBranchComparison")}
          </ReportLinkRow>
          <ReportLinkRow href="/branches">
            {t("dashboard.reportLinkBranch")}
          </ReportLinkRow>
          <ReportLinkRow href="/warehouses">
            {t("dashboard.reportLinkWarehouse")}
          </ReportLinkRow>
          <ReportLinkRow href="/products">
            {t("dashboard.reportLinkProducts")}
          </ReportLinkRow>
          <ReportLinkRow href="/personnel">
            {t("dashboard.reportLinkPersonnel")}
          </ReportLinkRow>
          <ReportLinkRow href="/personnel/costs">
            {t("dashboard.reportLinkPersonnelCosts")}
          </ReportLinkRow>
          {user?.role === "ADMIN" ? (
            <ReportLinkRow href="/admin/users">
              {t("dashboard.reportLinkUsers")}
            </ReportLinkRow>
          ) : null}
        </div>
      </section>
      ) : null}
    </div>
  );
}
