import type { BranchTransaction } from "@/types/branch-transaction";
import type { SelectOption } from "@/shared/ui/Select";

/** Gelir — ana kategori kodları */
export const TX_MAIN_IN: { value: string; labelKey: string }[] = [
  { value: "IN_SALES", labelKey: "branch.txMainInSales" },
  { value: "IN_SERVICE", labelKey: "branch.txMainInService" },
  { value: "IN_DAY_CLOSE", labelKey: "branch.txMainInDayClose" },
  { value: "IN_OTHER", labelKey: "branch.txMainInOther" },
];

/** Gider — ana kategori kodları */
export const TX_MAIN_OUT: { value: string; labelKey: string }[] = [
  { value: "OUT_PERSONNEL", labelKey: "branch.txMainOutPersonnel" },
  { value: "OUT_GOODS", labelKey: "branch.txMainOutGoods" },
  { value: "OUT_OPS", labelKey: "branch.txMainOutOps" },
  { value: "OUT_OTHER", labelKey: "branch.txMainOutOther" },
];

const SUB: Record<string, { value: string; labelKey: string }[]> = {
  IN_SALES: [
    { value: "SALE_RETAIL", labelKey: "branch.txSubSaleRetail" },
    { value: "SALE_WHOLESALE", labelKey: "branch.txSubSaleWholesale" },
    { value: "SALE_OTHER", labelKey: "branch.txSubSaleOther" },
  ],
  IN_SERVICE: [
    { value: "SVC_CONSULT", labelKey: "branch.txSubSvcConsult" },
    { value: "SVC_REPAIR", labelKey: "branch.txSubSvcRepair" },
    { value: "SVC_OTHER", labelKey: "branch.txSubSvcOther" },
  ],
  IN_OTHER: [{ value: "INC_OTHER", labelKey: "branch.txSubIncOther" }],
  OUT_PERSONNEL: [
    { value: "PER_SALARY", labelKey: "branch.txSubPerSalary" },
    { value: "PER_BONUS", labelKey: "branch.txSubPerBonus" },
    { value: "PER_ADVANCE", labelKey: "branch.txSubPerAdvance" },
    { value: "PER_OTHER", labelKey: "branch.txSubPerOther" },
  ],
  OUT_GOODS: [
    { value: "STK_PURCHASE", labelKey: "branch.txSubStkPurchase" },
    { value: "STK_MATERIAL", labelKey: "branch.txSubStkMaterial" },
    { value: "STK_OTHER", labelKey: "branch.txSubStkOther" },
  ],
  OUT_OPS: [
    { value: "OPS_RENT", labelKey: "branch.txSubOpsRent" },
    { value: "OPS_UTIL", labelKey: "branch.txSubOpsUtil" },
    { value: "OPS_MARKET", labelKey: "branch.txSubOpsMarket" },
    { value: "OPS_MEAL", labelKey: "branch.txSubOpsMeal" },
    { value: "OPS_TOBACCO", labelKey: "branch.txSubOpsTobacco" },
    { value: "OPS_FUEL", labelKey: "branch.txSubOpsFuel" },
    { value: "OPS_OTHER", labelKey: "branch.txSubOpsOther" },
  ],
  OUT_OTHER: [{ value: "EXP_OTHER", labelKey: "branch.txSubExpOther" }],
};

export function txMainOptions(
  type: string,
  t: (key: string) => string
): SelectOption[] {
  const empty = { value: "", label: t("branch.txSelectPlaceholder") };
  const list = type.toUpperCase() === "OUT" ? TX_MAIN_OUT : TX_MAIN_IN;
  return [empty, ...list.map((x) => ({ value: x.value, label: t(x.labelKey) }))];
}

export function txSubOptions(
  mainCategory: string,
  t: (key: string) => string
): SelectOption[] {
  const empty = { value: "", label: t("branch.txSelectPlaceholder") };
  const rows = SUB[mainCategory];
  if (!rows?.length) return [empty];
  return [empty, ...rows.map((x) => ({ value: x.value, label: t(x.labelKey) }))];
}

/** Alt kategori seçimi yok (tek satırda ana kategori yeterli). */
export function txMainNeedsSubCategory(type: string, mainCategory: string): boolean {
  const ty = type.trim().toUpperCase();
  const m = mainCategory.trim();
  if (!m) return false;
  if (ty === "IN" && m === "IN_DAY_CLOSE") return false;
  if (ty === "OUT" && m === "OUT_OTHER") return false;
  if (ty === "IN") return m === "IN_SALES" || m === "IN_SERVICE" || m === "IN_OTHER";
  if (ty === "OUT")
    return m === "OUT_PERSONNEL" || m === "OUT_GOODS" || m === "OUT_OPS";
  return false;
}

