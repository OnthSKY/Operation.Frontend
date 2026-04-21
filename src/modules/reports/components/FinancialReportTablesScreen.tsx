"use client";

import { useI18n } from "@/i18n/context";
import { FinancialReportDetailTables } from "@/modules/reports/components/ReportsDetailTables";
import { FinancialReportTablesShell } from "@/modules/reports/components/FinancialReportTablesShell";
import {
  FinancialReportTablesProvider,
  useFinancialReportTables,
} from "@/modules/reports/context/FinancialReportTablesContext";

function FinancialReportTablesAllBody() {
  const { t, locale } = useI18n();
  const { financial, branchTrendMap } = useFinancialReportTables();
  if (!financial.data) return null;
  return (
    <div className="w-full min-w-0 max-w-none space-y-6 rounded-2xl border border-zinc-200 bg-white px-3 py-4 sm:px-5 sm:py-6">
      <FinancialReportDetailTables
        data={financial.data}
        branchTrendMap={branchTrendMap}
        t={t}
        locale={locale}
        interactive
        panel="all"
      />
    </div>
  );
}

/** Full single-page tables; wrap with `FinancialReportTablesProvider` if not under `/reports/financial/tables` layout. */
export function FinancialReportTablesScreen() {
  return (
    <FinancialReportTablesProvider>
      <FinancialReportTablesShell showTableSubnav={false}>
        <FinancialReportTablesAllBody />
      </FinancialReportTablesShell>
    </FinancialReportTablesProvider>
  );
}
