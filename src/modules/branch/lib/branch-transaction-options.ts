import type { BranchTransaction } from "@/types/branch-transaction";
import type { SelectOption } from "@/shared/ui/Select";
import { UI_PERSONNEL_POCKET_ENABLED } from "@/modules/branch/lib/product-ui-flags";

/** Gelir — ana kategori kodları */
export const TX_MAIN_IN: { value: string; labelKey: string }[] = [
  { value: "IN_SALES", labelKey: "branch.txMainInSales" },
  { value: "IN_SERVICE", labelKey: "branch.txMainInService" },
  { value: "IN_OTHER", labelKey: "branch.txMainInOther" },
  { value: "IN_PATRON", labelKey: "branch.txMainInPatron" },
  { value: "IN_DAY_CLOSE", labelKey: "branch.txMainInDayClose" },
];

/**
 * Şube kasası gider modalı sırası (işletmeci): önce personel & cep/patron kasa akışları,
 * sonra günlük işletme (stok, işletme, vergi, diğer, P&L dışı not), en sonda patron borcu ödemesi.
 * TX_MAIN_OUT aynı sırayı kullanır (filtreler / formlar tutarlı).
 */
/**
 * Şube gider ekleme modalında kullanıcının seçebileceği ana kategoriler.
 * Sadeleştirildi: kullanıcı yalnızca İşletme Gideri (OUT_OPS) ekler.
 * Personel/Mal/Vergi/Diğer kayıtları ilgili modüllerden (personel, tedarikçi, vb.) gelir.
 * Patron borcu (OUT_PATRON_DEBT_REPAY) ve P&L dışı not (OUT_NON_PNL) sistem üretir.
 */
export const TX_MAIN_OUT_BRANCH_MODAL_ORDER = [
  "OUT_OPS",
] as const;

/**
 * Tüm OUT_* umbrella'larının label key'leri (eski kayıt görüntüleme + ledger label lookup için).
 * Modal/filtre listesi `TX_MAIN_OUT` ayrı; bu sadece "code → labelKey" çözümü.
 */
const TX_MAIN_OUT_LABEL_KEYS: Record<string, string> = {
  OUT_OPS: "branch.txMainOutOps",
  OUT_TAX: "branch.txMainOutTax",
  OUT_GOODS: "branch.txMainOutGoods",
  OUT_OTHER: "branch.txMainOutOther",
  OUT_NON_PNL: "branch.txMainOutNonPnl",
  OUT_PERSONNEL: "branch.txMainOutPersonnel",
  OUT_PERSONNEL_POCKET_REPAY: "branch.txMainOutPocketRepay",
  OUT_PERSONNEL_POCKET_CLAIM_TRANSFER: "branch.txMainOutPocketClaimTransfer",
  OUT_PATRON_DEBT_REPAY: "branch.txMainOutPatronDebtRepay",
};

/**
 * Gider — ana kategori. Tek "İşletme Gideri" (OUT_OPS) yeterli; personel/patron/cep gibi
 * sistem veya başka modüllerin ürettiği kayıtların ayrı umbrella filtresine gerek yok.
 */
