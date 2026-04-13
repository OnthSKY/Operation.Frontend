"use client";

import { normalizeWarehouseStock } from "@/modules/dashboard/api/overview-api";
import { StatSkeleton } from "@/modules/dashboard/components/DashboardMetricValue";
import { DashboardStorySlide } from "@/modules/dashboard/components/DashboardStoryPrimitives";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { Card } from "@/shared/components/Card";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { Button } from "@/shared/ui/Button";
import Link from "next/link";
import type { UseQueryResult } from "@tanstack/react-query";
import type { DashboardOverview } from "@/types/dashboard-overview";

export function DashboardCumulativeStorySection({
  t,
  locale,
  overview,
  onRegisterCashDetailClick,
  sectionClassName = "mt-6 space-y-4",
}: {
  t: (key: string) => string;
  locale: Locale;
  overview: UseQueryResult<DashboardOverview>;
  onRegisterCashDetailClick: () => void;
  /** Root wrapper class for the cumulative block. */
  sectionClassName?: string;
}) {
  const heldBreakdown =
    overview.data?.financeExtras.registerCashHeldByPersonnelBreakdown ?? [];
  const heldPreview = heldBreakdown.slice(0, 5);
  const heldMore = Math.max(0, heldBreakdown.length - heldPreview.length);

  return (
      <div className={sectionClassName}>
        <div>
          <h3 className="text-base font-semibold text-zinc-900">
            {t("dashboard.scopeSectionCumulativeTitle")}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-600">
            {t("dashboard.scopeSectionCumulativeHint")}
          </p>
        </div>

        {overview.isPending ? (
          <div className="max-w-xl rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-6">
            <StatSkeleton />
          </div>
        ) : overview.isError ? (
          <div className="max-w-xl rounded-2xl border border-red-200/80 bg-red-50/50 p-4 text-sm text-red-700">
            {toErrorMessage(overview.error)}
          </div>
        ) : overview.data ? (
          <div
            className={cn(
              "max-w-xl rounded-2xl border-2 p-4 shadow-sm",
              (overview.data.financeExtras.allBranchesLifetimeEconomicNet ?? 0) >
              0.005
                ? "border-sky-300/80 bg-sky-50/90"
                : (overview.data.financeExtras.allBranchesLifetimeEconomicNet ??
                      0) < -0.005
                  ? "border-orange-300/80 bg-orange-50/90"
                  : "border-zinc-200/90 bg-zinc-50/90"
            )}
          >
            <span className="inline-flex w-fit rounded-full bg-white/90 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-zinc-700 ring-1 ring-zinc-200/80">
              {t("dashboard.storyStep2Badge")}
            </span>
            <p className="mt-2 text-sm font-semibold text-zinc-900">
              {t("dashboard.storyStep2Title")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600">
              {t("dashboard.storyStep2Formula")}
            </p>
            <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              {t("dashboard.storyLifetimeNetLabel")}
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-snug text-zinc-800">
              {(overview.data.financeExtras.allBranchesLifetimeEconomicNet ?? 0) >
              0.005
                ? t("dashboard.storyLifetimeAhead")
                : (overview.data.financeExtras.allBranchesLifetimeEconomicNet ??
                      0) < -0.005
                  ? t("dashboard.storyLifetimeShort")
                  : t("dashboard.storyLifetimeEven")}
            </p>
            <p className="mt-2 tabular-nums text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              {formatLocaleAmount(
                overview.data.financeExtras.allBranchesLifetimeEconomicNet ?? 0,
                locale
              )}
            </p>
            <p className="mt-3 border-t border-zinc-200/70 pt-3 text-xs leading-relaxed text-zinc-600">
              {t("dashboard.storyLifetimeNetHint")}
            </p>
          </div>
        ) : null}

        <p className="text-xs text-zinc-500 md:hidden">
          {t("dashboard.storyMobileSwipeHint")}
        </p>

      <div
        className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:overflow-visible md:pb-0 md:snap-none"
        aria-busy={overview.isPending ? true : undefined}
      >
        <DashboardStorySlide>
        <Card
          title={t("dashboard.statActivePersonnel")}
          description={t("dashboard.statActivePersonnelDesc")}
          className="bg-white/90"
        >
          {overview.isPending ? (
            <StatSkeleton />
          ) : overview.isError ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">
                {toErrorMessage(overview.error)}
              </p>
              <p className="text-xs text-red-900/80">{t("common.loadErrorHint")}</p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => void overview.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
              {overview.data?.personnel.activePersonnelCount ?? 0}
            </p>
          )}
        </Card>
        </DashboardStorySlide>

        <DashboardStorySlide>
        <Card
          title={t("dashboard.statBranches")}
          description={t("dashboard.statBranchesDesc")}
          className="bg-white/90"
        >
          {overview.isPending ? (
            <StatSkeleton />
          ) : overview.isError ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">
                {toErrorMessage(overview.error)}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => void overview.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
              {overview.data?.operations.activeBranchCount ?? 0}
            </p>
          )}
        </Card>
        </DashboardStorySlide>

        <DashboardStorySlide>
        <Card
          title={t("dashboard.statWarehouses")}
          description={t("dashboard.statWarehousesDesc")}
          className="bg-white/90"
        >
          {overview.isPending ? (
            <StatSkeleton />
          ) : overview.isError ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">
                {toErrorMessage(overview.error)}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => void overview.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
              {overview.data?.operations.activeWarehouseCount ?? 0}
            </p>
          )}
        </Card>
        </DashboardStorySlide>

        <DashboardStorySlide>
        <Card
          title={t("dashboard.statActiveSuppliers")}
          description={t("dashboard.statActiveSuppliersDesc")}
          className="bg-white/90"
        >
          {overview.isPending ? (
            <StatSkeleton />
          ) : overview.isError ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">
                {toErrorMessage(overview.error)}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => void overview.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
              {overview.data?.operations.activeSupplierCount ?? 0}
            </p>
          )}
        </Card>
        </DashboardStorySlide>

        <DashboardStorySlide>
        <Card
          title={t("dashboard.statActiveVehicles")}
          description={t("dashboard.statActiveVehiclesDesc")}
          className="bg-white/90"
        >
          {overview.isPending ? (
            <StatSkeleton />
          ) : overview.isError ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">
                {toErrorMessage(overview.error)}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => void overview.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
              {overview.data?.operations.activeVehicleCount ?? 0}
            </p>
          )}
        </Card>
        </DashboardStorySlide>

        <DashboardStorySlide>
        <Card
          title={t("dashboard.statActiveProducts")}
          description={t("dashboard.statActiveProductsDesc")}
          className="bg-white/90"
        >
          {overview.isPending ? (
            <StatSkeleton />
          ) : overview.isError ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-red-600">
                {toErrorMessage(overview.error)}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => void overview.refetch()}
              >
                {t("common.retry")}
              </Button>
            </div>
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
              {overview.data?.operations.activeProductCount ?? 0}
            </p>
          )}
        </Card>
        </DashboardStorySlide>
      </div>

      <div className="mt-4 rounded-xl border border-teal-200/70 bg-gradient-to-br from-teal-50/85 via-white to-emerald-50/30 p-4 shadow-sm ring-1 ring-teal-100/45 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900">
              {t("dashboard.warehouseStockStoryTitle")}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600 sm:text-sm">
              {t("dashboard.warehouseStockStoryDesc")}
            </p>
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
          <p className="mt-4 text-sm text-red-600">{toErrorMessage(overview.error)}</p>
        ) : (
          (() => {
            const ws = normalizeWarehouseStock(
              overview.data?.operations?.warehouseStock
            );
            return (
              <>
                <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] md:grid md:grid-cols-2 md:overflow-visible md:pb-0 md:snap-none">
                  <div className="w-full max-md:w-[min(88vw,19rem)] max-md:shrink-0 max-md:snap-start rounded-lg border border-teal-100/90 bg-white/95 p-3 shadow-sm">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-teal-900/75">
                      {t("dashboard.warehouseStockKindsLabel")}
                    </p>
                    <p className="mt-1.5 text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
                      {ws.distinctProductCount}
                    </p>
                  </div>
                  <div className="w-full max-md:w-[min(88vw,19rem)] max-md:shrink-0 max-md:snap-start rounded-lg border border-teal-100/90 bg-white/95 p-3 shadow-sm">
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
                </div>
                {ws.distinctProductCount === 0 ? (
                  <p className="mt-4 text-sm text-zinc-600">
                    {t("dashboard.warehouseStockEmpty")}
                  </p>
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
                              <span className="ml-1.5 text-xs font-medium text-zinc-500">
                                {row.unit}
                              </span>
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

      {heldPreview.length > 0 ? (
        <div className="mt-4 rounded-xl border border-sky-200/60 bg-white/70 p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-900/85">
            {t("dashboard.registerCashHeroTitle")}
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-800">
            {heldPreview.map((row, i) => {
              const b = row.registerBranchName?.trim();
              return (
                <li
                  key={`${row.personnelId}-${row.currencyCode}-${b ?? i}-${i}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5"
                >
                  <span className="min-w-0">
                    <span className="font-medium text-zinc-900">
                      {row.fullName}
                    </span>
                    {b ? (
                      <span className="text-zinc-500">
                        {" "}
                        · {b}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-sky-900">
                    {formatLocaleAmount(
                      row.totalAmount,
                      locale,
                      row.currencyCode
                    )}{" "}
                    <span className="text-xs font-medium text-zinc-500">
                      {row.currencyCode}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          {heldMore > 0 ? (
            <p className="mt-2 text-xs text-zinc-500">
              +{heldMore} {t("dashboard.registerCashMoreLines")}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onRegisterCashDetailClick}
            className="mt-2 inline-block text-sm font-semibold text-violet-700 underline-offset-2 hover:underline"
          >
            {t("dashboard.registerCashSeeDetail")}
          </button>
        </div>
      ) : null}
      </div>
  );
}
