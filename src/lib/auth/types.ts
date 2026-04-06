export type AuthUser = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  personnelId: number | null;
  /** personnel.branch_id — PERSONNEL kapsamı için */
  personnelBranchId?: number | null;
};
