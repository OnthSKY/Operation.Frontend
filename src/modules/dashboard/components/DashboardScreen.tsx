"use client";

import { useI18n } from "@/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
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
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
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
    if (isPersonnelPortalRole(user?.role)) router.replace("/branches");
  }, [user?.role, router]);

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
    `min-h-11 w-full min-w-0 touch-manipulation rounded-lg px-1.5 py-2 text-center text-xs font-semibold transition sm:min-h-10 sm:px-2 sm:text-sm lg:flex-1 ${
      active
        ? "bg-white text-zinc-900 shadow-sm"
        : "text-zinc-600 active:bg-zinc-200/80 sm:hover:text-zinc-900"
    }`;

  return (
    <>
      <PageScreenScaffold
        className="w-full app-page-max px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:pb-6 sm:pt-5"
        intro={
          <>
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
              {t("dashboard.title")}
            </h1>
            <p className="text-sm text-zinc-500">{t("dashboard.subtitle")}</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              {t("dashboard.storyFlowHint")}
            </p>
            <PageWhenToUseGuide
              guideTab="dashboard"
              className="mt-1"
              title={t("common.pageWhenToUseTitle")}
              description={t("pageHelp.dashboard.intro")}
              listVariant="ordered"
              items={[
                { text: t("pageHelp.dashboard.step1") },
                { text: t("pageHelp.dashboard.step2") },
                { text: t("pageHelp.dashboard.step3") },
                {
                  text: t("pageHelp.dashboard.step4"),
                  link: { href: "/reports/financial", label: t("pageHelp.dashboard.step4Link") },
                },
              ]}
            />
          </>
        }
        main={
          <div className="min-w-0 w-full space-y-4 sm:space-y-5">
            <div
              className="sticky top-2 z-10 grid w-full min-w-0 grid-cols-2 gap-1.5 rounded-xl border border-zinc-200/80 bg-zinc-50/95 p-1.5 shadow-sm backdrop-blur-sm sm:grid-cols-3 sm:gap-2 lg:flex lg:flex-nowrap lg:p-2"
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

            {mainTab === "summary" ? (
              <div className="flex min-w-0 flex-col gap-5">
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
            ) : null}

            {mainTab === "personnel" ? (
              <DashboardPersonnelTab t={t} locale={locale} overview={overview} />
            ) : null}

            {mainTab === "operations" ? (
              <DashboardOperationsTab t={t} locale={locale} overview={overview} />
            ) : null}

            {mainTab === "operations_registry" ? (
              <DashboardOperationsRegistryTab t={t} overview={overview} />
            ) : null}

            {mainTab === "reports" ? (
              <DashboardReportsTab t={t} userRole={user?.role} />
            ) : null}
          </div>
        }
      />
    </>
  );
}
