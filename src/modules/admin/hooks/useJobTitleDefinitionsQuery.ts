"use client";

import { fetchJobTitleDefinitions } from "@/modules/admin/api/job-title-definitions-api";
import { useQuery } from "@tanstack/react-query";

export const jobTitleDefinitionsKeys = {
  all: ["job-title-definitions"] as const,
  list: (includeInactive: boolean) =>
    ["job-title-definitions", { includeInactive }] as const,
};

export function useJobTitleDefinitionsQuery(enabled: boolean, includeInactive = false) {
  return useQuery({
    queryKey: jobTitleDefinitionsKeys.list(includeInactive),
    queryFn: () => fetchJobTitleDefinitions(includeInactive),
    staleTime: 60_000,
    enabled,
  });
}
