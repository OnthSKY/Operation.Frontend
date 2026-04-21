"use client";

import { useI18n } from "@/i18n/context";
import { FinancialReportAdvancedFilters } from "@/modules/reports/components/FinancialReportAdvancedFilters";
import {
  FinancialReportScopeStripHubCumulativeBands,
  FinancialReportScopeStripHubFilterBand,
} from "@/modules/reports/components/FinancialReportScopeStrip";
import { ReportHubDateRangeControls } from "@/modules/reports/components/ReportHubDateRangeControls";
import { ReportMobileFilterSurface } from "@/modules/reports/components/ReportMobileFilterSurface";
import { ReportsPatronStoryInfoButton } from "@/modules/reports/components/ReportsPatronTabStory";
import { useFinancialReports } from "@/modules/reports/context/FinancialReportsContext";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { PageWhenToUseInfoButton } from "@/shared/components/PageWhenToUseInfoButton";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Select } from "@/shared/ui/Select";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";

const INTRO_PATRON_MAP_LINK_CLASS =
  "font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-900";

export function FinancialReportsShell({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const pathname = usePathname() ?? "";
  const path = pathname.split("?")[0] ?? "";
  const isTrend = path.includes("/financial/trend");
  const isCharts = path.includes("/financial/charts");
  const isCompare = path.includes("/financial/compare");
  const isTables = path.includes("/financial/tables");
  const normPath = path.replace(/\/$/, "") || "/";
  const isFinKpiHome = normPath === "/reports/financial";

  const ctx = useFinancialReports();
  const {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    dateRangeLock,
    setDateRangeLock,
    finBranchId,
    setFinBranchId,
    finCurrency,
    setFinCurrency,
    finTransactionType,
    setFinTransactionType,
    finMainCategory,
    setFinMainCategory,
    finCategory,
    setFinCategory,
    finExpenseSource,
    setFinExpenseSource,
    finBranchOptions,
    branches,
    applyDatePreset,
    onCalendarYearRange,
    financial,
    finAdvancedActive,
  } = ctx;

  const finScopeBranchLabel =
    finBranchId === ""
      ? null
      : (branches ?? []).find((b) => String(b.id) === finBranchId)?.name ?? null;

  const reportsHubIntroDescription = useMemo(() => {
    const elsewhere = [
      { href: "/branches", labelKey: "reports.patronHubGuideLinkBranchesLabel", descKey: "reports.patronHubGuideLinkBranchesDesc" },
      { href: "/personnel/costs", labelKey: "reports.patronHubGuideLinkPersonnelLabel", descKey: "reports.patronHubGuideLinkPersonnelDesc" },
      { href: "/reports/patron-flow", labelKey: "reports.patronHubGuideLinkPatronFlowLabel", descKey: "reports.patronHubGuideLinkPatronFlowDesc" },
      { href: "/reports/branches", labelKey: "reports.patronHubGuideLinkBranchCompareLabel", descKey: "reports.patronHubGuideLinkBranchCompareDesc" },
    ].map((item) => ({
      href: item.href,
      label: t(item.labelKey),
      desc: t(item.descKey),
    }));
    return (
      <div className="space-y-3">
        <p>{t("pageHelp.reportsHub.intro")}</p>
        <div className="space-y-3 border-t border-zinc-200 pt-3">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
              {t("reports.patronHubGuideEyebrow")}
            </p>
            <p className="mt-0.5 font-semibold text-zinc-900">{t("reports.patronHubGuideTitle")}</p>
            <p className="mt-1.5">{t("reports.patronHubGuideIntroFinancial")}</p>
          </div>
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
              {t("reports.patronHubGuideFlowTitle")}
            </p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              <li>{t("reports.patronHubGuideFlow1Financial")}</li>
              <li>{t("reports.patronHubGuideFlow2Financial")}</li>
              <li>{t("reports.patronHubGuideFlow3Financial")}</li>
            </ol>
          </div>
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
              {t("reports.patronHubGuideThisTabTitle")}
            </p>
            <p className="mt-1.5">{t("reports.patronHubGuideTabFinancial")}</p>
          </div>
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
              {t("reports.patronHubGuideElsewhereTitle")}
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {elsewhere.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={INTRO_PATRON_MAP_LINK_CLASS}>
                    {item.label}
                  </Link>
                  <span className="text-zinc-700">
                    {" — "}
                    {item.desc}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs leading-relaxed text-zinc-600">{t("reports.patronHubGuideFooterFinancial")}</p>
        </div>
      </div>
    );
  }, [t]);

  const hubFilterPreview = useMemo(() => {
    const a = formatLocaleDate(dateFrom, locale);
    const b = formatLocaleDate(dateTo, locale);
    return (
      <>
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
          {t("reports.finToolbarPreviewEyebrow")}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900">
          {a} – {b}
        </p>
      </>
    );
  }, [dateFrom, dateTo, locale, t]);

  const reportFiltersActive =
    finBranchId !== "" ||
    finCurrency !== "" ||
    finTransactionType !== "" ||
    finMainCategory !== "" ||
    finCategory !== "" ||
    finExpenseSource !== "" ||
    dateRangeLock !== "manual";

  const showBackgroundRefresh = financial.isFetching && financial.data;

  const aboveToolbar = useMemo(() => {
    if (!isTrend) return null;
    return (
      <FinancialReportScopeStripHubCumulativeBands
        t={t}
        locale={locale}
        dateFrom={dateFrom}
        dateTo={dateTo}
        branchLabel={finScopeBranchLabel}
        branchFilterEmpty={finBranchId === ""}
      />
    );
  }, [isTrend, t, locale, dateFrom, dateTo, finBranchId, finScopeBranchLabel]);

  const belowToolbar = useMemo(() => {
    if (isTrend) {
      return finAdvancedActive ? (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950">
          {t("reports.finChartsScopeNoteTrend")}
        </p>
      ) : null;
    }
    if (isCharts) {
      return (
        <p className="rounded-lg border border-sky-200/80 bg-sky-50/90 px-3 py-2 text-xs leading-relaxed text-sky-950">
          {t("reports.finChartsPageScopeReminder")}
        </p>
      );
    }
    const filterBand = !isFinKpiHome ? (
      <FinancialReportScopeStripHubFilterBand t={t} />
    ) : null;
    const amberNote = finAdvancedActive ? (
      <p className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950">
        {t("reports.finChartsScopeNote")}
      </p>
    ) : null;
    if (!filterBand && !amberNote) return null;
    return (
      <div className="space-y-2">
        {filterBand}
        {amberNote}
      </div>
    );
  }, [t, finAdvancedActive, isTrend, isCharts, isFinKpiHome]);

  const finHubLinkActive = (href: string) => {
    if (href === "/reports/financial/trend") return isTrend;
    if (href === "/reports/financial/tables") return isTables;
    if (href === "/reports/financial/charts") return isCharts;
    if (href === "/reports/financial/compare") return isCompare;
    if (href === "/reports/financial") {
      const norm = path.replace(/\/$/, "") || "/";
      return (
        norm === "/reports/financial" &&
        !isTrend &&
        !isTables &&
        !isCharts &&
        !isCompare
      );
    }
    return false;
  };

  const subNav = (
    <nav className="flex flex-wrap gap-2" aria-label={t("reports.finReportsNavAria")}>
      {(
        [
          { href: "/reports/financial", labelKey: "reports.finNavSummary" as const },
          { href: "/reports/financial/compare", labelKey: "reports.finNavCompare" as const },
          { href: "/reports/financial/charts", labelKey: "reports.finNavCharts" as const },
          { href: "/reports/financial/trend", labelKey: "reports.finNavTrend" as const },
          { href: "/reports/financial/tables", labelKey: "reports.finNavTables" as const },
        ] as const
      ).map((item) => {
        const active = finHubLinkActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`min-h-10 touch-manipulation rounded-lg border px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              active
                ? "border-violet-300 bg-violet-50 text-violet-900"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
            }`}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <PageScreenScaffold
      className="w-full min-w-0 app-page-max pb-6 pt-2 sm:pb-8 sm:pt-4 md:pt-0"
      intro={
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
                {t("reports.finReportsLayoutTitle")}
              </h1>
              <p className="mt-0.5 break-words text-xs leading-relaxed text-zinc-500 sm:text-sm">
                {t("reports.finReportsLayoutSubtitle")}
              </p>
            </div>
            <PageWhenToUseInfoButton
              className="shrink-0 self-start"
              ariaLabel={t("common.pageHelpHintLabel")}
              guideTab="reports"
              description={reportsHubIntroDescription}
              listVariant="ordered"
              items={[
                { text: t("pageHelp.reportsHub.step1") },
                { text: t("pageHelp.reportsHub.step2") },
                {
                  text: t("pageHelp.reportsHub.step3"),
                  link: { href: "/branches", label: t("pageHelp.reportsHub.step3Link") },
                },
              ]}
            />
          </div>
          {subNav}
          {isCharts ? (
            <div className="flex items-start gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-3 sm:px-4 sm:py-3.5">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-zinc-900">
                  {t("reports.finNavCharts")}
                </p>
                <div className="text-sm leading-relaxed text-zinc-600">
                  <p className="font-semibold text-zinc-800">
                    {t("reports.finChartsPageIntroEyebrow")}
                  </p>
                  <p className="mt-2 whitespace-pre-line">
                    {t("reports.finChartsPageIntroBody")}
                  </p>
                </div>
              </div>
              <ReportsPatronStoryInfoButton tab="financial" />
            </div>
          ) : isTrend ? (
            <div className="flex items-start gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-3 sm:px-4 sm:py-3.5">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-zinc-900">
                  {t("reports.finNavTrend")}
                </p>
                <div className="text-sm leading-relaxed text-zinc-600">
                  <p className="font-semibold text-zinc-800">
                    {t("reports.finTrendPageIntroEyebrow")}
                  </p>
                  <p className="mt-2 whitespace-pre-line">
                    {t("reports.finTrendPageIntroBody")}
                  </p>
                </div>
              </div>
              <ReportsPatronStoryInfoButton tab="financial" />
            </div>
          ) : null}
        </div>
      }
      main={
        <ReportMobileFilterSurface
          variant={isCompare ? "default" : "drawerOnly"}
          filtersActive={reportFiltersActive}
          drawerTitle={t("reports.filtersSectionTitle")}
          resetKey={pathname}
          preview={isTrend ? null : hubFilterPreview}
          aboveToolbar={aboveToolbar}
          belowToolbar={belowToolbar}
          belowToolbarInDrawer={isCompare}
          onRefetch={() => void financial.refetch()}
          isRefetching={financial.isFetching}
          main={
            <>
              {isCharts || isTrend ? null : (
                <div className="flex items-start gap-2">
                  {isFinKpiHome ? (
                    <>
                      <p className="min-w-0 flex-1 text-sm leading-snug text-zinc-600">
                        {t("reports.finSummaryPageLead")}
                      </p>
                      <ReportsPatronStoryInfoButton tab="financial" />
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-semibold text-zinc-900">
                          {isCompare
                            ? t("reports.finNavCompare")
                            : t("reports.finNavSummary")}
                        </p>
                        <p className="text-sm leading-snug text-zinc-600">
                          {isCompare
                            ? t("reports.finComparePageLead")
                            : t("reports.finSummaryPageLead")}
                        </p>
                      </div>
                      <ReportsPatronStoryInfoButton tab="financial" />
                    </>
                  )}
                </div>
              )}
              {showBackgroundRefresh ? (
                <p className="text-center text-xs text-zinc-400" aria-live="polite">
                  {t("reports.updatingHint")}
                </p>
              ) : null}
              {financial.isError ? (
                <div className="rounded-xl border border-red-200/80 bg-red-50/50 px-4 py-3">
                  <p className="text-sm font-medium text-red-800">
                    {t("reports.error")}{" "}
                    <span className="font-normal text-red-700">
                      {toErrorMessage(financial.error)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-red-900/85">{t("common.loadErrorHint")}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-2"
                    onClick={() => void financial.refetch()}
                  >
                    {t("common.retry")}
                  </Button>
                </div>
              ) : null}
              {children}
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <ReportHubDateRangeControls
              t={t}
              dateFrom={dateFrom}
              dateTo={dateTo}
              rangeLock={dateRangeLock}
              onUnlockCalendarYear={() => setDateRangeLock("manual")}
              onPreset={(key) => {
                setDateRangeLock("preset");
                applyDatePreset(key);
              }}
              onCalendarYearRange={(f, d) => {
                onCalendarYearRange(f, d);
              }}
              onDateFromChange={(v) => {
                setDateRangeLock("manual");
                setDateFrom(v);
              }}
              onDateToChange={(v) => {
                setDateRangeLock("manual");
                setDateTo(v);
              }}
            />
            <div className="min-w-0 sm:max-w-md">
              <Select
                name="finBranchFilter"
                label={t("reports.colBranch")}
                options={finBranchOptions}
                value={finBranchId}
                onChange={(e) => setFinBranchId(e.target.value)}
                onBlur={() => {}}
                className="min-h-11 sm:min-h-10 sm:text-sm"
              />
            </div>
            <FinancialReportAdvancedFilters
              dateFrom={dateFrom}
              dateTo={dateTo}
              branchId={finBranchId === "" ? undefined : Number.parseInt(finBranchId, 10)}
              values={{
                currencyCode: finCurrency,
                transactionType: finTransactionType,
                mainCategory: finMainCategory,
                category: finCategory,
                expensePaymentSource: finExpenseSource,
              }}
              onChange={(patch) => {
                if (patch.currencyCode !== undefined) setFinCurrency(patch.currencyCode);
                if (patch.transactionType !== undefined) setFinTransactionType(patch.transactionType);
                if (patch.mainCategory !== undefined) setFinMainCategory(patch.mainCategory);
                if (patch.category !== undefined) setFinCategory(patch.category);
                if (patch.expensePaymentSource !== undefined) setFinExpenseSource(patch.expensePaymentSource);
              }}
            />
          </div>
        </ReportMobileFilterSurface>
      }
    />
  );
}
