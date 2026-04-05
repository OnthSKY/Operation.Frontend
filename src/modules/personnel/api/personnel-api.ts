import { apiRequest } from "@/shared/api/client";
import type { CreatePersonnelInput, Personnel } from "@/types/personnel";

export async function fetchPersonnelList(): Promise<Personnel[]> {
  return apiRequest<Personnel[]>("/personnel");
}

export async function createPersonnel(
  input: CreatePersonnelInput
): Promise<Personnel> {
  return apiRequest<Personnel>("/personnel", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
