import { apiRequest } from "@/shared/api/client";

export type GeneralOverheadPoolAmount = {
  currencyCode: string;
  amount: number;
};

export type GeneralOverheadPoolRow = {
  id: number;
  title: string;
  notes: string | null;
  expenseDate: string;
  /** Özet sütunu (TRY veya ilk para birimi). */
  amountTotal: number;
  currencyCode: string;
  /** Çoklu tutarlar; boşsa `amountTotal` + `currencyCode` kullanılır. */
  amounts?: GeneralOverheadPoolAmount[] | null;
  mainCategory: string;
  category: string;
  status: string;
  createdAt: string;
  allocatedAt: string | null;
};

export type GeneralOverheadAllocationRow = {
  branchId: number;
  branchName: string;
  amount: number;
  currencyCode: string;
  branchTransactionId: number;
};

export type GeneralOverheadPoolDetail = GeneralOverheadPoolRow & {
  allocations: GeneralOverheadAllocationRow[];
};

export type CreateGeneralOverheadPoolInput = {
  title: string;
  notes?: string | null;
  expenseDate: string;
  mainCategory: string;
  category: string;
  /** Birden çok para birimi (tercih edilen gövde). */
  amounts?: GeneralOverheadPoolAmount[];
  /** Tek satır için geriye dönük. */
  amountTotal?: number;
  currencyCode?: string | null;
};

export type GeneralOverheadAllocateLine = {
  branchId: number;
  amount: number;
  currencyCode: string;
};

export async function fetchGeneralOverheadPools(
  status?: string
): Promise<GeneralOverheadPoolRow[]> {
  const q =
    status != null && String(status).trim() !== ""
      ? `?status=${encodeURIComponent(String(status).trim())}`
      : "";
  return apiRequest<GeneralOverheadPoolRow[]>(`/general-overhead${q}`);
}

export async function fetchGeneralOverheadPool(
  poolId: number
): Promise<GeneralOverheadPoolDetail> {
  return apiRequest<GeneralOverheadPoolDetail>(`/general-overhead/${poolId}`);
}

export async function createGeneralOverheadPool(
  body: CreateGeneralOverheadPoolInput
): Promise<GeneralOverheadPoolRow> {
  return apiRequest<GeneralOverheadPoolRow>("/general-overhead", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function allocateGeneralOverheadPool(
  poolId: number,
  lines: GeneralOverheadAllocateLine[],
  opts?: { expensePaymentSource?: "PATRON" | "REGISTER" }
): Promise<GeneralOverheadPoolDetail> {
  return apiRequest<GeneralOverheadPoolDetail>(
    `/general-overhead/${poolId}/allocate`,
    {
      method: "POST",
      body: JSON.stringify({
        lines,
        expensePaymentSource: opts?.expensePaymentSource ?? "PATRON",
      }),
    }
  );
}

export async function reverseGeneralOverheadAllocation(
  poolId: number
): Promise<GeneralOverheadPoolDetail> {
  return apiRequest<GeneralOverheadPoolDetail>(
    `/general-overhead/${poolId}/reverse-allocation`,
    { method: "POST" }
  );
}
