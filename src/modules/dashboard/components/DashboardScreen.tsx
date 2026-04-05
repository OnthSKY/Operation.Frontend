"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { useDashboardOverview } from "@/modules/dashboard/hooks/useDashboardOverview";
import {
  useTodayBranchesSummary,
  type SummaryAggregateState,
} from "@/modules/dashboard/hooks/useTodayBranchesSummary";
import { Card } from "@/shared/components/Card";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { useHashScroll } from "@/shared/lib/use-hash-scroll";
import { Button } from "@/shared/ui/Button";
import type { ReactNode } from "react";

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

function formatHireDate(iso: string, locale: Locale): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StoryBlock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      {children}
    </section>
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
  if (state.kind === "loading") {
    return <p className="text-sm text-zinc-500">{loadingLabel}</p>;
  }
  if (state.kind === "error") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-red-600">{toErrorMessage(state.message)}</p>
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
  useHashScroll();
  const { state, refetch } = useTodayBranchesSummary();
  const overview = useDashboardOverview();
  const dash = "—";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4 lg:max-w-6xl 2xl:max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm text-zinc-500">{t("dashboard.subtitle")}</p>
      </div>

      <StoryBlock
        title={t("dashboard.storyFinance")}
        description={t("dashboard.storyFinanceDesc")}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div id="dashboard-gelir" className="scroll-mt-24">
            <Card title={t("dashboard.income")} description={t("dashboard.todayTotal")}>
              <MetricValue
                state={state}
                dash={dash}
                locale={locale}
                pick={(s) => s.totalIncome}
                valueClassName="text-emerald-800"
                footnote={t("dashboard.sumAllBranches")}
                loadingLabel={t("common.loading")}
                emptyHint={t("dashboard.noBranches")}
                onRetry={refetch}
                retryLabel={t("common.retry")}
              />
            </Card>
          </div>
          <div id="dashboard-gider" className="scroll-mt-24">
            <Card title={t("dashboard.expense")} description={t("dashboard.todayTotal")}>
              <MetricValue
                state={state}
                dash={dash}
                locale={locale}
                pick={(s) => s.totalExpense}
                valueClassName="text-red-800"
                footnote={t("dashboard.sumAllBranches")}
                loadingLabel={t("common.loading")}
                emptyHint={t("dashboard.noBranches")}
                onRetry={refetch}
                retryLabel={t("common.retry")}
              />
            </Card>
          </div>
          <div id="dashboard-net" className="scroll-mt-24">
            <Card title={t("dashboard.netCash")} description={t("dashboard.incomeExpense")}>
              <MetricValue
                state={state}
                dash={dash}
                locale={locale}
                pick={(s) => s.netCash}
                valueClassName="text-zinc-900"
                footnote={t("dashboard.sumAllBranches")}
                loadingLabel={t("common.loading")}
                emptyHint={t("dashboard.noBranches")}
                onRetry={refetch}
                retryLabel={t("common.retry")}
              />
            </Card>
          </div>
        </div>

        {overview.isError ? (
          <Card title={t("dashboard.statAdvanceByCurrency")}>
            <p className="text-sm text-red-600">
              {toErrorMessage(overview.error)}
            </p>
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
        )}
      </StoryBlock>

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
                    {formatHireDate(
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

      <StoryBlock
        title={t("dashboard.storyOperations")}
        description={t("dashboard.storyOperationsDesc")}
      >
        {overview.isError ? (
          <p className="text-sm text-red-600">{t("dashboard.overviewLoadError")}</p>
        ) : (
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
        )}
      </StoryBlock>
    </div>
  );
}
