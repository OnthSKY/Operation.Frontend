"use client";

import { fetchOperationalReminders } from "@/modules/reminders/api/reminders-api";
import { remindersKeys } from "@/modules/reminders/reminders-keys";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { useQuery } from "@tanstack/react-query";

export function useNotifications(enabled = true) {
  const today = localIsoDate();
  return useQuery({
    queryKey: remindersKeys.today(today),
    queryFn: () => fetchOperationalReminders(today),
    staleTime: 30_000,
    refetchInterval: enabled ? 30_000 : false,
    enabled,
  });
}
