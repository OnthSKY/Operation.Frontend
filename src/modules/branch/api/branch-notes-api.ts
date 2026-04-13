import { apiRequest } from "@/shared/api/client";
import type { BranchNote, SaveBranchNoteInput } from "@/types/branch-note";

function normalizeNote(r: BranchNote): BranchNote {
  return {
    id: Number(r.id) || 0,
    branchId: Number(r.branchId) || 0,
    body: String(r.body ?? "").trim(),
    createdAt: String(r.createdAt ?? ""),
    updatedAt: String(r.updatedAt ?? ""),
  };
}

export async function fetchBranchNotes(branchId: number): Promise<BranchNote[]> {
  const rows = await apiRequest<BranchNote[]>(`/branches/${branchId}/notes`);
  return rows.map(normalizeNote);
}

export async function createBranchNote(
  branchId: number,
  body: SaveBranchNoteInput
): Promise<BranchNote> {
  const r = await apiRequest<BranchNote>(`/branches/${branchId}/notes`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeNote(r);
}

export async function updateBranchNote(
  branchId: number,
  noteId: number,
  body: SaveBranchNoteInput
): Promise<BranchNote> {
  const r = await apiRequest<BranchNote>(`/branches/${branchId}/notes/${noteId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return normalizeNote(r);
}

export async function deleteBranchNote(branchId: number, noteId: number): Promise<void> {
  await apiRequest<null>(`/branches/${branchId}/notes/${noteId}`, { method: "DELETE" });
}
