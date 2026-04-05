import { apiRequest } from "@/shared/api/client";
import type { Branch, CreateBranchInput } from "@/types/branch";

export async function fetchBranches(): Promise<Branch[]> {
  return apiRequest<Branch[]>("/branches");
}

export async function createBranch(input: CreateBranchInput): Promise<Branch> {
  return apiRequest<Branch>("/branches", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
