"use client";

import { cn } from "@/lib/cn";
import { DashboardStorySlide } from "@/modules/dashboard/components/DashboardStoryPrimitives";
import type { Locale } from "@/i18n/messages";
import { Card } from "@/shared/components/Card";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import type {
  CashPositionBranchRow,
  CashPositionHeldRegisterCashLine,
  CashPositionTotalsRow,
} from "@/types/reports";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";

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

const branchBreakdownListClass =
  "mt-2 max-h-44 overflow-y-auto rounded-md border border-zinc-200/80 bg-white/90 px-2 py-1.5 text-[0.7rem] leading-snug text-zinc-700";

const branchBreakdownSummaryClass =
  "cursor-pointer list-none text-xs font-semibold underline underline-offset-2 [&::-webkit-details-marker]:hidden";

function CashBranchMetricBreakdown({
  rows,
  locale,
  t,
  toggleLabel,
  summaryToneClass,
  pickAmount,
  registerDayIso,
}: {
  rows: CashPositionBranchRow[];
  locale: Locale;
  t: (key: string) => string;
  toggleLabel: string;
  summaryToneClass: string;
  pickAmount: (r: CashPositionBranchRow) => number;
  registerDayIso: string;
}) {
  if (!rows.length) return null;
  return (
    <details className="mt-2">
      <summary className={cn(branchBreakdownSummaryClass, summaryToneClass)}>
        {toggleLabel}
      </summary>
      <ul className={branchBreakdownListClass}>
        {rows.map((row) => (
          <li
            key={row.branchId}
            className="flex items-baseline justify-between gap-2 border-b border-zinc-100 py-1.5 last:border-b-0"
          >
            <Link
              href={`/branches?openBranch=${row.branchId}&branchTab=dashboard&registerDay=${encodeURIComponent(registerDayIso)}`}
              className="min-w-0 truncate font-medium text-violet-800 underline decoration-violet-200 underline-offset-2 hover:text-violet-950"
            >
              {row.branchName}
            </Link>
            <span className="shrink-0 tabular-nums font-semibold text-zinc-900">
              {formatLocaleAmount(pickAmount(row), locale)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[0.65rem] leading-snug text-zinc-500">{t("reports.cashBreakdownOpenBranchHint")}</p>
    </details>
  );
}

type Props = {
  branches: CashPositionBranchRow[];
  totals: CashPositionTotalsRow;
  heldLines: CashPositionHeldRegisterCashLine[];
  t: (key: string) => string;
  locale: Locale;
  /** Date and scope, e.g. "2024-12-31 · open season only" */
  asOfLabel: string;
  /** API `asOfDate` (YYYY-MM-DD) for deep links and copy. */
  asOfDateIso: string;
};

export function ReportCashPatronHighlights({
  branches,
  totals,
  heldLines,
  t,
  locale,
  asOfLabel,
  asOfDateIso,
}: Props) {
  const heldTotal = totals.cumulativeRegisterCashHeldByPersonnel ?? 0;

  const drawerByBranch = useMemo(
    () => [...branches].sort((a, b) => a.cumulativeCashBalance - b.cumulativeCashBalance),
    [branches]
  );

  const patronByBranch = useMemo(
    () =>
      [...branches]
        .filter((b) => b.cumulativeNetRegisterOwesPatron !== 0)
        .sort(
          (a, b) =>
            Math.abs(b.cumulativeNetRegisterOwesPatron) - Math.abs(a.cumulativeNetRegisterOwesPatron)
        ),
    [branches]
  );

  const pocketByBranch = useMemo(
    () =>
      [...branches]
        .filter((b) => b.cumulativeNetRegisterOwesPersonnelPocket !== 0)
        .sort(
          (a, b) =>
            Math.abs(b.cumulativeNetRegisterOwesPersonnelPocket) -
            Math.abs(a.cumulativeNetRegisterOwesPersonnelPocket)
        ),
    [branches]
  );

  const maxDrawerBranch = useMemo(() => {
    if (!branches.length) return null;
    let max = branches[0]!;
    for (const r of branches) {
      if (r.cumulativeCashBalance > max.cumulativeCashBalance) max = r;
    }
    return max;
  }, [branches]);

  if (!branches.length || !maxDrawerBranch) return null;

  const gridClass = "mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4";

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-violet-50/90 via-white to-fuchsia-50/40 p-4 shadow-sm ring-1 ring-violet-200/25 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">{t("reports.cashSnapshotPanelTitle")}</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-zinc-600">{t("reports.cashSnapshotPanelHint")}</p>
          <p className="mt-2 text-xs font-medium text-zinc-700">{asOfLabel}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
            {tpl(t("reports.cashAsOfCumulativeExplain"), {
              date: formatLocaleDate(asOfDateIso, locale),
            })}
          </p>
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
          <p className="mt-2 text-[0.7rem] leading-relaxed text-zinc-600">{t("reports.cashDrawerWhyShort")}</p>
          <CashBranchMetricBreakdown
            rows={drawerByBranch}
            locale={locale}
            t={t}
            toggleLabel={t("reports.cashDrawerBreakdownToggle")}
            summaryToneClass="text-emerald-900 decoration-emerald-300"
            pickAmount={(r) => r.cumulativeCashBalance}
            registerDayIso={asOfDateIso}
          />
        </CashStoryMetricCard>

        <CashStoryMetricCard
          badge={t("reports.cashSnapshotBadgeHeldPersonnel")}
          title={t("reports.cashColHeldPersonnel")}
          description={t("reports.cashSnapshotDescHeldPersonnel")}
          className="border-sky-200/50 ring-1 ring-sky-100/40"
        >
          <p className="text-2xl font-semibold tabular-nums text-sky-950 sm:text-3xl">
            {formatLocaleAmount(heldTotal, locale)}
          </p>
          {heldLines.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer list-none text-xs font-semibold text-sky-800 underline decoration-sky-300 underline-offset-2 [&::-webkit-details-marker]:hidden">
                {t("reports.cashPersonnelHeldBreakdownToggle")}
              </summary>
              <ul className="mt-2 max-h-44 overflow-y-auto rounded-md border border-zinc-200/80 bg-white/90 px-2 py-1.5 text-[0.7rem] leading-snug text-zinc-700">
                {heldLines.map((line, idx) => (
                  <li
                    key={`${line.branchId}-${line.personnelId ?? "n"}-${idx}`}
                    className="flex justify-between gap-2 border-b border-zinc-100 py-1.5 last:border-b-0"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-medium text-zinc-800">{line.branchName}</span>
                      <span className="text-zinc-500"> · </span>
                      <span>
                        {line.fullName?.trim()
                          ? line.fullName
                          : t("reports.cashPersonnelHeldUnknownPerson")}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums font-semibold text-zinc-900">
                      {formatLocaleAmount(line.amount, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
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
          {pocketByBranch.length > 0 ? (
            <CashBranchMetricBreakdown
              rows={pocketByBranch}
              locale={locale}
              t={t}
              toggleLabel={t("reports.cashPocketBreakdownToggle")}
              summaryToneClass="text-red-900 decoration-red-300"
              pickAmount={(r) => r.cumulativeNetRegisterOwesPersonnelPocket}
              registerDayIso={asOfDateIso}
            />
          ) : null}
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
          <p className="mt-2 text-[0.7rem] leading-relaxed text-zinc-600">{t("reports.cashPatronWhyShort")}</p>
          {patronByBranch.length > 0 ? (
            <CashBranchMetricBreakdown
              rows={patronByBranch}
              locale={locale}
              t={t}
              toggleLabel={t("reports.cashPatronBreakdownToggle")}
              summaryToneClass="text-violet-950 decoration-violet-300"
              pickAmount={(r) => r.cumulativeNetRegisterOwesPatron}
              registerDayIso={asOfDateIso}
            />
          ) : null}
          <p className="mt-2 text-[0.7rem] leading-snug text-zinc-600">
            <Link
              href="/reports/patron-flow"
              className="font-semibold text-violet-800 underline decoration-violet-200 underline-offset-2 hover:text-violet-950"
            >
              {t("reports.cashPatronFlowScreenLink")}
            </Link>
            <span className="text-zinc-500"> — {t("reports.cashPatronFlowScreenHint")}</span>
          </p>
        </CashStoryMetricCard>
      </div>

      <p className="mt-3 text-xs leading-snug text-zinc-600">
        {tpl(t("reports.cashPatronMaxDrawer"), { name: maxDrawerBranch.branchName })}
      </p>
    </div>
  );
}
