"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  fetchUserDataScopes,
  fetchUserPermissionOverrides,
  fetchUsersList,
  hardDeleteUser,
  patchUserAccountStatus,
  patchUserRole,
  patchUserSelfFinancialsVisibility,
  putUserDataScopes,
  putUserPermissionOverrides,
  resetUserPassword,
  setUserMfaEnabled,
  softDeleteUser,
  updateUserProfile,
} from "@/modules/personnel/api/users-api";
import type {
  BranchScopeAssignment,
  PersonnelScopeAssignment,
  WarehouseScopeAssignment,
} from "@/types/user";
import type { CreateUserInput, UpdateUserProfileInput } from "@/types/user";
import { invalidateWarehousePeopleOptions } from "@/modules/warehouse/hooks/useWarehouseQueries";

export const usersKeys = {
  all: ["users"] as const,
  list: () => [...usersKeys.all, "list"] as const,
  permissionOverrides: (userId: number) =>
    [...usersKeys.all, "permission-overrides", userId] as const,
  dataScopes: (userId: number) => [...usersKeys.all, "data-scopes", userId] as const,
};

export function useUsersList(enabled = true) {
  return useQuery({
    queryKey: usersKeys.list(),
    queryFn: fetchUsersList,
    enabled,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.list() });
      void qc.invalidateQueries({ queryKey: ["personnel", "list"] });
      invalidateWarehousePeopleOptions(qc);
    },
  });
}

export function usePatchUserSelfFinancials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { userId: number; allowPersonnelSelfFinancials: boolean }) =>
      patchUserSelfFinancialsVisibility(args.userId, args.allowPersonnelSelfFinancials),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function usePatchUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { userId: number; role: string; personnelId?: number }) =>
      patchUserRole(args.userId, args.role, args.personnelId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.list() });
      invalidateWarehousePeopleOptions(qc);
    },
  });
}

export function usePatchUserAccountStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { userId: number; active: boolean }) =>
      patchUserAccountStatus(args.userId, args.active),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function useUpdateUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { userId: number; input: UpdateUserProfileInput }) =>
      updateUserProfile(args.userId, args.input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.list() });
      invalidateWarehousePeopleOptions(qc);
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (args: { userId: number; password: string }) =>
      resetUserPassword(args.userId, args.password),
  });
}

export function useSetUserMfaEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { userId: number; enabled: boolean }) =>
      setUserMfaEnabled(args.userId, args.enabled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function useSoftDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => softDeleteUser(userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.list() });
      invalidateWarehousePeopleOptions(qc);
    },
  });
}

export function useHardDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => hardDeleteUser(userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: usersKeys.list() });
      invalidateWarehousePeopleOptions(qc);
    },
  });
}

export function useUserPermissionOverrides(userId: number | null, enabled = true) {
  return useQuery({
    queryKey: usersKeys.permissionOverrides(userId ?? 0),
    queryFn: () => fetchUserPermissionOverrides(userId ?? 0),
    enabled: enabled && Boolean(userId && userId > 0),
  });
}

export function usePutUserPermissionOverrides() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      userId: number;
      allowPermissionCodes: string[];
      denyPermissionCodes: string[];
    }) =>
      putUserPermissionOverrides(
        args.userId,
        args.allowPermissionCodes,
        args.denyPermissionCodes
      ),
    onSuccess: (result, args) => {
      void qc.invalidateQueries({ queryKey: usersKeys.permissionOverrides(args.userId) });
      void qc.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function useUserDataScopes(userId: number | null, enabled = true) {
  return useQuery({
    queryKey: usersKeys.dataScopes(userId ?? 0),
    queryFn: () => fetchUserDataScopes(userId ?? 0),
    enabled: enabled && Boolean(userId && userId > 0),
  });
}

export function usePutUserDataScopes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      userId: number;
      branchScopes: BranchScopeAssignment[];
      warehouseScopes: WarehouseScopeAssignment[];
      personnelScopes: PersonnelScopeAssignment[];
    }) =>
      putUserDataScopes(
        args.userId,
        args.branchScopes,
        args.warehouseScopes,
        args.personnelScopes
      ),
    onSuccess: (_result, args) => {
      void qc.invalidateQueries({ queryKey: usersKeys.dataScopes(args.userId) });
      void qc.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}
