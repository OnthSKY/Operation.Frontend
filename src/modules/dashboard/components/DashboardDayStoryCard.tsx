"use client";

import { MetricValue, StatSkeleton } from "@/modules/dashboard/components/DashboardMetricValue";
import { DashboardStorySlide } from "@/modules/dashboard/components/DashboardStoryPrimitives";
import type { SummaryAggregateState } from "@/modules/dashboard/hooks/useTodayBranchesSummary";
import type { Locale } from "@/i18n/messages";
import { Card } from "@/shared/components/Card";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { Button } from "@/shared/ui/Button";
import type { ReactNode } from "react";

export function DashboardDayStoryCard({
  t,
  locale,
  state,
  onCashRetry,
  sumBranchesFootnote,
}: {
  t: (key: string) => string;
  locale: Locale;
  state: SummaryAggregateState;
  onCashRetry: () => void;
  sumBranchesFootnote: string;
}): ReactNode {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/40 p-4 shadow-sm ring-1 ring-violet-200/25 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">
            {t("dashboard.summaryPanelTitle")}
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-zinc-600">
            {t("dashboard.summaryPanelHint")}
          </p>
        </div>
        {state.kind === "error" ? (
          <p className="shrink-0 text-xs font-medium text-amber-900/90 sm:max-w-xs sm:text-right">
            {t("dashboard.storyNarrativeCashError")}
          </p>
        ) : null}
      </div>

      <div
        className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] md:grid md:grid-cols-2 md:overflow-visible md:pb-0 md:snap-none"
        aria-busy={state.kind === "loading" ? true : undefined}
      >
        <DashboardStorySlide>
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
        </DashboardStorySlide>

        <DashboardStorySlide>
          <Card
            title={t("dashboard.storySummaryBranchesInDayTitle")}
            description={t("dashboard.storySummaryBranchesInDayDesc")}
            className="bg-white/90"
          >
            {state.kind === "loading" ? (
              <StatSkeleton />
            ) : state.kind === "error" ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-red-600">{toErrorMessage(state.message)}</p>
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
        </DashboardStorySlide>
      </div>

      <p className="mt-3 text-xs text-zinc-500 md:hidden">{t("dashboard.storyMobileSwipeHint")}</p>
    </div>
  );
}
