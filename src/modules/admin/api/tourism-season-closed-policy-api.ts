import { apiRequest } from "@/shared/api/client";

export type TourismSeasonClosedPolicyPayload = {
  allowRegisterIncomeWhenSeasonClosed: boolean;
  allowRegisterPersonnelExpenseWhenSeasonClosed: boolean;
  allowRegisterPocketRepayExpenseWhenSeasonClosed: boolean;
  allowRegisterOtherExpenseWhenSeasonClosed: boolean;
  allowAdvanceBranchCashWhenSeasonClosed: boolean;
  allowSupplierBranchAllocationPostWhenSeasonClosed: boolean;
  allowGeneralOverheadAllocateWhenSeasonClosed: boolean;
  allowVehicleBranchExpenseWhenSeasonClosed: boolean;
  updatedAtUtc: string | null;
  updatedByUserId: number | null;
};

export type UpdateTourismSeasonClosedPolicyBody = Partial<{
  allowRegisterIncomeWhenSeasonClosed: boolean;
  allowRegisterPersonnelExpenseWhenSeasonClosed: boolean;
  allowRegisterPocketRepayExpenseWhenSeasonClosed: boolean;
  allowRegisterOtherExpenseWhenSeasonClosed: boolean;
  allowAdvanceBranchCashWhenSeasonClosed: boolean;
  allowSupplierBranchAllocationPostWhenSeasonClosed: boolean;
  allowGeneralOverheadAllocateWhenSeasonClosed: boolean;
  allowVehicleBranchExpenseWhenSeasonClosed: boolean;
}>;

export function fetchTourismSeasonClosedPolicy() {
  return apiRequest<TourismSeasonClosedPolicyPayload>("/system/tourism-season-closed-policy");
}

export function putTourismSeasonClosedPolicy(body: UpdateTourismSeasonClosedPolicyBody) {
  return apiRequest<TourismSeasonClosedPolicyPayload>("/system/tourism-season-closed-policy", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}
