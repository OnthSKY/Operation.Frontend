import { FinancialReportsRouteLayout } from "@/modules/reports/components/FinancialReportsRouteLayout";
import type { ReactNode } from "react";

export default function FinancialLayout({ children }: { children: ReactNode }) {
  return <FinancialReportsRouteLayout>{children}</FinancialReportsRouteLayout>;
}