export const TX_MAIN_OUT: { value: string; labelKey: string }[] = [
  { value: "OUT_OPS", labelKey: TX_MAIN_OUT_LABEL_KEYS.OUT_OPS },
];

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
  ],
  IN_SERVICE: [
    { value: "SVC_CONSULT", labelKey: "branch.txSubSvcConsult" },
    { value: "SVC_REPAIR", labelKey: "branch.txSubSvcRepair" },
  ],
  IN_OTHER: [
    { value: "INC_OTHER", labelKey: "branch.txSubIncOther" },
  ],
  /** Ücret → yardımlar → yükümlülükler (SGK eğitimden önce) → diğer. */
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
    { value: "PER_SOCIAL_SECURITY", labelKey: "branch.txSubPerSocialSecurity" },
    { value: "PER_TRAINING", labelKey: "branch.txSubPerTraining" },
    { value: "PER_SEVERANCE", labelKey: "branch.txSubPerSeverance" },
    { value: "PER_OTHER", labelKey: "branch.txSubPerOther" },
  ],
  OUT_GOODS: [
    { value: "STK_PURCHASE", labelKey: "branch.txSubStkPurchase" },
    { value: "STK_MATERIAL", labelKey: "branch.txSubStkMaterial" },
    { value: "STK_OTHER", labelKey: "branch.txSubStkOther" },
  ],
  /** Sabit (kira/fatura) → bakım → pazarlama → sarf/temizlik → koruma/sigorta → yazılım/danışmanlık →
   *  eğitim/seyahat → ağırlama → banka → lisans → vergi → franchise → yemek/yakıt/kargo → diğer. */
  OUT_OPS: [
    { value: "OPS_RENT", labelKey: "branch.txSubOpsRent" },
    { value: "OPS_UTIL", labelKey: "branch.txSubOpsUtil" },
    { value: "OPS_MAINTENANCE", labelKey: "branch.txSubOpsMaintenance" },
    { value: "OPS_MARKETING", labelKey: "branch.txSubOpsMarketing" },
    { value: "OPS_CLEANING", labelKey: "branch.txSubOpsCleaning" },
    { value: "OPS_SUPPLIES", labelKey: "branch.txSubOpsSupplies" },
    { value: "OPS_INSURANCE", labelKey: "branch.txSubOpsInsurance" },
    { value: "OPS_CONSULTING", labelKey: "branch.txSubOpsConsulting" },
    { value: "OPS_SECURITY", labelKey: "branch.txSubOpsSecurity" },
    { value: "OPS_SOFTWARE", labelKey: "branch.txSubOpsSoftware" },
    { value: "OPS_TRAINING", labelKey: "branch.txSubOpsTraining" },
    { value: "OPS_TRAVEL", labelKey: "branch.txSubOpsTravel" },
    { value: "OPS_HOSPITALITY", labelKey: "branch.txSubOpsHospitality" },
    { value: "OPS_BANK_FEE", labelKey: "branch.txSubOpsBankFee" },
    { value: "OPS_LICENSE", labelKey: "branch.txSubOpsLicense" },
    { value: "OPS_TAX", labelKey: "branch.txSubOpsTax" },
    { value: "OPS_FRANCHISE", labelKey: "branch.txSubOpsFranchise" },
    { value: "OPS_MEAL", labelKey: "branch.txSubOpsMeal" },
    { value: "OPS_FUEL", labelKey: "branch.txSubOpsFuel" },
    { value: "OPS_CARGO", labelKey: "branch.txSubOpsCargo" },
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
  OUT_PERSONNEL_POCKET_CLAIM_TRANSFER: [
    { value: "POCKET_CLAIM_TRANSFER", labelKey: "branch.txSubPocketClaimTransfer" },
    { value: "POCKET_CLAIM_TRANSFER_TO_PATRON", labelKey: "branch.txSubPocketClaimTransferToPatron" },
  ],
};

export function txMainOptions(
  type: string,
  t: (key: string) => string
): SelectOption[] {
  const empty = { value: "", label: t("branch.txSelectPlaceholder") };
  const list =
    type.toUpperCase() === "OUT"
      ? TX_MAIN_OUT.filter((x) =>
          (TX_MAIN_OUT_BRANCH_MODAL_ORDER as readonly string[]).includes(x.value)
        )
      : TX_MAIN_IN;
  return [empty, ...list.map((x) => ({ value: x.value, label: t(x.labelKey) }))];
}

/**
 * Granüler ledger `classification_code` (ör. OUT_OPS_RENT) → SUB[…] anahtarı (ör. OUT_OPS).
 * Formda şemsiye ana + alt seçim varken alt liste doldurulur; tam granüler satırda alt dropdown gizlenir.
 */
/** Ledger patron nakit: şemsiye IN_PATRON veya tek kod IN_PATRON_CASH. */
export function isPatronCashIncomeMain(mainCategory: string | null | undefined): boolean {
  const m = String(mainCategory ?? "").trim().toUpperCase();
  return m === "IN_PATRON" || m === "IN_PATRON_CASH";
}

/** Gün sonu kasa satırı: ledger kodu IN_DAY_CLOSE. */
export function isRegisterDayCloseIncomeRow(
  type: string,
  mainCategory: string | null | undefined,
  _category: string | null | undefined
): boolean {
  const ty = String(type ?? "").trim().toUpperCase();
  if (ty !== "IN") return false;
  const m = String(mainCategory ?? "").trim().toUpperCase();
  return m === "IN_DAY_CLOSE";
}

/** P&L dışı not: şemsiye OUT_NON_PNL veya ledger tek kod MEMO_NON_PNL. */
export function isNonPnlMemoClassificationMain(mainCategory: string | null | undefined): boolean {
  const m = String(mainCategory ?? "").trim().toUpperCase();
  return m === "OUT_NON_PNL" || m === "MEMO_NON_PNL";
}

