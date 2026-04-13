"use client";

import { BranchTodaySnapshot } from "@/modules/dashboard/components/BranchTodaySnapshot";
import { StoryBlock } from "@/modules/dashboard/components/DashboardStoryPrimitives";
import { MetricValue, StatSkeleton } from "@/modules/dashboard/components/DashboardMetricValue";
import { fillDashboardTemplate, personnelJobTitleLabel } from "@/modules/dashboard/components/dashboard-utils";
import type { DashboardBulkCashParams } from "@/modules/dashboard/types/dashboard-cash-filter";
import type { Locale } from "@/i18n/messages";
import type { SummaryAggregateState } from "@/modules/dashboard/hooks/useTodayBranchesSummary";
import { Card } from "@/shared/components/Card";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { Button } from "@/shared/ui/Button";
import type { UseQueryResult } from "@tanstack/react-query";
import type { DashboardOverview } from "@/types/dashboard-overview";

export function DashboardFinanceTab({
  t,
  locale,
  state,
  refetch,
  overview,
  bulkParams,
  isPlainTodayView,
  snapshotDateLabel,
  sumBranchesFootnote,
  branchTodayTitleBadge,
  branchTodayTableBlurb,
  dash,
}: {
  t: (key: string) => string;
  locale: Locale;
  state: SummaryAggregateState;
  refetch: () => void;
  overview: UseQueryResult<DashboardOverview>;
  bulkParams: DashboardBulkCashParams;
  isPlainTodayView: boolean;
  snapshotDateLabel: string;
  sumBranchesFootnote: string;
  branchTodayTitleBadge: string | null;
  branchTodayTableBlurb: string;
  dash: string;
}) {
  return (
            <div className="min-w-0" role="tabpanel">
          <StoryBlock
            title={t("dashboard.storyFinance")}
            description={t("dashboard.storyFinanceDesc")}
          >
            <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3 sm:px-5 sm:py-3.5">
              <p className="text-sm font-semibold text-emerald-950">
                {t("dashboard.financeScopeRegisterDayTitle")}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-emerald-900/85">
                {t("dashboard.financeScopeRegisterDayHint")}
              </p>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              <div>
                <Card
                  title={t("dashboard.income")}
                  description={
                    isPlainTodayView
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
                titleBadge={branchTodayTitleBadge}
                tableBlurb={branchTodayTableBlurb}
              />
            ) : null}
            {state.kind === "ok" &&
            state.branchTodayRows.length === 1 &&
            !state.branchTodayRows[0]?.financialHidden ? (
              <p className="rounded-xl border border-zinc-200/70 bg-zinc-50/60 px-4 py-3 text-xs leading-relaxed text-zinc-700 sm:px-5">
                {fillDashboardTemplate(
                  bulkParams.kind !== "day"
                    ? t("dashboard.singleBranchFinanceContextSeason")
                    : isPlainTodayView
                      ? t("dashboard.singleBranchFinanceContext")
                      : t("dashboard.singleBranchFinanceContextForDate"),
                  bulkParams.kind !== "day"
                    ? {
                        name: state.branchTodayRows[0]!.branchName,
                        scope: snapshotDateLabel,
                      }
                    : isPlainTodayView
                      ? { name: state.branchTodayRows[0]!.branchName }
                      : {
                          name: state.branchTodayRows[0]!.branchName,
                          date: snapshotDateLabel,
                        }
                )}
              </p>
            ) : null}
    
            {state.kind === "ok" ? (
              <p className="mt-1 rounded-xl border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-xs leading-relaxed text-amber-950/90 sm:px-5">
                <span className="font-medium text-amber-950">{t("dashboard.financeKpiNoteTitle")}</span>
                {" — "}
                {t("dashboard.financeKpiFootnote")}
                {Math.abs(state.totalExpenseAllOut - state.totalExpenseFromRegister) > 0.005 ? (
                  <>
                    {" "}
                    <span className="mt-1 block font-medium text-zinc-800 sm:mt-0 sm:inline">
                      {isPlainTodayView
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
            </div>
    
            <div className="flex flex-col gap-5 border-t border-zinc-200/80 pt-6 sm:pt-7">
            <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/70 px-4 py-3 sm:px-5 sm:py-3.5">
              <p className="text-sm font-semibold text-zinc-900">
                {t("dashboard.financeScopeIndependentTitle")}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-600">
                {t("dashboard.financeScopeIndependentHint")}
              </p>
            </div>
    
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
              <div className="flex flex-col gap-4">
              <div className="grid gap-4 md:grid-cols-2">
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
    
              <div className="grid gap-4 lg:grid-cols-2">
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
                              className="flex flex-col gap-0.5 rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-2.5"
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
            </div>
          </StoryBlock>
            </div>
  );
}
