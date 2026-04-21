"use client";

import { useI18n } from "@/i18n/context";
import {
  FinancialReportDetailTables,
  type FinancialReportTablesPanel,
} from "@/modules/reports/components/ReportsDetailTables";
import { useFinancialReportTables } from "@/modules/reports/context/FinancialReportTablesContext";

export function FinancialReportTablePanelPage({
  panel,
}: {
  panel: Exclude<FinancialReportTablesPanel, "all">;
}) {
  const { t, locale } = useI18n();
  const { financial, branchTrendMap } = useFinancialReportTables();
  if (!financial.data) return null;
  const tables = (
    <FinancialReportDetailTables
      data={financial.data}
      branchTrendMap={branchTrendMap}
      t={t}
      locale={locale}
      interactive
      panel={panel}
    />
  );
  if (panel === "totals") {
    return <div className="mt-2 w-full min-w-0 max-w-none">{tables}</div>;
  }
  return (
    <div className="w-full min-w-0 max-w-none space-y-6 rounded-2xl border border-zinc-200 bg-white px-3 py-4 sm:px-5 sm:py-6">
      {tables}
    </div>
  );
}
