"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCustomRole,
  deleteCustomRole,
  fetchAuthorizationMatrix,
  fetchUserRoles,
  putRolePermissions,
  putUserRoles,
} from "@/modules/admin/api/authorization-admin-api";

export const authorizationAdminKeys = {
  all: ["admin", "authorization"] as const,
  matrix: () => [...authorizationAdminKeys.all, "matrix"] as const,
  userRoles: (userId: number) =>
    [...authorizationAdminKeys.all, "userRoles", userId] as const,
};

export function useAuthorizationMatrix(enabled = true) {
  return useQuery({
    queryKey: authorizationAdminKeys.matrix(),
    queryFn: fetchAuthorizationMatrix,
    enabled,
  });
}

export function usePutRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { roleCode: string; permissionCodes: string[] }) =>
      putRolePermissions(args.roleCode, args.permissionCodes),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: authorizationAdminKeys.matrix() });
    },
  });
}

// ---------- Multi-role + custom role yönetimi ----------

export function useCreateCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { code: string; displayName?: string; sortOrder?: number }) =>
      createCustomRole(args.code, args.displayName, args.sortOrder),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: authorizationAdminKeys.matrix() });
    },
  });
}

export function useDeleteCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roleCode: string) => deleteCustomRole(roleCode),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: authorizationAdminKeys.matrix() });
    },
  });
}

export function useUserRoles(userId: number | null, enabled = true) {
  return useQuery({
    queryKey: authorizationAdminKeys.userRoles(userId ?? 0),
    queryFn: () => fetchUserRoles(userId as number),
    enabled: enabled && typeof userId === "number" && userId > 0,
  });
}

export function usePutUserRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      userId: number;
      roleCodes: string[];
      personnelId?: number | null;
      unlinkPersonnel?: boolean;
    }) => putUserRoles(args.userId, args.roleCodes, args.personnelId, args.unlinkPersonnel),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({
        queryKey: authorizationAdminKeys.userRoles(vars.userId),
      });
      // Kullanıcı listesi (rol rozetleri + personel bağı) tazelensin.
      void qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
