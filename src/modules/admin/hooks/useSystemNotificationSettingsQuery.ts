"use client";

import {
  fetchSystemNotificationSettings,
  putSystemNotificationSettings,
  type SystemNotificationSettingsPayload,
  type UpdateSystemNotificationSettingsBody,
} from "@/modules/admin/api/system-notification-settings-api";
import { systemNotificationSettingsKeys } from "@/modules/admin/system-notification-settings-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useSystemNotificationSettingsQuery(enabled: boolean) {
  return useQuery({
    queryKey: systemNotificationSettingsKeys.all,
    queryFn: fetchSystemNotificationSettings,
    staleTime: 60_000,
    enabled,
  });
}

export function useUpdateSystemNotificationSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSystemNotificationSettingsBody) =>
      putSystemNotificationSettings(body),
    onSuccess: (data: SystemNotificationSettingsPayload) => {
      qc.setQueryData(systemNotificationSettingsKeys.all, data);
      void qc.invalidateQueries({ queryKey: systemNotificationSettingsKeys.all });
    },
  });
}
