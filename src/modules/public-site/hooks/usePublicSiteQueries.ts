"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFlavor,
  deleteBranchImage,
  deleteFlavor,
  deleteFlavorImage,
  fetchFlavors,
  fetchSelectableProducts,
  fetchPublicSiteBranch,
  fetchPublicSiteBranches,
  fetchSiteContent,
  savePublicSiteBranch,
  revalidateSite,
  saveSiteContent,
  updateFlavor,
  uploadBranchImage,
  uploadFlavorImage,
  type SiteContentAdmin,
  type UpsertBranchPublicProfile,
  type UpsertFlavor,
} from "@/modules/public-site/api/public-site-api";

export const publicSiteKeys = {
  all: ["public-site"] as const,
  branches: () => [...publicSiteKeys.all, "branches"] as const,
  branch: (id: number) => [...publicSiteKeys.all, "branch", id] as const,
  content: () => [...publicSiteKeys.all, "content"] as const,
  flavors: () => [...publicSiteKeys.all, "flavors"] as const,
};

export function usePublicSiteBranches() {
  return useQuery({
    queryKey: publicSiteKeys.branches(),
    queryFn: fetchPublicSiteBranches,
  });
}

export function usePublicSiteBranch(branchId: number | null) {
  return useQuery({
    queryKey: publicSiteKeys.branch(branchId ?? 0),
    queryFn: () => fetchPublicSiteBranch(branchId!),
    enabled: branchId != null && branchId > 0,
  });
}

export function useSavePublicSiteBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { branchId: number; body: UpsertBranchPublicProfile }) =>
      savePublicSiteBranch(input.branchId, input.body),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: publicSiteKeys.branches() });
      void qc.invalidateQueries({ queryKey: publicSiteKeys.branch(input.branchId) });
    },
  });
}

export function useUploadBranchImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { branchId: number; file: File }) => uploadBranchImage(input.branchId, input.file),
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: publicSiteKeys.branches() });
      void qc.invalidateQueries({ queryKey: publicSiteKeys.branch(input.branchId) });
    },
  });
}

export function useDeleteBranchImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (branchId: number) => deleteBranchImage(branchId),
    onSuccess: (_data, branchId) => {
      void qc.invalidateQueries({ queryKey: publicSiteKeys.branches() });
      void qc.invalidateQueries({ queryKey: publicSiteKeys.branch(branchId) });
    },
  });
}

export function useSiteContent() {
  return useQuery({
    queryKey: publicSiteKeys.content(),
    queryFn: fetchSiteContent,
  });
}

export function useSaveSiteContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SiteContentAdmin) => saveSiteContent(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: publicSiteKeys.content() }),
  });
}

// ---- Çeşitler ----

export function useFlavors() {
  return useQuery({
    queryKey: publicSiteKeys.flavors(),
    queryFn: fetchFlavors,
  });
}

export function useSelectableProducts() {
  return useQuery({
    queryKey: [...publicSiteKeys.all, "products"] as const,
    queryFn: fetchSelectableProducts,
  });
}

export function useCreateFlavor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertFlavor) => createFlavor(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: publicSiteKeys.flavors() }),
  });
}

export function useUpdateFlavor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; body: UpsertFlavor }) => updateFlavor(input.id, input.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: publicSiteKeys.flavors() }),
  });
}

export function useDeleteFlavor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteFlavor(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: publicSiteKeys.flavors() }),
  });
}

export function useUploadFlavorImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; file: File }) => uploadFlavorImage(input.id, input.file),
    onSuccess: () => void qc.invalidateQueries({ queryKey: publicSiteKeys.flavors() }),
  });
}

export function useDeleteFlavorImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteFlavorImage(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: publicSiteKeys.flavors() }),
  });
}

export function useRevalidateSite() {
  return useMutation({ mutationFn: revalidateSite });
}
