"use client";

import type { ProductCategory } from "@/modules/products/api/product-categories-api";
import {
  buildWarehouseStockCategoryBreakdown,
  isUncategorizedSection,
} from "@/modules/warehouse/lib/warehouse-stock-grouped-sections";
import {
  useWarehouseMovementsPage,
  useWarehouseStock,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { fillDashboardTemplate } from "@/modules/dashboard/components/dashboard-utils";
import { DashboardStorySlide, StoryBlock } from "@/modules/dashboard/components/DashboardStoryPrimitives";
import { useI18n } from "@/i18n/context";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/lib/cn";
import type { ProductListItem, WarehouseProductStockRow } from "@/types/product";
import { useMemo } from "react";

function countParentProductGroups(rows: WarehouseProductStockRow[]): number {
  const roots = new Set<number>();
  for (const r of rows) {
    const pid = r.parentProductId;
    roots.add(pid != null && pid > 0 ? pid : r.productId);
  }
  return roots.size;
}

type Props = {
  warehouseId: number;
  active: boolean;
  productCatalog: ProductListItem[];
  productCategories: ProductCategory[];
  onOpenMovementsTab?: () => void;
};

export function WarehouseOverviewStorySection({
  warehouseId,
  active,
  productCatalog,
  productCategories,
  onOpenMovementsTab,
}: Props) {
  const { t, locale } = useI18n();
  const stockQ = useWarehouseStock(active ? warehouseId : null, {});
  const movQ = useWarehouseMovementsPage(
    active ? warehouseId : null,
    { page: 1, pageSize: 12 },
    active
  );

  const rows = stockQ.data ?? [];
  const distinctSku = useMemo(() => new Set(rows.map((r) => r.productId)).size, [rows]);
  const totalUnits = useMemo(() => rows.reduce((s, r) => s + r.quantity, 0), [rows]);
  const parentGroups = useMemo(() => countParentProductGroups(rows), [rows]);
  const topByQty = useMemo(
    () =>
      [...rows]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 6)
        .filter((r) => r.quantity > 0),
    [rows]
  );

  const byMain = useMemo(
    () =>
      buildWarehouseStockCategoryBreakdown(rows, productCatalog, productCategories, "category"),
    [rows, productCatalog, productCategories]
  );
  const bySub = useMemo(
    () =>
      buildWarehouseStockCategoryBreakdown(rows, productCatalog, productCategories, "subcategory"),
    [rows, productCatalog, productCategories]
  );

  const movements = movQ.data?.items ?? [];
  const uncategorizedSku = useMemo(() => {
    const u = bySub.find((b) => isUncategorizedSection(b.sectionId));
    return u?.productCount ?? 0;
  }, [bySub]);
  const totalInLifetime = movQ.data?.totalInQuantity;
  const totalOutLifetime = movQ.data?.totalOutQuantity;
  const movementLineTotal = movQ.data?.totalCount;

  const breakdownTitle = (sectionId: string, raw: string) =>
    isUncategorizedSection(sectionId) ? t("warehouse.stockSectionUncategorized") : raw;

  const slideCardClass =
    "flex h-full min-h-[11rem] flex-col rounded-lg border border-teal-100/90 bg-white/95 p-3 shadow-sm";

  return (
    <StoryBlock
      id="warehouse-overview"
      title={t("warehouse.overviewTitle")}
      description={t("warehouse.overviewDescription")}
    >
      {stockQ.isPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : stockQ.isError ? (
        <p className="text-sm text-red-600">{toErrorMessage(stockQ.error)}</p>
      ) : (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] md:grid md:grid-cols-2 md:overflow-visible md:pb-0 md:snap-none xl:grid-cols-3">
          <DashboardStorySlide>
            <div className={cn(slideCardClass, "min-h-[16rem]")}>
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-teal-900/75">
                {t("warehouse.overviewDistinctProductsLabel")}
              </p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
                {distinctSku}
              </p>
              <p className="mt-3 text-[0.65rem] font-bold uppercase tracking-wide text-teal-900/75">
                {t("warehouse.overviewTotalUnitsLabel")}
              </p>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
                {formatLocaleAmount(totalUnits, locale)}
              </p>
              <dl className="mt-3 space-y-1.5 border-t border-teal-100/80 pt-3 text-xs text-zinc-700">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">{t("warehouse.overviewParentGroupsLabel")}</dt>
                  <dd className="tabular-nums font-medium text-zinc-900">{parentGroups}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">{t("warehouse.overviewUncategorizedSkusLabel")}</dt>
                  <dd className="tabular-nums font-medium text-zinc-900">{uncategorizedSku}</dd>
                </div>
                {movQ.isSuccess && movementLineTotal != null ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">{t("warehouse.overviewRegisteredMovementLines")}</dt>
                    <dd className="tabular-nums font-medium text-zinc-900">{movementLineTotal}</dd>
                  </div>
                ) : null}
                {movQ.isSuccess &&
                totalInLifetime != null &&
                totalOutLifetime != null &&
                Number.isFinite(totalInLifetime) &&
                Number.isFinite(totalOutLifetime) ? (
                  <div className="flex flex-col gap-0.5 pt-0.5">
                    <dt className="text-zinc-500">{t("warehouse.overviewLifetimeInOutTitle")}</dt>
                    <dd className="text-right text-[0.7rem] font-medium leading-snug text-zinc-800 sm:text-xs">
                      {fillDashboardTemplate(t("warehouse.overviewLifetimeInOutLine"), {
                        inQty: formatLocaleAmount(totalInLifetime, locale),
                        outQty: formatLocaleAmount(totalOutLifetime, locale),
                      })}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <p className="mt-auto pt-2 text-xs leading-relaxed text-zinc-500">
                {t("warehouse.overviewTotalUnitsFootnote")}
              </p>
            </div>
          </DashboardStorySlide>

          <DashboardStorySlide>
            <div className={cn(slideCardClass, "min-h-[14rem]")}>
              <p className="shrink-0 text-[0.65rem] font-bold uppercase tracking-wide text-teal-900/75">
                {t("warehouse.overviewByMainCategory")}
              </p>
              <ul className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto text-sm">
                {byMain.length === 0 ? (
                  <li className="text-zinc-500">{t("warehouse.overviewBreakdownEmpty")}</li>
                ) : (
                  byMain.map((b) => (
                    <li
                      key={b.sectionId}
                      className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b border-zinc-100/90 pb-1.5 last:border-0"
                    >
                      <span className="min-w-0 flex-1 truncate text-zinc-800">
                        {breakdownTitle(b.sectionId, b.title)}
                      </span>
                      <span className="shrink-0 text-right tabular-nums text-zinc-600">
                        <span className="block text-xs text-zinc-500">
                          {fillDashboardTemplate(t("warehouse.overviewSkuCount"), {
                            count: String(b.productCount),
                          })}
                        </span>
                        <span className="block font-medium text-zinc-800">
                          {formatLocaleAmount(b.totalQuantity, locale)}
                        </span>
                      </span>
                    </li>
                  ))
                )}
              </ul>
              <p className="mt-2 text-[0.65rem] leading-relaxed text-zinc-500">
                {t("warehouse.overviewQtyMixedUnitsHint")}
              </p>
            </div>
          </DashboardStorySlide>

          <DashboardStorySlide>
            <div className={cn(slideCardClass, "min-h-[14rem]")}>
              <p className="shrink-0 text-[0.65rem] font-bold uppercase tracking-wide text-teal-900/75">
                {t("warehouse.overviewBySubcategory")}
              </p>
              <ul className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto text-sm">
                {bySub.length === 0 ? (
                  <li className="text-zinc-500">{t("warehouse.overviewBreakdownEmpty")}</li>
                ) : (
                  bySub.map((b) => (
                    <li
                      key={b.sectionId}
                      className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b border-zinc-100/90 pb-1.5 last:border-0"
                    >
                      <span className="min-w-0 flex-1 truncate text-zinc-800">
                        {breakdownTitle(b.sectionId, b.title)}
                      </span>
                      <span className="shrink-0 text-right tabular-nums text-zinc-600">
                        <span className="block text-xs text-zinc-500">
                          {fillDashboardTemplate(t("warehouse.overviewSkuCount"), {
                            count: String(b.productCount),
                          })}
                        </span>
                        <span className="block font-medium text-zinc-800">
                          {formatLocaleAmount(b.totalQuantity, locale)}
                        </span>
                      </span>
                    </li>
                  ))
                )}
              </ul>
              <p className="mt-2 text-[0.65rem] leading-relaxed text-zinc-500">
                {t("warehouse.overviewQtyMixedUnitsHint")}
              </p>
            </div>
          </DashboardStorySlide>

          <DashboardStorySlide>
            <div className={cn(slideCardClass, "min-h-[14rem]")}>
              <p className="shrink-0 text-[0.65rem] font-bold uppercase tracking-wide text-teal-900/75">
                {t("warehouse.overviewTopByQuantity")}
              </p>
              <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto text-sm">
                {topByQty.length === 0 ? (
                  <li className="text-zinc-500">{t("warehouse.overviewTopByQuantityEmpty")}</li>
                ) : (
                  topByQty.map((r, i) => (
                    <li
                      key={r.productId}
                      className="flex items-start justify-between gap-2 rounded-md border border-zinc-100 bg-zinc-50/80 px-2 py-1.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="mr-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[0.65rem] font-bold text-teal-900">
                          {i + 1}
                        </span>
                        <span className="font-medium leading-snug text-zinc-900">{r.productName}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-sm font-semibold text-zinc-800">
                        {formatLocaleAmount(r.quantity, locale)}
                        {r.unit?.trim() ? (
                          <span className="ml-1 text-xs font-normal text-zinc-500">{r.unit.trim()}</span>
                        ) : null}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </DashboardStorySlide>

          <DashboardStorySlide>
            <div className={cn(slideCardClass, "min-h-[14rem]")}>
              <div className="flex shrink-0 items-start justify-between gap-2">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-teal-900/75">
                  {t("warehouse.overviewRecentMovements")}
                </p>
                {onOpenMovementsTab ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto min-h-0 shrink-0 px-2 py-0.5 text-xs font-medium text-teal-800 hover:bg-teal-50"
                    onClick={onOpenMovementsTab}
                  >
                    {t("warehouse.overviewAllMovements")}
                  </Button>
                ) : null}
              </div>
              <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto text-sm">
                {movQ.isPending ? (
                  <li className="text-zinc-500">{t("common.loading")}</li>
                ) : movQ.isError ? (
                  <li className="text-red-600">{toErrorMessage(movQ.error)}</li>
                ) : movements.length === 0 ? (
                  <li className="text-zinc-500">{t("warehouse.movementsEmpty")}</li>
                ) : (
                  movements.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-md border border-zinc-100 bg-zinc-50/80 px-2 py-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-bold uppercase",
                            m.type === "IN"
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-rose-100 text-rose-900"
                          )}
                        >
                          {m.type === "IN" ? t("warehouse.movementIn") : t("warehouse.movementOut")}
                        </span>
                        <span className="text-xs tabular-nums text-zinc-500">
                          {formatLocaleDate(m.movementDate.slice(0, 10), locale)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 font-medium leading-snug text-zinc-900">
                        {m.productName}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-zinc-600">
                        {formatLocaleAmount(m.quantity, locale)}
                        {m.unit?.trim() ? ` ${m.unit.trim()}` : ""}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </DashboardStorySlide>
        </div>
      )}
    </StoryBlock>
  );
}
