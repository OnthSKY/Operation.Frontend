"use client";

import { useI18n } from "@/i18n/context";
import { FinancialReportAdvancedFilters } from "@/modules/reports/components/FinancialReportAdvancedFilters";
import { ReportsPatronStoryInfoButton } from "@/modules/reports/components/ReportsPatronTabStory";
import { ReportHubDateRangeControls } from "@/modules/reports/components/ReportHubDateRangeControls";
import { FinancialReportScopeStripTables } from "@/modules/reports/components/FinancialReportScopeStrip";
import { ReportMobileFilterSurface } from "@/modules/reports/components/ReportMobileFilterSurface";
import { ReportTablesPageShell } from "@/modules/reports/components/ReportTablesPageShell";
import { useFinancialReportTables } from "@/modules/reports/context/FinancialReportTablesContext";
import type { FinancialReportTablesPanel } from "@/modules/reports/components/ReportsDetailTables";
import { PageWhenToUseInfoButton } from "@/shared/components/PageWhenToUseInfoButton";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Select } from "@/shared/ui/Select";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";

const TABLES_BASE = "/reports/financial/tables";

const SUBNAV: {
  path: string;
  panel: Exclude<FinancialReportTablesPanel, "all">;
  labelKey: string;
}[] = [
  { path: `${TABLES_BASE}/totals`, panel: "totals", labelKey: "reports.sectionTotals" },
  { path: `${TABLES_BASE}/branches`, panel: "branches", labelKey: "reports.sectionByBranch" },
  {
    path: `${TABLES_BASE}/expense-payment`,
    panel: "expense-payment",
    labelKey: "reports.sectionExpensePayment",
  },
  { path: `${TABLES_BASE}/by-category`, panel: "by-category", labelKey: "reports.sectionByCategory" },
  {
    path: `${TABLES_BASE}/overhead`,
    panel: "overhead",
    labelKey: "reports.sectionGeneralOverheadAllocated",
  },
  {
    path: `${TABLES_BASE}/supplier-payments`,
    panel: "supplier-payments",
    labelKey: "reports.sectionSupplierPayments",
  },
  {
    path: `${TABLES_BASE}/vehicle-off-register`,
    panel: "vehicle-off-register",
    labelKey: "reports.sectionVehicleExpensesOffRegister",
  },
  { path: `${TABLES_BASE}/advances`, panel: "advances", labelKey: "reports.sectionAdvances" },
];

