"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import {
  useSystemNotificationSettingsQuery,
  useUpdateSystemNotificationSettingsMutation,
} from "@/modules/admin/hooks/useSystemNotificationSettingsQuery";
import { useI18n } from "@/i18n/context";
import { StickyActionBar } from "@/components/mobile/StickyActionBar";
import { Card } from "@/shared/components/Card";
import { PageScreenScaffold } from "@/shared/components/PageScreenScaffold";
import { PageWhenToUseGuide } from "@/shared/components/PageWhenToUseGuide";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Switch } from "@/shared/ui/Switch";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SystemNotificationSettingsScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { user, isReady } = useAuth();
  const { data, isPending, isError, error, refetch } = useSystemNotificationSettingsQuery(
    Boolean(user && user.role === "ADMIN")
  );
  const mut = useUpdateSystemNotificationSettingsMutation();
  const [draft, setDraft] = useState({
    operationalRemindersEnabled: true,
    operationalDailyToastEnabled: true,
  });

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

  useEffect(() => {
    if (!data) return;
    setDraft({
      operationalRemindersEnabled: data.operationalRemindersEnabled !== false,
      operationalDailyToastEnabled: data.operationalDailyToastEnabled !== false,
    });
  }, [data]);

  const remindersOn = draft.operationalRemindersEnabled;
  const dailyOn = draft.operationalDailyToastEnabled;

  const save = async () => {
    try {
      await mut.mutateAsync({
        operationalRemindersEnabled: remindersOn,
        operationalDailyToastEnabled: dailyOn,
      });
      notify.success(t("settings.notificationsSaved"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const hasChanges =
    data != null &&
    (remindersOn !== (data.operationalRemindersEnabled !== false) ||
      dailyOn !== (data.operationalDailyToastEnabled !== false));

  return (
    <>
      <PageScreenScaffold
        variant="form"
        className={cn("w-full pb-24 pt-2 sm:pt-4")}
        top={
          <Link
            href="/admin/settings"
            className="inline-flex min-h-11 max-w-full items-center rounded-lg py-1.5 text-sm font-semibold text-violet-700 underline-offset-2 hover:text-violet-900 hover:underline active:bg-violet-50"
          >
            ← {t("settings.backToSettings")}
          </Link>
        }
        intro={
          <>
            <div className="min-w-0">
              <h1 className="mt-2 break-words text-lg font-bold leading-snug tracking-tight text-zinc-900 sm:mt-3 sm:text-xl md:text-2xl">
                {t("settings.notificationsPageTitle")}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
                {t("settings.notificationsPageDescription")}
              </p>
            </div>
            <PageWhenToUseGuide
              guideTab="admin"
              title={t("common.pageWhenToUseTitle")}
              description={t("pageHelp.settingsNotifications.intro")}
              listVariant="ordered"
              items={[
                { text: t("pageHelp.settingsNotifications.step1") },
                { text: t("pageHelp.settingsNotifications.step2") },
              ]}
            />
          </>
        }
        main={
          isPending ? (
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
                    onCheckedChange={(next) =>
                      setDraft((prev) => ({
                        ...prev,
                        operationalRemindersEnabled: next,
                        operationalDailyToastEnabled:
                          next ? prev.operationalDailyToastEnabled : false,
                      }))
                    }
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
                    onCheckedChange={(next) =>
                      setDraft((prev) => ({ ...prev, operationalDailyToastEnabled: next }))
                    }
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
          )
        }
      />
      <StickyActionBar>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full rounded-xl text-sm font-semibold"
            disabled={mut.isPending || !data || !hasChanges}
            onClick={() =>
              data &&
              setDraft({
                operationalRemindersEnabled: data.operationalRemindersEnabled !== false,
                operationalDailyToastEnabled: data.operationalDailyToastEnabled !== false,
              })
            }
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="min-h-11 w-full rounded-xl text-sm font-semibold"
            disabled={mut.isPending || !data || !hasChanges}
            onClick={() => void save()}
          >
            {mut.isPending ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </StickyActionBar>
    </>
  );
}
