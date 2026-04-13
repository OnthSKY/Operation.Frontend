"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import {
  useSystemNotificationSettingsQuery,
  useUpdateSystemNotificationSettingsMutation,
} from "@/modules/admin/hooks/useSystemNotificationSettingsQuery";
import { useI18n } from "@/i18n/context";
import { Card } from "@/shared/components/Card";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Switch } from "@/shared/ui/Switch";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function SystemNotificationSettingsScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();
  const { data, isPending, isError, error, refetch } = useSystemNotificationSettingsQuery(
    Boolean(user && user.role === "ADMIN")
  );
  const mut = useUpdateSystemNotificationSettingsMutation();

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

  const remindersOn = data?.operationalRemindersEnabled !== false;
  const dailyOn = data?.operationalDailyToastEnabled !== false;

  const save = async (patch: {
    operationalRemindersEnabled?: boolean;
    operationalDailyToastEnabled?: boolean;
  }) => {
    try {
      await mut.mutateAsync(patch);
      notify.success(t("settings.notificationsSaved"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  return (
    <div
      className={cn(
        "mx-auto flex w-full min-h-0 min-w-0 app-page-max flex-1 flex-col gap-5 sm:gap-6",
        "max-md:pt-2 md:pt-0 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pb-8"
      )}
    >
      <div className="min-w-0">
        <Link
          href="/admin/settings"
          className="inline-flex min-h-11 max-w-full items-center rounded-lg py-1.5 text-sm font-semibold text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline active:bg-violet-50"
        >
          ← {t("settings.backToSettings")}
        </Link>
        <h1 className="mt-2 break-words text-lg font-bold leading-snug tracking-tight text-zinc-900 sm:mt-3 sm:text-xl md:text-2xl">
          {t("settings.notificationsPageTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
          {t("settings.notificationsPageDescription")}
        </p>
      </div>

      {isPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-800">
          <p className="break-words leading-relaxed">{toErrorMessage(error)}</p>
          <button
            type="button"
            className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl bg-red-100 px-4 text-sm font-semibold text-red-900 ring-1 ring-red-200/80 active:bg-red-200/80 sm:mt-3 sm:w-auto sm:justify-start sm:bg-transparent sm:px-0 sm:ring-0 sm:underline"
            onClick={() => void refetch()}
          >
            {t("common.retry")}
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <Card className="overflow-hidden !p-0">
            <div className="border-b border-zinc-100 px-4 py-4 sm:px-5 sm:py-5">
              <h2 className="text-sm font-semibold text-zinc-900 sm:text-base">
                {t("settings.notificationsSectionOrg")}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 sm:text-sm">
                {t("settings.notificationsSectionOrgHint")}
              </p>
            </div>

            <ul className="flex flex-col divide-y divide-zinc-100">
              <li className={cn(mut.isPending && "pointer-events-none opacity-60")}>
                <label className="flex min-h-[3.25rem] cursor-pointer gap-3 px-4 py-4 active:bg-zinc-50 sm:min-h-0 sm:items-center sm:px-5 sm:py-4">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug text-zinc-900">
                      {t("settings.notificationsOperationalReminders")}
                    </span>
                    <span className="mt-1.5 block text-xs leading-relaxed text-zinc-600 sm:text-sm">
                      {t("settings.notificationsOperationalRemindersDesc")}
                    </span>
                  </span>
                  <Switch
                    checked={remindersOn}
                    disabled={mut.isPending}
                    onCheckedChange={(next) => void save({ operationalRemindersEnabled: next })}
                    className="self-start sm:self-center"
                  />
                </label>
              </li>
              <li className={cn(mut.isPending && "pointer-events-none opacity-60")}>
                <label
                  className={cn(
                    "flex min-h-[3.25rem] cursor-pointer gap-3 px-4 py-4 active:bg-zinc-50 sm:min-h-0 sm:items-center sm:px-5 sm:py-4",
                    !remindersOn && "cursor-not-allowed opacity-50"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold leading-snug text-zinc-900">
                      {t("settings.notificationsOperationalDailyToast")}
                    </span>
                    <span className="mt-1.5 block text-xs leading-relaxed text-zinc-600 sm:text-sm">
                      {t("settings.notificationsOperationalDailyToastDesc")}
                    </span>
                  </span>
                  <Switch
                    checked={dailyOn}
                    disabled={mut.isPending || !remindersOn}
                    onCheckedChange={(next) => void save({ operationalDailyToastEnabled: next })}
                    className="self-start sm:self-center"
                  />
                </label>
              </li>
            </ul>

            <p className="border-t border-zinc-100 px-4 py-3 text-[11px] leading-relaxed text-zinc-400 sm:px-5">
              {data?.updatedAtUtc
                ? `${t("settings.notificationsLastSaved")} ${formatLocaleDateTime(data.updatedAtUtc, locale)}`
                : t("settings.notificationsNeverUpdated")}
            </p>
          </Card>

          <p className="text-xs leading-relaxed text-zinc-500 sm:text-sm">{t("settings.notificationsUserPrefsNote")}</p>
        </div>
      )}
    </div>
  );
}
