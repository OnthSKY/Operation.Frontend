import { apiRequest } from "@/shared/api/client";

export type MissingDayCloseReminder = {
  branchId: number;
  branchName: string;
  date: string;
};

export type ZReportPendingReminder = {
  branchId: number;
  branchName: string;
  year: number;
  month: number;
  /** Aktif turizm dönemi (bugün) */
  tourismSeasonOpenedOn?: string | null;
  tourismSeasonClosedOn?: string | null;
};

export type VehicleInsuranceMissingReminder = {
  vehicleId: number;
  plateNumber: string;
};

export type VehicleInsuranceExpiringReminder = {
  vehicleId: number;
  plateNumber: string;
  insuranceEndDate: string;
};

export type VehicleMaintenanceDueReminder = {
  vehicleId: number;
  plateNumber: string;
  nextDueDate: string;
};

export type OperationalRemindersPayload = {
  missingDayClose: MissingDayCloseReminder[];
  zReportNotSentToAccounting: ZReportPendingReminder[];
  vehiclesWithoutValidInsurance?: VehicleInsuranceMissingReminder[];
  vehiclesInsuranceExpiringWithin30Days?: VehicleInsuranceExpiringReminder[];
  vehiclesMaintenanceDueSoon?: VehicleMaintenanceDueReminder[];
};

export function fetchOperationalReminders(todayIso: string) {
  const q = new URLSearchParams({ today: todayIso });
  return apiRequest<OperationalRemindersPayload>(`/reminders?${q}`);
}

export function markZReportAccountingSent(body: {
  branchId: number;
  year: number;
  month: number;
}) {
  return apiRequest<null>("/reminders/z-report-accounting", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
