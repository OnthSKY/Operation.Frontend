"use client";

import { StoryBlock } from "@/modules/dashboard/components/DashboardStoryPrimitives";
import { StatSkeleton } from "@/modules/dashboard/components/DashboardMetricValue";
import { fillDashboardTemplate } from "@/modules/dashboard/components/dashboard-utils";
import { Card } from "@/shared/components/Card";
import Link from "next/link";
import type { UseQueryResult } from "@tanstack/react-query";
import type { DashboardOverview } from "@/types/dashboard-overview";

export function DashboardOperationsTab({
  t,
  overview,
}: {
  t: (key: string) => string;
  overview: UseQueryResult<DashboardOverview>;
}) {
  return (
            <div role="tabpanel">
          <StoryBlock
            title={t("dashboard.storyOperations")}
            description={t("dashboard.storyOperationsDesc")}
          >
            {overview.isError ? (
              <p className="text-sm text-red-600">{t("dashboard.overviewLoadError")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                {!overview.isPending &&
                overview.data &&
                overview.data.operations.activeWarehouseCount > 1 ? (
                  <Link
                    href="/warehouses"
                    className="block rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/30 px-4 py-3 shadow-sm ring-1 ring-violet-200/25 transition hover:border-violet-300/80 hover:shadow-md"
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
                <div className="grid gap-3 sm:grid-cols-2">
                <Card
                  title={t("dashboard.statBranches")}
                  description={t("dashboard.statBranchesDesc")}
                >
                  {overview.isPending ? (
                    <StatSkeleton />
                  ) : (
                    <p className="text-2xl font-semibold text-zinc-900">
                      {overview.data?.operations.activeBranchCount ?? 0}
                    </p>
                  )}
                </Card>
                <Card
                  title={t("dashboard.statWarehouses")}
                  description={t("dashboard.statWarehousesDesc")}
                >
                  {overview.isPending ? (
                    <StatSkeleton />
                  ) : (
                    <p className="text-2xl font-semibold text-zinc-900">
                      {overview.data?.operations.activeWarehouseCount ?? 0}
                    </p>
                  )}
                </Card>
                </div>
              </div>
            )}
          </StoryBlock>
            </div>
  );
}