/** Personel cep borcu ödemesi — şemsiye OUT_PERSONNEL_POCKET_REPAY veya ledger OUT_POCKET_REPAY. */
export function isPersonnelPocketRepayClassificationMain(
  mainCategory: string | null | undefined
): boolean {
  const m = String(mainCategory ?? "").trim().toUpperCase();
  return m === "OUT_PERSONNEL_POCKET_REPAY" || m === "OUT_POCKET_REPAY";
}

export function isPatronDebtRepayClassificationMain(mainCategory: string | null | undefined): boolean {
  const m = String(mainCategory ?? "").trim().toUpperCase();
  return m === "OUT_PATRON_DEBT_REPAY";
}

/** Cep alacağı devri — şemsiye veya ledger OUT_POCKET_CLAIM_* kodları. */
export function isPocketClaimTransferClassificationMain(
  mainCategory: string | null | undefined
): boolean {
  const m = String(mainCategory ?? "").trim().toUpperCase();
  return (
    m === "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER" ||
    m === "OUT_POCKET_CLAIM_TRANSFER" ||
    m === "OUT_POCKET_CLAIM_TO_PATRON"
  );
}

/** Diğer gider — şemsiye OUT_OTHER veya ledger OUT_OTHER_EXPENSE. */
export function isOutOtherExpenseClassificationMain(mainCategory: string | null | undefined): boolean {
  const m = String(mainCategory ?? "").trim().toUpperCase();
  return m === "OUT_OTHER" || m === "OUT_OTHER_EXPENSE";
}

export function umbrellaTxMainForSubOptions(mainCategory: string): string {
  const m = mainCategory.trim();
  if (m.startsWith("IN_SALES_")) return "IN_SALES";
  if (m.startsWith("IN_SERVICE_")) return "IN_SERVICE";
  if (m === "IN_OTHER_MISC") return "IN_OTHER";
  if (m === "OUT_OPS_INVOICE") return "OUT_OPS_INVOICE";
  if (m === "OUT_POCKET_CLAIM_TRANSFER" || m === "OUT_POCKET_CLAIM_TO_PATRON") {
    return "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER";
  }
  if (m === "OUT_OPS" || (m.startsWith("OUT_OPS_") && m !== "OUT_OPS_INVOICE")) return "OUT_OPS";
  if (m.startsWith("OUT_GOODS_")) return "OUT_GOODS";
  if (m.startsWith("OUT_TAX_")) return "OUT_TAX";
  if (m.startsWith("OUT_PER_")) return "OUT_PERSONNEL";
  if (m === "OUT_OTHER_EXPENSE") return "OUT_OTHER";
  return m;
}

export function txSubOptions(
  mainCategory: string,
  t: (key: string) => string
): SelectOption[] {
  const empty = { value: "", label: t("branch.txSelectPlaceholder") };
  const key = umbrellaTxMainForSubOptions(mainCategory);
  const rows = SUB[key];
  if (!rows?.length) return [empty];
  return [empty, ...rows.map((x) => ({ value: x.value, label: t(x.labelKey) }))];
}

/**
 * Şube gider formu: «Tedarikçi faturası» satırı tedarikçi modülünden girilmeli (tek doğruluk kaynağı).
 * İstisnai kasa çıkışı diğer OPS alt kodlarıyla kalır.
 * Ledger’da ana alan granüler kod (ör. OUT_OPS_RENT) olduğunda şemsiye OUT_OPS alt listesine düşer.
 */
