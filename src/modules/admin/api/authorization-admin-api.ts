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

/**
 * Kullanıcının rol setini whole-set replace et — aktif session'lar iptal edilir.
 * `personnelId`: PERSONNEL/DRIVER rolü atanırken personel kartı bağlamak için (opsiyonel).
 */
export async function putUserRoles(
  userId: number,
  roleCodes: string[],
  personnelId?: number | null,
  unlinkPersonnel?: boolean,
): Promise<UserRolesResponse> {
  const body: Record<string, unknown> = { roleCodes };
  if (personnelId != null && personnelId > 0) {
    body.personnelId = personnelId;
  } else if (unlinkPersonnel) {
    // Portal rolü yokken mevcut personel bağını açıkça kaldır (kullanıcı kendi adıyla görünsün).
    body.unlinkPersonnel = true;
  }
  return apiRequest<UserRolesResponse>(`/admin/authorization/users/${userId}/roles`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export type UserPersonnelLinkResponse = {
  userId: number;
  personnelId: number | null;
};

/**
 * Kullanıcıyı bir personel kartına bağla/bağını kaldır — rolden bağımsız.
 * `personnelId` > 0 ise bağlar; aksi halde `unlink: true` ile mevcut bağı kaldırır
 * (PERSONNEL/DRIVER rolü olan kullanıcıda backend reddeder). Personel kimliği JWT
 * claim'inde olduğundan değişiklikte kullanıcının aktif session'ları iptal edilir.
 */
export async function putUserPersonnelLink(
  userId: number,
  personnelId: number | null,
): Promise<UserPersonnelLinkResponse> {
  const body: Record<string, unknown> =
    personnelId != null && personnelId > 0
      ? { personnelId }
      : { unlink: true };
  return apiRequest<UserPersonnelLinkResponse>(
    `/admin/authorization/users/${userId}/personnel`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}
