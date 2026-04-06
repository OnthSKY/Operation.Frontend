import { apiRequest } from "@/shared/api/client";
import type {
  PersonnelCashHandoverLine,
  PersonnelManagementSnapshot,
} from "@/types/personnel-management-snapshot";
import type {
  CreatePersonnelInput,
  Personnel,
  PersonnelJobTitle,
  UpdatePersonnelInput,
} from "@/types/personnel";

const jobTitleValues: PersonnelJobTitle[] = [
  "MANAGER",
  "DRIVER",
  "CRAFTSMAN",
  "WAITER",
  "CASHIER",
];

function normalizeJobTitle(v: unknown): PersonnelJobTitle {
  const s = String(v ?? "").toUpperCase();
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
  jobTitle?: string;
  currencyCode?: string;
  salary: number | null;
  branchId: number | null;
  isDeleted?: boolean;
  userId?: number | null;
  username?: string | null;
};

function normalizePositiveIntId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function mapPersonnel(r: PersonnelApiRow): Personnel {
  const userId = normalizePositiveIntId(r.userId);
  const username =
    typeof r.username === "string" && r.username.trim() !== ""
      ? r.username.trim()
      : null;
  return {
    id: r.id,
    fullName: r.fullName,
    hireDate: r.hireDate,
    jobTitle: normalizeJobTitle(r.jobTitle),
    currencyCode: normalizeCurrency(r.currencyCode),
    salary: r.salary,
    branchId: r.branchId,
    isDeleted: r.isDeleted === true,
    userId,
    username,
  };
}

export async function fetchPersonnelList(): Promise<Personnel[]> {
  const rows = await apiRequest<PersonnelApiRow[]>("/personnel");
  return rows.map(mapPersonnel);
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
