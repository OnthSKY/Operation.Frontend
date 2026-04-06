import { apiRequest } from "@/shared/api/client";
import type { Advance, AdvanceListItem, CreateAdvanceInput } from "@/types/advance";

function normalizeCurrency(v: unknown): string {
  const s = String(v ?? "TRY").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : "TRY";
}

export async function fetchAdvancesByPersonnel(
  personnelId: number,
  effectiveYear?: number
): Promise<Advance[]> {
  const q = new URLSearchParams({ personnelId: String(personnelId) });
  if (effectiveYear != null && Number.isFinite(effectiveYear)) {
    q.set("effectiveYear", String(Math.trunc(effectiveYear)));
  }
  const rows = await apiRequest<
    Array<Omit<Advance, "currencyCode"> & { currencyCode?: string }>
  >(`/advances?${q.toString()}`);
  return rows.map((r) => ({
    ...r,
    currencyCode: normalizeCurrency(r.currencyCode),
    hasLinkedRegisterExpense: Boolean((r as { hasLinkedRegisterExpense?: boolean }).hasLinkedRegisterExpense),
  }));
}

export type FetchAllAdvancesParams = {
  effectiveYear?: number;
  personnelId?: number;
  branchId?: number;
  limit?: number;
};

export async function fetchAllAdvances(
  params?: FetchAllAdvancesParams
): Promise<AdvanceListItem[]> {
  const q = new URLSearchParams();
  if (
    params?.effectiveYear != null &&
    Number.isFinite(params.effectiveYear)
  ) {
    q.set("effectiveYear", String(Math.trunc(params.effectiveYear)));
  }
  if (params?.personnelId != null && params.personnelId > 0) {
    q.set("personnelId", String(Math.trunc(params.personnelId)));
  }
  if (params?.branchId != null && params.branchId > 0) {
    q.set("branchId", String(Math.trunc(params.branchId)));
  }
  if (
    params?.limit != null &&
    Number.isFinite(params.limit) &&
    params.limit >= 1 &&
    params.limit <= 1000
  ) {
    q.set("limit", String(Math.trunc(params.limit)));
  }
  const qs = q.toString();
  const path = qs ? `/advances/all?${qs}` : "/advances/all";
  const rows = await apiRequest<
    Array<
      Omit<AdvanceListItem, "currencyCode"> & { currencyCode?: string }
    >
  >(path);
  return rows.map((r) => ({
    ...r,
    currencyCode: normalizeCurrency(r.currencyCode),
  }));
}

export async function createAdvance(
  input: CreateAdvanceInput
): Promise<Advance> {
  const body: Record<string, unknown> = {
    personnelId: input.personnelId,
    sourceType: input.sourceType ?? "CASH",
    amount: input.amount,
    currencyCode: input.currencyCode ?? undefined,
    advanceDate: input.advanceDate,
    effectiveYear: input.effectiveYear,
    description: input.description ?? undefined,
  };
  if (input.branchId != null && input.branchId > 0) {
    body.branchId = input.branchId;
  }
  return apiRequest<Advance>("/advances", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
