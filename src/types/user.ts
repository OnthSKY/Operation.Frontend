export type AppUserRole =
  | "ADMIN"
  | "STAFF"
  | "PERSONNEL"
  | "DRIVER"
  | "VIEWER"
  | "FINANCE"
  | "PROCUREMENT";

export type UserListItem = {
  id: number;
  username: string;
  fullName: string | null;
  role: string;
  status: string;
  personnelId: number | null;
  allowPersonnelSelfFinancials: boolean;
};

export type CreateUserInput = {
  username: string;
  password: string;
  fullName?: string | null;
  role: AppUserRole;
  personnelId?: number | null;
};
