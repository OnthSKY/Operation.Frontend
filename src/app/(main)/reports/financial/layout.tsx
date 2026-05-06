import { FinancialReportsAccessGuard } from "@/modules/reports/components/FinancialReportsAccessGuard";
import { FinancialReportsRouteLayout } from "@/modules/reports/components/FinancialReportsRouteLayout";
import type { ReactNode } from "react";

export default function FinancialLayout({ children }: { children: ReactNode }) {
  return (
    <FinancialReportsAccessGuard>
      <FinancialReportsRouteLayout>{children}</FinancialReportsRouteLayout>
    </FinancialReportsAccessGuard>
  );
}
