"use client";

import { useI18n } from "@/i18n/context";
import { ReportFinancialStoryCharts } from "@/modules/reports/components/ReportFinancialStoryCharts";
import { useFinancialReports } from "@/modules/reports/context/FinancialReportsContext";

export function FinancialReportComparePage() {
  const { t } = useI18n();
  const {
    financial,
    summaryMonthly,
    branchMonthly,
    finBranchId,
    finCurrency,
  } = useFinancialReports();

  if (financial.isPending) {
    return <p className="text-sm text-zinc-500">{t("reports.loading")}</p>;
  }
  if (!financial.data) {
    return null;
  }

  return (
    <div className="mt-2">
      <ReportFinancialStoryCharts
        data={financial.data}
        monthlyRows={summaryMonthly.data?.monthly}
        branchMonthlyRows={finBranchId === "" ? branchMonthly.data : null}
        showBranchNetByMonth={finBranchId === ""}
        filterCurrencyCode={finCurrency}
        includeCumulativeTrendCharts={false}
        storySegment="compare"
      />
    </div>
  );
}
