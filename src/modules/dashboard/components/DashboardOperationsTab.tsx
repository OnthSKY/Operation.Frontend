"use client";

import { normalizeWarehouseStock } from "@/modules/dashboard/api/overview-api";
import { StoryBlock, DashboardStorySlide } from "@/modules/dashboard/components/DashboardStoryPrimitives";
import { StatSkeleton } from "@/modules/dashboard/components/DashboardMetricValue";
import { fillDashboardTemplate } from "@/modules/dashboard/components/dashboard-utils";
import { DashboardSectionHeader, KpiCard, UI } from "@/modules/dashboard/components/dashboard-ui";
import { Card } from "@/shared/components/Card";
import type { Locale } from "@/i18n/messages";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import Link from "next/link";
import type { UseQueryResult } from "@tanstack/react-query";
import type { DashboardOverview } from "@/types/dashboard-overview";

export function DashboardOperationsTab({
  t,
  locale,
  overview,
}: {
  t: (key: string) => string;
  locale: Locale;
  overview: UseQueryResult<DashboardOverview>;
}) {
  const linkCls =
    "mt-3 inline-block text-sm font-semibold text-violet-800 underline-offset-2 hover:underline";
  const isUpdating = overview.isFetching;

  return (
    <div
      className={`min-w-0 transition-opacity duration-200 ease-in-out ${
        isUpdating ? "opacity-90" : "opacity-100"
      }`}
      role="tabpanel"
    >
      <StoryBlock
        title={t("dashboard.storyOperations")}
        description={t("dashboard.storyOperationsDesc")}
      >
        {overview.isError ? (
          <div className="rounded-xl border border-red-200/70 bg-red-50/50 px-4 py-3 sm:px-5">
            <p className="text-sm text-red-700">{t("dashboard.overviewLoadError")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {!overview.isPending &&
            overview.data &&
            overview.data.operations.activeWarehouseCount > 1 ? (
              <Link
                href="/warehouses"
                className="block rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/30 px-4 py-3.5 shadow-sm ring-1 ring-violet-200/25 transition hover:border-violet-300/80 hover:shadow-md sm:px-5 sm:py-4"
              >
                <p className="text-sm font-semibold text-violet-950">
                  {fillDashboardTemplate(t("dashboard.warehouseMultiCtaTitle"), {
                    count: String(overview.data.operations.activeWarehouseCount),
                  })}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-violet-900/80">
                  {t("dashboard.warehouseMultiCtaBody")}
                </p>
                <span className="mt-2 inline-block text-sm font-semibold text-violet-800 underline-offset-2 hover:underline">
                  {t("dashboard.warehouseMultiCtaLink")}
                </span>
              </Link>
            ) : null}

            <div className="grid min-w-0 grid-cols-1 gap-4 sm:max-w-md sm:gap-4">
              <KpiCard
                title={t("dashboard.statWarehouses")}
                description={t("dashboard.statWarehousesDesc")}
                value={
                  overview.isPending ? (
                    <StatSkeleton />
                  ) : (
                    <p className="text-3xl font-bold text-zinc-900">
                      {overview.data?.operations.activeWarehouseCount ?? 0}
                    </p>
                  )
                }
                footer={
                  !overview.isPending ? (
                    <Link href="/warehouses" className={linkCls}>
                      {t("dashboard.operationsOpenList")}
                    </Link>
                  ) : null
                }
              />
            </div>

            <div className={`${UI.surface} p-4 shadow-sm sm:p-5`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <DashboardSectionHeader
                    title={t("dashboard.warehouseStockStoryTitle")}
                    description={t("dashboard.warehouseStockStoryDesc")}
                  />
                </div>
                <Link
                  href="/warehouses"
                  className="shrink-0 text-sm font-semibold text-teal-900 underline-offset-2 hover:underline"
                >
                  {t("dashboard.warehouseStockSeeWarehouses")}
                </Link>
              </div>
              {overview.isPending ? (
                <div className="mt-4 space-y-2">
                  <StatSkeleton />
                  <StatSkeleton />
                </div>
              ) : overview.isError ? (
                <p className="mt-4 text-sm text-red-600">
                  {toErrorMessage((overview as UseQueryResult<DashboardOverview>).error)}
                </p>
              ) : (
                (() => {
                  const ws = normalizeWarehouseStock(overview.data?.operations?.warehouseStock);
                  return (
                    <>
                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <DashboardStorySlide>
                          <div className={`${UI.elevated} rounded-lg p-3`}>
                            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-teal-900/75">
                              {t("dashboard.warehouseStockKindsLabel")}
                            </p>
                            <p className="mt-1.5 text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
                              {ws.distinctProductCount}
                            </p>
                          </div>
                        </DashboardStorySlide>
                        <DashboardStorySlide>
                          <div className={`${UI.elevated} rounded-lg p-3`}>
                            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-teal-900/75">
                              {t("dashboard.warehouseStockTotalUnitsLabel")}
                            </p>
                            <p className="mt-1.5 text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
                              {formatLocaleAmount(ws.totalUnitsApprox, locale)}
                            </p>
                            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                              {t("dashboard.warehouseStockTotalUnitsFootnote")}
                            </p>
                          </div>
                        </DashboardStorySlide>
                      </div>
                      {ws.distinctProductCount === 0 ? (
                        <p className="mt-4 text-sm text-zinc-600">{t("dashboard.warehouseStockEmpty")}</p>
                      ) : ws.topByQuantity.length > 0 ? (
                        <>
                          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                            {t("dashboard.warehouseStockTopTitle")}
                          </p>
                          <ul className="mt-2 divide-y divide-zinc-200/80 overflow-hidden rounded-xl border border-zinc-200/80 bg-white/95 shadow-sm">
                            {ws.topByQuantity.map((row) => (
                              <li
                                key={row.productId}
                                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
                              >
                                <span className="min-w-0 font-medium text-zinc-900">
                                  {row.productName || "—"}
                                </span>
                                <span className="shrink-0 tabular-nums font-semibold text-teal-950">
                                  {formatLocaleAmount(row.quantity, locale)}
                                  {row.unit ? (
                                    <span className="ml-1.5 text-xs font-medium text-zinc-500">{row.unit}</span>
                                  ) : null}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </>
                  );
                })()
              )}
            </div>
          </div>
        )}
      </StoryBlock>
    </div>
  );
}
