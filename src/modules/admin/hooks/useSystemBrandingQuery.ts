"use client";

import {
  deleteSystemBrandingLogo,
  fetchSystemBranding,
  postSystemBrandingLogo,
  putSystemBranding,
  type BrandingSettingsPayload,
} from "@/modules/admin/api/system-branding-api";
import { systemBrandingKeys } from "@/modules/admin/system-branding-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useSystemBrandingQuery(enabled: boolean) {
  return useQuery({
    queryKey: systemBrandingKeys.all,
    queryFn: fetchSystemBranding,
    staleTime: 60_000,
    enabled,
    retry: 2,
    refetchOnWindowFocus: true,
  });
}

function patchBrandingCache(qc: ReturnType<typeof useQueryClient>, data: BrandingSettingsPayload) {
  qc.setQueryData(systemBrandingKeys.all, data);
}

export function usePutSystemBrandingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { companyName: string | null }) => putSystemBranding(body),
    onSuccess: (data) => {
      patchBrandingCache(qc, data);
      void qc.invalidateQueries({ queryKey: systemBrandingKeys.all });
    },
  });
}

export function usePostSystemBrandingLogoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => postSystemBrandingLogo(file),
    onSuccess: (data) => {
      patchBrandingCache(qc, data);
      void qc.invalidateQueries({ queryKey: systemBrandingKeys.all });
    },
  });
}

export function useDeleteSystemBrandingLogoMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteSystemBrandingLogo(),
    onSuccess: (data) => {
      patchBrandingCache(qc, data);
      void qc.invalidateQueries({ queryKey: systemBrandingKeys.all });
    },
  });
}
