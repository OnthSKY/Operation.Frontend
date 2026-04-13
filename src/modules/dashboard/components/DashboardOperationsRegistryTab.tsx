"use client";

import { StoryBlock } from "@/modules/dashboard/components/DashboardStoryPrimitives";
import { StatSkeleton } from "@/modules/dashboard/components/DashboardMetricValue";
import { Card } from "@/shared/components/Card";
import Link from "next/link";
import type { UseQueryResult } from "@tanstack/react-query";
import type { DashboardOverview } from "@/types/dashboard-overview";

export function DashboardOperationsRegistryTab({
  t,
  overview,
}: {
  t: (key: string) => string;
  overview: UseQueryResult<DashboardOverview>;
}) {
  const linkCls =
    "mt-3 inline-block text-sm font-semibold text-violet-800 underline-offset-2 hover:underline";

  return (
    <div className="min-w-0" role="tabpanel">
      <StoryBlock
        title={t("dashboard.storyRegistryTitle")}
        description={t("dashboard.storyRegistryDesc")}
      >
        {overview.isError ? (
          <div className="rounded-xl border border-red-200/70 bg-red-50/50 px-4 py-3 sm:px-5">
            <p className="text-sm text-red-700">{t("dashboard.overviewLoadError")}</p>
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
            <Card title={t("dashboard.statBranches")} description={t("dashboard.statBranchesDesc")}>
              {overview.isPending ? (
                <StatSkeleton />
              ) : (
                <>
                  <p className="text-2xl font-semibold text-zinc-900">
                    {overview.data?.operations.activeBranchCount ?? 0}
                  </p>
                  <Link href="/branches" className={linkCls}>
                    {t("dashboard.operationsOpenList")}
                  </Link>
                </>
              )}
            </Card>
            <Card
              title={t("dashboard.statActiveSuppliers")}
              description={t("dashboard.statActiveSuppliersDesc")}
            >
              {overview.isPending ? (
                <StatSkeleton />
              ) : (
                <>
                  <p className="text-2xl font-semibold text-zinc-900">
                    {overview.data?.operations.activeSupplierCount ?? 0}
                  </p>
                  <Link href="/suppliers" className={linkCls}>
                    {t("dashboard.operationsOpenList")}
                  </Link>
                </>
              )}
            </Card>
            <Card
              title={t("dashboard.statActiveVehicles")}
              description={t("dashboard.statActiveVehiclesDesc")}
            >
              {overview.isPending ? (
                <StatSkeleton />
              ) : (
                <>
                  <p className="text-2xl font-semibold text-zinc-900">
                    {overview.data?.operations.activeVehicleCount ?? 0}
                  </p>
                  <Link href="/vehicles" className={linkCls}>
                    {t("dashboard.operationsOpenList")}
                  </Link>
                </>
              )}
            </Card>
            <Card
              title={t("dashboard.statActiveProducts")}
              description={t("dashboard.statActiveProductsDesc")}
            >
              {overview.isPending ? (
                <StatSkeleton />
              ) : (
                <>
                  <p className="text-2xl font-semibold text-zinc-900">
                    {overview.data?.operations.activeProductCount ?? 0}
                  </p>
                  <Link href="/products" className={linkCls}>
                    {t("dashboard.operationsOpenList")}
                  </Link>
                </>
              )}
            </Card>
          </div>
        )}
      </StoryBlock>
    </div>
  );
}
