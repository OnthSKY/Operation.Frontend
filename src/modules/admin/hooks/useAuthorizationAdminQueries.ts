"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAuthorizationMatrix,
  putRolePermissions,
} from "@/modules/admin/api/authorization-admin-api";

export const authorizationAdminKeys = {
  all: ["admin", "authorization"] as const,
  matrix: () => [...authorizationAdminKeys.all, "matrix"] as const,
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
