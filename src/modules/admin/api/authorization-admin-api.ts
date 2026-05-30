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

// ---------- Multi-role + custom role yönetimi ----------

export type RoleDefinition = {
  code: string;
  displayName: string;
  sortOrder: number;
  isSystem: boolean;
};

export type UserRolesResponse = {
  userId: number;
  roleCodes: string[];
};

/** Yeni custom rol oluştur. 409 Conflict → kod zaten var. */
export async function createCustomRole(
  code: string,
  displayName?: string,
  sortOrder?: number,
): Promise<RoleDefinition> {
  return apiRequest<RoleDefinition>("/admin/authorization/roles", {
    method: "POST",
    body: JSON.stringify({ code, displayName, sortOrder }),
  });
}

/** Custom rolü sil. is_system=true rollerde 400. */
export async function deleteCustomRole(roleCode: string): Promise<void> {
  const enc = encodeURIComponent(roleCode);
  await apiRequest<{ deleted: string }>(`/admin/authorization/roles/${enc}`, {
    method: "DELETE",
  });
}

/** Kullanıcının atanmış rollerini listele. */
export async function fetchUserRoles(userId: number): Promise<UserRolesResponse> {
  return apiRequest<UserRolesResponse>(`/admin/authorization/users/${userId}/roles`);
}

/** Kullanıcının rol setini whole-set replace et — aktif session'lar iptal edilir. */
export async function putUserRoles(
  userId: number,
  roleCodes: string[],
): Promise<UserRolesResponse> {
  return apiRequest<UserRolesResponse>(`/admin/authorization/users/${userId}/roles`, {
    method: "PUT",
    body: JSON.stringify({ roleCodes }),
  });
}
