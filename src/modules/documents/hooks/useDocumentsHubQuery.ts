"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDocumentsHubRows } from "@/modules/documents/api/documents-hub-api";
import { useI18n } from "@/i18n/context";

export const documentsHubKeys = {
  all: ["documents-hub"] as const,
  list: () => [...documentsHubKeys.all, "list"] as const,
};

export function useDocumentsHubQuery() {
  const { t } = useI18n();
  return useQuery({
    queryKey: documentsHubKeys.list(),
    queryFn: () => fetchDocumentsHubRows(t),
  });
}

