"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useBranchComparisonReport } from "@/modules/reports/hooks/useReportsQueries";
import {
  ReportHubDateRangeControls,
  type ReportHubRangeLock,
} from "@/modules/reports/components/ReportHubDateRangeControls";
import { ReportMobileFilterSurface } from "@/modules/reports/components/ReportMobileFilterSurface";
import { ReportTablesPageShell } from "@/modules/reports/components/ReportTablesPageShell";
import {
  addDaysFromIso,
  startOfMonthIso,
} from "@/modules/reports/lib/report-period-helpers";
import { reportBranchLabel } from "@/modules/reports/lib/report-branch-label";
import { PageWhenToUseInfoButton } from "@/shared/components/PageWhenToUseInfoButton";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { Button } from "@/shared/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { expensePaymentSourceLabel } from "@/modules/branch/lib/branch-transaction-options";
import { cn } from "@/lib/cn";
import type { FinancialBranchBreakdownRow } from "@/types/reports";
import { Fragment, useEffect, useMemo, useState } from "react";

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => vars[key] ?? "—"
  );
}

type SortCol = "branchName" | "currencyCode" | "totalIncome" | "totalExpense" | "netCash";

function iso4217OrUndefined(code: string): string | undefined {
  const c = code.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : undefined;
}

function currencyTableLabel(code: string): string {
  const t = code.trim();
  return t.length > 0 ? t : "—";
}

function branchComparisonRowKey(row: FinancialBranchBreakdownRow): string {
  return `${row.branchId}-${row.currencyCode || ""}`;
}

