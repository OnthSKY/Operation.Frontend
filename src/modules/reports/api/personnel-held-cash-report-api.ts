import { apiRequest } from "@/lib/api/base-api";

export type PersonnelHeldCashReportPerPersonRow = {
  personnelId: number;
  fullName: string;
  currencyCode: string;
  received: number;
  spent: number;
  transferredOut: number;
  transferredIn: number;
  remaining: number;
  branchCount: number;
};

export type PersonnelHeldCashReportPerBranchRow = {
  branchId: number;
  branchName: string;
  currencyCode: string;
  received: number;
  spent: number;
  transferredOut: number;
  transferredIn: number;
  remaining: number;
  personnelCount: number;
};

export type PersonnelHeldCashReportDetailRow = {
  personnelId: number;
  fullName: string;
  branchId: number;
  branchName: string;
  currencyCode: string;
  received: number;
  spent: number;
  transferredOut: number;
  transferredIn: number;
  remaining: number;
};

export type PersonnelHeldCashReportTopHolder = {
  personnelId: number;
  fullName: string;
  amount: number;
};

export type PersonnelHeldCashReportCurrencyTotal = {
  currencyCode: string;
  totalReceived: number;
  totalSpent: number;
  totalTransferredOut: number;
  totalTransferredIn: number;
  totalRemaining: number;
  personnelCount: number;
  branchCount: number;
  topHolder: PersonnelHeldCashReportTopHolder | null;
};

export type PersonnelHeldCashReportResponse = {
  generatedAt: string;
  currencyTotals: PersonnelHeldCashReportCurrencyTotal[];
  perPersonnel: PersonnelHeldCashReportPerPersonRow[];
  perBranch: PersonnelHeldCashReportPerBranchRow[];
  detail: PersonnelHeldCashReportDetailRow[];
};

export async function fetchPersonnelHeldCashReport(): Promise<PersonnelHeldCashReportResponse> {
  return apiRequest<PersonnelHeldCashReportResponse>("/reports/personnel-held-cash", {
    method: "GET",
  });
}
