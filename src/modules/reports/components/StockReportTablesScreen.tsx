"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { StockReportDetailTables } from "@/modules/reports/components/ReportsDetailTables";
import { ReportsPatronTabStory } from "@/modules/reports/components/ReportsPatronTabStory";
import { ReportSeasonYearQuickSelect } from "@/modules/reports/components/ReportSeasonYearQuickSelect";
import { ReportTablesPageShell } from "@/modules/reports/components/ReportTablesPageShell";
import {
  addDaysFromIso,
  startOfMonthIso,
} from "@/modules/reports/lib/report-period-helpers";
import { useStockReport } from "@/modules/reports/hooks/useReportsQueries";
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
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Select } from "@/shared/ui/Select";
import { useMemo, useState } from "react";

export function StockReportTablesScreen() {
  const { t, locale } = useI18n();
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

  const stock = useStockReport(stockParams, true);

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

  const filtersActive =
    stockWarehouseId !== "" ||
    stockBranchId !== "" ||
    warehouseScopeFiltersActive(stockScope);

  return (
    <ReportTablesPageShell
      title={t("reports.tablesPageStockTitle")}
      subtitle={t("reports.tablesPageStockSubtitle")}
      pageGuide={
        <PageWhenToUseGuide
          guideTab="reports"
          title={t("common.pageWhenToUseTitle")}
          description={t("pageHelp.reportsStock.intro")}
          listVariant="ordered"
          items={[
            { text: t("pageHelp.reportsStock.step1") },
            {
              text: t("pageHelp.reportsStock.step2"),
              link: { href: "/warehouses", label: t("pageHelp.reportsStock.step2Link") },
            },
            {
              text: t("pageHelp.reportsStock.step3"),
              link: { href: "/branches", label: t("pageHelp.reportsStock.step3Link") },
            },
          ]}
        />
      }
    >
      <CollapsibleMobileFilters
        title={t("reports.filtersSectionTitle")}
        toggleAriaLabel={t("common.filters")}
        active={filtersActive}
        resetKey="stock-tables"
        expandLabel={t("common.filtersShow")}
        collapseLabel={t("common.filtersHide")}
      >
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
          <ReportSeasonYearQuickSelect
            dateFrom={dateFrom}
            dateTo={dateTo}
            onApplyRange={(f, d) => {
              setDateFrom(f);
              setDateTo(d);
            }}
            className="max-w-full sm:max-w-sm"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>
          <div className="space-y-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-xs font-medium text-zinc-600">
              {t("reports.stockScopeFiltersTitle")}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                name="stockTablesWarehouseFilter"
                label={t("reports.colWarehouse")}
                options={stockWarehouseOptions}
                value={stockWarehouseId}
                onChange={(e) => setStockWarehouseId(e.target.value)}
                onBlur={() => {}}
                className="min-h-11 sm:min-h-10 sm:text-sm"
              />
              <Select
                name="stockTablesBranchFilter"
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
        </div>
      </CollapsibleMobileFilters>

      <ReportsPatronTabStory tab="stock" />

      {stock.isFetching && stock.data ? (
        <p className="text-center text-xs text-zinc-400" aria-live="polite">
          {t("reports.updatingHint")}
        </p>
      ) : null}

      {stock.isError ? (
        <p className="text-sm text-red-600">
          {t("reports.error")} {toErrorMessage(stock.error)}
        </p>
      ) : null}

      {stock.isPending ? (
        <p className="text-sm text-zinc-500">{t("reports.loading")}</p>
      ) : null}

      {stock.data ? (
        <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white px-3 py-4 sm:px-5 sm:py-6">
          <StockReportDetailTables
            data={stock.data}
            t={t}
            locale={locale}
            interactive
          />
        </div>
      ) : null}
    </ReportTablesPageShell>
  );
}