export function FinancialReportTablesShell({
  children,
  showTableSubnav = true,
}: {
  children: ReactNode;
  /** Sub-route layout; set false for the legacy all-tables-on-one-page embed. */
  showTableSubnav?: boolean;
}) {
  const { t, locale } = useI18n();
  const pathname = usePathname() ?? "";
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
    filtersActive,
    financial,
  } = useFinancialReportTables();

  const activePanel = useMemo(
    () => SUBNAV.find((item) => pathname === item.path)?.panel ?? null,
    [pathname]
  );

  const totalsIntroCallout =
    activePanel === "totals" ? (
      <div className="flex items-start gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-3 sm:px-4 sm:py-3.5">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-zinc-900">{t("reports.sectionTotals")}</p>
          <div className="text-sm leading-relaxed text-zinc-600">
            <p className="font-semibold text-zinc-800">
              {t("reports.finTablesTotalsPageIntroEyebrow")}
            </p>
            <p className="mt-2 whitespace-pre-line">
              {t("reports.finTablesTotalsPageIntroBody")}
            </p>
          </div>
        </div>
        <ReportsPatronStoryInfoButton tab="financial" />
      </div>
    ) : undefined;

  return (
    <ReportTablesPageShell
      title={t("reports.tablesPageFinTitle")}
      subtitle={t("reports.tablesPageFinSubtitle")}
      introCallout={totalsIntroCallout}
      pageGuide={
        <PageWhenToUseInfoButton
          ariaLabel={t("common.pageHelpHintLabel")}
          guideTab="reports"
          description={t("pageHelp.reportsFinancial.intro")}
          listVariant="ordered"
          items={[
            { text: t("pageHelp.reportsFinancial.step1") },
            { text: t("pageHelp.reportsFinancial.step2") },
            {
              text: t("pageHelp.reportsFinancial.step3"),
              link: { href: "/branches", label: t("pageHelp.reportsFinancial.step3Link") },
            },
          ]}
        />
      }
    >
      <ReportMobileFilterSurface
        variant="drawerOnly"
        filtersActive={filtersActive}
        drawerTitle={t("reports.filtersSectionTitle")}
        resetKey="fin-tables"
        preview={null}
        onRefetch={() => void financial.refetch()}
        isRefetching={financial.isFetching}
        main={
          <>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <FinancialReportScopeStripTables
                  t={t}
                  locale={locale}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  branchLabel={
                    finBranchId === ""
                      ? null
                      : branches.find((x) => String(x.id) === finBranchId)?.name ?? null
                  }
                />
              </div>
              {activePanel === "totals" ? null : (
                <div className="shrink-0 self-end sm:self-start sm:pt-1">
                  <ReportsPatronStoryInfoButton tab="financial" />
                </div>
              )}
            </div>

            {financial.isFetching && financial.data ? (
              <p className="text-center text-xs text-zinc-400" aria-live="polite">
                {t("reports.updatingHint")}
              </p>
            ) : null}

            {financial.isError ? (
              <p className="text-sm text-red-600">
                {t("reports.error")} {toErrorMessage(financial.error)}
              </p>
            ) : null}

            {financial.isPending ? (
              <p className="text-sm text-zinc-500">{t("reports.loading")}</p>
            ) : null}

            {financial.data ? (
              showTableSubnav ? (
                <div className="flex w-full min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:gap-6">
                  <nav
                    aria-label={t("reports.finTablesSubnavAria")}
                    className="flex w-full min-w-0 shrink-0 flex-col gap-1 rounded-2xl border border-zinc-200 bg-zinc-50 p-2 xl:w-[min(100%,15rem)] xl:max-w-[15rem]"
                  >
                    {SUBNAV.map((item) => {
                      const active = pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          href={item.path}
                          className={`block w-full rounded-xl px-3 py-2.5 text-left text-xs font-medium leading-snug transition-colors sm:text-sm xl:py-2 ${
                            active
                              ? "bg-white text-violet-800 shadow-sm ring-1 ring-violet-200"
                              : "text-zinc-700 hover:bg-white/80 hover:text-zinc-900"
                          }`}
                        >
                          {t(item.labelKey)}
                        </Link>
                      );
                    })}
                  </nav>
                  <div className="min-w-0 w-full flex-1">{children}</div>
                </div>
              ) : (
                children
              )
            ) : null}
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
              setDateRangeLock("calendarYear");
              setDateFrom(f);
              setDateTo(d);
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
            branchId={
              finBranchId === "" ? undefined : Number.parseInt(finBranchId, 10)
            }
            values={{
              currencyCode: finCurrency,
              transactionType: finTransactionType,
              mainCategory: finMainCategory,
              category: finCategory,
              expensePaymentSource: finExpenseSource,
            }}
            onChange={(patch) => {
              if (patch.currencyCode !== undefined) {
                setFinCurrency(patch.currencyCode);
              }
              if (patch.transactionType !== undefined) {
                setFinTransactionType(patch.transactionType);
              }
              if (patch.mainCategory !== undefined) {
                setFinMainCategory(patch.mainCategory);
              }
              if (patch.category !== undefined) {
                setFinCategory(patch.category);
              }
              if (patch.expensePaymentSource !== undefined) {
                setFinExpenseSource(patch.expensePaymentSource);
              }
            }}
          />
        </div>
      </ReportMobileFilterSurface>
    </ReportTablesPageShell>
  );
}
