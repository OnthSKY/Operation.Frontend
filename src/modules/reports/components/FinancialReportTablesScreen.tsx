"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { FinancialReportAdvancedFilters } from "@/modules/reports/components/FinancialReportAdvancedFilters";
import { FinancialReportDetailTables } from "@/modules/reports/components/ReportsDetailTables";
import { ReportsPatronTabStory } from "@/modules/reports/components/ReportsPatronTabStory";
import { ReportSeasonYearQuickSelect } from "@/modules/reports/components/ReportSeasonYearQuickSelect";
import { ReportTablesPageShell } from "@/modules/reports/components/ReportTablesPageShell";
import {
  addDaysFromIso,
  startOfMonthIso,
} from "@/modules/reports/lib/report-period-helpers";
import { useFinancialReport } from "@/modules/reports/hooks/useReportsQueries";
import { CollapsibleMobileFilters } from "@/shared/components/CollapsibleMobileFilters";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Select } from "@/shared/ui/Select";
import { useEffect, useMemo, useState } from "react";

export function FinancialReportTablesScreen() {
  const { t, locale } = useI18n();
  const [dateFrom, setDateFrom] = useState(startOfMonthIso);
  const [dateTo, setDateTo] = useState(() => localIsoDate());
  const [finBranchId, setFinBranchId] = useState("");
  const [finCurrency, setFinCurrency] = useState("");
  const [finTransactionType, setFinTransactionType] = useState("");
  const [finMainCategory, setFinMainCategory] = useState("");
  const [finCategory, setFinCategory] = useState("");
  const [finExpenseSource, setFinExpenseSource] = useState("");

  const { data: branches = [] } = useBranchesList();

  const finBranchOptions = useMemo(
    () => [
      { value: "", label: t("reports.allBranches") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const finParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      branchId:
        finBranchId === "" ? undefined : Number.parseInt(finBranchId, 10),
      currencyCode: finCurrency || undefined,
      transactionType: finTransactionType || undefined,
      mainCategory: finMainCategory || undefined,
      category: finCategory || undefined,
      expensePaymentSource: finExpenseSource || undefined,
    }),
    [
      dateFrom,
      dateTo,
      finBranchId,
      finCurrency,
      finTransactionType,
      finMainCategory,
      finCategory,
      finExpenseSource,
    ]
  );

  const financial = useFinancialReport(finParams, true);

  useEffect(() => {
    setFinCategory("");
  }, [finMainCategory]);

  const branchTrendMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const tr of financial.data?.branchTrends ?? []) {
      m.set(`${tr.branchId}:${tr.currencyCode}`, tr.netDelta);
    }
    return m;
  }, [financial.data]);

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

  const filtersActive =
    finBranchId !== "" ||
    finCurrency !== "" ||
    finTransactionType !== "" ||
    finMainCategory !== "" ||
    finCategory !== "" ||
    finExpenseSource !== "";

  return (
    <ReportTablesPageShell
      title={t("reports.tablesPageFinTitle")}
      subtitle={t("reports.tablesPageFinSubtitle")}
    >
      <CollapsibleMobileFilters
        title={t("reports.filtersSectionTitle")}
        toggleAriaLabel={t("common.filters")}
        active={filtersActive}
        resetKey="fin-tables"
        expandLabel={t("common.filtersShow")}
        collapseLabel={t("common.filtersHide")}
      >
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
            <div className="min-w-0 sm:col-span-2">
              <Select
                name="finBranchFilter"
                label={t("reports.colBranch")}
                options={finBranchOptions}
                value={finBranchId}
                onChange={(e) => setFinBranchId(e.target.value)}
                onBlur={() => {}}
                className="min-h-11 sm:min-h-10 sm:text-sm"
              />
            </div>
          </div>
          <FinancialReportAdvancedFilters
            dateFrom={dateFrom}
            dateTo={dateTo}
            branchId={
              finBranchId === "" ? undefined : Number.parseInt(finBranchId, 10)
            }
            values={{
              currencyCode: finCurrency,
              transactionType: finTransactionType,
              mainCategory: finMainCategory,
              category: finCategory,
              expensePaymentSource: finExpenseSource,
            }}
            onChange={(patch) => {
              if (patch.currencyCode !== undefined) {
                setFinCurrency(patch.currencyCode);
              }
              if (patch.transactionType !== undefined) {
                setFinTransactionType(patch.transactionType);
              }
              if (patch.mainCategory !== undefined) {
                setFinMainCategory(patch.mainCategory);
              }
              if (patch.category !== undefined) {
                setFinCategory(patch.category);
              }
              if (patch.expensePaymentSource !== undefined) {
                setFinExpenseSource(patch.expensePaymentSource);
              }
            }}
          />
        </div>
      </CollapsibleMobileFilters>

      <ReportsPatronTabStory tab="financial" />

      {financial.isFetching && financial.data ? (
        <p className="text-center text-xs text-zinc-400" aria-live="polite">
          {t("reports.updatingHint")}
        </p>
      ) : null}

      {financial.isError ? (
        <p className="text-sm text-red-600">
          {t("reports.error")} {toErrorMessage(financial.error)}
        </p>
      ) : null}

      {financial.isPending ? (
        <p className="text-sm text-zinc-500">{t("reports.loading")}</p>
      ) : null}

      {financial.data ? (
        <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white px-3 py-4 sm:px-5 sm:py-6">
          <FinancialReportDetailTables
            data={financial.data}
            branchTrendMap={branchTrendMap}
            t={t}
            locale={locale}
            interactive
          />
        </div>
      ) : null}
    </ReportTablesPageShell>
  );
}
