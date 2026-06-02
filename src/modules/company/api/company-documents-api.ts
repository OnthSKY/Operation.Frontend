import { apiFetch, apiRequest } from "@/shared/api/client";
import type {
  CompanyDocument,
  CompanyDocumentKind,
  UploadCompanyDocumentInput,
} from "@/types/company-document";

type ApiRow = {
  id: number;
  kind: string;
  originalFileName?: string | null;
  contentType?: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const KINDS: ReadonlySet<string> = new Set(["GENERAL", "OTHER"]);

function normalizeKind(raw: string): CompanyDocumentKind {
  const k = String(raw ?? "").trim().toUpperCase();
  return (KINDS.has(k) ? k : "OTHER") as CompanyDocumentKind;
}

function mapRow(r: ApiRow): CompanyDocument {
  return {
    id: Number(r.id) || 0,
    kind: normalizeKind(r.kind),
    originalFileName:
      r.originalFileName != null && String(r.originalFileName).trim() !== ""
        ? String(r.originalFileName).trim()
        : null,
    contentType: String(r.contentType ?? "application/octet-stream").trim() || "application/octet-stream",
    notes: r.notes != null && String(r.notes).trim() !== "" ? String(r.notes).trim() : null,
    createdAt: String(r.createdAt ?? ""),
    updatedAt: String(r.updatedAt ?? ""),
  };
}

export async function fetchCompanyDocuments(): Promise<CompanyDocument[]> {
  const rows = await apiRequest<ApiRow[]>(`/company-documents`);
  return rows.map(mapRow);
}

export async function uploadCompanyDocument(
  input: UploadCompanyDocumentInput
): Promise<CompanyDocument> {
  const fd = new FormData();
  fd.append("file", input.file);
  fd.append("kind", input.kind);
  if (input.notes != null && String(input.notes).trim() !== "") {
    fd.append("notes", String(input.notes).trim());
  }
  const r = await apiRequest<ApiRow>(`/company-documents`, {
    method: "POST",
    body: fd,
  });
  return mapRow(r);
}

export async function deleteCompanyDocument(documentId: number): Promise<void> {
  await apiRequest<null>(`/company-documents/${documentId}`, { method: "DELETE" });
}

/** Kimlik doğrulamalı indirme; blob ile `URL.createObjectURL` veya `a.download` için kullanın. */
export async function fetchCompanyDocumentBlob(
  documentId: number
): Promise<{ blob: Blob; contentType: string }> {
  const res = await apiFetch(`/company-documents/${documentId}/file`);
  if (!res.ok) throw new Error(String(res.status));
  const blob = await res.blob();
  const contentType = res.headers.get("Content-Type")?.split(";")[0]?.trim() || blob.type;
  return { blob, contentType };
}
