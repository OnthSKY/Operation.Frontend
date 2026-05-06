"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import {
  PERM,
  canSeeDailyBranchRegister,
  canSeeFinancialReports,
  canSeeUiModule,
} from "@/lib/auth/permissions";
import { useI18n } from "@/i18n/context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ReportsIndexPage() {
  const { user, isReady } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (!isReady || !user) return;
    if (canSeeFinancialReports(user)) {
      router.replace("/reports/financial");
      return;
    }
    if (canSeeUiModule(user, PERM.uiReports)) {
      router.replace("/reports/position");
      return;
    }
    if (canSeeDailyBranchRegister(user)) {
      router.replace("/daily-branch-register");
      return;
    }
    router.replace("/");
  }, [isReady, user, router]);

  return (
    <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
      {t("common.loading")}
    </div>
  );
}