export function branchTxLinkedExpenseLine(
  row: Pick<
    BranchTransaction,
    | "type"
    | "linkedAdvanceId"
    | "linkedSalaryPaymentId"
    | "linkedAdvancePersonnelFullName"
    | "linkedSalaryPersonnelFullName"
  >,
  t: (key: string) => string
): string | null {
  if (row.type.trim().toUpperCase() !== "OUT") return null;
  const adv =
    row.linkedAdvanceId != null && row.linkedAdvanceId > 0 ? row.linkedAdvanceId : null;
  const sal =
    row.linkedSalaryPaymentId != null && row.linkedSalaryPaymentId > 0
      ? row.linkedSalaryPaymentId
      : null;
  if (adv) {
    const n = row.linkedAdvancePersonnelFullName?.trim();
    return n ? `${t("branch.txLinkedAdvance")}: ${n}` : t("branch.txLinkedAdvance");
  }
  if (sal) {
    const n = row.linkedSalaryPersonnelFullName?.trim();
    return n ? `${t("branch.txLinkedSalary")}: ${n}` : t("branch.txLinkedSalary");
  }
  return null;
}

export function expensePaymentSourceLabel(
  code: string | null | undefined,
  t: (key: string) => string
): string {
  const u = String(code ?? "").trim().toUpperCase();
  if (u === "REGISTER") return t("branch.expensePayRegister");
  if (u === "PATRON") return t("branch.expensePayPatron");
  if (u === "PERSONNEL_POCKET") return t("branch.expensePayPersonnelPocket");
  return "";
}

export function txCategoryLine(
  main: string | null | undefined,
  cat: string | null | undefined,
  t: (key: string) => string
): string {
  const m = txCodeLabel(main, t);
  const c = txCodeLabel(cat, t);
  if (m && c) return `${m} · ${c}`;
  return m || c || "";
}

const SETTLEMENT_JOB_TITLE_KEYS = new Set([
  "MANAGER",
  "DRIVER",
  "CRAFTSMAN",
  "WAITER",
  "CASHIER",
]);

export function cashSettlementPartyLabel(
  code: string | null | undefined,
  t: (key: string) => string,
  responsible?: { fullName: string; jobTitle?: string | null } | null
): string {
  const u = String(code ?? "").trim().toUpperCase();
  if (u === "PATRON") return t("branch.cashSettlementPatron");
  if (u === "BRANCH_MANAGER") {
    const base = t("branch.cashSettlementBranchManager");
    const name = responsible?.fullName?.trim();
    if (!name) return base;
    const jt = responsible?.jobTitle?.trim().toUpperCase();
    if (jt && SETTLEMENT_JOB_TITLE_KEYS.has(jt)) {
      const jl = t(`personnel.jobTitles.${jt}` as "personnel.jobTitles.MANAGER");
      return `${base}: ${name} (${jl})`;
    }
    if (jt) return `${base}: ${name} (${jt})`;
    return `${base}: ${name}`;
  }
  if (u === "REMAINS_AT_BRANCH") return t("branch.cashSettlementRemainsAtBranch");
  return "";
}

/** Tabloda kod → çeviri (bilinmeyen kodlar olduğu gibi gösterilir). */
const ALL_LABEL_KEYS: Record<string, string> = Object.fromEntries([
  ...TX_MAIN_IN.map((x) => [x.value, x.labelKey]),
  ...TX_MAIN_OUT.map((x) => [x.value, x.labelKey]),
  ...Object.values(SUB).flatMap((opts) => opts.map((o) => [o.value, o.labelKey])),
  ["INC_REGISTER", "branch.txSubIncRegister"],
  ["UNKNOWN", "branch.txCategoryUnknown"],
]);

/** Sistemden gelen sabit category değerleri (avans, maaş, satış kaydı vb.) */
const LEGACY_CATEGORY_KEYS: Record<string, string> = {
  SALE: "branch.txLegacySale",
  EXPENSE: "branch.txLegacyExpense",
  ADVANCE: "branch.txLegacyAdvance",
  SALARY: "branch.txLegacySalary",
};

export function txCodeLabel(
  code: string | null | undefined,
  t: (key: string) => string
): string {
  if (code == null || code === "") return "";
  const key = ALL_LABEL_KEYS[code] ?? LEGACY_CATEGORY_KEYS[code];
  return key ? t(key) : code;
}
