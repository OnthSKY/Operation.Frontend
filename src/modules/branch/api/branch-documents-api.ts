import { apiFetch, apiRequest } from "@/shared/api/client";
import type {
  BranchDocument,
  BranchDocumentKind,
  UploadBranchDocumentInput,
} from "@/types/branch-document";

type ApiRow = {
  id: number;
  branchId: number;
  kind: string;
  originalFileName?: string | null;
  contentType?: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const KINDS: ReadonlySet<string> = new Set([
  "TAX_BASE",
  "WORK_PERMIT",
  "AGRICULTURE_CERT",
  "OTHER",
]);

function normalizeKind(raw: string): BranchDocumentKind {
  const k = String(raw ?? "").trim().toUpperCase();
  return (KINDS.has(k) ? k : "OTHER") as BranchDocumentKind;
}

function mapRow(r: ApiRow): BranchDocument {
  return {
    id: Number(r.id) || 0,
    branchId: Number(r.branchId) || 0,
    kind: normalizeKind(r.kind),
    originalFileName:
      r.originalFileName != null && String(r.originalFileName).trim() !== ""
        ? String(r.originalFileName).trim()
        : null,
    contentType: String(r.contentType ?? "application/octet-stream").trim() || "application/octet-stream",
    notes:
      r.notes != null && String(r.notes).trim() !== "" ? String(r.notes).trim() : null,
    createdAt: String(r.createdAt ?? ""),
    updatedAt: String(r.updatedAt ?? ""),
  };
}

export async function fetchBranchDocuments(branchId: number): Promise<BranchDocument[]> {
  const rows = await apiRequest<ApiRow[]>(`/branches/${branchId}/documents`);
  return rows.map(mapRow);
}

export async function uploadBranchDocument(
  branchId: number,
  input: UploadBranchDocumentInput
): Promise<BranchDocument> {
  const fd = new FormData();
  fd.append("file", input.file);
  fd.append("kind", input.kind);
  if (input.notes != null && String(input.notes).trim() !== "") {
    fd.append("notes", String(input.notes).trim());
  }
  const r = await apiRequest<ApiRow>(`/branches/${branchId}/documents`, {
    method: "POST",
    body: fd,
  });
  return mapRow(r);
}

export async function deleteBranchDocument(branchId: number, documentId: number): Promise<void> {
  await apiRequest<null>(`/branches/${branchId}/documents/${documentId}`, { method: "DELETE" });
}

/** Kimlik doğrulamalı indirme; blob ile `URL.createObjectURL` veya `a.download` için kullanın. */
export async function fetchBranchDocumentBlob(
  branchId: number,
  documentId: number
): Promise<{ blob: Blob; contentType: string }> {
  const res = await apiFetch(`/branches/${branchId}/documents/${documentId}/file`);
  if (!res.ok) throw new Error(String(res.status));
  const blob = await res.blob();
  const contentType = res.headers.get("Content-Type")?.split(";")[0]?.trim() || blob.type;
  return { blob, contentType };
}
