"use client";

import { useI18n } from "@/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasStaffOperationsNotifications } from "@/lib/auth/permissions";
import { fetchOperationalReminders } from "@/modules/reminders/api/reminders-api";
import { remindersKeys } from "@/modules/reminders/reminders-keys";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

const LS_KEY = "ops.operationalReminderToastDate";

function reminderCount(
  d:
    | {
        missingDayClose: readonly unknown[];
        zReportNotSentToAccounting: readonly unknown[];
        vehiclesWithoutValidInsurance?: readonly unknown[];
        vehiclesInsuranceExpiringWithin30Days?: readonly unknown[];
        vehiclesMaintenanceDueSoon?: readonly unknown[];
      }
    | undefined
) {
  if (!d) return 0;
  return (
    d.missingDayClose.length +
    d.zReportNotSentToAccounting.length +
    (d.vehiclesWithoutValidInsurance?.length ?? 0) +
    (d.vehiclesInsuranceExpiringWithin30Days?.length ?? 0) +
    (d.vehiclesMaintenanceDueSoon?.length ?? 0)
  );
}

/** Günlük bir kez (yerel takvim günü) bekleyen hatırlatıcı varsa bilgi tostu. */
export function OperationalReminderDailyToast() {
  const { user } = useAuth();
  const { t } = useI18n();
  const today = localIsoDate();
  const shownRef = useRef(false);
  const dailyToastAllowed = user?.notificationPreferences?.operationalDailyToast !== false;
  const staffOps = Boolean(user) && hasStaffOperationsNotifications(user);

  const { data, isSuccess } = useQuery({
    queryKey: remindersKeys.today(today),
    queryFn: () => fetchOperationalReminders(today),
    staleTime: 60_000,
    enabled: staffOps && dailyToastAllowed,
  });

  useEffect(() => {
    if (!staffOps || !dailyToastAllowed || !isSuccess || !data) return;
    if (typeof window === "undefined") return;
    if (shownRef.current) return;
    if (reminderCount(data) === 0) return;
    try {
      if (localStorage.getItem(LS_KEY) === today) return;
    } catch {
      /* private mode */
    }
    shownRef.current = true;
    try {
      localStorage.setItem(LS_KEY, today);
    } catch {
      /* private mode */
    }
    notify.info(t("reminders.dailyToast"));
  }, [staffOps, dailyToastAllowed, isSuccess, data, today, t]);

  return null;
}
