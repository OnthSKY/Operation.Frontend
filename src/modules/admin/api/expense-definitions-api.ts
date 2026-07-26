import { apiRequest } from "@/shared/api/client";
import type { ExpenseDefinition, ExpenseDefinitionGroup } from "@/types/expense-definition";

function str(a: unknown, b: unknown): string {
  const v = a ?? b;
  return v != null ? String(v).trim() : "";
}

function normalize(r: Record<string, unknown>): ExpenseDefinition {
  return {
    id: Number(r.id ?? r.Id) || 0,
    code: str(r.code, r.Code),
    nameTr: str(r.nameTr, r.NameTr),
    nameEn: str(r.nameEn, r.NameEn),
    sortOrder: Number(r.sortOrder ?? r.SortOrder ?? 0) || 0,
    costBehavior: str(r.costBehavior, r.CostBehavior) || "NONE",
    isPnlRelevant: Boolean(r.isPnlRelevant ?? r.IsPnlRelevant ?? false),
  };
}

export async function fetchExpenseDefinitions(
  group: ExpenseDefinitionGroup,
  includeArchived = false
): Promise<ExpenseDefinition[]> {
  const params = new URLSearchParams({ group });
  if (includeArchived) params.set("includeArchived", "true");
  const rows = await apiRequest<Record<string, unknown>[]>(
    `/admin/expense-definitions?${params.toString()}`
  );
  return (rows ?? []).map(normalize);
}
