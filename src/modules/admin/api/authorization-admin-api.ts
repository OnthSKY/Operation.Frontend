import { apiRequest } from "@/shared/api/client";
import type { AuthorizationMatrix, RolePermissionsRow } from "@/types/authorization-matrix";

export async function fetchAuthorizationMatrix(): Promise<AuthorizationMatrix> {
  return apiRequest<AuthorizationMatrix>("/admin/authorization/matrix");
}

export async function putRolePermissions(
  roleCode: string,
  permissionCodes: string[]
): Promise<RolePermissionsRow> {
  const enc = encodeURIComponent(roleCode);
  return apiRequest<RolePermissionsRow>(`/admin/authorization/roles/${enc}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissionCodes }),
  });
}
