"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  fetchUserDataScopes,
  fetchUserPermissionOverrides,
  fetchUsersList,
  patchUserAccountStatus,
  patchUserRole,
  patchUserSelfFinancialsVisibility,
  putUserDataScopes,
  putUserPermissionOverrides,
} from "@/modules/personnel/api/users-api";
import type {
  BranchScopeAssignment,
  PersonnelScopeAssignment,
  WarehouseScopeAssignment,
} from "@/types/user";
import type { CreateUserInput } from "@/types/user";

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
