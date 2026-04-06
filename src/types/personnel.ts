/** Backend job_title (personnel). */
export type PersonnelJobTitle =
  | "MANAGER"
  | "DRIVER"
  | "CRAFTSMAN"
  | "WAITER"
  | "CASHIER";

/** Backend: PersonnelResponse / CreatePersonnelRequest (camelCase). */
export type Personnel = {
  id: number;
  fullName: string;
  hireDate: string;
  jobTitle: PersonnelJobTitle;
  currencyCode: string;
  salary: number | null;
  branchId: number | null;
  isDeleted: boolean;
  /** Linked active `users.id` when a system account exists. */
  userId?: number | null;
  username?: string | null;
};

export type CreatePersonnelUserAccountInput = {
  username: string;
  password: string;
};

export type CreatePersonnelInput = {
  fullName: string;
  hireDate: string;
  jobTitle: PersonnelJobTitle;
  salary?: number | null;
  branchId?: number | null;
  userAccount?: CreatePersonnelUserAccountInput;
};

export type UpdatePersonnelInput = CreatePersonnelInput & { id: number };
