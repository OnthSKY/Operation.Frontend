export type BranchNote = {
  id: number;
  branchId: number;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type SaveBranchNoteInput = {
  body: string;
};
