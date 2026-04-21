"use client";

import { useI18n } from "@/i18n/context";
import { ReportInteractiveRows } from "@/modules/reports/components/ReportInteractiveRows";
import { ReportCashAsOfFilterBlock } from "@/modules/reports/components/ReportCashAsOfFilterBlock";
import { ReportMobileFilterSurface } from "@/modules/reports/components/ReportMobileFilterSurface";
import { ReportTablesPageShell } from "@/modules/reports/components/ReportTablesPageShell";
import { ReportCashPatronHighlights } from "@/modules/reports/components/ReportCashPatronHighlights";
import { ReportsPatronStoryInfoButton } from "@/modules/reports/components/ReportsPatronTabStory";
import { useCashPositionReport } from "@/modules/reports/hooks/useReportsQueries";
import { PageWhenToUseInfoButton } from "@/shared/components/PageWhenToUseInfoButton";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CashPositionBranchRow } from "@/types/reports";

function seasonStatusLabel(t: (key: string) => string, status: string): string {
  const u = status.toUpperCase();
  if (u === "OPEN") return t("branch.seasonOpen");
  if (u === "PLANNED") return t("branch.seasonPlanned");
  if (u === "CLOSED") return t("branch.seasonClosed");
  return t("branch.seasonNone");
}

const mobileCard =
  "rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:hidden";
const mobileCardStack = "flex flex-col gap-3 sm:hidden";

