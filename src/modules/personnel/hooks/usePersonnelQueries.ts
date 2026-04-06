"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdvance,
  fetchAdvancesByPersonnel,
  fetchAllAdvances,
  type FetchAllAdvancesParams,
} from "@/modules/personnel/api/advances-api";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
import { dashboardSummaryKeys } from "@/modules/dashboard/query-keys";
import {
  createPersonnel,
  fetchPersonnelList,
  fetchPersonnelManagementSnapshot,
  softDeletePersonnel,
  updatePersonnel,
} from "@/modules/personnel/api/personnel-api";
import { usersKeys } from "@/modules/personnel/hooks/useUsersQueries";
import type { CreateAdvanceInput } from "@/types/advance";
import type { CreatePersonnelInput, UpdatePersonnelInput } from "@/types/personnel";

export const personnelKeys = {
  all: ["personnel"] as const,
  list: () => [...personnelKeys.all, "list"] as const,
  managementSnapshot: (personnelId: number) =>
    [...personnelKeys.all, "management-snapshot", personnelId] as const,
  /** @param effectiveYear calendar year — filters API by effectiveYear; omit for all years */
  advances: (personnelId: number, effectiveYear?: number) =>
    [...personnelKeys.all, "advances", personnelId, effectiveYear ?? "all"] as const,
  advancesAll: (
    effectiveYear: number,
    personnelId: number,
    branchId: number,
    limit: number
  ) =>
    [
      ...personnelKeys.all,
      "advances-all",
      effectiveYear,
      personnelId,
      branchId,
      limit,
    ] as const,
};

export function usePersonnelList(enabled: boolean = true) {
  return useQuery({
    queryKey: personnelKeys.list(),
    queryFn: fetchPersonnelList,
    enabled,
  });
}

export function usePersonnelManagementSnapshot(
  personnelId: number | null | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: personnelKeys.managementSnapshot(personnelId ?? 0),
    queryFn: () => fetchPersonnelManagementSnapshot(personnelId!),
    enabled: enabled && personnelId != null && personnelId > 0,
  });
}

/** Tüm yıllar — geçmiş listesi (effectiveYear filtresi yok). */
export function usePersonnelAdvancesAll(personnelId: number | null | undefined) {
  return useQuery({
    queryKey: personnelKeys.advances(personnelId ?? 0, undefined),
    queryFn: () => fetchAdvancesByPersonnel(personnelId!),
    enabled: personnelId != null && personnelId > 0,
  });
}

export function useAllAdvancesList(
  params: FetchAllAdvancesParams,
  enabled: boolean = true
) {
  const effectiveYear = params.effectiveYear;
  const personnelId = params.personnelId ?? 0;
  const branchId = params.branchId ?? 0;
  const limit =
    params.limit != null &&
    Number.isFinite(params.limit) &&
    params.limit >= 1 &&
    params.limit <= 1000
      ? Math.trunc(params.limit)
      : 500;
  const yearKey = effectiveYear ?? 0;
  return useQuery({
    queryKey: personnelKeys.advancesAll(
      yearKey,
      personnelId,
      branchId,
      limit
    ),
    queryFn: () =>
      fetchAllAdvances({
        effectiveYear:
          effectiveYear != null &&
          Number.isFinite(effectiveYear) &&
          effectiveYear >= 1900 &&
          effectiveYear <= 9999
            ? Math.trunc(effectiveYear)
            : undefined,
        personnelId: personnelId > 0 ? personnelId : undefined,
        branchId: branchId > 0 ? branchId : undefined,
        limit,
      }),
    enabled,
  });
}

export function useCreatePersonnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePersonnelInput) => createPersonnel(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.list() });
      void qc.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function useUpdatePersonnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePersonnelInput) => updatePersonnel(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.list() });
    },
  });
}

export function useSoftDeletePersonnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeletePersonnel(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.list() });
    },
  });
}

export function useCreateAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdvanceInput) => createAdvance(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: personnelKeys.list() });
      void qc.invalidateQueries({
        queryKey: [...personnelKeys.all, "advances"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...personnelKeys.all, "management-snapshot"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...personnelKeys.all, "advances-all"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...branchKeys.all, "advances"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...branchKeys.all, "register-summary"],
        exact: false,
      });
      void qc.invalidateQueries({ queryKey: branchKeys.all });
      void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
    },
  });
}
