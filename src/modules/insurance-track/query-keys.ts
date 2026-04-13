import type { InsuranceTrackQueryParams } from "@/types/insurance-track";

export const insuranceTrackKeys = {
  all: ["insurance-track"] as const,
  list: (p: InsuranceTrackQueryParams) => [...insuranceTrackKeys.all, "list", p] as const,
};
