import { apiRequest } from "@/shared/api/client";
import type {
  BranchScopeAssignment,
  CreateUserInput,
  PersonnelScopeAssignment,
  UserDataScopesResponse,
  UserListItem,
  UserPermissionOverridesResponse,
  WarehouseScopeAssignment,
} from "@/types/user";

export async function fetchUsersList(): Promise<UserListItem[]> {
  return apiRequest<UserListItem[]>("/users");
}

export async function createUser(input: CreateUserInput): Promise<UserListItem> {
  return apiRequest<UserListItem>("/users", {
    method: "POST",
    body: JSON.stringify({
      username: input.username.trim(),
      password: input.password,
      fullName: input.fullName?.trim() || null,
      role: input.role,
      personnelId: input.personnelId ?? null,
    }),
  });
}

export async function patchUserSelfFinancialsVisibility(
  userId: number,
  allowPersonnelSelfFinancials: boolean
): Promise<UserListItem> {
  return apiRequest<UserListItem>(`/users/${userId}/self-financials-visibility`, {
    method: "PATCH",
    body: JSON.stringify({ allowPersonnelSelfFinancials }),
  });
}

export async function patchUserRole(
  userId: number,
  role: string,
  personnelId?: number | null
): Promise<UserListItem> {
  const body: Record<string, unknown> = { role };
  if (personnelId != null && personnelId > 0) {
    body.personnelId = personnelId;
  }
  return apiRequest<UserListItem>(`/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function patchUserAccountStatus(
  userId: number,
  active: boolean
): Promise<UserListItem> {
  return apiRequest<UserListItem>(`/users/${userId}/account-status`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}

export async function fetchUserPermissionOverrides(
  userId: number
): Promise<UserPermissionOverridesResponse> {
  return apiRequest<UserPermissionOverridesResponse>(
    `/admin/authorization/users/${userId}/permissions`
  );
}

export async function putUserPermissionOverrides(
  userId: number,
  allowPermissionCodes: string[],
  denyPermissionCodes: string[]
): Promise<UserPermissionOverridesResponse> {
  return apiRequest<UserPermissionOverridesResponse>(
    `/admin/authorization/users/${userId}/permissions`,
    {
      method: "PUT",
      body: JSON.stringify({ allowPermissionCodes, denyPermissionCodes }),
    }
  );
}

export async function fetchUserDataScopes(userId: number): Promise<UserDataScopesResponse> {
  return apiRequest<UserDataScopesResponse>(`/admin/authorization/users/${userId}/scopes`);
}

export async function putUserDataScopes(
  userId: number,
  branchScopes: BranchScopeAssignment[],
  warehouseScopes: WarehouseScopeAssignment[],
  personnelScopes: PersonnelScopeAssignment[]
): Promise<UserDataScopesResponse> {
  return apiRequest<UserDataScopesResponse>(`/admin/authorization/users/${userId}/scopes`, {
    method: "PUT",
    body: JSON.stringify({ branchScopes, warehouseScopes, personnelScopes }),
  });
}
