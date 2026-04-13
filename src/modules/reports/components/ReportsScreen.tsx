"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  useCashPositionReport,
  useFinancialBranchMonthly,
  useFinancialReport,
  useFinancialSummaryMonthly,
  useStockReport,
} from "@/modules/reports/hooks/useReportsQueries";
import { ReportFinancialStoryCharts } from "@/modules/reports/components/ReportFinancialStoryCharts";
import {
  FinancialReportDetailTables,
  StockReportDetailTables,
} from "@/modules/reports/components/ReportsDetailTables";
import { FinancialReportAdvancedFilters } from "@/modules/reports/components/FinancialReportAdvancedFilters";
import { ReportStockCharts } from "@/modules/reports/components/ReportStockCharts";
import { ReportCashPatronHighlights } from "@/modules/reports/components/ReportCashPatronHighlights";
import { ReportCashSeasonYearEndSelect } from "@/modules/reports/components/ReportCashSeasonYearEndSelect";
import { ReportSeasonYearQuickSelect } from "@/modules/reports/components/ReportSeasonYearQuickSelect";
import { ReportsPatronHubGuide } from "@/modules/reports/components/ReportsPatronHubGuide";
import { ReportsPatronTabStory } from "@/modules/reports/components/ReportsPatronTabStory";
import {
  WarehouseProductScopeFilters,
  type WarehouseScopeFiltersValue,
} from "@/modules/warehouse/components/WarehouseProductScopeFilters";
import {
  warehouseScopeEffectiveCategoryId,
  warehouseScopeFiltersActive,
} from "@/modules/warehouse/lib/warehouse-scope-filters";
import { useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { CollapsibleMobileFilters } from "@/shared/components/CollapsibleMobileFilters";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Select } from "@/shared/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import {
  addDaysFromIso,
  calendarYearRangeIso,
  inferCalendarSeasonYearFromRange,
  inferYearFromDec31AsOf,
  startOfMonthIso,
} from "@/modules/reports/lib/report-period-helpers";
import Link from "next/link";
import { useMemo, useEffect, useState, useCallback } from "react";

const REPORTS_TAB_STORAGE_KEY = "sky-ops-reports-tab";
const REPORTS_HUB_COLLAPSED_KEY = "sky-ops-reports-hub-collapsed";

type ReportMainTab = "financial" | "cash" | "stock";

function parseStoredReportTab(raw: string | null): ReportMainTab | null {
  if (raw === "financial" || raw === "cash" || raw === "stock") return raw;
  return null;
}

function seasonStatusLabel(t: (key: string) => string, status: string): string {
  const u = status.toUpperCase();
  if (u === "OPEN") return t("branch.seasonOpen");
  if (u === "PLANNED") return t("branch.seasonPlanned");
  if (u === "CLOSED") return t("branch.seasonClosed");
  return t("branch.seasonNone");
}

