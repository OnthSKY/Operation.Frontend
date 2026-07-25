"use client";

import { fetchDocumentDefinitions } from "@/modules/admin/api/document-definitions-api";
import { useQuery } from "@tanstack/react-query";

export const documentDefinitionsKeys = {
  all: ["document-definitions"] as const,
  list: (includeInactive: boolean) =>
    ["document-definitions", { includeInactive }] as const,
};

export function useDocumentDefinitionsQuery(enabled: boolean, includeInactive = false) {
  return useQuery({
    queryKey: documentDefinitionsKeys.list(includeInactive),
    queryFn: () => fetchDocumentDefinitions(includeInactive),
    staleTime: 60_000,
    enabled,
  });
}
