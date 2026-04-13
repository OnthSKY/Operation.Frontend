"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { patchMyNotificationPreferences } from "@/modules/account/api/notification-preferences-api";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Switch } from "@/shared/ui/Switch";
import { useState } from "react";

export function AccountSettingsPanel() {
  const { t } = useI18n();
  const { user, refreshMe } = useAuth();
  const [busy, setBusy] = useState(false);

  const dailyToast =
    user?.notificationPreferences?.operationalDailyToast !== false;

  const onToggleDailyToast = async (enabled: boolean) => {
    setBusy(true);
    try {
      await patchMyNotificationPreferences({ operationalDailyToast: enabled });
      await refreshMe();
      notify.success(t("profile.notificationPrefsSaved"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <section aria-labelledby="account-settings-notifications-heading" className="space-y-3">
        <h3
          id="account-settings-notifications-heading"
          className="text-base font-semibold text-zinc-900"
        >
          {t("profile.settingsNotificationsHeading")}
        </h3>
        <p className="text-sm text-zinc-600">{t("profile.settingsNotificationsIntro")}</p>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80">
          <label
            className={cn(
              "flex min-h-[3.25rem] cursor-pointer gap-3 px-3 py-3.5 active:bg-zinc-100/80 sm:min-h-0 sm:items-center sm:px-4 sm:py-4"
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-snug text-zinc-900">
                {t("profile.notificationOperationalDailyToast")}
              </span>
              <span className="mt-1.5 block text-xs leading-relaxed text-zinc-600 sm:text-sm">
                {t("profile.notificationOperationalDailyToastHint")}
              </span>
            </span>
            <Switch
              checked={dailyToast}
              disabled={busy || !user}
              onCheckedChange={(next) => void onToggleDailyToast(next)}
              className="self-start sm:self-center"
            />
          </label>
        </div>
      </section>

      <p className="text-xs text-zinc-400">{t("profile.settingsMoreComing")}</p>
    </div>
  );
}
