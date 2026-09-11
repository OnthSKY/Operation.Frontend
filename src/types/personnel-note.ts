export type PersonnelNote = {
  id: number;
  personnelId: number;
  body: string;
  createdByUserId: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SavePersonnelNoteInput = {
  body: string;
};
