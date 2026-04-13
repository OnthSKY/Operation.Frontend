export type InsuranceTrackKindApi = "Personnel" | "Vehicle" | "Branch";

export type InsuranceTrackStatusApi =
  | "Active"
  | "ExpiringSoon"
  | "Expired"
  | "NoCoverage";

export type InsuranceTrackRow = {
  kind: InsuranceTrackKindApi;
  entityId: number;
  lineId: number | null;
  title: string;
  subtitle: string | null;
  coverageTypeLabel: string;
  startDate: string | null;
  endDate: string | null;
  branchId: number | null;
  branchName: string | null;
  status: InsuranceTrackStatusApi;
  daysUntilEnd: number | null;
  detailPath: string;
};

export type InsuranceTrackSummary = {
  total: number;
  personnelCount: number;
  vehiclePolicyCount: number;
  branchPolicyCount: number;
  active: number;
  expiringSoon: number;
  expired: number;
  noCoverage: number;
};

export type InsuranceTrackList = {
  summary: InsuranceTrackSummary;
  rows: InsuranceTrackRow[];
};

export type InsuranceTrackQueryParams = {
  asOf: string;
  branchId?: number;
  kind?: string;
  status?: string;
  expiringWithinDays: number;
};
