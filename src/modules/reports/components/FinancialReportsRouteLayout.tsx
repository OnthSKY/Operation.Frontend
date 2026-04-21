"use client";

import { FinancialReportsProvider } from "@/modules/reports/context/FinancialReportsContext";
import { FinancialReportsShell } from "@/modules/reports/components/FinancialReportsShell";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function FinancialReportsRouteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname.includes("/reports/financial/tables")) {
    return <>{children}</>;
  }
  return (
    <FinancialReportsProvider>
      <FinancialReportsShell>{children}</FinancialReportsShell>
    </FinancialReportsProvider>
  );
}
