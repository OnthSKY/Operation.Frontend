"use client";

import Link from "next/link";
import { DashboardDayStoryCard } from "@/modules/dashboard/components/DashboardDayStoryCard";
import { UI } from "@/modules/dashboard/components/dashboard-ui";
import type { Locale } from "@/i18n/messages";
import type { SummaryAggregateState } from "@/modules/dashboard/hooks/useTodayBranchesSummary";
export function DashboardSummaryTab({
  t,
  locale,
  state,
  onCashRetry,
  sumBranchesFootnote,
  isPlainTodayView,
  snapshotDateLabel,
}: {
  t: (key: string) => string;
  locale: Locale;
  state: SummaryAggregateState;
  onCashRetry: () => void;
  sumBranchesFootnote: string;
  isPlainTodayView: boolean;
  snapshotDateLabel: string;
}) {
  return (
            <div className="flex min-w-0 flex-col gap-4 transition-opacity duration-200 ease-in-out sm:gap-6" role="tabpanel">
              <DashboardDayStoryCard
                t={t}
                locale={locale}
                state={state}
                onCashRetry={onCashRetry}
                sumBranchesFootnote={sumBranchesFootnote}
                isPlainTodayView={isPlainTodayView}
                snapshotDateLabel={snapshotDateLabel}
              />
    
              {state.kind === "empty" ? (
                <div
                  role="note"
                  className={`${UI.subtle} border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm leading-relaxed text-amber-950`}
                >
                  <p className="font-semibold">{t("dashboard.emptyCalloutTitle")}</p>
                  <p className="mt-1 text-amber-950/90">
                    {t("dashboard.emptyCalloutBody")}
                  </p>
                  <Link
                    href="/branches"
                    className="mt-2 inline-block text-sm font-semibold text-violet-800 underline-offset-2 hover:underline"
                  >
                    {t("dashboard.emptyCalloutCta")}
                  </Link>
                </div>
              ) : null}
            </div>
  );
}
