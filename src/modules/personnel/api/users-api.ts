import { apiRequest } from "@/shared/api/client";
import type { CreateUserInput, UserListItem } from "@/types/user";

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

export async function patchUserRole(userId: number, role: string): Promise<UserListItem> {
  return apiRequest<UserListItem>(`/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}
