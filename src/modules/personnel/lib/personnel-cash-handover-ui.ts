import type { PersonnelCashHandoverOutflow } from "@/types/personnel-management-snapshot";

export type HandoverOutflowSpendBucket =
  | "advance"
  | "held_expense"
  | "settles_expense"
  | "patron_repay"
  | "other";

export function classifyHandoverOutflowSpend(
  row: PersonnelCashHandoverOutflow
): HandoverOutflowSpendBucket {
  if (row.linkedAdvanceId != null && row.linkedAdvanceId > 0) return "advance";
  const mc = (row.mainCategory ?? "").trim().toUpperCase();
  if (mc.includes("PATRON") || mc === "OUT_PATRON_DEBT_REPAY") return "patron_repay";
  if (row.outflowKind === "SETTLES_HANDOVER_IN") return "settles_expense";
  if (row.outflowKind === "HELD_REGISTER_CASH") return "held_expense";
  return "other";
}

export function handoverOutflowBucketLabelKey(bucket: HandoverOutflowSpendBucket): string {
  switch (bucket) {
    case "advance":
      return "personnel.detailMgmtSpentBucketAdvance";
    case "held_expense":
      return "personnel.detailMgmtSpentBucketHeldExpense";
    case "settles_expense":
      return "personnel.detailMgmtSpentBucketSettlesExpense";
    case "patron_repay":
      return "personnel.detailMgmtSpentBucketPatronRepay";
    default:
      return "personnel.detailMgmtSpentBucketOther";
  }
}
