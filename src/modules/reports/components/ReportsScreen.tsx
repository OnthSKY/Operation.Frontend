"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
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
import { ReportStockCharts } from "@/modules/reports/components/ReportStockCharts";
import { useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { Card } from "@/shared/components/Card";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { Button } from "@/shared/ui/Button";
import { useMemo, useEffect, useState } from "react";

function startOfMonthIso(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function addDaysFromIso(iso: string, deltaDays: number): string {
  const [y, mo, da] = iso.split("-").map(Number);
  const dt = new Date(y, mo - 1, da);
  dt.setDate(dt.getDate() + deltaDays);
  return localIsoDate(dt);
}

export function ReportsScreen() {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<"financial" | "stock">("financial");
  const [dateFrom, setDateFrom] = useState(startOfMonthIso);
  const [dateTo, setDateTo] = useState(() => localIsoDate());
  const [finBranchId, setFinBranchId] = useState("");
  const [stockWarehouseId, setStockWarehouseId] = useState("");
  const [stockBranchId, setStockBranchId] = useState("");
  const [reportView, setReportView] = useState<"summary" | "tables">(
    "summary"
  );

  const { data: branches = [] } = useBranchesList();
  const { data: warehouses = [] } = useWarehousesList();

  const finParams = useMemo(
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
    }),
    [dateFrom, dateTo, stockWarehouseId, stockBranchId]
  );

  const financial = useFinancialReport(finParams, tab === "financial");
  const summaryMonthly = useFinancialSummaryMonthly(
    finParams,
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

  useEffect(() => {
    setReportView("summary");
  }, [tab]);

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

  const activeQuery = tab === "financial" ? financial : stock;

  const branchTrendMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const tr of financial.data?.branchTrends ?? []) {
      m.set(`${tr.branchId}:${tr.currencyCode}`, tr.netDelta);
    }
    return m;
  }, [financial.data]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-[max(0.75rem,env(safe-area-inset-left))] pb-20 pt-2 sm:gap-6 sm:px-4 sm:pb-8 sm:pt-4 lg:max-w-6xl 2xl:max-w-7xl">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 sm:text-xl">
          {t("reports.title")}
        </h1>
        <p className="mt-0.5 break-words text-xs leading-relaxed text-zinc-500 sm:text-sm">
          {t("reports.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100/80 p-1">
        <button
          type="button"
          onClick={() => setTab("financial")}
          className={`min-h-12 touch-manipulation rounded-lg px-2 py-2.5 text-sm font-semibold transition sm:min-h-0 sm:px-4 sm:py-2 ${
            tab === "financial"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 active:bg-zinc-200/80 sm:hover:text-zinc-900"
          }`}
        >
          {t("reports.tabFinancial")}
        </button>
        <button
          type="button"
          onClick={() => setTab("stock")}
          className={`min-h-12 touch-manipulation rounded-lg px-2 py-2.5 text-sm font-semibold transition sm:min-h-0 sm:px-4 sm:py-2 ${
            tab === "stock"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 active:bg-zinc-200/80 sm:hover:text-zinc-900"
          }`}
        >
          {t("reports.tabStock")}
        </button>
      </div>
      <p className="break-words text-xs leading-relaxed text-zinc-500">
        {t("reports.tabHint")}
      </p>

      <Card title={t("reports.stepPeriod")} description={t("reports.periodHelp")}>
        <div className="flex flex-col gap-4">
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex min-w-0 flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-700">
                {t("reports.dateFrom")}
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-zinc-200 px-3 py-2 text-base sm:min-h-10 sm:text-sm"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-700">
                {t("reports.dateTo")}
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-zinc-200 px-3 py-2 text-base sm:min-h-10 sm:text-sm"
              />
            </label>
            {tab === "financial" ? (
              <label className="flex min-w-0 flex-col gap-1 text-sm sm:col-span-2">
                <span className="font-medium text-zinc-700">
                  {t("reports.colBranch")}
                </span>
                <select
                  value={finBranchId}
                  onChange={(e) => setFinBranchId(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-zinc-200 px-3 py-2 text-base sm:min-h-10 sm:text-sm"
                >
                  <option value="">{t("reports.allBranches")}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="flex min-w-0 flex-col gap-1 text-sm">
                  <span className="font-medium text-zinc-700">
                    {t("reports.colWarehouse")}
                  </span>
                  <select
                    value={stockWarehouseId}
                    onChange={(e) => setStockWarehouseId(e.target.value)}
                    className="min-h-11 w-full rounded-lg border border-zinc-200 px-3 py-2 text-base sm:min-h-10 sm:text-sm"
                  >
                    <option value="">{t("reports.allWarehouses")}</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-col gap-1 text-sm">
                  <span className="font-medium text-zinc-700">
                    {t("reports.sectionBranchReceipts")}
                  </span>
                  <select
                    value={stockBranchId}
                    onChange={(e) => setStockBranchId(e.target.value)}
                    className="min-h-11 w-full rounded-lg border border-zinc-200 px-3 py-2 text-base sm:min-h-10 sm:text-sm"
                  >
                    <option value="">{t("reports.allBranches")}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="min-h-11 w-full touch-manipulation sm:w-auto sm:min-h-10"
              onClick={() => void activeQuery.refetch()}
              disabled={activeQuery.isFetching}
            >
              {t("reports.apply")}
            </Button>
            {activeQuery.isFetching ? (
              <span className="text-sm text-zinc-500">
                {t("reports.loading")}
              </span>
            ) : null}
          </div>
        </div>
      </Card>

      {activeQuery.isError ? (
        <p className="text-sm text-red-600">
          {t("reports.error")} {toErrorMessage(activeQuery.error)}
        </p>
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
            {t("reports.reportViewSummary")}
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
            {t("reports.reportViewTables")}
          </button>
        </div>
      ) : null}

      {tab === "financial" && financial.data ? (
        <div className="flex flex-col gap-4 sm:gap-6">
          {reportView === "summary" ? (
            <div>
              <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
                {t("reports.stepRead")}
              </p>
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
              <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
                {t("reports.stepTables")}
              </p>
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
              <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
                {t("reports.stepRead")}
              </p>
              <ReportStockCharts data={stock.data} />
            </div>
          ) : (
            <div>
              <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
                {t("reports.stepTables")}
              </p>
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

    </div>
  );
}
