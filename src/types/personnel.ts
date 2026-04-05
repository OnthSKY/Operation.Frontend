/** Backend: PersonnelResponse / CreatePersonnelRequest (camelCase). */
export type Personnel = {
  id: number;
  fullName: string;
  hireDate: string;
  salary: number | null;
  branchId: number | null;
};

export type CreatePersonnelInput = {
  fullName: string;
  hireDate: string;
  salary?: number | null;
  branchId?: number | null;
};
