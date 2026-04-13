import { apiRequest, apiUrl } from "@/shared/api/client";
import type {
  PersonnelCashHandoverLine,
  PersonnelManagementSnapshot,
} from "@/types/personnel-management-snapshot";
import type {
  AddPersonnelInsurancePeriodInput,
  CreatePersonnelInput,
  NationalIdCardGeneration,
  Personnel,
  PersonnelInsurancePeriod,
  PersonnelJobTitle,
  UpdatePersonnelInput,
  UpdatePersonnelInsurancePeriodInput,
} from "@/types/personnel";
import type {
  BranchPersonnelSalaryCostEstimates,
  PersonnelSalaryCostEstimate,
} from "@/types/personnel-salary-cost-estimate";

const jobTitleValues: PersonnelJobTitle[] = [
  "GENERAL_MANAGER",
  "BRANCH_SUPERVISOR",
  "DRIVER",
  "CRAFTSMAN",
  "WAITER",
  "COMMIS",
  "CASHIER",
  "BRANCH_INTERNAL_HELP",
];

function normalizeJobTitle(v: unknown): PersonnelJobTitle {
  const s = String(v ?? "").toUpperCase().trim();
  if (s === "MANAGER") return "BRANCH_SUPERVISOR";
  if (s === "BACK_HOUSE_HELPER" || s === "BACKEND_SUPPORT")
    return "BRANCH_INTERNAL_HELP";
  return jobTitleValues.includes(s as PersonnelJobTitle)
    ? (s as PersonnelJobTitle)
    : "WAITER";
}

function normalizeCurrency(v: unknown): string {
  const s = String(v ?? "TRY").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : "TRY";
}

type PersonnelApiRow = {
  id: number;
  fullName: string;
  hireDate: string;
  seasonArrivalDate?: string | null;
  jobTitle?: string;
  currencyCode?: string;
  salary: number | null;
  branchId: number | null;
  phone?: string | null;
  insuranceStarted?: boolean;
  insuranceStartDate?: string | null;
  insuranceEndDate?: string | null;
  nationalId?: string | null;
  birthDate?: string | null;
  nationalIdCardGeneration?: string | null;
  hasNationalIdPhotoFront?: boolean;
  hasNationalIdPhotoBack?: boolean;
  hasProfilePhoto1?: boolean;
  hasProfilePhoto2?: boolean;
  insuranceIntakeStartDate?: string | null;
  insuranceAccountingNotified?: boolean;
  isDeleted?: boolean;
  userId?: number | null;
  username?: string | null;
  driverHasSrc?: boolean | null;
  driverHasPsychotechnical?: boolean | null;
};

