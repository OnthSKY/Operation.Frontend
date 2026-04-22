import type { OperationalRemindersPayload } from "@/modules/reminders/api/reminders-api";

export function selectUnreadCount(data: OperationalRemindersPayload | undefined): number {
  if (!data) return 0;
  return (
    data.missingDayClose.length +
    data.zReportNotSentToAccounting.length +
    (data.vehiclesWithoutValidInsurance?.length ?? 0) +
    (data.vehiclesInsuranceExpiringWithin30Days?.length ?? 0) +
    (data.vehiclesMaintenanceDueSoon?.length ?? 0)
  );
}
