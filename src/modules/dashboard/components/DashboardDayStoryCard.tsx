"use client";

import { fillDashboardTemplate } from "@/modules/dashboard/components/dashboard-utils";
import { MetricValue } from "@/modules/dashboard/components/DashboardMetricValue";
import { DashboardStorySlide } from "@/modules/dashboard/components/DashboardStoryPrimitives";
import type { SummaryAggregateState } from "@/modules/dashboard/hooks/useTodayBranchesSummary";
import type { Locale } from "@/i18n/messages";
import { Card } from "@/shared/components/Card";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { Button } from "@/shared/ui/Button";
import type { ReactNode } from "react";

const storyBadge = (text: string) => (
  <span className="mb-2 inline-flex w-fit rounded-full bg-zinc-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-zinc-600 ring-1 ring-zinc-200/80">
    {text}
  </span>
);

function StoryMetricCard({
  badge,
  title,
  description,
  children,
  className,
}: {
  badge: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DashboardStorySlide>
      <Card className={`h-full min-h-[11rem] bg-white/95 ${className ?? ""}`}>
        {storyBadge(badge)}
        <h3 className="text-base font-semibold leading-snug text-zinc-900">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600">{description}</p>
        <div className="mt-3 min-h-[3.25rem]">{children}</div>
      </Card>
    </DashboardStorySlide>
  );
}

const EXCLUDED_OUT_EPS = 0.005;