function normalizePositiveIntId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Şube atanmamış: null / 0 / geçersiz → null (AddBranchTransactionModal orgMode ile uyumlu). */
function normalizePersonnelBranchId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function normalizeIsoDateOptional(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function normalizeNationalIdCardGeneration(
  v: unknown
): NationalIdCardGeneration | null {
  const s = String(v ?? "").trim().toUpperCase();
  return s === "OLD" || s === "NEW" ? s : null;
}

function normalizeBoolOrNull(v: unknown): boolean | null {
  if (v === true || v === false) return v;
  return null;
}

function mapPersonnel(r: PersonnelApiRow): Personnel {
  const userId = normalizePositiveIntId(r.userId);
  const username =
    typeof r.username === "string" && r.username.trim() !== ""
      ? r.username.trim()
      : null;
  const nid =
    typeof r.nationalId === "string" && r.nationalId.trim() !== ""
      ? r.nationalId.trim()
      : null;
  const phone =
    typeof r.phone === "string" && r.phone.trim() !== ""
      ? r.phone.trim()
      : null;
  const hireNorm = normalizeIsoDateOptional(r.hireDate);
  const hireRaw = String(r.hireDate ?? "").trim();
  const hireDate =
    hireNorm ??
    (/^\d{4}-\d{2}-\d{2}/.test(hireRaw) ? hireRaw.slice(0, 10) : "");

  return {
    id: r.id,
    fullName: r.fullName,
    hireDate,
    seasonArrivalDate: normalizeIsoDateOptional(r.seasonArrivalDate),
    jobTitle: normalizeJobTitle(r.jobTitle),
    currencyCode: normalizeCurrency(r.currencyCode),
    salary: r.salary,
    branchId: normalizePersonnelBranchId(r.branchId),
    phone,
    insuranceStarted: r.insuranceStarted === true,
    insuranceStartDate: normalizeIsoDateOptional(r.insuranceStartDate),
    insuranceEndDate: normalizeIsoDateOptional(r.insuranceEndDate),
    nationalId: nid,
    birthDate: normalizeIsoDateOptional(r.birthDate),
    nationalIdCardGeneration: normalizeNationalIdCardGeneration(
      r.nationalIdCardGeneration
    ),
    hasNationalIdPhotoFront: r.hasNationalIdPhotoFront === true,
    hasNationalIdPhotoBack: r.hasNationalIdPhotoBack === true,
    hasProfilePhoto1: r.hasProfilePhoto1 === true,
    hasProfilePhoto2: r.hasProfilePhoto2 === true,
    insuranceIntakeStartDate: normalizeIsoDateOptional(
      r.insuranceIntakeStartDate
    ),
    insuranceAccountingNotified: r.insuranceAccountingNotified === true,
    isDeleted: r.isDeleted === true,
    userId,
    username,
    driverHasSrc: normalizeBoolOrNull(r.driverHasSrc),
    driverHasPsychotechnical: normalizeBoolOrNull(r.driverHasPsychotechnical),
  };
}

export type PersonnelListQueryParams = {
  status?: "all" | "active" | "passive";
  branchId?: number;
  jobTitle?: string;
  name?: string;
  seasonArrivalFrom?: string;
  seasonArrivalTo?: string;
  hireDateFrom?: string;
  hireDateTo?: string;
};

export type PersonnelListResult = {
  items: Personnel[];
  totalCount: number;
  activeCount: number;
  passiveCount: number;
};

type PersonnelListApiEnvelope = {
  items: PersonnelApiRow[];
  totalCount: number;
  activeCount: number;
  passiveCount: number;
};

export async function fetchPersonnelList(
  params?: PersonnelListQueryParams
): Promise<PersonnelListResult> {
  const sp = new URLSearchParams();
  if (params?.status && params.status !== "all") {
    sp.set("status", params.status);
  }
  if (params?.branchId != null && params.branchId > 0) {
    sp.set("branchId", String(params.branchId));
  }
  const jt = params?.jobTitle?.trim();
  if (jt) sp.set("jobTitle", jt);
  const nm = params?.name?.trim();
  if (nm) sp.set("name", nm);
  const saf = params?.seasonArrivalFrom?.trim();
  const sat = params?.seasonArrivalTo?.trim();
  if (saf) sp.set("seasonArrivalFrom", saf);
  if (sat) sp.set("seasonArrivalTo", sat);
  const hf = params?.hireDateFrom?.trim();
  const ht = params?.hireDateTo?.trim();
  if (hf) sp.set("hireDateFrom", hf);
  if (ht) sp.set("hireDateTo", ht);
  const q = sp.toString();
  const path = q ? `/personnel?${q}` : "/personnel";
  const row = await apiRequest<PersonnelListApiEnvelope>(path);
  return {
    items: row.items.map(mapPersonnel),
    totalCount: row.totalCount,
    activeCount: row.activeCount,
    passiveCount: row.passiveCount,
  };
}

export async function fetchPersonnel(id: number): Promise<Personnel> {
  const row = await apiRequest<PersonnelApiRow>(`/personnel/${id}`);
  return mapPersonnel(row);
}

export async function fetchPersonnelSalaryCostEstimate(
  personnelId: number
): Promise<PersonnelSalaryCostEstimate> {
  return apiRequest<PersonnelSalaryCostEstimate>(
    `/personnel/${personnelId}/salary-cost-estimate`
  );
}

export async function fetchBranchPersonnelSalaryCostEstimates(
  branchId: number
): Promise<BranchPersonnelSalaryCostEstimates> {
  return apiRequest<BranchPersonnelSalaryCostEstimates>(
    `/personnel/salary-cost-estimates/by-branch/${branchId}`
  );
}

export async function createPersonnel(
  input: CreatePersonnelInput
): Promise<Personnel> {
  const created = await apiRequest<PersonnelApiRow>("/personnel", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return mapPersonnel(created);
}

export async function updatePersonnel(
  input: UpdatePersonnelInput
): Promise<Personnel> {
  const { id, ...body } = input;
  const updated = await apiRequest<PersonnelApiRow>(`/personnel/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return mapPersonnel(updated);
}

export async function softDeletePersonnel(id: number): Promise<void> {
  await apiRequest<null>(`/personnel/${id}`, { method: "DELETE" });
}

export type NationalIdPhotoSide = "front" | "back";

export function personnelNationalIdPhotoUrl(
  personnelId: number,
  side: NationalIdPhotoSide
): string {
  return apiUrl(`/personnel/${personnelId}/national-id-photo/${side}`);
}

export type ProfilePhotoSlot = 1 | 2;

export function personnelProfilePhotoUrl(
  personnelId: number,
  slot: ProfilePhotoSlot
): string {
  return apiUrl(`/personnel/${personnelId}/profile-photos/${slot}`);
}

export type UploadNationalIdPhotosInput = {
  photoFront?: File | null;
  photoBack?: File | null;
  /** Foto yokken yalnızca kimlik kartı nesli güncellemesi (form kaydından sonra). */
  nationalIdCardGeneration?: "" | NationalIdCardGeneration;
};

export async function uploadNationalIdPhotos(
  personnelId: number,
  input: UploadNationalIdPhotosInput
): Promise<Personnel> {
  const fd = new FormData();
  if (input.photoFront && input.photoFront.size > 0) {
    fd.append("photoFront", input.photoFront);
  }
  if (input.photoBack && input.photoBack.size > 0) {
    fd.append("photoBack", input.photoBack);
  }
  if (input.nationalIdCardGeneration !== undefined) {
    fd.append("nationalIdCardGeneration", input.nationalIdCardGeneration);
  }
  const updated = await apiRequest<PersonnelApiRow>(
    `/personnel/${personnelId}/national-id-photo`,
    { method: "POST", body: fd }
  );
  return mapPersonnel(updated);
}

export type UploadProfilePhotosInput = {
  photo1?: File | null;
  photo2?: File | null;
};

export async function uploadProfilePhotos(
  personnelId: number,
  input: UploadProfilePhotosInput
): Promise<Personnel> {
  const fd = new FormData();
  if (input.photo1 && input.photo1.size > 0) fd.append("photo1", input.photo1);
  if (input.photo2 && input.photo2.size > 0) fd.append("photo2", input.photo2);
  const updated = await apiRequest<PersonnelApiRow>(
    `/personnel/${personnelId}/profile-photos`,
    { method: "POST", body: fd }
  );
  return mapPersonnel(updated);
}

type PersonnelInsurancePeriodApiRow = {
  id: number;
  personnelId: number;
  coverageStartDate: string;
  coverageEndDate?: string | null;
  notes?: string | null;
  registeredBranchId?: number | null;
  registeredBranchName?: string | null;
  createdAtUtc: string;
};

function mapInsurancePeriod(
  r: PersonnelInsurancePeriodApiRow
): PersonnelInsurancePeriod {
  const rbid = normalizePositiveIntId(r.registeredBranchId);
  const rbname =
    typeof r.registeredBranchName === "string" && r.registeredBranchName.trim() !== ""
      ? r.registeredBranchName.trim()
      : null;
  return {
    id: r.id,
    personnelId: r.personnelId,
    coverageStartDate: String(r.coverageStartDate).slice(0, 10),
    coverageEndDate: normalizeIsoDateOptional(r.coverageEndDate),
    notes:
      typeof r.notes === "string" && r.notes.trim() !== ""
        ? r.notes.trim()
        : null,
    registeredBranchId: rbid,
    registeredBranchName: rbname,
    createdAtUtc:
      typeof r.createdAtUtc === "string" ? r.createdAtUtc : String(r.createdAtUtc),
  };
}

export async function fetchPersonnelInsurancePeriods(
  personnelId: number
): Promise<PersonnelInsurancePeriod[]> {
  const rows = await apiRequest<PersonnelInsurancePeriodApiRow[]>(
    `/personnel/${personnelId}/insurance-periods`
  );
  return rows.map(mapInsurancePeriod);
}

export async function addPersonnelInsurancePeriod(
  personnelId: number,
  input: AddPersonnelInsurancePeriodInput
): Promise<PersonnelInsurancePeriod> {
  const body: Record<string, unknown> = {
    coverageStartDate: input.coverageStartDate,
  };
  if (input.coverageEndDate != null && String(input.coverageEndDate).trim() !== "") {
    body.coverageEndDate = String(input.coverageEndDate).trim().slice(0, 10);
  } else {
    body.coverageEndDate = null;
  }
  if (input.notes != null && String(input.notes).trim() !== "") {
    body.notes = String(input.notes).trim();
  }
  body.registeredBranchId = input.registeredBranchId;
  const row = await apiRequest<PersonnelInsurancePeriodApiRow>(
    `/personnel/${personnelId}/insurance-periods`,
    { method: "POST", body: JSON.stringify(body) }
  );
  return mapInsurancePeriod(row);
}

export async function updatePersonnelInsurancePeriod(
  personnelId: number,
  periodId: number,
  input: UpdatePersonnelInsurancePeriodInput
): Promise<PersonnelInsurancePeriod> {
  const d = String(input.coverageEndDate).trim().slice(0, 10);
  const body: Record<string, unknown> = { coverageEndDate: d };
  body.notes =
    input.notes == null || String(input.notes).trim() === ""
      ? null
      : String(input.notes).trim();
  const row = await apiRequest<PersonnelInsurancePeriodApiRow>(
    `/personnel/${personnelId}/insurance-periods/${periodId}`,
    { method: "PUT", body: JSON.stringify(body) }
  );
  return mapInsurancePeriod(row);
}

function mapCashHandoverLine(r: Record<string, unknown>): PersonnelCashHandoverLine {
  const tid = typeof r.transactionId === "number" ? r.transactionId : Number(r.transactionId);
  const bid = typeof r.branchId === "number" ? r.branchId : Number(r.branchId);
  const amt = typeof r.cashAmount === "number" ? r.cashAmount : Number(r.cashAmount);
  const d = r.transactionDate != null ? String(r.transactionDate).slice(0, 10) : "";
  return {
    transactionId: Number.isFinite(tid) ? tid : 0,
    branchId: Number.isFinite(bid) ? bid : 0,
    branchName: typeof r.branchName === "string" ? r.branchName : "",
    transactionDate: d,
    cashAmount: Number.isFinite(amt) ? amt : 0,
    currencyCode:
      typeof r.currencyCode === "string" && r.currencyCode.trim()
        ? r.currencyCode.trim().toUpperCase()
        : "TRY",
    mainCategory: r.mainCategory != null ? String(r.mainCategory) : null,
    category: r.category != null ? String(r.category) : null,
    description: r.description != null ? String(r.description) : null,
  };
}

export async function fetchPersonnelManagementSnapshot(
  personnelId: number
): Promise<PersonnelManagementSnapshot> {
  const raw = await apiRequest<Record<string, unknown>>(
    `/personnel/${personnelId}/management-snapshot`
  );
  const linesRaw = raw.cashHandoverLines;
  const cashHandoverLines: PersonnelCashHandoverLine[] = Array.isArray(linesRaw)
    ? linesRaw.map((x) => mapCashHandoverLine(x as Record<string, unknown>))
    : [];
  return { ...(raw as unknown as PersonnelManagementSnapshot), cashHandoverLines };
}
