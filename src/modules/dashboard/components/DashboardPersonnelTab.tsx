"use client";

import { StoryBlock } from "@/modules/dashboard/components/DashboardStoryPrimitives";
import { StatSkeleton } from "@/modules/dashboard/components/DashboardMetricValue";
import { formatTenure } from "@/modules/dashboard/components/dashboard-utils";
import type { Locale } from "@/i18n/messages";
import { Card } from "@/shared/components/Card";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import type { UseQueryResult } from "@tanstack/react-query";
import type { DashboardOverview } from "@/types/dashboard-overview";

export function DashboardPersonnelTab({
  t,
  locale,
  overview,
}: {
  t: (key: string) => string;
  locale: Locale;
  overview: UseQueryResult<DashboardOverview>;
}) {
  return (
            <div role="tabpanel">
          <StoryBlock
            title={t("dashboard.storyPersonnel")}
            description={t("dashboard.storyPersonnelDesc")}
          >
            {overview.isError ? (
              <p className="text-sm text-red-600">{t("dashboard.overviewLoadError")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                <Card
                  title={t("dashboard.statActivePersonnel")}
                  description={t("dashboard.statActivePersonnelDesc")}
                >
                  {overview.isPending ? (
                    <StatSkeleton />
                  ) : (
                    <p className="text-2xl font-semibold text-zinc-900">
                      {overview.data?.personnel.activePersonnelCount ?? 0}
                    </p>
                  )}
                </Card>
                <Card
                  title={t("dashboard.statLongestTenure")}
                  description={t("dashboard.statLongestTenureDesc")}
                >
                  {overview.isPending ? (
                    <StatSkeleton />
                  ) : overview.data?.personnel.longestTenure ? (
                    <div className="flex flex-col gap-1">
                      <p className="text-lg font-semibold text-zinc-900">
                        {overview.data.personnel.longestTenure.fullName}
                      </p>
                      <p className="text-sm text-zinc-600">
                        {formatTenure(
                          overview.data.personnel.longestTenure.tenureYears,
                          overview.data.personnel.longestTenure.tenureMonthsRemainder,
                          locale
                        )}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {t("dashboard.hireDateLabel")}:{" "}
                        {formatLocaleDate(
                          overview.data.personnel.longestTenure.hireDate,
                          locale
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">{t("dashboard.noData")}</p>
                  )}
                </Card>
                <Card
                  title={t("dashboard.statTopAdvance")}
                  description={t("dashboard.statTopAdvanceDesc")}
                >
                  {overview.isPending ? (
                    <StatSkeleton />
                  ) : overview.data?.personnel.topAdvanceRecipient ? (
                    <div className="flex flex-col gap-1">
                      <p className="text-lg font-semibold text-zinc-900">
                        {overview.data.personnel.topAdvanceRecipient.fullName}
                      </p>
                      <p className="text-xl font-semibold tabular-nums text-violet-800">
                        {formatLocaleAmount(
                          overview.data.personnel.topAdvanceRecipient.totalAmount,
                          locale,
                          overview.data.personnel.topAdvanceRecipient.currencyCode
                        )}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {overview.data.personnel.topAdvanceRecipient.advanceCount}{" "}
                        {t("dashboard.advanceCountLabel")}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">{t("dashboard.noData")}</p>
                  )}
                </Card>
              </div>
            )}
          </StoryBlock>
            </div>
  );
}
