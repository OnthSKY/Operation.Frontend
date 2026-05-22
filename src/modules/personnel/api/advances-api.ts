import { apiRequest } from "@/shared/api/client";
import type { Advance, AdvanceListItem, CreateAdvanceInput } from "@/types/advance";
import type { Personnel } from "@/types/personnel";

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
  return rows.map((r) => {
    const raw = r as Record<string, unknown>;
    const heldPid = raw.heldRegisterSourcePersonnelId ?? raw.HeldRegisterSourcePersonnelId;
    const heldName =
      raw.heldRegisterSourcePersonnelFullName ?? raw.HeldRegisterSourcePersonnelFullName;
    const linkedTx = raw.linkedBranchTransactionId ?? raw.LinkedBranchTransactionId;
    return {
      ...r,
      currencyCode: normalizeCurrency(r.currencyCode),
      hasLinkedRegisterExpense: Boolean(raw.hasLinkedRegisterExpense ?? raw.HasLinkedRegisterExpense),
      heldRegisterSourcePersonnelId:
        heldPid != null && Number(heldPid) > 0 ? Number(heldPid) : null,
      heldRegisterSourcePersonnelFullName:
        heldName != null && String(heldName).trim() ? String(heldName).trim() : null,
      linkedBranchTransactionId:
        linkedTx != null && Number(linkedTx) > 0 ? Number(linkedTx) : null,
    };
  });
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
  return rows.map((r) => {
    const raw = r as Record<string, unknown>;
    const heldPid = raw.heldRegisterSourcePersonnelId ?? raw.HeldRegisterSourcePersonnelId;
    const heldName =
      raw.heldRegisterSourcePersonnelFullName ?? raw.HeldRegisterSourcePersonnelFullName;
    const linkedTx = raw.linkedBranchTransactionId ?? raw.LinkedBranchTransactionId;
    return {
      ...r,
      currencyCode: normalizeCurrency(r.currencyCode),
      heldRegisterSourcePersonnelId:
        heldPid != null && Number(heldPid) > 0 ? Number(heldPid) : null,
      heldRegisterSourcePersonnelFullName:
        heldName != null && String(heldName).trim() ? String(heldName).trim() : null,
      linkedBranchTransactionId:
        linkedTx != null && Number(linkedTx) > 0 ? Number(linkedTx) : null,
    };
  });
}

export async function deleteAdvance(advanceId: number): Promise<void> {
  await apiRequest<null>(`/advances/${advanceId}`, { method: "DELETE" });
}

/** `GET /advances/delegate-targets` — gün sonu kasiyeri için avans hedefi personeller. */
export async function fetchAdvanceDelegateTargets(
  branchId: number
): Promise<Array<{ id: number; fullName: string }>> {
  if (!Number.isFinite(branchId) || branchId <= 0) return [];
  const rows = await apiRequest<Array<{ id: number; fullName: string }>>(
    `/advances/delegate-targets?branchId=${Math.trunc(branchId)}`
  );
  return Array.isArray(rows) ? rows : [];
}

function personnelStubForAdvanceDelegate(
  row: { id: number; fullName: string },
  branchId: number
): Personnel {
  return {
    id: row.id,
    fullName: row.fullName,
    hireDate: "1970-01-01",
    seasonArrivalDate: null,
    jobTitle: "CASHIER",
    currencyCode: "TRY",
    salary: null,
    phone: null,
    insuranceStarted: false,
    insuranceStartDate: null,
    insuranceEndDate: null,
    nationalId: null,
    birthDate: null,
    nationalIdCardGeneration: null,
    hasNationalIdPhotoFront: false,
    hasNationalIdPhotoBack: false,
    hasProfilePhoto1: false,
    hasProfilePhoto2: false,
    profilePhoto1Url: null,
    profilePhoto2Url: null,
    insuranceIntakeStartDate: null,
    insuranceAccountingNotified: false,
    isDeleted: false,
    branchId,
    userId: null,
    driverHasSrc: null,
    driverHasPsychotechnical: null,
  };
}

/** Avans modalı için minimal `Personnel` listesi (yalnızca id / ad / şube). */
export function advanceDelegateTargetsToPersonnelStubs(
  targets: Array<{ id: number; fullName: string }>,
  branchId: number
): Personnel[] {
  return targets.map((row) => personnelStubForAdvanceDelegate(row, branchId));
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
  if (input.sourcePersonnelId != null && input.sourcePersonnelId > 0) {
    body.sourcePersonnelId = input.sourcePersonnelId;
  }
  return apiRequest<Advance>("/advances", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
