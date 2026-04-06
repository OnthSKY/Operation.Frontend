"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { useAuth } from "@/lib/auth/AuthContext";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { useDashboardOverview } from "@/modules/dashboard/hooks/useDashboardOverview";
import {
  useTodayBranchesSummary,
  type SummaryAggregateState,
} from "@/modules/dashboard/hooks/useTodayBranchesSummary";
import { Card } from "@/shared/components/Card";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { useHashScroll } from "@/shared/lib/use-hash-scroll";
import { Button } from "@/shared/ui/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
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
  "MANAGER",
  "DRIVER",
  "CRAFTSMAN",
  "WAITER",
  "CASHIER",
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
    <section id={sectionId} className="flex scroll-mt-24 flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function DashboardDayStoryCard({
  t,
  locale,
  state,
  overview,
}: {
  t: (key: string) => string;
  locale: Locale;
  state: SummaryAggregateState;
  overview: UseQueryResult<DashboardOverview>;
}): ReactNode {
  const loading =
    overview.isPending || state.kind === "loading";
  if (loading) {
    return (
      <div
        className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/40 p-5 shadow-sm ring-1 ring-violet-200/25"
        aria-busy
        aria-label={t("dashboard.storyLoading")}
      >
        <div className="h-5 w-44 animate-pulse rounded-md bg-zinc-200/90" />
        <div className="mt-4 h-14 w-full animate-pulse rounded-lg bg-zinc-100" />
      </div>
    );
  }

  if (overview.isError) {
    return (
      <div className="rounded-2xl border border-red-200/80 bg-red-50/40 p-5 shadow-sm ring-1 ring-red-200/30">
        <h2 className="text-lg font-semibold text-zinc-900">
          {t("dashboard.storyCardTitle")}
        </h2>
        <p className="mt-1 text-sm text-red-700">
          {toErrorMessage(overview.error)}
        </p>
        {state.kind === "ok" ? (
          <p className="mt-3 text-sm leading-relaxed text-zinc-700">
            <span className="font-medium text-zinc-900">
              {t("dashboard.netCash")}:{" "}
            </span>
            {formatLocaleAmount(state.netCash, locale)}
          </p>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={() => void overview.refetch()}
        >
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const personnelCount = String(
    overview.data?.personnel.activePersonnelCount ?? 0
  );
  const branchTotal = String(
    overview.data?.operations.activeBranchCount ?? 0
  );
  const warehouseCount = String(
    overview.data?.operations.activeWarehouseCount ?? 0
  );

  let narrative: string;
  if (state.kind === "error") {
    narrative = t("dashboard.storyNarrativeCashError");
  } else if (state.kind === "empty") {
    narrative = fillDashboardTemplate(t("dashboard.storyNarrativeNoBranches"), {
      personnelCount,
      branchTotal,
      warehouseCount,
    });
  } else {
    narrative = fillDashboardTemplate(t("dashboard.storyNarrativeOk"), {
      branchCount: String(state.branchCount),
      net: formatLocaleAmount(state.netCash, locale),
      personnelCount,
      branchTotal,
      warehouseCount,
    });
  }

  const heldBreakdown =
    overview.data?.financeExtras.registerCashHeldByPersonnelBreakdown ?? [];
  const heldPreview = heldBreakdown.slice(0, 5);
  const heldMore = Math.max(0, heldBreakdown.length - heldPreview.length);

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/40 p-5 shadow-sm ring-1 ring-violet-200/25">
      <h2 className="text-lg font-semibold text-zinc-900">
        {t("dashboard.storyCardTitle")}
      </h2>
      <p className="text-sm text-zinc-500">{t("dashboard.storyCardDesc")}</p>
      <p className="mt-4 text-sm leading-relaxed text-zinc-800">
        {narrative}
      </p>
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
          <a
            href="#dashboard-register-cash-detail"
            className="mt-2 inline-block text-sm font-semibold text-violet-700 underline-offset-2 hover:underline"
          >
            {t("dashboard.registerCashSeeDetail")}
          </a>
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
  const router = useRouter();
  const { user } = useAuth();
  useHashScroll();
  useEffect(() => {
    if (isPersonnelPortalRole(user?.role)) router.replace("/branch");
  }, [user?.role, router]);
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

      <DashboardDayStoryCard
        t={t}
        locale={locale}
        state={state}
        overview={overview}
      />

      <StoryBlock
        id="dashboard-section-finance"
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

          <div
            id="dashboard-register-cash-detail"
            className="grid gap-3 scroll-mt-24 lg:grid-cols-2"
          >
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
                <p className="text-sm text-zinc-500">{t("dashboard.noData")}</p>
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
                <p className="text-sm text-zinc-500">{t("dashboard.noData")}</p>
              )}
            </Card>
          </div>
          </div>
        )}
      </StoryBlock>

      <StoryBlock
        id="dashboard-section-personnel"
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

      <StoryBlock
        id="dashboard-section-operations"
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

      <section
        id="dashboard-detailed-reports"
        className="flex scroll-mt-24 flex-col gap-3"
      >
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
          <ReportLinkRow href="/branch">
            {t("dashboard.reportLinkBranch")}
          </ReportLinkRow>
          <ReportLinkRow href="/warehouse">
            {t("dashboard.reportLinkWarehouse")}
          </ReportLinkRow>
          <ReportLinkRow href="/products">
            {t("dashboard.reportLinkProducts")}
          </ReportLinkRow>
          <ReportLinkRow href="/personnel">
            {t("dashboard.reportLinkPersonnel")}
          </ReportLinkRow>
          <ReportLinkRow href="/personnel/advances">
            {t("dashboard.reportLinkAdvances")}
          </ReportLinkRow>
          {user?.role === "ADMIN" ? (
            <ReportLinkRow href="/admin/users">
              {t("dashboard.reportLinkUsers")}
            </ReportLinkRow>
          ) : null}
        </div>
      </section>
    </div>
  );
}
