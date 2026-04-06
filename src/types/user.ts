export type AppUserRole = "ADMIN" | "STAFF" | "PERSONNEL";

export type UserListItem = {
  id: number;
  username: string;
  fullName: string | null;
  role: string;
  status: string;
  personnelId: number | null;
};

export type CreateUserInput = {
  username: string;
  password: string;
  fullName?: string | null;
  role: AppUserRole;
  personnelId?: number | null;
};
