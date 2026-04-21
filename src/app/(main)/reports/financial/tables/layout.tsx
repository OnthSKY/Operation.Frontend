"use client";

import { FinancialReportTablesProvider } from "@/modules/reports/context/FinancialReportTablesContext";
import { FinancialReportTablesShell } from "@/modules/reports/components/FinancialReportTablesShell";
import type { ReactNode } from "react";

export default function FinancialReportTablesLayout({ children }: { children: ReactNode }) {
  return (
    <FinancialReportTablesProvider>
      <FinancialReportTablesShell>{children}</FinancialReportTablesShell>
    </FinancialReportTablesProvider>
  );
}
