import type { BranchTransaction } from "@/types/branch-transaction";
import type { SelectOption } from "@/shared/ui/Select";

/** Gelir — ana kategori kodları */
export const TX_MAIN_IN: { value: string; labelKey: string }[] = [
  { value: "IN_SALES", labelKey: "branch.txMainInSales" },
  { value: "IN_SERVICE", labelKey: "branch.txMainInService" },
  { value: "IN_OTHER", labelKey: "branch.txMainInOther" },
  { value: "IN_PATRON", labelKey: "branch.txMainInPatron" },
  { value: "IN_DAY_CLOSE", labelKey: "branch.txMainInDayClose" },
];

/** Gider — ana kategori kodları (sıra: genel liste; şube gider modalinde ayrıca yeniden sıralanır). */
export const TX_MAIN_OUT: { value: string; labelKey: string }[] = [
  { value: "OUT_PERSONNEL", labelKey: "branch.txMainOutPersonnel" },
  { value: "OUT_GOODS", labelKey: "branch.txMainOutGoods" },
  { value: "OUT_OPS", labelKey: "branch.txMainOutOps" },
  { value: "OUT_TAX", labelKey: "branch.txMainOutTax" },
  { value: "OUT_PERSONNEL_POCKET_REPAY", labelKey: "branch.txMainOutPocketRepay" },
  { value: "OUT_PATRON_DEBT_REPAY", labelKey: "branch.txMainOutPatronDebtRepay" },
  { value: "OUT_OTHER", labelKey: "branch.txMainOutOther" },
  { value: "OUT_NON_PNL", labelKey: "branch.txMainOutNonPnl" },
];

/**
 * Şube kasası gider modalı: önce işletme / stok, sonra personel — böylece tedarikçi & personel
 * yönlendirmesiyle uyumlu akış.
 */
export const TX_MAIN_OUT_BRANCH_MODAL_ORDER = [
  "OUT_OPS",
  "OUT_TAX",
  "OUT_GOODS",
  "OUT_OTHER",
  "OUT_NON_PNL",
  "OUT_PERSONNEL",
  "OUT_PERSONNEL_POCKET_REPAY",
  "OUT_PATRON_DEBT_REPAY",
] as const;

