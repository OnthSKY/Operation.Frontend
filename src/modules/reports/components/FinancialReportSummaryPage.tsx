"use client";

import { useI18n } from "@/i18n/context";
import { FinancialSummaryTree } from "@/modules/reports/components/FinancialSummaryTree";
import { useFinancialReports } from "@/modules/reports/context/FinancialReportsContext";

export function FinancialReportSummaryPage() {
  const { t } = useI18n();
  const { financial, finBranchId, finCurrency } = useFinancialReports();

  if (financial.isPending) {
    return <p className="text-sm text-zinc-500">{t("reports.loading")}</p>;
  }
  if (!financial.data) {
    return null;
  }

  return (
    <FinancialSummaryTree
      className="mt-4"
      data={financial.data}
      filterCurrencyCode={finCurrency}
      branchScoped={finBranchId !== ""}
    />
  );
}