export function BranchComparisonReportScreen() {
  const { t, locale } = useI18n();
  const [dateFrom, setDateFrom] = useState(startOfMonthIso);
  const [dateTo, setDateTo] = useState(() => localIsoDate());
  const [branchId, setBranchId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState<SortCol>("netCash");
  const [sortDescending, setSortDescending] = useState(true);
  const [dateRangeLock, setDateRangeLock] = useState<ReportHubRangeLock>("manual");
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);

  const { data: branches = [] } = useBranchesList();

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, branchId, pageSize]);

  useEffect(() => {
    setExpandedRowKey(null);
  }, [dateFrom, dateTo, branchId, page, pageSize, sortBy, sortDescending]);

  const params = useMemo(
    () => ({
      dateFrom,
      dateTo,
      branchId:
        branchId === "" ? undefined : Number.parseInt(branchId, 10),
      page,
      pageSize,
      sortBy,
      sortDescending,
    }),
    [dateFrom, dateTo, branchId, page, pageSize, sortBy, sortDescending]
  );

  const q = useBranchComparisonReport(params, true);

  const applyDatePreset = (key: "month" | "d30" | "d7") => {
    const today = localIsoDate();
    if (key === "month") {
      setDateFrom(startOfMonthIso());
      setDateTo(today);
      return;
    }
    if (key === "d30") {
      setDateFrom(addDaysFromIso(today, -29));
      setDateTo(today);
      return;
    }
    setDateFrom(addDaysFromIso(today, -6));
    setDateTo(today);
  };

  const onSort = (col: SortCol) => {
    if (sortBy === col) {
      setSortDescending((d) => !d);
    } else {
      setSortBy(col);
      setSortDescending(col === "branchName" || col === "currencyCode" ? false : true);
    }
    setPage(1);
  };

  const filtersActive = branchId !== "" || dateRangeLock !== "manual";

  const filterPreview = useMemo(() => {
    const a = formatLocaleDate(dateFrom, locale);
    const b = formatLocaleDate(dateTo, locale);
    const branchName =
      branchId === "" ? null : branches.find((x) => String(x.id) === branchId)?.name;
    return (
      <>
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
          {t("reports.navBranchComparison")}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900">
          {a} – {b}
        </p>
        {branchName ? (
          <p className="mt-0.5 truncate text-xs text-zinc-600">{branchName}</p>
        ) : null}
      </>
    );
  }, [dateFrom, dateTo, locale, t, branchId, branches]);

  const totalPages = useMemo(() => {
    const n = q.data?.totalCount ?? 0;
    return Math.max(1, Math.ceil(n / pageSize));
  }, [q.data?.totalCount, pageSize]);

  useEffect(() => {
    if (q.isPending || q.data == null) return;
    if (page > totalPages) setPage(totalPages);
  }, [q.isPending, q.data?.totalCount, page, totalPages]);

  const pageClamped = Math.min(page, totalPages);

  const headerSortSuffix = (col: SortCol) =>
    sortBy === col ? ` · ${sortDescending ? t("reports.sortStateDesc") : t("reports.sortStateAsc")}` : "";

  const filterDrawerBody = (
    <div className="flex flex-col gap-4">
      <ReportHubDateRangeControls
        t={t}
        dateFrom={dateFrom}
        dateTo={dateTo}
        rangeLock={dateRangeLock}
        onUnlockCalendarYear={() => setDateRangeLock("manual")}
        onPreset={(key) => {
          setDateRangeLock("preset");
          applyDatePreset(key);
        }}
        onCalendarYearRange={(f, d) => {
          setDateRangeLock("calendarYear");
          setDateFrom(f);
          setDateTo(d);
        }}
        onDateFromChange={(v) => {
          setDateRangeLock("manual");
          setDateFrom(v);
        }}
        onDateToChange={(v) => {
          setDateRangeLock("manual");
          setDateTo(v);
        }}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">{t("reports.colBranch")}</span>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-zinc-200 px-3 py-2 text-base sm:min-h-10 sm:text-sm"
          >
            <option value="">{t("reports.allBranches")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">{t("reports.branchComparisonPageSize")}</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="min-h-11 w-full rounded-lg border border-zinc-200 px-3 py-2 text-base sm:min-h-10 sm:text-sm"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </label>
      </div>
    </div>
  );

  return (
    <ReportTablesPageShell
      title={t("reports.tablesPageBranchComparisonTitle")}
      subtitle={t("reports.tablesPageBranchComparisonSubtitle")}
      introCallout={
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950 sm:text-sm">
          {t("reports.branchComparisonKpiScopeCallout")}
        </p>
      }
      pageGuide={
        <PageWhenToUseInfoButton
          ariaLabel={t("common.pageHelpHintLabel")}
          guideTab="reports"
          description={t("pageHelp.reportsBranches.intro")}
          listVariant="ordered"
          items={[
            { text: t("pageHelp.reportsBranches.step1") },
            {
              text: t("pageHelp.reportsBranches.step2"),
              link: { href: "/branches", label: t("pageHelp.reportsBranches.step2Link") },
            },
          ]}
        />
      }
    >
      <ReportMobileFilterSurface
        variant="drawerOnly"
        filtersActive={filtersActive}
        drawerTitle={t("reports.filtersSectionTitle")}
        resetKey="branch-comparison"
        preview={filterPreview}
        onRefetch={() => void q.refetch()}
        isRefetching={q.isFetching}
        belowToolbar={
          <div className="space-y-2 text-xs leading-relaxed text-zinc-700">
            <p>{t("reports.branchComparisonPeriodHelp")}</p>
            <p className="text-zinc-600">{t("reports.branchComparisonScopeNote")}</p>
          </div>
        }
        main={
          <>
            {q.isFetching && q.data ? (
              <p className="text-center text-xs text-zinc-400" aria-live="polite">
                {t("reports.updatingHint")}
              </p>
            ) : null}

            <p className="text-xs text-zinc-500">{t("reports.branchComparisonSortHint")}</p>

            {q.isError ? (
              <p className="text-sm text-red-600">
                {t("reports.error")} {toErrorMessage(q.error)}
              </p>
            ) : null}

            {q.isPending ? (
              <p className="text-sm text-zinc-500">{t("reports.loading")}</p>
            ) : null}

            {q.data ? (
              <div className="w-full min-w-0 space-y-4 rounded-2xl border border-zinc-200 bg-white px-2 py-4 sm:px-4 sm:py-5">
                {q.data.items.length === 0 ? (
                  <p className="text-sm text-zinc-600">{t("reports.branchComparisonEmpty")}</p>
                ) : (
                  <>
                    <div className="w-full min-w-0">
                      <Table mobileCards className="w-full text-sm lg:min-w-[44rem]">
                        <TableHead>
                          <TableRow>
                            <TableHeader className="min-w-[7.5rem] max-w-[11rem] sm:max-w-none">
                              <button
                                type="button"
                                className="font-semibold text-left underline-offset-2 hover:underline"
                                onClick={() => onSort("branchName")}
                              >
                                {t("reports.colBranch")}
                                {headerSortSuffix("branchName")}
                              </button>
                            </TableHeader>
                            <TableHeader className="w-14 shrink-0 whitespace-nowrap sm:w-auto">
                              <button
                                type="button"
                                className="font-semibold text-left underline-offset-2 hover:underline"
                                onClick={() => onSort("currencyCode")}
                              >
                                {t("reports.colCurrency")}
                                {headerSortSuffix("currencyCode")}
                              </button>
                            </TableHeader>
                            <TableHeader className="min-w-[5.5rem] text-right whitespace-nowrap">
                              <button
                                type="button"
                                className="inline font-semibold underline-offset-2 hover:underline"
                                onClick={() => onSort("totalIncome")}
                              >
                                {t("reports.colIncome")}
                                {headerSortSuffix("totalIncome")}
                              </button>
                            </TableHeader>
                            <TableHeader className="min-w-[5.5rem] text-right whitespace-nowrap">
                              <button
                                type="button"
                                className="inline font-semibold underline-offset-2 hover:underline"
                                onClick={() => onSort("totalExpense")}
                              >
                                {t("reports.colExpense")}
                                {headerSortSuffix("totalExpense")}
                              </button>
                            </TableHeader>
                            <TableHeader className="min-w-[6rem] max-w-[9rem] text-right text-[0.65rem] font-semibold normal-case leading-tight text-zinc-600 sm:max-w-none sm:text-xs">
                              {t("reports.colSupplierRegisterPaid")}
                            </TableHeader>
                            <TableHeader className="min-w-[5.5rem] text-right whitespace-nowrap">
                              <button
                                type="button"
                                className="inline font-semibold underline-offset-2 hover:underline"
                                onClick={() => onSort("netCash")}
                              >
                                {t("reports.colNet")}
                                {headerSortSuffix("netCash")}
                              </button>
                            </TableHeader>
                          </TableRow>
                        </TableHead>
                  <TableBody>
                    {q.data.items.map((row) => {
                      const ccy = iso4217OrUndefined(row.currencyCode);
                      const rk = branchComparisonRowKey(row);
                      const expanded = expandedRowKey === rk;
                      const ic = row.totalIncomeCash ?? 0;
                      const idc = row.totalIncomeCard ?? 0;
                      const ip = row.totalIncomeCashTaggedPatron ?? 0;
                      const er = row.totalExpenseRegister ?? 0;
                      const ep = row.totalExpensePatron ?? 0;
                      const epp = row.totalExpensePersonnelPocket ?? 0;
                      const eph = row.totalExpensePersonnelHeldRegisterCash ?? 0;
                      const eu = row.totalExpenseUnset ?? 0;
                      return (
                        <Fragment key={rk}>
                          <TableRow className="align-middle">
                            <TableCell className="max-w-[12rem] font-medium text-zinc-900 sm:max-w-none">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <button
                                  type="button"
                                  className={cn(
                                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900",
                                    expanded && "bg-zinc-100 text-zinc-900"
                                  )}
                                  aria-expanded={expanded}
                                  aria-label={
                                    expanded
                                      ? t("reports.branchComparisonExpandHide")
                                      : t("reports.branchComparisonExpandShow")
                                  }
                                  onClick={() =>
                                    setExpandedRowKey((k) => (k === rk ? null : rk))
                                  }
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    className={cn(
                                      "h-4 w-4 transition-transform",
                                      expanded ? "rotate-90" : ""
                                    )}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden
                                  >
                                    <path d="m9 18 6-6-6-6" />
                                  </svg>
                                </button>
                                <span className="min-w-0 truncate">
                                  {reportBranchLabel(row.branchId, row.branchName, t)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap tabular-nums text-zinc-700">
                              {currencyTableLabel(row.currencyCode)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right tabular-nums">
                              {formatLocaleAmount(row.totalIncome, locale, ccy)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right tabular-nums text-red-800/90">
                              {formatLocaleAmount(row.totalExpense, locale, ccy)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right tabular-nums text-zinc-700">
                              {formatLocaleAmount(
                                row.totalSupplierRegisterCashPaid ?? 0,
                                locale,
                                ccy
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right tabular-nums font-semibold text-zinc-900">
                              {formatLocaleAmount(row.netCash, locale, ccy)}
                            </TableCell>
                          </TableRow>
                          {expanded ? (
                            <TableRow className="bg-zinc-50/90">
                              <TableCell colSpan={6} className="p-0">
                                <div className="border-t border-zinc-200/80 p-3 sm:p-4">
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="min-w-0">
                                      <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
                                        {t("reports.branchComparisonDetailIncomeTitle")}
                                      </p>
                                      <dl className="space-y-1.5 text-xs">
                                        <div className="flex justify-between gap-3">
                                          <dt className="text-zinc-600">
                                            {t("reports.branchComparisonIncomeCash")}
                                          </dt>
                                          <dd className="tabular-nums font-medium text-zinc-900">
                                            {formatLocaleAmount(ic, locale, ccy)}
                                          </dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                          <dt className="text-zinc-600">
                                            {t("reports.branchComparisonIncomeCard")}
                                          </dt>
                                          <dd className="tabular-nums font-medium text-zinc-900">
                                            {formatLocaleAmount(idc, locale, ccy)}
                                          </dd>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                          <dt className="text-zinc-600">
                                            {t("reports.branchComparisonIncomeCashPatron")}
                                          </dt>
                                          <dd className="tabular-nums font-medium text-zinc-900">
                                            {formatLocaleAmount(ip, locale, ccy)}
                                          </dd>
                                        </div>
                                      </dl>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
                                        {t("reports.branchComparisonDetailExpenseTitle")}
                                      </p>
                                      <dl className="space-y-1.5 text-xs">
                                        {[
                                          { label: expensePaymentSourceLabel("REGISTER", t), v: er },
                                          { label: expensePaymentSourceLabel("PATRON", t), v: ep },
                                          { label: expensePaymentSourceLabel("PERSONNEL_POCKET", t), v: epp },
                                          {
                                            label: expensePaymentSourceLabel(
                                              "PERSONNEL_HELD_REGISTER_CASH",
                                              t
                                            ),
                                            v: eph,
                                          },
                                          { label: t("branch.expensePaymentUnset"), v: eu },
                                        ].map((line) => (
                                          <div
                                            key={line.label}
                                            className="flex justify-between gap-3"
                                          >
                                            <dt className="min-w-0 shrink text-zinc-600">
                                              {line.label}
                                            </dt>
                                            <dd className="tabular-nums font-medium text-zinc-900">
                                              {formatLocaleAmount(line.v, locale, ccy)}
                                            </dd>
                                          </div>
                                        ))}
                                      </dl>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                      </Table>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-zinc-600">
                        {fillTemplate(t("reports.branchComparisonPaging"), {
                          page: String(pageClamped),
                          totalPages: String(totalPages),
                          total: String(q.data.totalCount),
                        })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-10"
                          disabled={pageClamped <= 1 || q.isFetching}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          {t("reports.branchComparisonPrev")}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-10"
                          disabled={pageClamped >= totalPages || q.isFetching}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                          {t("reports.branchComparisonNext")}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </>
        }
      >
        {filterDrawerBody}
      </ReportMobileFilterSurface>
    </ReportTablesPageShell>
  );
}