/** txMainOptions çıktısında ilk eleman boş placeholder; OUT satırlarını sürdürülebilir sıraya koyar. */
export function orderBranchExpenseMainOptions(options: SelectOption[]): SelectOption[] {
  if (options.length < 2) return options;
  const empty = options[0];
  if (String(empty?.value ?? "") !== "") return options;
  const rest = options.slice(1);
  const byVal = new Map(rest.map((o) => [o.value, o]));
  const ordered: SelectOption[] = [];
  for (const v of TX_MAIN_OUT_BRANCH_MODAL_ORDER) {
    const o = byVal.get(v);
    if (o) ordered.push(o);
  }
  for (const o of rest) {
    if (
      !(TX_MAIN_OUT_BRANCH_MODAL_ORDER as readonly string[]).includes(o.value)
    ) {
      ordered.push(o);
    }
  }
  return [empty, ...ordered];
}

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
  /** Ücret → yardımlar → yükümlülükler → diğer (liste sırası formlarda böyle görünür). */
  OUT_PERSONNEL: [
    { value: "PER_SALARY", labelKey: "branch.txSubPerSalary" },
    { value: "PER_BONUS", labelKey: "branch.txSubPerBonus" },
    { value: "PER_ADVANCE", labelKey: "branch.txSubPerAdvance" },
    { value: "PER_OVERTIME", labelKey: "branch.txSubPerOvertime" },
    { value: "PER_COMMISSION", labelKey: "branch.txSubPerCommission" },
    { value: "PER_MEAL_ALLOWANCE", labelKey: "branch.txSubPerMealAllowance" },
    { value: "PER_TRANSPORT", labelKey: "branch.txSubPerTransport" },
    { value: "PER_UNIFORM", labelKey: "branch.txSubPerUniform" },
    { value: "PER_HEALTH", labelKey: "branch.txSubPerHealth" },
    { value: "PER_TRAINING", labelKey: "branch.txSubPerTraining" },
    { value: "PER_SOCIAL_SECURITY", labelKey: "branch.txSubPerSocialSecurity" },
    { value: "PER_SEVERANCE", labelKey: "branch.txSubPerSeverance" },
    { value: "PER_OTHER", labelKey: "branch.txSubPerOther" },
  ],
  OUT_GOODS: [
    { value: "STK_PURCHASE", labelKey: "branch.txSubStkPurchase" },
    { value: "STK_MATERIAL", labelKey: "branch.txSubStkMaterial" },
    { value: "STK_OTHER", labelKey: "branch.txSubStkOther" },
  ],
  /** Sabit / lojistik → tedarik & ücretler → franchise → diğer. */
  OUT_OPS: [
    { value: "OPS_RENT", labelKey: "branch.txSubOpsRent" },
    { value: "OPS_UTIL", labelKey: "branch.txSubOpsUtil" },
    { value: "OPS_FUEL", labelKey: "branch.txSubOpsFuel" },
    { value: "OPS_CARGO", labelKey: "branch.txSubOpsCargo" },
    { value: "OPS_MEAL", labelKey: "branch.txSubOpsMeal" },
    { value: "OPS_MARKET", labelKey: "branch.txSubOpsMarket" },
    { value: "OPS_TOBACCO", labelKey: "branch.txSubOpsTobacco" },
    { value: "OPS_POS_BANK_FEE", labelKey: "branch.txSubOpsPosBankFee" },
    { value: "OPS_INVOICE", labelKey: "branch.txSubOpsInvoice" },
    { value: "OPS_FRANCHISE_ROYALTY", labelKey: "branch.txSubOpsFranchiseRoyalty" },
    { value: "OPS_FRANCHISE_MARKETING", labelKey: "branch.txSubOpsFranchiseMarketing" },
    { value: "OPS_OTHER", labelKey: "branch.txSubOpsOther" },
  ],
  /** Stopaj & KDV → SGK → POS / özel → belediye / ÖTV → diğer. */
  OUT_TAX: [
    { value: "TAX_WITHHOLDING", labelKey: "branch.txSubTaxWithholding" },
    { value: "TAX_VAT", labelKey: "branch.txSubTaxVat" },
    { value: "TAX_SSI", labelKey: "branch.txSubTaxSsi" },
    { value: "TAX_POS_EOD", labelKey: "branch.txSubTaxPosEod" },
    { value: "TAX_STAMP", labelKey: "branch.txSubTaxStamp" },
    { value: "TAX_MUNICIPAL", labelKey: "branch.txSubTaxMunicipal" },
    { value: "TAX_EXCISE", labelKey: "branch.txSubTaxExcise" },
    { value: "TAX_OTHER", labelKey: "branch.txSubTaxOther" },
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

/**
 * Şube gider formu: «Tedarikçi faturası» satırı tedarikçi modülünden girilmeli (tek doğruluk kaynağı).
 * İstisnai kasa çıkışı diğer OPS alt kodlarıyla kalır.
 */
export function txSubOptionsForRegisterExpenseModal(
  mainCategory: string,
  t: (key: string) => string
): SelectOption[] {
  const m = mainCategory.trim();
  const empty = { value: "", label: t("branch.txSelectPlaceholder") };
  if (m === "OUT_OPS") {
    const rows = SUB.OUT_OPS.filter((x) => x.value !== "OPS_INVOICE");
    return [empty, ...rows.map((x) => ({ value: x.value, label: t(x.labelKey) }))];
  }
  return txSubOptions(mainCategory, t);
}

/** Alt kategori seçimi yok (tek satırda ana kategori yeterli). */
export function txMainNeedsSubCategory(type: string, mainCategory: string): boolean {
  const ty = type.trim().toUpperCase();
  const m = mainCategory.trim();
  if (!m) return false;
  if (ty === "IN" && m === "IN_DAY_CLOSE") return false;
  if (ty === "IN" && m === "IN_PATRON") return false;
  if (ty === "OUT" && m === "OUT_OTHER") return false;
  if (ty === "OUT" && m === "OUT_PERSONNEL_POCKET_REPAY") return false;
  if (ty === "OUT" && m === "OUT_PATRON_DEBT_REPAY") return false;
  if (ty === "OUT" && m === "OUT_NON_PNL") return false;
  if (ty === "IN") return m === "IN_SALES" || m === "IN_SERVICE" || m === "IN_OTHER";
  if (ty === "OUT")
    return m === "OUT_PERSONNEL" || m === "OUT_GOODS" || m === "OUT_OPS" || m === "OUT_TAX";
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

export function branchTxLinkedSupplierInvoiceLine(
  row: Pick<BranchTransaction, "type" | "linkedSupplierInvoiceLineId">,
  t: (key: string) => string
): string | null {
  if (row.type.trim().toUpperCase() !== "OUT") return null;
  const lineId =
    row.linkedSupplierInvoiceLineId != null && row.linkedSupplierInvoiceLineId > 0
      ? row.linkedSupplierInvoiceLineId
      : null;
  if (!lineId) return null;
  return `${t("branch.txLinkedSupplierInvoiceLine")} #${lineId}`;
}

export function branchTxLinkedVehicleLine(
  row: Pick<
    BranchTransaction,
    "type" | "linkedVehicleExpenseId" | "linkedVehiclePlateNumber"
  >,
  t: (key: string) => string
): string | null {
  if (row.type.trim().toUpperCase() !== "OUT") return null;
  const id =
    row.linkedVehicleExpenseId != null && row.linkedVehicleExpenseId > 0
      ? row.linkedVehicleExpenseId
      : null;
  if (!id) return null;
  const plate = row.linkedVehiclePlateNumber?.trim();
  return plate ? `${t("branch.txLinkedVehicle")}: ${plate}` : t("branch.txLinkedVehicle");
}

export function branchTxGeneralOverheadLine(
  row: Pick<BranchTransaction, "type" | "generalOverheadPoolId">,
  t: (key: string) => string
): string | null {
  if (String(row.type ?? "").trim().toUpperCase() !== "OUT") return null;
  const id =
    row.generalOverheadPoolId != null && row.generalOverheadPoolId > 0
      ? row.generalOverheadPoolId
      : null;
  if (!id) return null;
  return `${t("branch.txGeneralOverheadPool")} #${id}`;
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

/** Liste / şube giderler tabı için kısa ödeme kaynağı. */
export function branchTxUnpaidInvoice(
  row: Pick<BranchTransaction, "type" | "mainCategory" | "category" | "invoicePaymentStatus">
): boolean {
  return (
    String(row.type ?? "")
      .trim()
      .toUpperCase() === "OUT" &&
    String(row.mainCategory ?? "")
      .trim()
      .toUpperCase() === "OUT_OPS" &&
    String(row.category ?? "")
      .trim()
      .toUpperCase() === "OPS_INVOICE" &&
    String(row.invoicePaymentStatus ?? "")
      .trim()
      .toUpperCase() === "UNPAID"
  );
}

export function expensePaymentSourceLabelShort(
  code: string | null | undefined,
  t: (key: string) => string
): string {
  const u = String(code ?? "").trim().toUpperCase();
  if (u === "REGISTER") return t("branch.expensePayRegisterShort");
  if (u === "PATRON") return t("branch.expensePayPatronShort");
  if (u === "PERSONNEL_POCKET") return t("branch.expensePayPersonnelPocketShort");
  return "";
}

/** Maaş / prim / avans: linked advance veya salary payment. */
export const OUT_PERSONNEL_PAYROLL_SUBS = new Set([
  "PER_ADVANCE",
  "PER_SALARY",
  "PER_BONUS",
]);

/** Avans / maaş / prim satırları (linked advance veya salary payment). */
export function outPersonnelSubcategoryNeedsFinancialLink(
  category: string | null | undefined
): boolean {
  return OUT_PERSONNEL_PAYROLL_SUBS.has(String(category ?? "").trim().toUpperCase());
}

/** Gider «kim ödedi» — personel (OUT_PERSONNEL) yalnız kasa veya patron; diğer ana giderlerde cepten seçeneği var. */
export function buildExpensePaymentSelectOptions(params: {
  orgMode: boolean;
  mainCategory: string;
  category: string;
  isNonPnlMemoMain: boolean;
  isPatronDebtRepayMain: boolean;
  isPocketRepayMain: boolean;
  t: (key: string) => string;
}): SelectOption[] {
  const empty = { value: "", label: params.t("branch.expensePaymentUnset") };
  const reg = { value: "REGISTER", label: params.t("branch.expensePayRegister") };
  const pat = { value: "PATRON", label: params.t("branch.expensePayPatron") };
  const poc = {
    value: "PERSONNEL_POCKET",
    label: params.t("branch.expensePayPersonnelPocket"),
  };
  if (params.isNonPnlMemoMain) {
    return [empty];
  }
  if (params.isPatronDebtRepayMain) {
    return [empty, reg];
  }
  if (params.isPocketRepayMain) {
    return [empty, reg, pat];
  }
  const main = String(params.mainCategory ?? "").trim().toUpperCase();
  if (main === "OUT_PERSONNEL") {
    return params.orgMode ? [empty, pat] : [empty, reg, pat];
  }
  if (params.orgMode) {
    return [empty, pat, poc];
  }
  return [empty, reg, pat, poc];
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
  "GENERAL_MANAGER",
  "BRANCH_SUPERVISOR",
  "DRIVER",
  "CRAFTSMAN",
  "WAITER",
  "COMMIS",
  "CASHIER",
  "BRANCH_INTERNAL_HELP",
  "MANAGER",
  "BACK_HOUSE_HELPER",
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
  ["PATRON_CASH", "branch.txSubPatronCash"],
  ["OUT_PERSONNEL_POCKET_REPAY", "branch.txMainOutPocketRepay"],
  ["OUT_PATRON_DEBT_REPAY", "branch.txMainOutPatronDebtRepay"],
  ["POCKET_REPAY", "branch.txSubPocketRepay"],
  ["PATRON_DEBT_REPAY", "branch.txSubPatronDebtRepay"],
  ["OUT_NON_PNL", "branch.txMainOutNonPnl"],
  ["NON_PNL_MEMO", "branch.txSubNonPnlMemo"],
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
