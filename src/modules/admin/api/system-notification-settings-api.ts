import { apiRequest } from "@/shared/api/client";

export type SystemNotificationSettingsPayload = {
  operationalRemindersEnabled: boolean;
  operationalDailyToastEnabled: boolean;
  updatedAtUtc: string | null;
  updatedByUserId: number | null;
};

export type UpdateSystemNotificationSettingsBody = {
  operationalRemindersEnabled?: boolean;
  operationalDailyToastEnabled?: boolean;
};

export function fetchSystemNotificationSettings() {
  return apiRequest<SystemNotificationSettingsPayload>("/system/notification-settings");
}

export function putSystemNotificationSettings(body: UpdateSystemNotificationSettingsBody) {
  return apiRequest<SystemNotificationSettingsPayload>("/system/notification-settings", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
