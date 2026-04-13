"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useBranchComparisonReport } from "@/modules/reports/hooks/useReportsQueries";
import { ReportSeasonYearQuickSelect } from "@/modules/reports/components/ReportSeasonYearQuickSelect";
import { ReportTablesPageShell } from "@/modules/reports/components/ReportTablesPageShell";
import {
  addDaysFromIso,
  startOfMonthIso,
} from "@/modules/reports/lib/report-period-helpers";
import { reportBranchLabel } from "@/modules/reports/lib/report-branch-label";
import { CollapsibleMobileFilters } from "@/shared/components/CollapsibleMobileFilters";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { useEffect, useMemo, useState } from "react";

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => vars[key] ?? "—"
  );
}

type SortCol = "branchName" | "currencyCode" | "totalIncome" | "totalExpense" | "netCash";

export function BranchComparisonReportScreen() {
  const { t, locale } = useI18n();
  const [dateFrom, setDateFrom] = useState(startOfMonthIso);
  const [dateTo, setDateTo] = useState(() => localIsoDate());
  const [branchId, setBranchId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState<SortCol>("netCash");
  const [sortDescending, setSortDescending] = useState(true);

  const { data: branches = [] } = useBranchesList();

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, branchId, pageSize]);

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

  const setPreset = (key: "month" | "d30" | "d7") => {
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

  const filtersActive = branchId !== "";

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

  return (
    <ReportTablesPageShell
      title={t("reports.tablesPageBranchComparisonTitle")}
      subtitle={t("reports.tablesPageBranchComparisonSubtitle")}
      pageGuide={
        <PageWhenToUseGuide
          guideTab="reports"
          title={t("common.pageWhenToUseTitle")}
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
      <CollapsibleMobileFilters
        title={t("reports.filtersSectionTitle")}
        toggleAriaLabel={t("common.filters")}
        active={filtersActive}
        resetKey="branch-comparison"
        expandLabel={t("common.filtersShow")}
        collapseLabel={t("common.filtersHide")}
      >
        <p className="-mt-1 mb-2 text-xs leading-relaxed text-zinc-500 sm:mt-0">
          {t("reports.branchComparisonPeriodHelp")}
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 touch-manipulation text-xs sm:min-h-10"
              onClick={() => setPreset("month")}
            >
              {t("reports.presetThisMonth")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 touch-manipulation text-xs sm:min-h-10"
              onClick={() => setPreset("d30")}
            >
              {t("reports.presetLast30")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 touch-manipulation text-xs sm:min-h-10"
              onClick={() => setPreset("d7")}
            >
              {t("reports.presetLast7")}
            </Button>
          </div>
          <ReportSeasonYearQuickSelect
            dateFrom={dateFrom}
            dateTo={dateTo}
            onApplyRange={(f, d) => {
              setDateFrom(f);
              setDateTo(d);
            }}
            className="max-w-full sm:max-w-sm"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DateField
              label={t("reports.dateFrom")}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <DateField
              label={t("reports.dateTo")}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <label className="flex min-w-0 flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-700">
                {t("reports.colBranch")}
              </span>
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
              <span className="font-medium text-zinc-700">
                {t("reports.branchComparisonPageSize")}
              </span>
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
      </CollapsibleMobileFilters>

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
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white px-3 py-4 sm:px-5 sm:py-6">
          {q.data.items.length === 0 ? (
            <p className="text-sm text-zinc-600">{t("reports.branchComparisonEmpty")}</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader className="w-[28%]">
                        <button
                          type="button"
                          className="font-semibold text-left underline-offset-2 hover:underline"
                          onClick={() => onSort("branchName")}
                        >
                          {t("reports.colBranch")}
                          {headerSortSuffix("branchName")}
                        </button>
                      </TableHeader>
                      <TableHeader>
                        <button
                          type="button"
                          className="font-semibold text-left underline-offset-2 hover:underline"
                          onClick={() => onSort("currencyCode")}
                        >
                          {t("reports.colCurrency")}
                          {headerSortSuffix("currencyCode")}
                        </button>
                      </TableHeader>
                      <TableHeader className="text-right">
                        <button
                          type="button"
                          className="inline font-semibold underline-offset-2 hover:underline"
                          onClick={() => onSort("totalIncome")}
                        >
                          {t("reports.colIncome")}
                          {headerSortSuffix("totalIncome")}
                        </button>
                      </TableHeader>
                      <TableHeader className="text-right">
                        <button
                          type="button"
                          className="inline font-semibold underline-offset-2 hover:underline"
                          onClick={() => onSort("totalExpense")}
                        >
                          {t("reports.colExpense")}
                          {headerSortSuffix("totalExpense")}
                        </button>
                      </TableHeader>
                      <TableHeader className="text-right text-xs font-semibold normal-case text-zinc-600">
                        {t("reports.colSupplierRegisterPaid")}
                      </TableHeader>
                      <TableHeader className="text-right">
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
                    {q.data.items.map((row) => (
                      <TableRow key={`${row.branchId}-${row.currencyCode}`}>
                        <TableCell className="font-medium text-zinc-900">
                          {reportBranchLabel(
                            row.branchId,
                            row.branchName,
                            t
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums text-zinc-700">
                          {row.currencyCode}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatLocaleAmount(row.totalIncome, locale)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-red-800/90">
                          {formatLocaleAmount(row.totalExpense, locale)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-zinc-700">
                          {formatLocaleAmount(
                            row.totalSupplierRegisterCashPaid ?? 0,
                            locale
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-zinc-900">
                          {formatLocaleAmount(row.netCash, locale)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="space-y-2 sm:hidden">
                {q.data.items.map((row) => (
                  <li
                    key={`${row.branchId}-${row.currencyCode}`}
                    className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 px-3 py-2.5"
                  >
                    <p className="text-sm font-semibold text-zinc-900">
                      {reportBranchLabel(row.branchId, row.branchName, t)}
                    </p>
                    <p className="text-xs text-zinc-500">{row.currencyCode}</p>
                    <dl className="mt-2 grid gap-1 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-zinc-500">{t("reports.colIncome")}</dt>
                        <dd className="tabular-nums font-medium">
                          {formatLocaleAmount(row.totalIncome, locale)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-zinc-500">{t("reports.colExpense")}</dt>
                        <dd className="tabular-nums font-medium text-red-800/90">
                          {formatLocaleAmount(row.totalExpense, locale)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-zinc-500">
                          {t("reports.colSupplierRegisterPaid")}
                        </dt>
                        <dd className="tabular-nums font-medium text-zinc-800">
                          {formatLocaleAmount(
                            row.totalSupplierRegisterCashPaid ?? 0,
                            locale
                          )}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 border-t border-zinc-200 pt-1">
                        <dt className="font-medium text-zinc-700">{t("reports.colNet")}</dt>
                        <dd className="tabular-nums font-semibold">
                          {formatLocaleAmount(row.netCash, locale)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>

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
    </ReportTablesPageShell>
  );
}
