"use client";

import { useI18n } from "@/i18n/context";
import { ReportFinancialTimeSeriesCharts } from "@/modules/reports/components/ReportFinancialTimeSeriesCharts";
import { useFinancialReports } from "@/modules/reports/context/FinancialReportsContext";
import { useMemo } from "react";

export function FinancialReportTrendPage() {
  const { t, locale } = useI18n();
  const {
    financial,
    summaryMonthly,
    branchMonthly,
    finBranchId,
    finCurrency,
  } = useFinancialReports();

  const ccy = useMemo(() => {
    const currencies = financial.data?.totalsByCurrency.map((x) => x.currencyCode) ?? [];
    const want = finCurrency.trim();
    if (want && currencies.includes(want)) return want;
    if (currencies.includes("TRY")) return "TRY";
    return currencies[0] ?? "TRY";
  }, [financial.data, finCurrency]);

  if (financial.isPending) {
    return <p className="mt-2 text-sm text-zinc-500">{t("reports.loading")}</p>;
  }
  if (!financial.data) {
    return null;
  }

  return (
    <div className="mt-2">
      <ReportFinancialTimeSeriesCharts
        t={t}
        locale={locale}
        currencyCode={ccy}
        monthlyRows={summaryMonthly.data?.monthly}
        branchMonthlyRows={branchMonthly.data ?? undefined}
        showBranchNetByMonth={finBranchId === ""}
        suppressSectionIntro={false}
      />
    </div>
  );
}
