"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { hasStaffOperationsNotifications } from "@/lib/auth/permissions";
import { useSystemNotificationSettingsQuery } from "@/modules/admin/hooks/useSystemNotificationSettingsQuery";
import { OperationalReminderDailyToast } from "@/shared/components/OperationalReminderDailyToast";
import { OperationalRemindersBell } from "@/shared/components/OperationalRemindersBell";

/** Ofis kullanıcıları için kurum bildirim ayarlarına göre zil / günlük toast. */
export function StaffHeaderNotifications() {
  const { user } = useAuth();
  const staffOps = Boolean(user) && hasStaffOperationsNotifications(user);

  const { data } = useSystemNotificationSettingsQuery(staffOps);

  if (!staffOps) return null;

  const remindersOn = data?.operationalRemindersEnabled !== false;
  const dailyToastSysOn = data?.operationalDailyToastEnabled !== false;

  if (!remindersOn) return null;

  return (
    <>
      {dailyToastSysOn ? <OperationalReminderDailyToast /> : null}
      <OperationalRemindersBell />
    </>
  );
}
