import { apiRequest } from "@/shared/api/client";
import type { PersonnelNote, SavePersonnelNoteInput } from "@/types/personnel-note";

function normalizeNote(r: PersonnelNote): PersonnelNote {
  return {
    id: Number(r.id) || 0,
    personnelId: Number(r.personnelId) || 0,
    body: String(r.body ?? "").trim(),
    createdAt: String(r.createdAt ?? ""),
    updatedAt: String(r.updatedAt ?? ""),
  };
}

export async function fetchPersonnelNotes(personnelId: number): Promise<PersonnelNote[]> {
  const rows = await apiRequest<PersonnelNote[]>(`/personnel/${personnelId}/notes`);
  return rows.map(normalizeNote);
}

export async function createPersonnelNote(
  personnelId: number,
  body: SavePersonnelNoteInput
): Promise<PersonnelNote> {
  const r = await apiRequest<PersonnelNote>(`/personnel/${personnelId}/notes`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeNote(r);
}

export async function updatePersonnelNote(
  personnelId: number,
  noteId: number,
  body: SavePersonnelNoteInput
): Promise<PersonnelNote> {
  const r = await apiRequest<PersonnelNote>(`/personnel/${personnelId}/notes/${noteId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return normalizeNote(r);
}

export async function deletePersonnelNote(personnelId: number, noteId: number): Promise<void> {
  await apiRequest<null>(`/personnel/${personnelId}/notes/${noteId}`, { method: "DELETE" });
}
