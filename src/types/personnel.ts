/** Backend job_title (personnel). */
export type PersonnelJobTitle = "MANAGER" | "DRIVER" | "CRAFTSMAN" | "WAITER";

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
};

export type CreatePersonnelInput = {
  fullName: string;
  hireDate: string;
  jobTitle: PersonnelJobTitle;
  salary?: number | null;
  branchId?: number | null;
};

export type UpdatePersonnelInput = CreatePersonnelInput & { id: number };
