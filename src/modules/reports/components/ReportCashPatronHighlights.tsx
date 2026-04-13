"use client";

import { DashboardStorySlide } from "@/modules/dashboard/components/DashboardStoryPrimitives";
import type { Locale } from "@/i18n/messages";
import { Card } from "@/shared/components/Card";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type { CashPositionBranchRow, CashPositionTotalsRow } from "@/types/reports";
import type { ReactNode } from "react";

function tpl(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ""));
}

const storyBadge = (text: string) => (
  <span className="mb-2 inline-flex w-fit rounded-full bg-zinc-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-zinc-600 ring-1 ring-zinc-200/80">
    {text}
  </span>
);

function CashStoryMetricCard({
  badge,
  title,
  description,
  children,
  className,
}: {
  badge: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <DashboardStorySlide>
      <Card className={`h-full min-h-[11rem] bg-white/95 ${className ?? ""}`}>
        {storyBadge(badge)}
        <h3 className="text-base font-semibold leading-snug text-zinc-900">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600">{description}</p>
        <div className="mt-3 min-h-[3.25rem]">{children}</div>
      </Card>
    </DashboardStorySlide>
  );
}

type Props = {
  branches: CashPositionBranchRow[];
  totals: CashPositionTotalsRow;
  t: (key: string) => string;
  locale: Locale;
  /** Date and scope, e.g. "2024-12-31 · open season only" */
  asOfLabel: string;
};

export function ReportCashPatronHighlights({ branches, totals, t, locale, asOfLabel }: Props) {
  if (!branches.length) return null;
  let max = branches[0]!;
  for (const r of branches) {
    if (r.cumulativeCashBalance > max.cumulativeCashBalance) max = r;
  }

  const gridClass =
    "mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] md:grid md:grid-cols-3 md:overflow-visible md:pb-0 md:snap-none";

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/40 p-4 shadow-sm ring-1 ring-violet-200/25 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">{t("reports.cashSnapshotPanelTitle")}</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-zinc-600">{t("reports.cashSnapshotPanelHint")}</p>
          <p className="mt-2 text-xs font-medium text-zinc-700">{asOfLabel}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">{t("reports.cashSnapshotMoreHint")}</p>
        </div>
      </div>

      <div className={gridClass}>
        <CashStoryMetricCard
          badge={t("reports.cashSnapshotBadgeDrawer")}
          title={t("reports.cashColDrawer")}
          description={t("reports.cashSnapshotDescDrawer")}
          className="border-emerald-200/50 ring-1 ring-emerald-100/40"
        >
          <p className="text-2xl font-semibold tabular-nums text-emerald-900 sm:text-3xl">
            {formatLocaleAmount(totals.cumulativeCashBalance, locale)}
          </p>
        </CashStoryMetricCard>

        <CashStoryMetricCard
          badge={t("reports.cashSnapshotBadgePocket")}
          title={t("reports.cashColPocketDebt")}
          description={t("reports.cashSnapshotDescPocket")}
          className="border-red-200/40 ring-1 ring-red-100/30"
        >
          <p className="text-2xl font-semibold tabular-nums text-red-800 sm:text-3xl">
            {formatLocaleAmount(totals.cumulativeNetRegisterOwesPersonnelPocket, locale)}
          </p>
        </CashStoryMetricCard>

        <CashStoryMetricCard
          badge={t("reports.cashSnapshotBadgePatron")}
          title={t("reports.cashColPatronDebt")}
          description={t("reports.cashSnapshotDescPatron")}
          className="border-violet-200/50 shadow-md shadow-violet-950/[0.04] ring-1 ring-violet-100/50"
        >
          <p className="text-2xl font-semibold tabular-nums text-violet-950 sm:text-3xl">
            {formatLocaleAmount(totals.cumulativeNetRegisterOwesPatron, locale)}
          </p>
        </CashStoryMetricCard>
      </div>

      <p className="mt-3 text-xs leading-snug text-zinc-600">
        {tpl(t("reports.cashPatronMaxDrawer"), { name: max.branchName })}
      </p>
      <p className="mt-2 text-xs text-zinc-500 md:hidden">{t("dashboard.storyMobileSwipeHint")}</p>
    </div>
  );
}
