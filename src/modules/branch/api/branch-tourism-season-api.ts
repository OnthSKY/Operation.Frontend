import { apiRequest } from "@/shared/api/client";
import type {
  BranchTourismSeasonPeriod,
  SaveBranchTourismSeasonPeriodInput,
} from "@/types/branch-tourism-season";

export async function fetchBranchTourismSeasonPeriods(
  branchId: number,
  seasonYear?: number
): Promise<BranchTourismSeasonPeriod[]> {
  const q = new URLSearchParams();
  if (seasonYear != null && Number.isFinite(seasonYear)) {
    q.set("seasonYear", String(Math.trunc(seasonYear)));
  }
  const qs = q.toString();
  const path = qs
    ? `/branches/${branchId}/tourism-season-periods?${qs}`
    : `/branches/${branchId}/tourism-season-periods`;
  return apiRequest<BranchTourismSeasonPeriod[]>(path);
}

export async function createBranchTourismSeasonPeriod(
  branchId: number,
  body: SaveBranchTourismSeasonPeriodInput
): Promise<BranchTourismSeasonPeriod> {
  return apiRequest<BranchTourismSeasonPeriod>(`/branches/${branchId}/tourism-season-periods`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateBranchTourismSeasonPeriod(
  branchId: number,
  periodId: number,
  body: SaveBranchTourismSeasonPeriodInput
): Promise<BranchTourismSeasonPeriod> {
  return apiRequest<BranchTourismSeasonPeriod>(
    `/branches/${branchId}/tourism-season-periods/${periodId}`,
    { method: "PUT", body: JSON.stringify(body) }
  );
}

export async function deleteBranchTourismSeasonPeriod(
  branchId: number,
  periodId: number
): Promise<void> {
  await apiRequest<null>(`/branches/${branchId}/tourism-season-periods/${periodId}`, {
    method: "DELETE",
  });
}
