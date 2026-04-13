import { apiRequest } from "@/shared/api/client";
import type { BranchTransaction } from "@/types/branch-transaction";

export async function fetchMyAttributedExpenses(): Promise<BranchTransaction[]> {
  return apiRequest<BranchTransaction[]>("/me/attributed-expenses");
}
