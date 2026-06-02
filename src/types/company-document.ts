export type CompanyDocumentKind = "GENERAL" | "OTHER";

export type CompanyDocument = {
  id: number;
  kind: CompanyDocumentKind;
  originalFileName: string | null;
  contentType: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UploadCompanyDocumentInput = {
  file: File;
  kind: CompanyDocumentKind;
  notes?: string | null;
};
