"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { canSeeFinancialReports } from "@/lib/auth/permissions";
import { useI18n } from "@/i18n/context";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * `/reports/financial` ağacı: `ui.reports.financial` (veya tam staff jokeri) yoksa kasa özeti rotasına yönlendirir.
 */
export function FinancialReportsAccessGuard({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (!isReady || !user) return;
    if (!canSeeFinancialReports(user)) {
      router.replace("/reports/position");
    }
  }, [isReady, user, router]);

  if (!isReady || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  if (!canSeeFinancialReports(user)) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  return <>{children}</>;
}
