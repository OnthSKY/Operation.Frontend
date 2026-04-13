export type PersonnelNote = {
  id: number;
  personnelId: number;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type SavePersonnelNoteInput = {
  body: string;
};
