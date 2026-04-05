import { apiRequest } from "@/shared/api/client";
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

export async function fetchPersonnelList(): Promise<Personnel[]> {
  const rows = await apiRequest<
    Array<{
      id: number;
      fullName: string;
      hireDate: string;
      jobTitle?: string;
      currencyCode?: string;
      salary: number | null;
      branchId: number | null;
      isDeleted?: boolean;
    }>
  >("/personnel");
  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    hireDate: r.hireDate,
    jobTitle: normalizeJobTitle(r.jobTitle),
    currencyCode: normalizeCurrency(r.currencyCode),
    salary: r.salary,
    branchId: r.branchId,
    isDeleted: r.isDeleted === true,
  }));
}

export async function createPersonnel(
  input: CreatePersonnelInput
): Promise<Personnel> {
  const created = await apiRequest<{
    id: number;
    fullName: string;
    hireDate: string;
    jobTitle?: string;
    currencyCode?: string;
    salary: number | null;
    branchId: number | null;
    isDeleted?: boolean;
  }>("/personnel", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return {
    id: created.id,
    fullName: created.fullName,
    hireDate: created.hireDate,
    jobTitle: normalizeJobTitle(created.jobTitle),
    currencyCode: normalizeCurrency(created.currencyCode),
    salary: created.salary,
    branchId: created.branchId,
    isDeleted: created.isDeleted === true,
  };
}

export async function updatePersonnel(
  input: UpdatePersonnelInput
): Promise<Personnel> {
  const { id, ...body } = input;
  const updated = await apiRequest<{
    id: number;
    fullName: string;
    hireDate: string;
    jobTitle?: string;
    currencyCode?: string;
    salary: number | null;
    branchId: number | null;
    isDeleted?: boolean;
  }>(`/personnel/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return {
    id: updated.id,
    fullName: updated.fullName,
    hireDate: updated.hireDate,
    jobTitle: normalizeJobTitle(updated.jobTitle),
    currencyCode: normalizeCurrency(updated.currencyCode),
    salary: updated.salary,
    branchId: updated.branchId,
    isDeleted: updated.isDeleted === true,
  };
}

export async function softDeletePersonnel(id: number): Promise<void> {
  await apiRequest<null>(`/personnel/${id}`, { method: "DELETE" });
}