export function CashReportScreen() {
  const { t, locale } = useI18n();
  const [cashAsOfDate, setCashAsOfDate] = useState(() => localIsoDate());
  const [cashOpenSeasonOnly, setCashOpenSeasonOnly] = useState(true);
  const [cashAsOfMode, setCashAsOfMode] = useState<"calendarYearEnd" | "customDate">("customDate");

  const cashParams = useMemo(
    () => ({ asOfDate: cashAsOfDate, openSeasonOnly: cashOpenSeasonOnly }),
    [cashAsOfDate, cashOpenSeasonOnly]
  );
  const cash = useCashPositionReport(cashParams, true);

  const filtersActive = !cashOpenSeasonOnly || cashAsOfMode === "calendarYearEnd";

  const filterPreview = useMemo(
    () => (
      <>
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
          {t("reports.navCashReport")}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900">
          {formatLocaleDate(cashAsOfDate, locale)}
        </p>
      </>
    ),
    [cashAsOfDate, locale, t]
  );

  const rows: CashPositionBranchRow[] = cash.data?.branches ?? [];

  return (
    <ReportTablesPageShell
      title={t("reports.tablesPageCashTitle")}
      subtitle={t("reports.tablesPageCashSubtitle")}
      pageGuide={
        <PageWhenToUseInfoButton
          ariaLabel={t("common.pageHelpHintLabel")}
          guideTab="reports"
          description={t("pageHelp.reportsCash.intro")}
          listVariant="ordered"
          items={[
            { text: t("pageHelp.reportsCash.step1") },
            { text: t("pageHelp.reportsCash.step2") },
            {
              text: t("pageHelp.reportsCash.step3"),
              link: { href: "/", label: t("pageHelp.reportsCash.step3Link") },
            },
          ]}
        />
      }
    >
      <ReportMobileFilterSurface
        variant="drawerOnly"
        filtersActive={filtersActive}
        drawerTitle={t("reports.filtersSectionTitle")}
        resetKey="cash-report"
        preview={filterPreview}
        onRefetch={() => void cash.refetch()}
        isRefetching={cash.isFetching}
        main={
          <>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <section
                  className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3 sm:p-4"
                  aria-label={t("reports.cashAsOfDate")}
                >
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    {t("reports.cashAsOfDate")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    {formatLocaleDate(cashAsOfDate, locale)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-600">
                    {cashOpenSeasonOnly
                      ? t("reports.cashOpenSeasonOnlyShort")
                      : t("reports.cashAllBranchesShort")}
                  </p>
                  <div className="mt-3 rounded-lg border border-zinc-200/90 bg-white/90 px-3 py-2">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
                      {t("reports.finScopeBucketFilter")}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-700">
                      {t("reports.hubFilterEffectsScopeLeadCash")}
                    </p>
                  </div>
                </section>
              </div>
              <div className="shrink-0 self-end sm:self-start sm:pt-1">
                <ReportsPatronStoryInfoButton tab="cash" />
              </div>
            </div>

            {cash.isFetching && cash.data ? (
              <p className="text-center text-xs text-zinc-400" aria-live="polite">
                {t("reports.updatingHint")}
              </p>
            ) : null}

            {cash.isError ? (
              <p className="text-sm text-red-600">
                {t("reports.error")} {toErrorMessage(cash.error)}
              </p>
            ) : null}

            {cash.isPending ? (
              <p className="text-sm text-zinc-500">{t("reports.loading")}</p>
            ) : null}

            {cash.data ? (
        <div className="flex flex-col gap-3 sm:gap-4">
          {rows.length > 0 ? (
            <ReportCashPatronHighlights
              branches={rows}
              totals={cash.data.totals}
              heldLines={cash.data.registerCashHeldByPersonnelLines ?? []}
              t={t}
              locale={locale}
              asOfDateIso={cash.data.asOfDate}
              asOfLabel={`${cash.data.asOfDate}${
                cash.data.openSeasonOnly
                  ? ` · ${t("reports.cashOpenSeasonOnlyShort")}`
                  : ` · ${t("reports.cashAllBranchesShort")}`
              }`}
            />
          ) : null}
          {rows.length === 0 ? (
            <>
              <p className="text-sm leading-relaxed text-zinc-600">
                {t("reports.cashPositionLead")}{" "}
                <span className="font-medium text-zinc-800">
                  {cash.data.asOfDate}
                  {cash.data.openSeasonOnly
                    ? ` · ${t("reports.cashOpenSeasonOnlyShort")}`
                    : ` · ${t("reports.cashAllBranchesShort")}`}
                </span>
              </p>
              <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                {t("reports.cashPositionEmpty")}
              </p>
            </>
          ) : (
            <ReportInteractiveRows
              interactive
              rows={rows}
              defaultSortKey="drawer"
              sortOptions={[
                { id: "branch", label: t("reports.colBranch") },
                { id: "season", label: t("branch.tableSeason") },
                { id: "drawer", label: t("reports.cashColDrawer") },
                { id: "held", label: t("reports.cashColHeldPersonnel") },
                { id: "pocket", label: t("reports.cashColPocketDebt") },
                { id: "patron", label: t("reports.cashColPatronDebt") },
              ]}
              getSearchHaystack={(r) =>
                `${r.branchName} ${seasonStatusLabel(t, r.seasonStatus)}`
              }
              getSortValue={(r, key) => {
                switch (key) {
                  case "branch":
                    return r.branchName;
                  case "season":
                    return seasonStatusLabel(t, r.seasonStatus);
                  case "drawer":
                    return r.cumulativeCashBalance;
                  case "held":
                    return r.cumulativeRegisterCashHeldByPersonnel ?? 0;
                  case "pocket":
                    return r.cumulativeNetRegisterOwesPersonnelPocket;
                  case "patron":
                    return r.cumulativeNetRegisterOwesPatron;
                  default:
                    return 0;
                }
              }}
              t={t}
            >
              {({ displayRows, toolbar, emptyFiltered }) => (
                <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-4 sm:px-5 sm:py-6">
                  <p className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    {t("reports.cashPositionSectionTitle")}
                  </p>
                  {toolbar}
                  {emptyFiltered ? (
                    <p className="text-sm text-zinc-500">
                      {t("reports.sectionNoSearchMatches")}
                    </p>
                  ) : (
                    <>
                      <div className={mobileCardStack}>
                        {displayRows.map((row) => (
                          <article key={row.branchId} className={mobileCard}>
                            <dl className="space-y-2">
                              <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                  {t("reports.colBranch")}
                                </dt>
                                <dd className="text-sm font-medium text-zinc-900">
                                  <Link
                                    href={`/branches?openBranch=${row.branchId}&branchTab=dashboard&registerDay=${encodeURIComponent(cash.data.asOfDate)}`}
                                    className="text-violet-800 underline decoration-violet-200 underline-offset-2 hover:text-violet-950"
                                  >
                                    {row.branchName}
                                  </Link>
                                </dd>
                              </div>
                              <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                  {t("branch.tableSeason")}
                                </dt>
                                <dd className="text-sm text-zinc-600">
                                  {seasonStatusLabel(t, row.seasonStatus)}
                                </dd>
                              </div>
                              <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                  {t("reports.cashColDrawer")}
                                </dt>
                                <dd className="text-sm tabular-nums text-zinc-900">
                                  {formatLocaleAmount(
                                    row.cumulativeCashBalance,
                                    locale
                                  )}
                                </dd>
                              </div>
                              <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                  {t("reports.cashColHeldPersonnel")}
                                </dt>
                                <dd className="text-sm tabular-nums text-sky-950">
                                  {formatLocaleAmount(
                                    row.cumulativeRegisterCashHeldByPersonnel ?? 0,
                                    locale
                                  )}
                                </dd>
                              </div>
                              <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                  {t("reports.cashColPocketDebt")}
                                </dt>
                                <dd className="text-sm tabular-nums text-zinc-800">
                                  {formatLocaleAmount(
                                    row.cumulativeNetRegisterOwesPersonnelPocket,
                                    locale
                                  )}
                                </dd>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                  {t("reports.cashColPatronDebt")}
                                </dt>
                                <dd className="text-sm tabular-nums text-zinc-800">
                                  {formatLocaleAmount(
                                    row.cumulativeNetRegisterOwesPatron,
                                    locale
                                  )}
                                </dd>
                              </div>
                            </dl>
                          </article>
                        ))}
                      </div>
                      <div className="hidden sm:block">
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableHeader>{t("reports.colBranch")}</TableHeader>
                              <TableHeader>{t("branch.tableSeason")}</TableHeader>
                              <TableHeader className="text-right tabular-nums">
                                {t("reports.cashColDrawer")}
                              </TableHeader>
                              <TableHeader className="text-right tabular-nums">
                                {t("reports.cashColHeldPersonnel")}
                              </TableHeader>
                              <TableHeader className="text-right tabular-nums">
                                {t("reports.cashColPocketDebt")}
                              </TableHeader>
                              <TableHeader className="text-right tabular-nums">
                                {t("reports.cashColPatronDebt")}
                              </TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {displayRows.map((row) => (
                              <TableRow key={row.branchId}>
                                <TableCell className="font-medium text-zinc-900">
                                  <Link
                                    href={`/branches?openBranch=${row.branchId}&branchTab=dashboard&registerDay=${encodeURIComponent(cash.data.asOfDate)}`}
                                    className="text-violet-800 underline decoration-violet-200 underline-offset-2 hover:text-violet-950"
                                  >
                                    {row.branchName}
                                  </Link>
                                </TableCell>
                                <TableCell className="text-zinc-600">
                                  {seasonStatusLabel(t, row.seasonStatus)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-zinc-900">
                                  {formatLocaleAmount(
                                    row.cumulativeCashBalance,
                                    locale
                                  )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-sky-950">
                                  {formatLocaleAmount(
                                    row.cumulativeRegisterCashHeldByPersonnel ?? 0,
                                    locale
                                  )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-zinc-800">
                                  {formatLocaleAmount(
                                    row.cumulativeNetRegisterOwesPersonnelPocket,
                                    locale
                                  )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-zinc-800">
                                  {formatLocaleAmount(
                                    row.cumulativeNetRegisterOwesPatron,
                                    locale
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell
                                colSpan={2}
                                className="bg-zinc-50/90 font-semibold text-zinc-800"
                              >
                                {t("reports.cashTotalsRow")}
                              </TableCell>
                              <TableCell className="bg-zinc-50/90 text-right tabular-nums font-semibold text-zinc-900">
                                {formatLocaleAmount(
                                  cash.data.totals.cumulativeCashBalance,
                                  locale
                                )}
                              </TableCell>
                              <TableCell className="bg-zinc-50/90 text-right tabular-nums font-semibold text-sky-950">
                                {formatLocaleAmount(
                                  cash.data.totals.cumulativeRegisterCashHeldByPersonnel ?? 0,
                                  locale
                                )}
                              </TableCell>
                              <TableCell className="bg-zinc-50/90 text-right tabular-nums font-semibold text-zinc-900">
                                {formatLocaleAmount(
                                  cash.data.totals
                                    .cumulativeNetRegisterOwesPersonnelPocket,
                                  locale
                                )}
                              </TableCell>
                              <TableCell className="bg-zinc-50/90 text-right tabular-nums font-semibold text-zinc-900">
                                {formatLocaleAmount(
                                  cash.data.totals.cumulativeNetRegisterOwesPatron,
                                  locale
                                )}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </ReportInteractiveRows>
          )}
        </div>
            ) : null}
          </>
        }
      >
        <ReportCashAsOfFilterBlock
          t={t}
          asOfDate={cashAsOfDate}
          onAsOfChange={setCashAsOfDate}
          openSeasonOnly={cashOpenSeasonOnly}
          onOpenSeasonOnlyChange={setCashOpenSeasonOnly}
          mode={cashAsOfMode}
          onModeChange={setCashAsOfMode}
        />
      </ReportMobileFilterSurface>
    </ReportTablesPageShell>
  );
}
