import type { TourismSeasonClosedPolicyPayload } from "@/modules/admin/api/tourism-season-closed-policy-api";

export type TourismSeasonPolicyWarningId =
  | "pocketWithoutPersonnel"
  | "advanceWithoutPersonnel"
  | "indirectOutWithoutOther"
  | "expensesWithoutIncome"
  | "allEnabled";

/** Kapalı sezon politikasında tutarsız veya riskli kombinasyonlar (UI uyarıları). */
export function listTourismSeasonPolicyWarningIds(p: TourismSeasonClosedPolicyPayload): TourismSeasonPolicyWarningId[] {
  const {
    allowRegisterIncomeWhenSeasonClosed: inc,
    allowRegisterPersonnelExpenseWhenSeasonClosed: per,
    allowRegisterPocketRepayExpenseWhenSeasonClosed: pocket,
    allowRegisterOtherExpenseWhenSeasonClosed: other,
    allowAdvanceBranchCashWhenSeasonClosed: adv,
    allowSupplierBranchAllocationPostWhenSeasonClosed: sup,
    allowGeneralOverheadAllocateWhenSeasonClosed: oh,
    allowVehicleBranchExpenseWhenSeasonClosed: veh,
  } = p;

  const ids: TourismSeasonPolicyWarningId[] = [];

  if (pocket && !per) ids.push("pocketWithoutPersonnel");
  if (adv && !per) ids.push("advanceWithoutPersonnel");

  const anyIndirectOut = sup || oh || veh;
  if (anyIndirectOut && !other) ids.push("indirectOutWithoutOther");

  const anyOutLike = per || pocket || other || adv || sup || oh || veh;
  if (!inc && anyOutLike) ids.push("expensesWithoutIncome");

  if (inc && per && pocket && other && adv && sup && oh && veh) ids.push("allEnabled");

  return ids;
}

const warningI18nKeys: Record<TourismSeasonPolicyWarningId, string> = {
  pocketWithoutPersonnel: "settings.tourismSeasonWarnPocketWithoutPersonnel",
  advanceWithoutPersonnel: "settings.tourismSeasonWarnAdvanceWithoutPersonnel",
  indirectOutWithoutOther: "settings.tourismSeasonWarnIndirectOutWithoutOther",
  expensesWithoutIncome: "settings.tourismSeasonWarnExpensesWithoutIncome",
  allEnabled: "settings.tourismSeasonWarnAllEnabled",
};

export function tourismSeasonPolicyWarningI18nKey(id: TourismSeasonPolicyWarningId): string {
  return warningI18nKeys[id];
}
