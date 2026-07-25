import { apiRequest } from "@/shared/api/client";
import type { DocumentDefinition } from "@/types/document-definition";

function str(a: unknown, b: unknown): string {
  const v = a ?? b;
  return v != null ? String(v).trim() : "";
}

function strOrNull(a: unknown, b: unknown): string | null {
  const s = str(a, b);
  return s !== "" ? s : null;
}

function normalize(r: Record<string, unknown>): DocumentDefinition {
  return {
    id: Number(r.id ?? r.Id) || 0,
    domain: str(r.domain, r.Domain),
    category: strOrNull(r.category, r.Category),
    code: str(r.code, r.Code),
    nameTr: str(r.nameTr, r.NameTr),
    nameEn: str(r.nameEn, r.NameEn),
    sortOrder: Number(r.sortOrder ?? r.SortOrder ?? 0) || 0,
    isSystem: Boolean(r.isSystem ?? r.IsSystem ?? false),
    isActive: Boolean(r.isActive ?? r.IsActive ?? false),
  };
}

export async function fetchDocumentDefinitions(
  includeInactive = false
): Promise<DocumentDefinition[]> {
  const q = includeInactive ? "?includeInactive=true" : "";
  const rows = await apiRequest<Record<string, unknown>[]>(`/admin/document-definitions${q}`);
  return (rows ?? []).map(normalize);
}
