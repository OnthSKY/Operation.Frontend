import { apiRequest } from "@/shared/api/client";
import type {
  PersonnelAccountClosurePreview,
  PersonnelEmploymentTerm,
  PersonnelYearAccountClosureListItem,
  PersonnelYearAccountPreview,
} from "@/types/personnel-account-closure";

export async function fetchPersonnelEmploymentTerms(
  personnelId: number
): Promise<PersonnelEmploymentTerm[]> {
  return apiRequest<PersonnelEmploymentTerm[]>(
    `/personnel/${personnelId}/salary-terms`
  );
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