export function txSubOptionsForRegisterExpenseModal(
  mainCategory: string,
  t: (key: string) => string
): SelectOption[] {
  const m = mainCategory.trim();
  const empty = { value: "", label: t("branch.txSelectPlaceholder") };
  const key = umbrellaTxMainForSubOptions(m);
  if (key === "OUT_OPS") {
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
  if (ty === "IN" && m === "IN_PATRON_CASH") return false;
  if (ty === "OUT" && isOutOtherExpenseClassificationMain(m)) return false;
  if (ty === "OUT" && (m === "OUT_PERSONNEL_POCKET_REPAY" || m === "OUT_POCKET_REPAY")) return false;
  if (ty === "OUT" && m === "OUT_PATRON_DEBT_REPAY") return false;
  if (ty === "OUT" && (m === "OUT_NON_PNL" || m === "MEMO_NON_PNL")) return false;
  if (ty === "IN") {
    if (m.startsWith("IN_SALES_") || m.startsWith("IN_SERVICE_")) return false;
    if (m === "IN_OTHER_MISC") return false;
    return m === "IN_SALES" || m === "IN_SERVICE" || m === "IN_OTHER";
  }
  if (ty === "OUT") {
    if (m === "OUT_OPS_INVOICE") return false;
    if (m.startsWith("OUT_OPS_")) return false;
    if (m.startsWith("OUT_GOODS_")) return false;
    if (m.startsWith("OUT_TAX_")) return false;
    if (m.startsWith("OUT_PER_")) return false;
    if (m === "OUT_POCKET_CLAIM_TRANSFER" || m === "OUT_POCKET_CLAIM_TO_PATRON") return false;
    return (
      m === "OUT_PERSONNEL" ||
      m === "OUT_GOODS" ||
      m === "OUT_OPS" ||
      m === "OUT_TAX" ||
      m === "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER"
    );
  }
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

/** Şube gider satırının türü (liste rozeti). Öncelik sırası önemli. */
export type BranchExpenseKind =
  | "advance"
  | "personnel"
  | "overhead"
  | "invoice"
  | "branch";

export function branchExpenseKind(
  row: Pick<
    BranchTransaction,
    | "type"
    | "mainCategory"
    | "category"
    | "linkedAdvanceId"
    | "linkedSalaryPaymentId"
    | "linkedPersonnelId"
    | "generalOverheadPoolId"
    | "linkedSupplierInvoiceLineId"
  >
): BranchExpenseKind {
  const m = String(row.mainCategory ?? "").trim().toUpperCase();
  const c = String(row.category ?? "").trim().toUpperCase();
  const has = (v: number | null | undefined) => v != null && v > 0;

  // Genel gider havuzu paylaşımı her ana kategoriyi geçersiz kılar.
  if (has(row.generalOverheadPoolId)) return "overhead";
  // Avans (bağlı avans veya PER_ADVANCE sınıfı).
  if (has(row.linkedAdvanceId) || c === "PER_ADVANCE" || m === "OUT_PER_ADVANCE")
    return "advance";
  // Tedarikçi / işletme faturası.
  if (
    has(row.linkedSupplierInvoiceLineId) ||
    m === "OUT_OPS_INVOICE" ||
    (m === "OUT_OPS" && c === "OPS_INVOICE")
  )
    return "invoice";
  // Personel gideri (maaş/prim/diğer personel — avans hariç).
  if (
    has(row.linkedSalaryPaymentId) ||
    has(row.linkedPersonnelId) ||
    m === "OUT_PERSONNEL" ||
    m.startsWith("OUT_PER")
  )
    return "personnel";
  return "branch";
}

export function branchExpenseKindLabel(
  kind: BranchExpenseKind,
  t: (key: string) => string
): string {
  switch (kind) {
    case "advance":
      return t("branch.expenseKindAdvance");
    case "personnel":
      return t("branch.expenseKindPersonnel");
    case "overhead":
      return t("branch.expenseKindOverhead");
    case "invoice":
      return t("branch.expenseKindInvoice");
    default:
      return t("branch.expenseKindBranch");
  }
}

export function expensePaymentSourceLabel(
  code: string | null | undefined,
  t: (key: string) => string
): string {
  const u = String(code ?? "").trim().toUpperCase();
  if (u === "REGISTER") return t("branch.expensePayRegister");
  if (u === "PATRON") return t("branch.expensePayPatron");
  if (u === "PERSONNEL_POCKET") return t("branch.expensePayPersonnelPocket");
  if (u === "PERSONNEL_HELD_REGISTER_CASH") return t("branch.expensePayPersonnelHeldRegisterCash");
  return "";
}

/** Modal/create: şemsiye OUT_OPS+OPS_INVOICE veya tek kod OUT_OPS_INVOICE (API classification). */
export function branchTxFormIsSupplierInvoiceLine(params: {
  type: string;
  mainCategory: string | null | undefined;
  category?: string | null | undefined;
}): boolean {
  const ty = String(params.type ?? "").trim().toUpperCase();
  if (ty !== "OUT") return false;
  const mc = String(params.mainCategory ?? "").trim().toUpperCase();
  const cat = String(params.category ?? "").trim().toUpperCase();
  return mc === "OUT_OPS_INVOICE" || (mc === "OUT_OPS" && cat === "OPS_INVOICE");
}

/** Liste / şube giderler tabı için kısa ödeme kaynağı. */
export function branchTxUnpaidInvoice(
  row: Pick<BranchTransaction, "type" | "mainCategory" | "category" | "invoicePaymentStatus">
): boolean {
  return (
    branchTxFormIsSupplierInvoiceLine({
      type: row.type ?? "",
      mainCategory: row.mainCategory,
      category: row.category,
    }) &&
    String(row.invoicePaymentStatus ?? "").trim().toUpperCase() === "UNPAID"
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
  if (u === "PERSONNEL_HELD_REGISTER_CASH") return t("branch.expensePayPersonnelHeldRegisterCashShort");
  return "";
}

/**
 * Finans eksenleri (mercek mimarisi). Bir OUT işlemi tek "gider" değil; üç ortogonal
 * soruyla değerlendirilir. P&L ekseni için `branchTxNonPnl` (BranchDetailTabs.shared)
 * kullanılır — döngüsel import olmaması için burada tutulmaz.
 *
 * Kasa ekseni: çekmeceden nakit çıktı mı? Yalnız REGISTER kasayı düşürür; PATRON ve
 * PERSONNEL_POCKET kasa-nötrdür. PERSONNEL_HELD_REGISTER_CASH ayrı ele alınır
 * (Giderler sekmesindeki mevcut toggle yönetir), katı kasa toplamına dahil edilmez.
 */
export function txAffectsRegister(
  row: Pick<BranchTransaction, "type" | "expensePaymentSource">
): boolean {
  if (String(row.type ?? "").trim().toUpperCase() !== "OUT") return false;
  return String(row.expensePaymentSource ?? "").trim().toUpperCase() === "REGISTER";
}

/** Finansman ekseni: gideri patron mu fonladı? (kasa-dışı, şube → patron borcu). */
export function txFundedByPatron(
  row: Pick<BranchTransaction, "expensePaymentSource">
): boolean {
  return String(row.expensePaymentSource ?? "").trim().toUpperCase() === "PATRON";
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

/** Şube gider modalı: OUT_PERSONNEL şemsiyesi veya ledger granüler OUT_PER_* (personel gider ailesi). */
export function isOutPersonnelClassificationMain(
  mainCategory: string | null | undefined
): boolean {
  const m = String(mainCategory ?? "").trim().toUpperCase();
  return m === "OUT_PERSONNEL" || m.startsWith("OUT_PER_");
}

/**
 * Şemsiye ana + alt kod veya tek granüler OUT_PER_* ana kodundan PER_* alt kodu (watch / submit).
 */
export function outPersonnelCategoryEffective(
  mainCategory: string | null | undefined,
  category: string | null | undefined
): string {
  const m = String(mainCategory ?? "").trim().toUpperCase();
  const c = String(category ?? "").trim().toUpperCase();
  if (m.startsWith("OUT_PER_")) {
    const fromMain = m.length > 4 ? m.slice(4) : "";
    return fromMain || c;
  }
  return c;
}

/** Gider «kim ödedi» — personel (OUT_PERSONNEL) yalnız kasa veya patron; diğer ana giderlerde cepten seçeneği var. */
export function buildExpensePaymentSelectOptions(params: {
  orgMode: boolean;
  mainCategory: string;
  category: string;
  isNonPnlMemoMain: boolean;
  isPatronDebtRepayMain: boolean;
  isPocketRepayMain: boolean;
  isPocketClaimTransferMain?: boolean;
  /**
   * Personel gideri akışı (orgMode + personnelDirectExpenseEntry).
   * Hedef şube modal içinde ayrıca seçildiği için REGISTER/HELD geçerli olur.
   */
  personnelExpenseFlow?: boolean;
  t: (key: string) => string;
}): SelectOption[] {
  const claimXfer = params.isPocketClaimTransferMain === true;
  const empty = { value: "", label: params.t("branch.expensePaymentUnset") };
  const reg = { value: "REGISTER", label: params.t("branch.expensePayRegister") };
  const pat = { value: "PATRON", label: params.t("branch.expensePayPatron") };
  const held = {
    value: "PERSONNEL_HELD_REGISTER_CASH",
    label: params.t("branch.expensePayPersonnelHeldRegisterCash"),
  };
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
  if (claimXfer) {
    return [empty];
  }
  const main = String(params.mainCategory ?? "").trim().toUpperCase();
  if (isOutPersonnelClassificationMain(main)) {
    // Personel gideri akışında hedef şube ayrıca seçildiği için orgMode olsa da
    // REGISTER + HELD kullanılabilir.
    if (params.orgMode && !params.personnelExpenseFlow) return [empty, pat];
    return [empty, reg, pat, held];
  }
  if (params.orgMode) {
    return UI_PERSONNEL_POCKET_ENABLED ? [empty, pat, poc] : [empty, pat];
  }
  return UI_PERSONNEL_POCKET_ENABLED
    ? [empty, reg, pat, held, poc]
    : [empty, reg, pat, held];
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

/** Ledger classification_code → i18n (granüler kodlar için). */
function buildLedgerClassificationLabelKeys(): Record<string, string> {
  const m: Record<string, string> = {};
  for (const row of SUB.OUT_PERSONNEL) {
    m[`OUT_${row.value}`] = row.labelKey;
  }
  for (const row of SUB.OUT_GOODS) {
    const map: Record<string, string> = {
      STK_PURCHASE: "OUT_GOODS_PURCHASE",
      STK_MATERIAL: "OUT_GOODS_MATERIAL",
      STK_OTHER: "OUT_GOODS_OTHER",
    };
    const canon = map[row.value];
    if (canon) m[canon] = row.labelKey;
  }
  for (const row of SUB.OUT_OPS) {
    m[`OUT_${row.value}`] = row.labelKey;
  }
  for (const row of SUB.OUT_TAX) {
    m[`OUT_${row.value}`] = row.labelKey;
  }
  for (const row of SUB.IN_SALES) {
    const suf = row.value.replace(/^SALE_/, "");
    m[`IN_SALES_${suf}`] = row.labelKey;
  }
  for (const row of SUB.IN_SERVICE) {
    const suf = row.value.replace(/^SVC_/, "");
    m[`IN_SERVICE_${suf}`] = row.labelKey;
  }
  const incOth = SUB.IN_OTHER.find((x) => x.value === "INC_OTHER");
  if (incOth) m.IN_OTHER_MISC = incOth.labelKey;

  const inDay = TX_MAIN_IN.find((x) => x.value === "IN_DAY_CLOSE");
  if (inDay) m.IN_DAY_CLOSE = inDay.labelKey;
  m.IN_PATRON_CASH = "branch.txSubPatronCash";

  m.MEMO_NON_PNL = TX_MAIN_OUT_LABEL_KEYS.OUT_NON_PNL;
  m.OUT_POCKET_REPAY = TX_MAIN_OUT_LABEL_KEYS.OUT_PERSONNEL_POCKET_REPAY;
  m.OUT_OTHER_EXPENSE = SUB.OUT_OTHER[0]?.labelKey ?? "branch.txSubExpOther";

  for (const row of SUB.OUT_PERSONNEL_POCKET_CLAIM_TRANSFER) {
    if (row.value === "POCKET_CLAIM_TRANSFER_TO_PATRON") {
      m.OUT_POCKET_CLAIM_TO_PATRON = row.labelKey;
    } else {
      m.OUT_POCKET_CLAIM_TRANSFER = row.labelKey;
    }
  }
  return m;
}

/** Tabloda kod → çeviri (bilinmeyen kodlar olduğu gibi gösterilir). */
const ALL_LABEL_KEYS: Record<string, string> = Object.fromEntries([
  ...TX_MAIN_IN.map((x) => [x.value, x.labelKey]),
  ...TX_MAIN_OUT.map((x) => [x.value, x.labelKey]),
  ...Object.values(SUB).flatMap((opts) => opts.map((o) => [o.value, o.labelKey])),
  ...Object.entries(buildLedgerClassificationLabelKeys()),
  ["PATRON_CASH", "branch.txSubPatronCash"],
  ["OUT_PERSONNEL_POCKET_REPAY", "branch.txMainOutPocketRepay"],
  ["OUT_PATRON_DEBT_REPAY", "branch.txMainOutPatronDebtRepay"],
  ["POCKET_REPAY", "branch.txSubPocketRepay"],
  ["OUT_PERSONNEL_POCKET_CLAIM_TRANSFER", "branch.txMainOutPocketClaimTransfer"],
  ["POCKET_CLAIM_TRANSFER", "branch.txSubPocketClaimTransfer"],
  ["POCKET_CLAIM_TRANSFER_TO_PATRON", "branch.txSubPocketClaimTransferToPatron"],
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
