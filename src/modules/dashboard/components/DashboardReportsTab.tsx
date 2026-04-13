"use client";

import { ReportLinkRow } from "@/modules/dashboard/components/ReportLinkRow";

export function DashboardReportsTab({
  t,
  userRole,
}: {
  t: (key: string) => string;
  userRole?: string | null;
}) {
  return (
            <section className="flex flex-col gap-3" role="tabpanel">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                {t("dashboard.detailedReportsTitle")}
              </h2>
              <p className="text-sm text-zinc-500">
                {t("dashboard.detailedReportsDesc")}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ReportLinkRow href="/reports">
                {t("dashboard.reportLinkReportsHub")}
              </ReportLinkRow>
              <ReportLinkRow href="/reports/branches">
                {t("dashboard.reportLinkBranchComparison")}
              </ReportLinkRow>
              <ReportLinkRow href="/branches">
                {t("dashboard.reportLinkBranch")}
              </ReportLinkRow>
              <ReportLinkRow href="/warehouses">
                {t("dashboard.reportLinkWarehouse")}
              </ReportLinkRow>
              <ReportLinkRow href="/products">
                {t("dashboard.reportLinkProducts")}
              </ReportLinkRow>
              <ReportLinkRow href="/personnel">
                {t("dashboard.reportLinkPersonnel")}
              </ReportLinkRow>
              <ReportLinkRow href="/personnel/costs">
                {t("dashboard.reportLinkPersonnelCosts")}
              </ReportLinkRow>
              {userRole === "ADMIN" ? (
                <ReportLinkRow href="/admin/users">
                  {t("dashboard.reportLinkUsers")}
                </ReportLinkRow>
              ) : null}
            </div>
          </section>
  );
}
