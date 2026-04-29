import { apiRequest, apiUrl } from "@/shared/api/client";
import type {
  CreatePersonnelEmploymentTermBody,
  PersonnelAccountClosurePreview,
  PersonnelEmploymentTerm,
  PersonnelYearAccountClosureListItem,
  PersonnelYearAccountPreview,
  UpdatePersonnelEmploymentTermBody,
} from "@/types/personnel-account-closure";

function normalizeEmploymentTerm(r: Record<string, unknown>): PersonnelEmploymentTerm {
  const id = typeof r.id === "number" ? r.id : parseInt(String(r.id ?? ""), 10);
  const branchRaw = r.branchId;
  const branchId =
    branchRaw == null || branchRaw === ""
      ? null
      : (() => {
          const n = typeof branchRaw === "number" ? branchRaw : parseInt(String(branchRaw), 10);
          return Number.isFinite(n) && n > 0 ? n : null;
        })();
  const salaryRaw = r.salary;
  const salary =
    salaryRaw == null || salaryRaw === ""
      ? null
      : typeof salaryRaw === "number"
        ? salaryRaw
        : parseFloat(String(salaryRaw));
  const manualRaw = r.manualTotalEmployerCost;
  const manualTotal =
    manualRaw == null || manualRaw === ""
      ? null
      : typeof manualRaw === "number"
        ? manualRaw
        : parseFloat(String(manualRaw));

  return {
    id: Number.isFinite(id) ? id : 0,
    validFrom: String(r.validFrom ?? "").slice(0, 10),
    validTo:
      r.validTo == null || String(r.validTo).trim() === ""
        ? null
        : String(r.validTo).slice(0, 10),
    arrivalDate: String(r.arrivalDate ?? "").slice(0, 10),
    branchId,
    salary: salary != null && Number.isFinite(salary) ? salary : null,
    currencyCode:
      typeof r.currencyCode === "string" && r.currencyCode.trim() !== ""
        ? r.currencyCode.trim().toUpperCase()
        : "TRY",
    salaryType:
      typeof r.salaryType === "string" && r.salaryType.trim() !== ""
        ? r.salaryType.trim().toUpperCase()
        : "GROSS",
    employmentType:
      typeof r.employmentType === "string" && r.employmentType.trim() !== ""
        ? r.employmentType.trim().toUpperCase()
        : "FULL_TIME",
    isManualEmployerCostOverride: r.isManualEmployerCostOverride === true,
    manualTotalEmployerCost:
      manualTotal != null && Number.isFinite(manualTotal) ? manualTotal : null,
    manualOverrideNote:
      typeof r.manualOverrideNote === "string" && r.manualOverrideNote.trim() !== ""
        ? r.manualOverrideNote.trim()
        : null,
    isOpen: r.isOpen === true,
  };
}

export async function fetchPersonnelEmploymentTerms(
  personnelId: number
): Promise<PersonnelEmploymentTerm[]> {
  const raw = await apiRequest<unknown>(`/personnel/${personnelId}/salary-terms`);
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => normalizeEmploymentTerm(row as Record<string, unknown>));
}

export async function createPersonnelEmploymentTerm(
  personnelId: number,
  body: CreatePersonnelEmploymentTermBody
): Promise<PersonnelEmploymentTerm> {
  const row = await apiRequest<Record<string, unknown>>(
    `/personnel/${personnelId}/salary-terms`,
    { method: "POST", body: JSON.stringify(body) }
  );
  return normalizeEmploymentTerm(row);
}

export async function updatePersonnelEmploymentTerm(
  personnelId: number,
  termId: number,
  body: UpdatePersonnelEmploymentTermBody
): Promise<PersonnelEmploymentTerm> {
  const row = await apiRequest<Record<string, unknown>>(
    `/personnel/${personnelId}/salary-terms/${termId}`,
    { method: "PUT", body: JSON.stringify(body) }
  );
  return normalizeEmploymentTerm(row);
}

export async function deleteOpenPersonnelEmploymentTerm(
  personnelId: number
): Promise<void> {
  await apiRequest<unknown>(`/personnel/${personnelId}/salary-terms/open`, {
    method: "DELETE",
  });
}

export async function deletePersonnelEmploymentTerm(
  personnelId: number,
  termId: number,
): Promise<void> {
  await apiRequest<unknown>(`/personnel/${personnelId}/salary-terms/${termId}`, {
    method: "DELETE",
  });
}

export async function fetchPersonnelAccountClosurePreview(
  personnelId: number,
  employmentTermId?: number
): Promise<PersonnelAccountClosurePreview> {
  const q =
    employmentTermId != null && employmentTermId > 0
      ? `?employmentTermId=${employmentTermId}`
      : "";
  return apiRequest<PersonnelAccountClosurePreview>(
    `/personnel/${personnelId}/account-closure-preview${q}`
  );
}

export async function fetchPersonnelYearAccountPreview(
  personnelId: number,
  year: number
): Promise<PersonnelYearAccountPreview> {
  return apiRequest<PersonnelYearAccountPreview>(
    `/personnel/${personnelId}/year-account/preview?year=${year}`
  );
}

export type ClosePersonnelYearAccountBody = {
  closureYear: number;
  notes?: string | null;
  settlementPdfAcknowledged: boolean;
  closureWorkedDays: number;
  closureExpectedSalaryAmount: number;
  closureExpectedSalaryCurrency?: string | null;
  salaryBalanceSettled: boolean;
  salaryPaymentSourceType?: string | null;
  salarySettlementNote?: string | null;
};

export async function closePersonnelYearAccount(
  personnelId: number,
  body: ClosePersonnelYearAccountBody
): Promise<{ id: number; personnelId: number; closureYear: number; closedAtUtc: string }> {
  return apiRequest(`/personnel/${personnelId}/year-account/close`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchPersonnelYearAccountClosures(
  personnelId: number
): Promise<PersonnelYearAccountClosureListItem[]> {
  return apiRequest<PersonnelYearAccountClosureListItem[]>(
    `/personnel/${personnelId}/year-account/closures`
  );
}

export async function reopenPersonnelYearAccount(
  personnelId: number,
  year: number
): Promise<boolean> {
  return apiRequest<boolean>(`/personnel/${personnelId}/year-account/closures/${year}`, {
    method: "DELETE",
  });
}

export function personnelYearClosureArchiveUrl(
  personnelId: number,
  year: number,
): string {
  return apiUrl(
    `/personnel/${personnelId}/year-account/closures/${year}/archive`,
  );
}

export function personnelYearClosurePdfDownloadUrl(
  personnelId: number,
  year: number,
): string {
  return apiUrl(
    `/personnel/${personnelId}/year-account/closures/${year}/closure-pdf`,
  );
}

export async function uploadPersonnelYearClosurePdf(
  personnelId: number,
  year: number,
  file: File,
): Promise<boolean> {
  const fd = new FormData();
  fd.append("file", file);
  return apiRequest<boolean>(
    `/personnel/${personnelId}/year-account/closures/${year}/closure-pdf`,
    { method: "POST", body: fd },
  );
}
