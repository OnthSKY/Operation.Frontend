export type BranchDocumentKind =
  | "TAX_BASE"
  | "WORK_PERMIT"
  | "AGRICULTURE_CERT"
  | "OTHER";

export type BranchDocument = {
  id: number;
  branchId: number;
  kind: BranchDocumentKind;
  originalFileName: string | null;
  contentType: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UploadBranchDocumentInput = {
  file: File;
  kind: BranchDocumentKind;
  notes?: string | null;
};
