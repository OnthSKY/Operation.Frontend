import type { SelectOption } from "@/shared/ui/Select";

/** Gelir — ana kategori kodları */
export const TX_MAIN_IN: { value: string; labelKey: string }[] = [
  { value: "IN_SALES", labelKey: "branch.txMainInSales" },
  { value: "IN_SERVICE", labelKey: "branch.txMainInService" },
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
  IN_OTHER: [
    { value: "INC_REGISTER", labelKey: "branch.txSubIncRegister" },
    { value: "INC_OTHER", labelKey: "branch.txSubIncOther" },
  ],
  OUT_PERSONNEL: [
    { value: "PER_SALARY", labelKey: "branch.txSubPerSalary" },
    { value: "PER_BONUS", labelKey: "branch.txSubPerBonus" },
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

/** Tabloda kod → çeviri (bilinmeyen kodlar olduğu gibi gösterilir). */
const ALL_LABEL_KEYS: Record<string, string> = Object.fromEntries([
  ...TX_MAIN_IN.map((x) => [x.value, x.labelKey]),
  ...TX_MAIN_OUT.map((x) => [x.value, x.labelKey]),
  ...Object.values(SUB).flatMap((opts) => opts.map((o) => [o.value, o.labelKey])),
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
