"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { isDriverPortalRole, isPersonnelPortalRole } from "@/lib/auth/roles";
import { useSystemNotificationSettingsQuery } from "@/modules/admin/hooks/useSystemNotificationSettingsQuery";
import { OperationalReminderDailyToast } from "@/shared/components/OperationalReminderDailyToast";
import { OperationalRemindersBell } from "@/shared/components/OperationalRemindersBell";

/** Ofis kullanıcıları için kurum bildirim ayarlarına göre zil / günlük toast. */
export function StaffHeaderNotifications() {
  const { user } = useAuth();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const driverPortal = isDriverPortalRole(user?.role);
  const staffFullNav = Boolean(user) && !personnelPortal && !driverPortal;

  const { data } = useSystemNotificationSettingsQuery(staffFullNav);

  if (!staffFullNav) return null;

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
