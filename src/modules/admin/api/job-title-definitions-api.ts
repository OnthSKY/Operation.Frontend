import { apiRequest } from "@/shared/api/client";
import type { JobTitleDefinition } from "@/types/job-title-definition";

function str(a: unknown, b: unknown): string {
  const v = a ?? b;
  return v != null ? String(v).trim() : "";
}

function normalize(r: Record<string, unknown>): JobTitleDefinition {
  return {
    id: Number(r.id ?? r.Id) || 0,
    code: str(r.code, r.Code),
    nameTr: str(r.nameTr, r.NameTr),
    nameEn: str(r.nameEn, r.NameEn),
    sortOrder: Number(r.sortOrder ?? r.SortOrder ?? 0) || 0,
    isSystem: Boolean(r.isSystem ?? r.IsSystem ?? false),
    isActive: Boolean(r.isActive ?? r.IsActive ?? false),
  };
}

export async function fetchJobTitleDefinitions(
  includeInactive = false
): Promise<JobTitleDefinition[]> {
  const q = includeInactive ? "?includeInactive=true" : "";
  const rows = await apiRequest<Record<string, unknown>[]>(`/admin/job-title-definitions${q}`);
  return (rows ?? []).map(normalize);
}
