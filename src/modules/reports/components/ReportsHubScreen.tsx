"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useCashPositionReport, useStockReport } from "@/modules/reports/hooks/useReportsQueries";
import { StockReportDetailTables } from "@/modules/reports/components/ReportsDetailTables";
import { ReportStockCharts } from "@/modules/reports/components/ReportStockCharts";
import { ReportCashAsOfFilterBlock } from "@/modules/reports/components/ReportCashAsOfFilterBlock";
import { ReportCashPatronHighlights } from "@/modules/reports/components/ReportCashPatronHighlights";
import {
  ReportHubDateRangeControls,
  type ReportHubRangeLock,
} from "@/modules/reports/components/ReportHubDateRangeControls";
import {
  PATRON_TAB_STORY_KEYS,
  ReportsPatronStoryInfoButton,
} from "@/modules/reports/components/ReportsPatronTabStory";
import {
  WarehouseProductScopeFilters,
  type WarehouseScopeFiltersValue,
} from "@/modules/warehouse/components/WarehouseProductScopeFilters";
import {
  warehouseScopeEffectiveCategoryId,
  warehouseScopeFiltersActive,
} from "@/modules/warehouse/lib/warehouse-scope-filters";
import { useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { ReportMobileFilterSurface } from "@/modules/reports/components/ReportMobileFilterSurface";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { PageWhenToUseInfoButton } from "@/shared/components/PageWhenToUseInfoButton";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { Button } from "@/shared/ui/Button";
import { Select } from "@/shared/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/Table";
import {
  addDaysFromIso,
  calendarYearRangeIso,
  inferCalendarSeasonYearFromRange,
  startOfMonthIso,
} from "@/modules/reports/lib/report-period-helpers";
import type { ReportsHubTab } from "@/modules/reports/lib/reports-hub-paths";
import Link from "next/link";
import { useMemo, useEffect, useState } from "react";

const INTRO_PATRON_MAP_LINK_CLASS =
  "font-semibold text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-900";

function seasonStatusLabel(t: (key: string) => string, status: string): string {
  const u = status.toUpperCase();
  if (u === "OPEN") return t("branch.seasonOpen");
  if (u === "PLANNED") return t("branch.seasonPlanned");
  if (u === "CLOSED") return t("branch.seasonClosed");
  return t("branch.seasonNone");
}

export function ReportsHubScreen({ routeTab }: { routeTab: ReportsHubTab }) {
  const { t, locale } = useI18n();
  const tab = routeTab;
  const [dateFrom, setDateFrom] = useState(startOfMonthIso);
  const [dateTo, setDateTo] = useState(() => localIsoDate());
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
  const [cashAsOfMode, setCashAsOfMode] = useState<"calendarYearEnd" | "customDate">("customDate");
  const [dateRangeLock, setDateRangeLock] = useState<ReportHubRangeLock>("manual");

  const { data: branches = [] } = useBranchesList();
  const { data: warehouses = [] } = useWarehousesList();

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

  const stock = useStockReport(stockParams, tab === "stock");

  const cashParams = useMemo(
    () => ({ asOfDate: cashAsOfDate, openSeasonOnly: cashOpenSeasonOnly }),
    [cashAsOfDate, cashOpenSeasonOnly]
  );
  const cash = useCashPositionReport(cashParams, tab === "cash");

  useEffect(() => {
    setReportView("summary");
  }, [tab]);

  const applyDatePreset = (key: "month" | "d30" | "d7") => {
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

  const activeQuery = tab === "stock" ? stock : cash;

  const reportFiltersActive =
    stockWarehouseId !== "" ||
    stockBranchId !== "" ||
    warehouseScopeFiltersActive(stockScope) ||
    (tab === "cash" && (!cashOpenSeasonOnly || cashAsOfMode === "calendarYearEnd")) ||
    (tab === "stock" && dateRangeLock !== "manual");

  const tabOneLiner =
    tab === "cash" ? t("reports.tabOneLinerCash") : t("reports.tabOneLinerStock");

  const hubFilterPreview = useMemo(() => {
    if (tab === "cash") {
      return (
        <>
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
            {t("reports.tabCashPosition")}
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900">
            {formatLocaleDate(cashAsOfDate, locale)}
          </p>
        </>
      );
    }
    const tabLabel = t("reports.tabStock");
    const a = formatLocaleDate(dateFrom, locale);
    const b = formatLocaleDate(dateTo, locale);
    return (
      <>
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
          {tabLabel}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900">
          {a} – {b}
        </p>
      </>
    );
  }, [tab, cashAsOfDate, dateFrom, dateTo, locale, t]);

  const showBackgroundRefresh =
    (tab === "stock" && stock.isFetching && stock.data) ||
    (tab === "cash" && cash.isFetching && cash.data);

  const reportsHubIntroDescription = useMemo(() => {
    const map: Record<
      ReportsHubTab,
      {
        intro: string;
        flow: readonly string[];
        tabAnswer: string;
        footer: string;
        elsewhere: readonly { href: string; labelKey: string; descKey: string }[];
      }
    > = {
      cash: {
        intro: t("reports.patronHubGuideIntroCash"),
        flow: [
          t("reports.patronHubGuideFlow1Cash"),
          t("reports.patronHubGuideFlow2Cash"),
          t("reports.patronHubGuideFlow3Cash"),
        ],
        tabAnswer: t("reports.patronHubGuideTabCash"),
        footer: t("reports.patronHubGuideFooterCash"),
        elsewhere: [
          { href: "/branches", labelKey: "reports.patronHubGuideLinkBranchesLabel", descKey: "reports.patronHubGuideLinkBranchesDesc" },
          { href: "/reports/financial", labelKey: "reports.patronHubGuideLinkFinancialHubLabel", descKey: "reports.patronHubGuideLinkFinancialHubDesc" },
          { href: "/reports/cash", labelKey: "reports.patronHubGuideLinkCashTablesLabel", descKey: "reports.patronHubGuideLinkCashTablesDesc" },
          { href: "/reports/patron-flow", labelKey: "reports.patronHubGuideLinkPatronFlowLabel", descKey: "reports.patronHubGuideLinkPatronFlowDesc" },
        ],
      },
      stock: {
        intro: t("reports.patronHubGuideIntroStock"),
        flow: [
          t("reports.patronHubGuideFlow1Stock"),
          t("reports.patronHubGuideFlow2Stock"),
          t("reports.patronHubGuideFlow3Stock"),
        ],
        tabAnswer: t("reports.patronHubGuideTabStock"),
        footer: t("reports.patronHubGuideFooterStock"),
        elsewhere: [
          { href: "/warehouses", labelKey: "reports.patronHubGuideLinkWarehousesLabel", descKey: "reports.patronHubGuideLinkWarehousesDesc" },
          { href: "/branches", labelKey: "reports.patronHubGuideLinkBranchesLabel", descKey: "reports.patronHubGuideLinkBranchesStockDesc" },
          { href: "/reports/stock/tables", labelKey: "reports.patronHubGuideLinkStockTablesLabel", descKey: "reports.patronHubGuideLinkStockTablesDesc" },
        ],
      },
    };
    const cfg = map[tab];
    const elsewhere = cfg.elsewhere.map((item) => ({
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
            <p className="mt-1.5">{cfg.intro}</p>
          </div>
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
              {t("reports.patronHubGuideFlowTitle")}
            </p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4">
              {cfg.flow.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
              {t("reports.patronHubGuideThisTabTitle")}
            </p>
            <p className="mt-1.5">{cfg.tabAnswer}</p>
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
          <p className="text-xs leading-relaxed text-zinc-600">{cfg.footer}</p>
        </div>
      </div>
    );
  }, [tab, t]);

  const reportsHubFilterScopeBelow = useMemo(() => {
    if (tab === "cash") {
      return (
        <div>
          <p className="rounded-lg border border-zinc-200/80 bg-zinc-50/90 px-3 py-2 text-xs leading-relaxed text-zinc-700">
            {t("reports.hubFilterEffectsScopeLeadCash")}
          </p>
          <p className="mt-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500">
            {t("reports.hubFilterEffectsTitle")}
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-zinc-800 sm:text-sm">
            <li>{t("reports.hubFilterEffectsCash1")}</li>
            <li>{t("reports.hubFilterEffectsCash2")}</li>
          </ul>
        </div>
      );
    }
    return (
      <div>
        <p className="rounded-lg border border-zinc-200/80 bg-zinc-50/90 px-3 py-2 text-xs leading-relaxed text-zinc-700">
          {t("reports.hubFilterEffectsScopeLeadStock")}
        </p>
        <p className="mt-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500">
          {t("reports.hubFilterEffectsTitle")}
        </p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-zinc-800 sm:text-sm">
          <li>{t("reports.hubFilterEffectsStock1")}</li>
          <li>{t("reports.hubFilterEffectsStock2")}</li>
        </ul>
      </div>
    );
  }, [tab, t]);

  return (
    <>
      <PageScreenScaffold
        variant="report"
        className="w-full min-w-0 pb-6 pt-2 sm:pb-8 sm:pt-4 md:pt-0"
        intro={
          <>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
                  {t("reports.title")}
                </h1>
                <p className="mt-0.5 break-words text-xs leading-relaxed text-zinc-500 sm:text-sm">
                  {t("reports.subtitle")}
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
          </>
        }
        main={
          <>
      <ReportMobileFilterSurface
        variant="drawerOnly"
        filtersActive={reportFiltersActive}
        drawerTitle={t("reports.filtersSectionTitle")}
        resetKey={tab}
        preview={hubFilterPreview}
        aboveToolbar={null}
        belowToolbar={reportsHubFilterScopeBelow}
        onRefetch={() => void activeQuery.refetch()}
        isRefetching={activeQuery.isFetching}
        main={
          <>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-zinc-900">
            {tab === "cash" ? t("reports.tabCashPosition") : t("reports.tabStock")}
          </p>
          <p className="text-sm leading-snug text-zinc-600">{tabOneLiner}</p>
        </div>
        <ReportsPatronStoryInfoButton tab={tab} />
      </div>
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

      {((tab === "stock" && stock.data) || (tab === "cash" && cash.data)) ? (
        <div
          className="sticky top-2 z-10 grid grid-cols-2 gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 shadow-sm backdrop-blur-sm sm:p-1"
          role="tablist"
          aria-label={t("reports.reportViewSwitchAria")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={reportView === "summary"}
            onClick={() => setReportView("summary")}
            className={`min-h-11 touch-manipulation rounded-md px-4 py-2 text-sm font-semibold transition sm:min-h-10 ${
              reportView === "summary"
                ? "bg-white text-zinc-900 shadow"
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
            className={`min-h-11 touch-manipulation rounded-md px-4 py-2 text-sm font-semibold transition sm:min-h-10 ${
              reportView === "tables"
                ? "bg-white text-zinc-900 shadow"
                : "text-zinc-600 active:bg-zinc-200/80 sm:hover:text-zinc-900"
            }`}
          >
            {t("reports.reportViewTablesPatron")}
          </button>
        </div>
      ) : null}

      {tab === "stock" && stock.data ? (
        <div className="flex flex-col gap-4 sm:gap-6">
          {reportView === "summary" ? (
            <div className="flex flex-col gap-3">
              <ReportStockCharts data={stock.data} />
              <div className="flex justify-center">
                <Link href="/reports/stock/tables" className={INTRO_PATRON_MAP_LINK_CLASS}>
                  {t("reports.hubOpenStockFullTables")}
                </Link>
              </div>
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
          {reportView === "summary" ? (
            <>
              {cash.data.branches.length > 0 ? (
                <ReportCashPatronHighlights
                  branches={cash.data.branches}
                  totals={cash.data.totals}
                  heldLines={cash.data.registerCashHeldByPersonnelLines ?? []}
                  t={t}
                  locale={locale}
                  asOfDateIso={cash.data.asOfDate}
                  asOfLabel={`${cash.data.asOfDate}${
                    cash.data.openSeasonOnly
                      ? ` · ${t("reports.cashOpenSeasonOnlyShort")}`
                      : ` · ${t("reports.cashAllBranchesShort")}`
                  }`}
                />
              ) : null}
              {cash.data.branches.length === 0 ? (
                <>
                  <p className="text-sm leading-relaxed text-zinc-600">
                    {t("reports.cashPositionLead")}{" "}
                    <span className="font-medium text-zinc-800">
                      {cash.data.asOfDate}
                      {cash.data.openSeasonOnly
                        ? ` · ${t("reports.cashOpenSeasonOnlyShort")}`
                        : ` · ${t("reports.cashAllBranchesShort")}`}
                    </span>
                  </p>
                  <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                    {t("reports.cashPositionEmpty")}
                  </p>
                </>
              ) : null}
              <div className="flex justify-center pt-1">
                <Link href="/reports/cash" className={INTRO_PATRON_MAP_LINK_CLASS}>
                  {t("reports.hubOpenCashFullTable")}
                </Link>
              </div>
            </>
          ) : cash.data.branches.length === 0 ? (
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
                    {t("reports.cashColHeldPersonnel")}
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
                    <TableCell
                      dataLabel={t("reports.cashColHeldPersonnel")}
                      className="text-right tabular-nums text-sky-950"
                    >
                      {formatLocaleAmount(row.cumulativeRegisterCashHeldByPersonnel ?? 0, locale)}
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
                    dataLabel={t("reports.cashColHeldPersonnel")}
                    className="bg-zinc-50/90 text-right tabular-nums font-semibold text-sky-950"
                  >
                    {formatLocaleAmount(cash.data.totals.cumulativeRegisterCashHeldByPersonnel ?? 0, locale)}
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

          </>
        }
      >
        <div className="flex flex-col gap-4">
          {tab === "cash" ? (
            <ReportCashAsOfFilterBlock
              t={t}
              asOfDate={cashAsOfDate}
              onAsOfChange={setCashAsOfDate}
              openSeasonOnly={cashOpenSeasonOnly}
              onOpenSeasonOnlyChange={setCashOpenSeasonOnly}
              mode={cashAsOfMode}
              onModeChange={setCashAsOfMode}
              cashYearSelectExtraHint={t("reports.cashAsOfSeasonYearCrossTabHint")}
              onSyncHubCalendarYear={(y) => {
                const { dateFrom: f, dateTo: d } = calendarYearRangeIso(y);
                setDateFrom(f);
                setDateTo(d);
                setDateRangeLock("calendarYear");
              }}
            />
          ) : (
            <>
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
                  const y = inferCalendarSeasonYearFromRange(f, d);
                  if (y != null) {
                    setCashAsOfDate(`${y}-12-31`);
                    setCashAsOfMode("calendarYearEnd");
                  }
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
      </ReportMobileFilterSurface>
          </>
        }
      />
    </>
  );
}
