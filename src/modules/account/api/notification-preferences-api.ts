import { apiRequest } from "@/shared/api/client";
import type { NotificationPreferences } from "@/lib/auth/types";

export type PatchNotificationPreferencesBody = {
  operationalDailyToast?: boolean;
};

export function patchMyNotificationPreferences(body: PatchNotificationPreferencesBody) {
  return apiRequest<NotificationPreferences>("/auth/me/notification-preferences", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