function SummaryExcludedRegisterOutflows({
  state,
  locale,
  t,
}: {
  state: Extract<SummaryAggregateState, { kind: "ok" }>;
  locale: Locale;
  t: (key: string) => string;
}) {
  const defs = [
    {
      amount: state.totalRegisterOwesPatronToday,
      labelKey: "dashboard.summaryExcludedPatronPaidLabel",
      hintKey: "dashboard.summaryExcludedPatronPaidHint",
    },
    {
      amount: state.totalPersonnelPocketRepaidFromPatronToday,
      labelKey: "dashboard.summaryExcludedPocketByPatronLabel",
      hintKey: "dashboard.summaryExcludedPocketByPatronHint",
    },
    {
      amount: state.totalRegisterOwesPersonnelToday,
      labelKey: "dashboard.summaryExcludedPersonnelPocketLabel",
      hintKey: "dashboard.summaryExcludedPersonnelPocketHint",
    },
  ] as const;
  const visible = defs.filter((d) => d.amount > EXCLUDED_OUT_EPS);
  if (visible.length === 0) return null;
  const total = visible.reduce((s, d) => s + d.amount, 0);
  return (
    <div className="mt-3 border-t border-red-200/50 pt-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-red-900/70">
        {t("dashboard.summaryExcludedOutflowsCaption")}
      </p>
      <dl className="mt-2 space-y-2.5">
        {visible.map((d) => (
          <div key={d.labelKey}>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="min-w-0 text-sm font-medium text-zinc-800">{t(d.labelKey)}</dt>
              <dd className="shrink-0 tabular-nums text-sm font-semibold text-red-900">
                {formatLocaleAmount(d.amount, locale)}
              </dd>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{t(d.hintKey)}</p>
          </div>
        ))}
      </dl>
      {visible.length > 1 ? (
        <div className="mt-2 flex items-baseline justify-between border-t border-zinc-200/60 pt-2">
          <span className="text-xs font-semibold text-zinc-700">
            {t("dashboard.summaryExcludedOutflowsTotalLabel")}
          </span>
          <span className="tabular-nums text-sm font-bold text-red-950">
            {formatLocaleAmount(total, locale)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function DashboardDayStoryCard({
  t,
  locale,
  state,
  onCashRetry,
  sumBranchesFootnote,
  isPlainTodayView,
  snapshotDateLabel,
}: {
  t: (key: string) => string;
  locale: Locale;
  state: SummaryAggregateState;
  onCashRetry: () => void;
  sumBranchesFootnote: string;
  isPlainTodayView: boolean;
  snapshotDateLabel: string;
}): ReactNode {
  const incomeDesc = isPlainTodayView
    ? t("dashboard.summaryStoryInDescToday")
    : fillDashboardTemplate(t("dashboard.summaryStoryInDescScoped"), {
        scope: snapshotDateLabel,
      });

  const gridClass =
    "mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] md:grid md:grid-cols-2 md:overflow-visible md:pb-0 md:snap-none xl:grid-cols-4";

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
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            {t("dashboard.summaryStoryMoreIdeasHint")}
          </p>
        </div>
        {state.kind === "error" ? (
          <p className="shrink-0 text-xs font-medium text-amber-900/90 sm:max-w-xs sm:text-right">
            {t("dashboard.storyNarrativeCashError")}
          </p>
        ) : null}
      </div>

      {state.kind === "loading" ? (
        <div className={gridClass} aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <DashboardStorySlide key={i}>
              <div className="flex h-full min-h-[11rem] flex-col rounded-xl border border-zinc-200/80 bg-white/70 p-4 shadow-sm">
                <div className="h-5 w-14 animate-pulse rounded-full bg-zinc-200/90" />
                <div className="mt-3 h-5 w-[72%] animate-pulse rounded bg-zinc-200/70" />
                <div className="mt-2 h-4 w-full animate-pulse rounded bg-zinc-100" />
                <div className="mt-4 h-9 w-28 animate-pulse rounded-md bg-zinc-100" />
              </div>
            </DashboardStorySlide>
          ))}
        </div>
      ) : state.kind === "error" ? (
        <div className="mt-4">
          <Card className="border-red-200/60 bg-red-50/40">
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
          </Card>
        </div>
      ) : (
        <div className={gridClass}>
          <StoryMetricCard
            badge={t("dashboard.summaryStoryBadgeIn")}
            title={t("dashboard.summaryStoryInTitle")}
            description={incomeDesc}
            className="border-emerald-200/50 ring-1 ring-emerald-100/40"
          >
            <MetricValue
              state={state}
              dash="—"
              locale={locale}
              pick={(s) => s.totalIncome}
              valueClassName="tabular-nums text-emerald-900 sm:text-3xl"
              footnote={sumBranchesFootnote}
              loadingLabel={t("common.loading")}
              emptyHint={t("dashboard.noBranches")}
              onRetry={onCashRetry}
              retryLabel={t("common.retry")}
            />
            {state.kind === "ok" ? (
              <dl className="mt-3 space-y-1.5 border-t border-zinc-200/80 pt-3 text-sm">
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
            ) : null}
            {state.kind === "ok" ? (
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {t("dashboard.summaryIncomeSplitFootnote")}
              </p>
            ) : null}
          </StoryMetricCard>

          <StoryMetricCard
            badge={t("dashboard.summaryStoryBadgeOut")}
            title={t("dashboard.expenseFromRegister")}
            description={t("dashboard.expenseFromRegisterDesc")}
            className="border-red-200/40 ring-1 ring-red-100/30"
          >
            <MetricValue
              state={state}
              dash="—"
              locale={locale}
              pick={(s) => s.totalExpenseFromRegister}
              valueClassName="tabular-nums text-red-800 sm:text-3xl"
              footnote={sumBranchesFootnote}
              loadingLabel={t("common.loading")}
              emptyHint={t("dashboard.noBranches")}
              onRetry={onCashRetry}
              retryLabel={t("common.retry")}
            />
            {state.kind === "ok" ? (
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                {t("dashboard.summaryStoryOutFootnote")}
              </p>
            ) : null}
            {state.kind === "ok" ? (
              <SummaryExcludedRegisterOutflows state={state} locale={locale} t={t} />
            ) : null}
          </StoryMetricCard>

          <StoryMetricCard
            badge={t("dashboard.summaryStoryBadgeNet")}
            title={t("dashboard.netRegisterToday")}
            description={t("dashboard.netRegisterTodayDesc")}
            className="border-violet-200/50 shadow-md shadow-violet-950/[0.04] ring-1 ring-violet-100/50"
          >
            <MetricValue
              state={state}
              dash="—"
              locale={locale}
              pick={(s) => s.netCash}
              valueClassName="tabular-nums text-violet-950 sm:text-3xl"
              footnote={sumBranchesFootnote}
              loadingLabel={t("common.loading")}
              emptyHint={t("dashboard.noBranches")}
              onRetry={onCashRetry}
              retryLabel={t("common.retry")}
            />
            {state.kind === "ok" ? (
              <p className="mt-2 text-xs text-violet-900/70">
                {t("dashboard.summaryStoryFinanceTabHint")}
              </p>
            ) : null}
          </StoryMetricCard>

          <StoryMetricCard
            badge={t("dashboard.summaryStoryBadgeScope")}
            title={t("dashboard.storySummaryBranchesInDayTitle")}
            description={t("dashboard.storySummaryBranchesInDayDesc")}
            className="border-zinc-200/70"
          >
            {state.kind === "empty" ? (
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
          </StoryMetricCard>
        </div>
      )}

      <p className="mt-3 text-xs text-zinc-500 md:hidden">{t("dashboard.storyMobileSwipeHint")}</p>
    </div>
  );
}
