import { apiRequest } from "@/shared/api/client";
import type { InsuranceTrackList, InsuranceTrackQueryParams } from "@/types/insurance-track";

function appendParams(sp: URLSearchParams, p: InsuranceTrackQueryParams): void {
  sp.set("asOf", p.asOf);
  sp.set("expiringWithinDays", String(p.expiringWithinDays));
  if (p.branchId != null && p.branchId > 0) sp.set("branchId", String(p.branchId));
  if (p.kind != null && p.kind !== "" && p.kind !== "All") sp.set("kind", p.kind);
  if (p.status != null && p.status !== "" && p.status !== "All") sp.set("status", p.status);
}

export async function fetchInsuranceTrack(
  params: InsuranceTrackQueryParams
): Promise<InsuranceTrackList> {
  const sp = new URLSearchParams();
  appendParams(sp, params);
  return apiRequest<InsuranceTrackList>(`/insurance-track?${sp.toString()}`);
}