export function ReportsScreen() {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<ReportMainTab>("financial");
  const [tablesHubOpen, setTablesHubOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState(startOfMonthIso);
  const [dateTo, setDateTo] = useState(() => localIsoDate());
  const [finBranchId, setFinBranchId] = useState("");
  const [finCurrency, setFinCurrency] = useState("");
  const [finTransactionType, setFinTransactionType] = useState("");
  const [finMainCategory, setFinMainCategory] = useState("");
  const [finCategory, setFinCategory] = useState("");
  const [finExpenseSource, setFinExpenseSource] = useState("");
  const [stockWarehouseId, setStockWarehouseId] = useState("");
  const [stockBranchId, setStockBranchId] = useState("");
  const [stockScope, setStockScope] = useState<WarehouseScopeFiltersValue>({
    mainCategoryId: null,
    subCategoryId: null,
    parentProductId: null,
    productId: null,
  });
  const [reportView, setReportView] = useState<"summary" | "tables">(
    "summary"
  );
  const [cashAsOfDate, setCashAsOfDate] = useState(() => localIsoDate());
  const [cashOpenSeasonOnly, setCashOpenSeasonOnly] = useState(true);

  const { data: branches = [] } = useBranchesList();
  const { data: warehouses = [] } = useWarehousesList();

  const finBranchOptions = useMemo(
    () => [
      { value: "", label: t("reports.allBranches") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const stockWarehouseOptions = useMemo(
    () => [
      { value: "", label: t("reports.allWarehouses") },
      ...warehouses.map((w) => ({ value: String(w.id), label: w.name })),
    ],
    [warehouses, t]
  );

  const stockBranchOptions = useMemo(
    () => [
      { value: "", label: t("reports.allBranches") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const finParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      branchId:
        finBranchId === "" ? undefined : Number.parseInt(finBranchId, 10),
      currencyCode: finCurrency || undefined,
      transactionType: finTransactionType || undefined,
      mainCategory: finMainCategory || undefined,
      category: finCategory || undefined,
      expensePaymentSource: finExpenseSource || undefined,
    }),
    [
      dateFrom,
      dateTo,
      finBranchId,
      finCurrency,
      finTransactionType,
      finMainCategory,
      finCategory,
      finExpenseSource,
    ]
  );

  const finParamsCharts = useMemo(
    () => ({
      dateFrom,
      dateTo,
      branchId:
        finBranchId === "" ? undefined : Number.parseInt(finBranchId, 10),
    }),
    [dateFrom, dateTo, finBranchId]
  );

  const stockParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      warehouseId:
        stockWarehouseId === ""
          ? undefined
          : Number.parseInt(stockWarehouseId, 10),
      branchId:
        stockBranchId === "" ? undefined : Number.parseInt(stockBranchId, 10),
      categoryId: warehouseScopeEffectiveCategoryId(stockScope) ?? undefined,
      parentProductId: stockScope.parentProductId ?? undefined,
      productId: stockScope.productId ?? undefined,
    }),
    [dateFrom, dateTo, stockWarehouseId, stockBranchId, stockScope]
  );

  const financial = useFinancialReport(finParams, tab === "financial");
  const summaryMonthly = useFinancialSummaryMonthly(
    finParamsCharts,
    tab === "financial"
  );
  const allBranchesFinParams = useMemo(
    () => ({ dateFrom, dateTo }),
    [dateFrom, dateTo]
  );
  const branchMonthly = useFinancialBranchMonthly(
    allBranchesFinParams,
    tab === "financial" && finBranchId === ""
  );
  const stock = useStockReport(stockParams, tab === "stock");

  const cashParams = useMemo(
    () => ({ asOfDate: cashAsOfDate, openSeasonOnly: cashOpenSeasonOnly }),
    [cashAsOfDate, cashOpenSeasonOnly]
  );
  const cash = useCashPositionReport(cashParams, tab === "cash");

  useEffect(() => {
    try {
      const storedTab = parseStoredReportTab(
        localStorage.getItem(REPORTS_TAB_STORAGE_KEY)
      );
      if (storedTab) setTab(storedTab);
      const hubPref = localStorage.getItem(REPORTS_HUB_COLLAPSED_KEY);
      if (hubPref === "1") setTablesHubOpen(false);
      else if (hubPref === "0") setTablesHubOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const setReportTab = useCallback((next: ReportMainTab) => {
    setTab(next);
    try {
      localStorage.setItem(REPORTS_TAB_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTablesHub = useCallback(() => {
    setTablesHubOpen((open) => {
      const next = !open;
      try {
        localStorage.setItem(REPORTS_HUB_COLLAPSED_KEY, next ? "0" : "1");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setReportView("summary");
  }, [tab]);

  useEffect(() => {
    setFinCategory("");
  }, [finMainCategory]);

  const setPreset = (key: "month" | "d30" | "d7") => {
    const today = localIsoDate();
    if (key === "month") {
      setDateFrom(startOfMonthIso());
      setDateTo(today);
      return;
    }
    if (key === "d30") {
      setDateFrom(addDaysFromIso(today, -29));
      setDateTo(today);
      return;
    }
    setDateFrom(addDaysFromIso(today, -6));
    setDateTo(today);
  };

  const activeQuery = tab === "financial" ? financial : tab === "stock" ? stock : cash;

  const reportFiltersActive =
    finBranchId !== "" ||
    finCurrency !== "" ||
    finTransactionType !== "" ||
    finMainCategory !== "" ||
    finCategory !== "" ||
    finExpenseSource !== "" ||
    stockWarehouseId !== "" ||
    stockBranchId !== "" ||
    warehouseScopeFiltersActive(stockScope) ||
    (tab === "cash" && !cashOpenSeasonOnly);

  const branchTrendMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const tr of financial.data?.branchTrends ?? []) {
      m.set(`${tr.branchId}:${tr.currencyCode}`, tr.netDelta);
    }
    return m;
  }, [financial.data]);

  const tabOneLiner =
    tab === "financial"
      ? t("reports.tabOneLinerFinancial")
      : tab === "cash"
        ? t("reports.tabOneLinerCash")
        : t("reports.tabOneLinerStock");

  const showBackgroundRefresh =
    (tab === "financial" && financial.isFetching && financial.data) ||
    (tab === "stock" && stock.isFetching && stock.data) ||
    (tab === "cash" && cash.isFetching && cash.data);

  const finAdvancedActive =
    finCurrency !== "" ||
    finTransactionType !== "" ||
    finMainCategory !== "" ||
    finCategory !== "" ||
    finExpenseSource !== "";

  return (
    <div className="mx-auto flex w-full min-w-0 app-page-max flex-col gap-4 pb-6 pt-2 sm:gap-6 sm:pt-4 sm:pb-8 md:pt-0">
      <div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
          {t("reports.title")}
        </h1>
        <p className="mt-0.5 break-words text-xs leading-relaxed text-zinc-500 sm:text-sm">
          {t("reports.subtitle")}
        </p>
      </div>

      <ReportsPatronHubGuide />

      <div
        className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100/80 p-1"
        role="tablist"
        aria-label={t("reports.reportTypePickerAria")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "financial"}
          onClick={() => setReportTab("financial")}
          className={`min-h-12 touch-manipulation rounded-lg px-1.5 py-2.5 text-xs font-semibold transition sm:min-h-0 sm:px-3 sm:py-2 sm:text-sm ${
            tab === "financial"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 active:bg-zinc-200/80 sm:hover:text-zinc-900"
          }`}
        >
          {t("reports.tabFinancial")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "cash"}
          onClick={() => setReportTab("cash")}
          className={`min-h-12 touch-manipulation rounded-lg px-1.5 py-2.5 text-xs font-semibold transition sm:min-h-0 sm:px-3 sm:py-2 sm:text-sm ${
            tab === "cash"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 active:bg-zinc-200/80 sm:hover:text-zinc-900"
          }`}
        >
          {t("reports.tabCashPosition")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "stock"}
          onClick={() => setReportTab("stock")}
          className={`min-h-12 touch-manipulation rounded-lg px-1.5 py-2.5 text-xs font-semibold transition sm:min-h-0 sm:px-3 sm:py-2 sm:text-sm ${
            tab === "stock"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 active:bg-zinc-200/80 sm:hover:text-zinc-900"
          }`}
        >
          {t("reports.tabStock")}
        </button>
      </div>
      <p className="text-sm leading-snug text-zinc-600">{tabOneLiner}</p>
      <ReportsPatronTabStory tab={tab} />

      <CollapsibleMobileFilters
        title={t("reports.filtersSectionTitle")}
        toggleAriaLabel={t("common.filters")}
        active={reportFiltersActive}
        resetKey={tab}
        expandLabel={t("common.filtersShow")}
        collapseLabel={t("common.filtersHide")}
      >
        <div className="flex flex-col gap-4">
          {tab === "cash" ? (
            <div className="grid grid-cols-1 gap-3 sm:max-w-md">
              <ReportCashSeasonYearEndSelect
                asOfDate={cashAsOfDate}
                extraHint={t("reports.cashAsOfSeasonYearCrossTabHint")}
                onApplyAsOf={(iso) => {
                  setCashAsOfDate(iso);
                  const y = inferYearFromDec31AsOf(iso);
                  if (y != null) {
                    const { dateFrom: f, dateTo: d } = calendarYearRangeIso(y);
                    setDateFrom(f);
                    setDateTo(d);
                  }
                }}
              />
              <DateField
                label={t("reports.cashAsOfDate")}
                value={cashAsOfDate}
                onChange={(e) => setCashAsOfDate(e.target.value)}
              />
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 touch-manipulation sm:min-h-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-zinc-300"
                  checked={cashOpenSeasonOnly}
                  onChange={(e) => setCashOpenSeasonOnly(e.target.checked)}
                />
                <span>{t("reports.cashOpenSeasonOnly")}</span>
              </label>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 touch-manipulation text-xs sm:min-h-10"
                  onClick={() => setPreset("month")}
                >
                  {t("reports.presetThisMonth")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 touch-manipulation text-xs sm:min-h-10"
                  onClick={() => setPreset("d30")}
                >
                  {t("reports.presetLast30")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 touch-manipulation text-xs sm:min-h-10"
                  onClick={() => setPreset("d7")}
                >
                  {t("reports.presetLast7")}
                </Button>
              </div>
              <ReportSeasonYearQuickSelect
                dateFrom={dateFrom}
                dateTo={dateTo}
                onApplyRange={(f, d) => {
                  setDateFrom(f);
                  setDateTo(d);
                  const y = inferCalendarSeasonYearFromRange(f, d);
                  if (y != null) {
                    setCashAsOfDate(`${y}-12-31`);
                  }
                }}
                className="max-w-full sm:max-w-sm"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DateField
                  label={t("reports.dateFrom")}
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <DateField
                  label={t("reports.dateTo")}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
                {tab === "financial" ? (
                  <div className="min-w-0 sm:col-span-2">
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
                ) : null}
              </div>
              {tab === "financial" ? (
                <FinancialReportAdvancedFilters
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  branchId={
                    finBranchId === ""
                      ? undefined
                      : Number.parseInt(finBranchId, 10)
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
              ) : null}
              {tab === "stock" ? (
                <div className="space-y-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:px-4 sm:py-4">
                  <p className="text-xs font-medium text-zinc-600">
                    {t("reports.stockScopeFiltersTitle")}
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Select
                      name="stockWarehouseFilter"
                      label={t("reports.colWarehouse")}
                      options={stockWarehouseOptions}
                      value={stockWarehouseId}
                      onChange={(e) => setStockWarehouseId(e.target.value)}
                      onBlur={() => {}}
                      className="min-h-11 sm:min-h-10 sm:text-sm"
                    />
                    <Select
                      name="stockBranchFilter"
                      label={t("reports.sectionBranchReceipts")}
                      options={stockBranchOptions}
                      value={stockBranchId}
                      onChange={(e) => setStockBranchId(e.target.value)}
                      onBlur={() => {}}
                      className="min-h-11 sm:min-h-10 sm:text-sm"
                    />
                  </div>
                  <div className="min-w-0">
                    <WarehouseProductScopeFilters value={stockScope} onChange={setStockScope} />
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </CollapsibleMobileFilters>

      {showBackgroundRefresh ? (
        <p className="text-center text-xs text-zinc-400" aria-live="polite">
          {t("reports.updatingHint")}
        </p>
      ) : null}

      {activeQuery.isError ? (
        <div className="rounded-xl border border-red-200/80 bg-red-50/50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">
            {t("reports.error")}{" "}
            <span className="font-normal text-red-700">
              {toErrorMessage(activeQuery.error)}
            </span>
          </p>
          <p className="mt-1 text-xs text-red-900/85">{t("common.loadErrorHint")}</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            onClick={() => void activeQuery.refetch()}
          >
            {t("common.retry")}
          </Button>
        </div>
      ) : null}

      {tab === "cash" && cash.isPending ? (
        <p className="text-sm text-zinc-500">{t("reports.loading")}</p>
      ) : null}

      {((tab === "financial" && financial.data) ||
        (tab === "stock" && stock.data)) ? (
        <div
          className="sticky top-2 z-10 grid grid-cols-2 gap-1 rounded-xl border border-zinc-200/80 bg-zinc-50/95 p-1 shadow-sm backdrop-blur-sm sm:p-1.5"
          role="tablist"
          aria-label={t("reports.reportViewSwitchAria")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={reportView === "summary"}
            onClick={() => setReportView("summary")}
            className={`min-h-11 touch-manipulation rounded-lg px-2 py-2 text-sm font-semibold transition sm:min-h-10 sm:px-4 sm:py-2 ${
              reportView === "summary"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 active:bg-zinc-200/80 sm:hover:text-zinc-900"
            }`}
          >
            {t("reports.reportViewSummaryPatron")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={reportView === "tables"}
            onClick={() => setReportView("tables")}
            className={`min-h-11 touch-manipulation rounded-lg px-2 py-2 text-sm font-semibold transition sm:min-h-10 sm:px-4 sm:py-2 ${
              reportView === "tables"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 active:bg-zinc-200/80 sm:hover:text-zinc-900"
            }`}
          >
            {t("reports.reportViewTablesPatron")}
          </button>
        </div>
      ) : null}

      {tab === "financial" && financial.data ? (
        <div className="flex flex-col gap-4 sm:gap-6">
          {reportView === "summary" ? (
            <div>
              {finAdvancedActive ? (
                <p className="text-xs leading-relaxed text-amber-900/90">
                  {t("reports.finChartsScopeNote")}
                </p>
              ) : null}
              <ReportFinancialStoryCharts
                data={financial.data}
                monthlyRows={summaryMonthly.data?.monthly}
                branchMonthlyRows={
                  finBranchId === "" ? branchMonthly.data : null
                }
                showBranchNetByMonth={finBranchId === ""}
              />
            </div>
          ) : (
            <div>
              <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white px-3 py-4 sm:px-5 sm:py-6">
                <FinancialReportDetailTables
                  data={financial.data}
                  branchTrendMap={branchTrendMap}
                  t={t}
                  locale={locale}
                />
              </div>
            </div>
          )}
        </div>
      ) : null}

      {tab === "stock" && stock.data ? (
        <div className="flex flex-col gap-4 sm:gap-6">
          {reportView === "summary" ? (
            <div>
              <ReportStockCharts data={stock.data} />
            </div>
          ) : (
            <div>
              <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white px-3 py-4 sm:px-5 sm:py-6">
                <StockReportDetailTables
                  data={stock.data}
                  t={t}
                  locale={locale}
                />
              </div>
            </div>
          )}
        </div>
      ) : null}

      {tab === "cash" && cash.data ? (
        <div className="flex flex-col gap-3 sm:gap-4">
          <p className="text-sm leading-relaxed text-zinc-600">
            <span className="font-medium text-zinc-800">
              {t("reports.cashPositionSectionTitle")}
            </span>
            {" · "}
            <span className="text-zinc-700">
              {cash.data.asOfDate}
              {cash.data.openSeasonOnly ? ` · ${t("reports.cashOpenSeasonOnlyShort")}` : ` · ${t("reports.cashAllBranchesShort")}`}
            </span>
          </p>
          {cash.data.branches.length > 0 ? (
            <ReportCashPatronHighlights
              branches={cash.data.branches}
              totals={cash.data.totals}
              t={t}
              locale={locale}
            />
          ) : null}
          {cash.data.branches.length === 0 ? (
            <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              {t("reports.cashPositionEmpty")}
            </p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("reports.colBranch")}</TableHeader>
                  <TableHeader>{t("branch.tableSeason")}</TableHeader>
                  <TableHeader className="text-right tabular-nums">
                    {t("reports.cashColDrawer")}
                  </TableHeader>
                  <TableHeader className="text-right tabular-nums">
                    {t("reports.cashColPocketDebt")}
                  </TableHeader>
                  <TableHeader className="text-right tabular-nums">
                    {t("reports.cashColPatronDebt")}
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {cash.data.branches.map((row) => (
                  <TableRow key={row.branchId}>
                    <TableCell dataLabel={t("reports.colBranch")} className="font-medium text-zinc-900">
                      {row.branchName}
                    </TableCell>
                    <TableCell dataLabel={t("branch.tableSeason")} className="text-zinc-600">
                      {seasonStatusLabel(t, row.seasonStatus)}
                    </TableCell>
                    <TableCell dataLabel={t("reports.cashColDrawer")} className="text-right tabular-nums text-zinc-900">
                      {formatLocaleAmount(row.cumulativeCashBalance, locale)}
                    </TableCell>
                    <TableCell dataLabel={t("reports.cashColPocketDebt")} className="text-right tabular-nums text-zinc-800">
                      {formatLocaleAmount(row.cumulativeNetRegisterOwesPersonnelPocket, locale)}
                    </TableCell>
                    <TableCell dataLabel={t("reports.cashColPatronDebt")} className="text-right tabular-nums text-zinc-800">
                      {formatLocaleAmount(row.cumulativeNetRegisterOwesPatron, locale)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell
                    colSpan={2}
                    dataLabel={t("reports.cashTotalsRow")}
                    className="bg-zinc-50/90 font-semibold text-zinc-800"
                  >
                    {t("reports.cashTotalsRow")}
                  </TableCell>
                  <TableCell
                    dataLabel={t("reports.cashColDrawer")}
                    className="bg-zinc-50/90 text-right tabular-nums font-semibold text-zinc-900"
                  >
                    {formatLocaleAmount(cash.data.totals.cumulativeCashBalance, locale)}
                  </TableCell>
                  <TableCell
                    dataLabel={t("reports.cashColPocketDebt")}
                    className="bg-zinc-50/90 text-right tabular-nums font-semibold text-zinc-900"
                  >
                    {formatLocaleAmount(cash.data.totals.cumulativeNetRegisterOwesPersonnelPocket, locale)}
                  </TableCell>
                  <TableCell
                    dataLabel={t("reports.cashColPatronDebt")}
                    className="bg-zinc-50/90 text-right tabular-nums font-semibold text-zinc-900"
                  >
                    {formatLocaleAmount(cash.data.totals.cumulativeNetRegisterOwesPatron, locale)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      ) : null}

      <section
        className="rounded-2xl border border-dashed border-zinc-300/90 bg-zinc-50/60 p-3 sm:p-4"
        aria-labelledby="reports-tables-hub-heading"
      >
        <button
          type="button"
          id="reports-tables-hub-heading"
          onClick={toggleTablesHub}
          aria-expanded={tablesHubOpen}
          aria-controls="reports-tables-hub-panel"
          className="flex w-full min-h-11 touch-manipulation items-start justify-between gap-3 rounded-lg text-left outline-none ring-zinc-400 focus-visible:ring-2 sm:min-h-0"
        >
          <span className="min-w-0">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
              {t("reports.fullPageReportsTitle")}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-zinc-600 sm:text-sm">
              {tablesHubOpen
                ? t("reports.fullPageReportsLead")
                : t("reports.tablesHubCollapsedHint")}
            </span>
          </span>
          <span className="mt-0.5 shrink-0 text-zinc-400" aria-hidden>
            {tablesHubOpen ? "▾" : "▸"}
          </span>
        </button>
        {tablesHubOpen ? (
          <div
            id="reports-tables-hub-panel"
            className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          >
            <Link
              href="/reports/financial/tables"
              className="flex min-h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-violet-300 hover:text-violet-800 touch-manipulation sm:min-h-11"
            >
              {t("reports.navFinancialTables")}
            </Link>
            <Link
              href="/reports/branches"
              className="flex min-h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-violet-300 hover:text-violet-800 touch-manipulation sm:min-h-11"
            >
              {t("reports.navBranchComparison")}
            </Link>
            <Link
              href="/reports/stock/tables"
              className="flex min-h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-violet-300 hover:text-violet-800 touch-manipulation sm:min-h-11"
            >
              {t("reports.navStockTables")}
            </Link>
            <Link
              href="/reports/cash"
              className="flex min-h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-violet-300 hover:text-violet-800 touch-manipulation sm:min-h-11"
            >
              {t("reports.navCashReport")}
            </Link>
            <Link
              href="/reports/patron-flow"
              className="flex min-h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-violet-300 hover:text-violet-800 touch-manipulation sm:min-h-11"
            >
              {t("reports.navPatronFlow")}
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
