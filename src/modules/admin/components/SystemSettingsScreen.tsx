"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { Card } from "@/shared/components/Card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function SystemSettingsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (isReady && user && user.role !== "ADMIN") router.replace("/personnel");
  }, [isReady, user, router]);

  if (!isReady || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-zinc-500">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto flex w-full min-w-0 app-page-max flex-1 flex-col gap-5 sm:gap-6",
        "max-md:pt-2 md:pt-0 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]"
      )}
    >
      <div className="min-w-0">
        <h1 className="break-words text-lg font-bold leading-snug tracking-tight text-zinc-900 sm:text-xl md:text-2xl">
          {t("settings.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
          {t("settings.description")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <Link
          href="/admin/users"
          className="block min-h-[4.5rem] rounded-xl ring-1 ring-zinc-200/80 transition hover:bg-zinc-50 active:bg-zinc-100"
        >
          <Card className="h-full min-h-[inherit] p-4 sm:p-5">
            <h2 className="text-base font-semibold text-zinc-900">{t("settings.usersCardTitle")}</h2>
            <p className="mt-2 text-sm text-zinc-600">{t("settings.usersCardDesc")}</p>
            <span className="mt-4 inline-block text-sm font-medium text-violet-700">
              {t("settings.usersCardLink")} →
            </span>
          </Card>
        </Link>

        <Link
          href="/admin/settings/authorization"
          className="block min-h-[4.5rem] rounded-xl ring-1 ring-zinc-200/80 transition hover:bg-zinc-50 active:bg-zinc-100"
        >
          <Card className="h-full min-h-[inherit] p-4 sm:p-5">
            <h2 className="text-base font-semibold text-zinc-900">{t("settings.authzCardTitle")}</h2>
            <p className="mt-2 text-sm text-zinc-600">{t("settings.authzCardDesc")}</p>
            <span className="mt-4 inline-block text-sm font-medium text-violet-700">
              {t("settings.authzCardLink")} →
            </span>
          </Card>
        </Link>

        <Link
          href="/admin/settings/notifications"
          className="block min-h-[4.5rem] rounded-xl ring-1 ring-zinc-200/80 transition hover:bg-zinc-50 active:bg-zinc-100 sm:col-span-2 lg:col-span-1"
        >
          <Card className="h-full min-h-[inherit] p-4 sm:p-5">
            <h2 className="text-base font-semibold text-zinc-900">{t("settings.notificationsCardTitle")}</h2>
            <p className="mt-2 text-sm text-zinc-600">{t("settings.notificationsCardDesc")}</p>
            <span className="mt-4 inline-block text-sm font-medium text-violet-700">
              {t("settings.notificationsCardLink")} →
            </span>
          </Card>
        </Link>

        <Link
          href="/admin/settings/branding"
          className="block min-h-[4.5rem] rounded-xl ring-1 ring-zinc-200/80 transition hover:bg-zinc-50 active:bg-zinc-100 sm:col-span-2 lg:col-span-1"
        >
          <Card className="h-full min-h-[inherit] p-4 sm:p-5">
            <h2 className="text-base font-semibold text-zinc-900">{t("settings.brandingCardTitle")}</h2>
            <p className="mt-2 text-sm text-zinc-600">{t("settings.brandingCardDesc")}</p>
            <span className="mt-4 inline-block text-sm font-medium text-violet-700">
              {t("settings.brandingCardLink")} →
            </span>
          </Card>
        </Link>

        <Link
          href="/admin/settings/tourism-season-closed-policy"
          className="block min-h-[4.5rem] rounded-xl ring-1 ring-zinc-200/80 transition hover:bg-zinc-50 active:bg-zinc-100 sm:col-span-2 lg:col-span-1"
        >
          <Card className="h-full min-h-[inherit] p-4 sm:p-5">
            <h2 className="text-base font-semibold text-zinc-900">{t("settings.tourismSeasonCardTitle")}</h2>
            <p className="mt-2 text-sm text-zinc-600">{t("settings.tourismSeasonCardDesc")}</p>
            <span className="mt-4 inline-block text-sm font-medium text-violet-700">
              {t("settings.tourismSeasonCardLink")} →
            </span>
          </Card>
        </Link>
      </div>
    </div>
  );
}
