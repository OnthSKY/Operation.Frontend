import { apiRequest } from "@/shared/api/client";
import type { Advance, AdvanceListItem, CreateAdvanceInput } from "@/types/advance";
import type { Personnel } from "@/types/personnel";

function normalizeCurrency(v: unknown): string {
  const s = String(v ?? "TRY").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : "TRY";
}

/** Audit «yazan kişi» alanlarını camel/Pascal toleranslı çözer. */
function extractCreatedByMeta(raw: Record<string, unknown>): {
  createdByUserId: number | null;
  createdByName: string | null;
  createdAt: string | null;
} {
  const uid = raw.createdByUserId ?? raw.CreatedByUserId;
  const name = raw.createdByDisplayName ?? raw.CreatedByDisplayName;
  const at = raw.createdAt ?? raw.CreatedAt;
  return {
    createdByUserId: uid != null && Number(uid) > 0 ? Number(uid) : null,
    createdByName:
      name != null && String(name).trim() ? String(name).trim() : null,
    createdAt: at != null && String(at).trim() ? String(at) : null,
  };
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
      ...extractCreatedByMeta(raw),
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
      ...extractCreatedByMeta(raw),
    };
  });
}

export async function deleteAdvance(advanceId: number): Promise<void> {
  await apiRequest<null>(`/advances/${advanceId}`, { method: "DELETE" });
}

export type AdvanceListTotalsCurrencyAmount = {
  currencyCode: string;
  amount: number;
  count: number;
};

export type AdvanceListTotalsResponse = {
  totalsByCurrency: AdvanceListTotalsCurrencyAmount[];
  bySourceBucket: Record<string, AdvanceListTotalsCurrencyAmount[]>;
};

export type FetchAllAdvanceTotalsParams = {
  effectiveYear?: number;
  personnelId?: number;
  branchId?: number;
};

export async function fetchAllAdvanceTotals(
  params?: FetchAllAdvanceTotalsParams
): Promise<AdvanceListTotalsResponse> {
  const q = new URLSearchParams();
  if (params?.effectiveYear != null && Number.isFinite(params.effectiveYear)) {
    q.set("effectiveYear", String(Math.trunc(params.effectiveYear)));
  }
  if (params?.personnelId != null && params.personnelId > 0) {
    q.set("personnelId", String(Math.trunc(params.personnelId)));
  }
  if (params?.branchId != null && params.branchId > 0) {
    q.set("branchId", String(Math.trunc(params.branchId)));
  }
  const qs = q.toString();
  const path = qs ? `/advances/all/totals?${qs}` : "/advances/all/totals";
  const raw = await apiRequest<{
    totalsByCurrency?: Array<{ currencyCode?: string; amount?: number | string; count?: number | string }>;
    bySourceBucket?: Record<
      string,
      Array<{ currencyCode?: string; amount?: number | string; count?: number | string }>
    >;
  }>(path);
  const normalizeAmounts = (
    items: Array<{ currencyCode?: string; amount?: number | string; count?: number | string }> | undefined
  ): AdvanceListTotalsCurrencyAmount[] =>
    (items ?? []).map((r) => ({
      currencyCode: normalizeCurrency(r.currencyCode),
      amount: Number(r.amount ?? 0),
      count: Number(r.count ?? 0),
    }));
  const bucketMap: Record<string, AdvanceListTotalsCurrencyAmount[]> = {};
  for (const [k, v] of Object.entries(raw.bySourceBucket ?? {})) {
    bucketMap[k] = normalizeAmounts(v);
  }
  return {
    totalsByCurrency: normalizeAmounts(raw.totalsByCurrency),
    bySourceBucket: bucketMap,
  };
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
