import { apiRequest } from "@/shared/api/client";
import type { Advance, CreateAdvanceInput } from "@/types/advance";

export async function fetchAdvancesByPersonnel(
  personnelId: number,
  effectivePeriod?: string
): Promise<Advance[]> {
  const q = new URLSearchParams({ personnelId: String(personnelId) });
  if (effectivePeriod) q.set("effectivePeriod", effectivePeriod);
  return apiRequest<Advance[]>(`/advances?${q.toString()}`);
}

export async function createAdvance(
  input: CreateAdvanceInput
): Promise<Advance> {
  const body = {
    ...input,
    sourceType: input.sourceType ?? "CASH",
  };
  return apiRequest<Advance>("/advances", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
