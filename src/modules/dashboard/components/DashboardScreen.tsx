"use client";

import { useI18n } from "@/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import { canSeeUiModule, PERM } from "@/lib/auth/permissions";
import { isPersonnelPortalRole, postLoginHomePath } from "@/lib/auth/roles";
import { DashboardCumulativeStorySection } from "@/modules/dashboard/components/DashboardCumulativeStorySection";
import { DashboardFinanceTab } from "@/modules/dashboard/components/DashboardFinanceTab";
import { DashboardOperationsRegistryTab } from "@/modules/dashboard/components/DashboardOperationsRegistryTab";
import { DashboardOperationsTab } from "@/modules/dashboard/components/DashboardOperationsTab";
import { DashboardPersonnelTab } from "@/modules/dashboard/components/DashboardPersonnelTab";
import { DashboardRegisterDayFilterBar } from "@/modules/dashboard/components/DashboardRegisterDayFilterBar";
import { DashboardReportsTab } from "@/modules/dashboard/components/DashboardReportsTab";
import { DashboardSummaryTab } from "@/modules/dashboard/components/DashboardSummaryTab";
import { fillDashboardTemplate } from "@/modules/dashboard/components/dashboard-utils";
import type { DashboardMainTab } from "@/modules/dashboard/components/dashboard-main-tab";
import { useDashboardOverview } from "@/modules/dashboard/hooks/useDashboardOverview";
import { useTodayBranchesSummary } from "@/modules/dashboard/hooks/useTodayBranchesSummary";
import {
  dashboardOverviewKeys,
  dashboardSummaryKeys,
} from "@/modules/dashboard/query-keys";
import type {
  DashboardBulkCashParams,
  DashboardCashFilterMode,
} from "@/modules/dashboard/types/dashboard-cash-filter";
import { reportYearQuickSelectTopYear } from "@/modules/reports/lib/report-period-helpers";
import { PageHeader } from "@/shared/components/PageHeader";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { Button } from "@/shared/ui/Button";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export function DashboardScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<DashboardMainTab>("summary");
  const prevMainTab = useRef<DashboardMainTab | null>(null);
  const [cashFilterMode, setCashFilterMode] =
    useState<DashboardCashFilterMode>("day");
  const [branchSummaryDate, setBranchSummaryDate] = useState(() =>
    localIsoDate()
  );
  const [cashSeasonYear, setCashSeasonYear] = useState(() =>
    reportYearQuickSelectTopYear()
  );
  const [cashSeasonYearFrom, setCashSeasonYearFrom] = useState(() =>
    reportYearQuickSelectTopYear()
  );
  const [cashSeasonYearTo, setCashSeasonYearTo] = useState(() =>
    reportYearQuickSelectTopYear()
  );
  useEffect(() => {
    if (!user) return;
    if (isPersonnelPortalRole(user.role)) {
      router.replace("/branches");
      return;
    }
    if (!canSeeUiModule(user, PERM.uiDashboard)) router.replace(postLoginHomePath(user));
  }, [user, router]);

  useEffect(() => {
    if (prevMainTab.current === null) {
      prevMainTab.current = mainTab;
      return;
    }
    if (prevMainTab.current === mainTab) return;
    prevMainTab.current = mainTab;
    void qc.invalidateQueries({ queryKey: dashboardOverviewKeys.all });
    void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
  }, [mainTab, qc]);

  const bulkParams = useMemo((): DashboardBulkCashParams => {
    if (cashFilterMode === "all_data") return { kind: "all_data" };
    if (cashFilterMode === "day") return { kind: "day", date: branchSummaryDate };
    if (cashFilterMode === "season_single") {
      return { kind: "season_single", seasonYear: cashSeasonYear };
    }
    const lo = Math.min(cashSeasonYearFrom, cashSeasonYearTo);
    const hi = Math.max(cashSeasonYearFrom, cashSeasonYearTo);
    return { kind: "season_range", fromYear: lo, toYear: hi };
  }, [
    cashFilterMode,
    branchSummaryDate,
    cashSeasonYear,
    cashSeasonYearFrom,
    cashSeasonYearTo,
  ]);

  const { state, refetch } = useTodayBranchesSummary(bulkParams);
  const overview = useDashboardOverview();
  const dash = "—";
  const todayIso = localIsoDate();
  const isCalendarToday = branchSummaryDate === todayIso;
  const isPlainTodayView = bulkParams.kind === "day" && isCalendarToday;

  const snapshotDateLabel = useMemo(() => {
    if (bulkParams.kind === "all_data") {
      return t("dashboard.cashScopeAllDataShort");
    }
    if (bulkParams.kind === "day") {
      return formatLocaleDate(bulkParams.date, locale);
    }
    if (bulkParams.kind === "season_single") {
      return fillDashboardTemplate(t("dashboard.cashScopeSeasonSingleShort"), {
        year: String(bulkParams.seasonYear),
      });
    }
    return fillDashboardTemplate(t("dashboard.cashScopeSeasonRangeShort"), {
      fromYear: String(bulkParams.fromYear),
      toYear: String(bulkParams.toYear),
    });
  }, [bulkParams, locale, t]);

  const sumBranchesFootnote = useMemo(() => {
    if (bulkParams.kind === "all_data") {
      return t("dashboard.sumAllBranchesAllData");
    }
    if (bulkParams.kind === "day") {
      return bulkParams.date === todayIso
        ? t("dashboard.sumAllBranchesToday")
        : fillDashboardTemplate(t("dashboard.sumAllBranchesForDate"), {
            date: formatLocaleDate(bulkParams.date, locale),
          });
    }
    if (bulkParams.kind === "season_single") {
      return fillDashboardTemplate(t("dashboard.sumAllBranchesSeasonSingle"), {
        year: String(bulkParams.seasonYear),
      });
    }
    return fillDashboardTemplate(t("dashboard.sumAllBranchesSeasonRange"), {
      fromYear: String(bulkParams.fromYear),
      toYear: String(bulkParams.toYear),
    });
  }, [bulkParams, todayIso, locale, t]);

  const branchTodayTitleBadge = isPlainTodayView ? null : snapshotDateLabel;

  const branchTodayTableBlurb = useMemo(() => {
    if (bulkParams.kind === "all_data") {
      return t("dashboard.branchTodayDescAllData");
    }
    if (bulkParams.kind === "day") {
      return isCalendarToday
        ? t("dashboard.branchTodayDesc")
        : fillDashboardTemplate(t("dashboard.branchTodayDescForDate"), {
            date: snapshotDateLabel,
          });
    }
    if (bulkParams.kind === "season_single") {
      return fillDashboardTemplate(t("dashboard.branchTodayDescSeasonSingle"), {
        year: String(bulkParams.seasonYear),
      });
    }
    return fillDashboardTemplate(t("dashboard.branchTodayDescSeasonRange"), {
      fromYear: String(bulkParams.fromYear),
      toYear: String(bulkParams.toYear),
    });
  }, [bulkParams, isCalendarToday, snapshotDateLabel, t]);

  const tabBtn = (active: boolean) =>
    `min-h-11 w-full min-w-[8.5rem] shrink-0 touch-manipulation rounded-md px-4 py-2 text-center text-xs font-semibold whitespace-nowrap transition-all duration-200 ease-in-out sm:min-h-10 sm:min-w-0 sm:text-sm lg:flex-1 ${
      active
        ? "bg-white text-zinc-900 shadow-sm"
        : "text-zinc-600 active:bg-zinc-200/80 sm:hover:text-zinc-900"
    }`;

  return (
    <>
      <PageScreenScaffold
        variant="dashboard"
        className="w-full pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-4 sm:pb-8 sm:pt-5"
        intro={
          <PageHeader
            title={t("dashboard.title")}
            description={t("dashboard.subtitle")}
            actions={
              <>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 flex-1 sm:flex-none"
                onClick={() => {
                  const el = document.getElementById("dashboard-filters");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {t("common.filters")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 flex-1 sm:flex-none"
                onClick={() => {
                  void refetch();
                  void overview.refetch();
                }}
              >
                {t("common.retry")}
              </Button>
              </>
            }
          />
        }
        main={
          <div className="min-w-0 w-full space-y-4 sm:space-y-6">
            <div className="sticky top-2 z-10">
              <div
                className="flex w-full min-w-0 gap-1 overflow-x-auto rounded-lg bg-zinc-100 p-1 pr-16 shadow-sm backdrop-blur-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3 sm:overflow-visible sm:pr-1 lg:flex lg:flex-nowrap"
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
                  onClick={() => {
                    setMainTab("finance");
                    if (cashFilterMode === "all_data") setCashFilterMode("day");
                  }}
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
                  aria-selected={mainTab === "operations_registry"}
                  onClick={() => setMainTab("operations_registry")}
                  className={tabBtn(mainTab === "operations_registry")}
                >
                  {t("dashboard.storyFlowNavRegistry")}
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
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center rounded-r-xl bg-gradient-to-l from-zinc-50/95 via-zinc-50/85 to-transparent pl-8 pr-2 sm:hidden">
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200/80 bg-white/85 text-zinc-500 shadow-sm animate-pulse"
                  aria-hidden
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </span>
              </div>
            </div>

            <div id="dashboard-filters">
              {mainTab === "summary" || mainTab === "finance" ? (
                <DashboardRegisterDayFilterBar
                  filterMode={cashFilterMode}
                  setFilterMode={setCashFilterMode}
                  branchSummaryDate={branchSummaryDate}
                  setBranchSummaryDate={setBranchSummaryDate}
                  seasonYear={cashSeasonYear}
                  setSeasonYear={setCashSeasonYear}
                  seasonYearFrom={cashSeasonYearFrom}
                  setSeasonYearFrom={setCashSeasonYearFrom}
                  seasonYearTo={cashSeasonYearTo}
                  setSeasonYearTo={setCashSeasonYearTo}
                  isCalendarToday={isCalendarToday}
                  t={t}
                />
              ) : null}
            </div>

            {mainTab === "summary" ? (
              <div className="flex min-w-0 flex-col gap-5 transition-opacity duration-200 ease-in-out">
                {cashFilterMode !== "all_data" ? (
                  <DashboardSummaryTab
                    t={t}
                    locale={locale}
                    state={state}
                    onCashRetry={refetch}
                    sumBranchesFootnote={sumBranchesFootnote}
                    isPlainTodayView={isPlainTodayView}
                    snapshotDateLabel={snapshotDateLabel}
                  />
                ) : null}
                {cashFilterMode === "all_data" ? (
                  <div className="min-w-0 rounded-2xl border border-zinc-200/85 bg-white p-4 shadow-sm ring-1 ring-zinc-950/[0.04] sm:p-5">
                    <DashboardCumulativeStorySection
                      t={t}
                      locale={locale}
                      overview={overview}
                      onRegisterCashDetailClick={() => {
                        setCashFilterMode("day");
                        setMainTab("finance");
                      }}
                      sectionClassName="space-y-4"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {mainTab === "finance" ? (
              <div className="transition-opacity duration-200 ease-in-out">
                <DashboardFinanceTab
                  t={t}
                  locale={locale}
                  state={state}
                  refetch={refetch}
                  overview={overview}
                  bulkParams={bulkParams}
                  isPlainTodayView={isPlainTodayView}
                  snapshotDateLabel={snapshotDateLabel}
                  sumBranchesFootnote={sumBranchesFootnote}
                  branchTodayTitleBadge={branchTodayTitleBadge}
                  branchTodayTableBlurb={branchTodayTableBlurb}
                  dash={dash}
                />
              </div>
            ) : null}

            {mainTab === "personnel" ? (
              <div className="transition-opacity duration-200 ease-in-out">
                <DashboardPersonnelTab t={t} locale={locale} overview={overview} />
              </div>
            ) : null}

            {mainTab === "operations" ? (
              <div className="transition-opacity duration-200 ease-in-out">
                <DashboardOperationsTab t={t} locale={locale} overview={overview} />
              </div>
            ) : null}

            {mainTab === "operations_registry" ? (
              <div className="transition-opacity duration-200 ease-in-out">
                <DashboardOperationsRegistryTab t={t} overview={overview} />
              </div>
            ) : null}

            {mainTab === "reports" ? (
              <div className="transition-opacity duration-200 ease-in-out">
                <DashboardReportsTab t={t} userRole={user?.role} />
              </div>
            ) : null}
          </div>
        }
      />
    </>
  );
}
