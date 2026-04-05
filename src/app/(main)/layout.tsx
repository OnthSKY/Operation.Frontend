"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { AppShell } from "@/shared/components/AppShell";
import { useI18n } from "@/i18n/context";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export default function MainLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (isReady && !user) router.replace("/login");
  }, [isReady, user, router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
