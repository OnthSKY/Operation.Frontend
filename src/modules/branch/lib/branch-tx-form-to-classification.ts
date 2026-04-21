/**
 * Şube işlem formundaki legacy type + mainCategory + category üçlüsünden
 * ledger_classifications.code üretir (POST /branch-transactions ile uyumlu).
 */

/** Modal «şemsiye» ana kodları — bunlar dışındaki mainCategory doğrudan ledger code kabul edilir. */
const LEGACY_FORM_MAIN = new Set([
  "IN_SALES",
  "IN_SERVICE",
  "IN_OTHER",
  "IN_PATRON",
  "OUT_PERSONNEL",
  "OUT_GOODS",
  "OUT_OPS",
  "OUT_TAX",
  "OUT_OTHER",
  "OUT_NON_PNL",
  "OUT_PERSONNEL_POCKET_REPAY",
  "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER",
]);

export function classificationCodeFromLegacyBranchTxForm(
  typeRaw: string,
  mainRaw: string | null | undefined,
  categoryRaw: string | null | undefined
): string {
  const ty = typeRaw.trim().toUpperCase();
  const mc = (mainRaw ?? "").trim().toUpperCase();
  const cat = (categoryRaw ?? "").trim().toUpperCase();

  if (mc && !LEGACY_FORM_MAIN.has(mc)) return mc;

  if (ty === "IN") {
    if (mc === "IN_DAY_CLOSE") return "IN_DAY_CLOSE";
    if (mc === "IN_PATRON") return "IN_PATRON_CASH";
    if (mc === "IN_OTHER" && cat === "INC_REGISTER") return "IN_OTHER_REGISTER";
    if (mc === "IN_OTHER" && cat === "INC_OTHER") return "IN_OTHER_MISC";
    if (mc === "IN_SALES") {
      if (cat === "SALE_RETAIL") return "IN_SALES_RETAIL";
      if (cat === "SALE_WHOLESALE") return "IN_SALES_WHOLESALE";
      if (cat === "SALE_OTHER") return "IN_SALES_OTHER";
    }
    if (mc === "IN_SERVICE") {
      if (cat === "SVC_CONSULT") return "IN_SERVICE_CONSULT";
      if (cat === "SVC_REPAIR") return "IN_SERVICE_REPAIR";
      if (cat === "SVC_OTHER") return "IN_SERVICE_OTHER";
    }
  }

  if (ty === "OUT") {
    if (mc === "OUT_NON_PNL" && cat === "NON_PNL_MEMO") return "MEMO_NON_PNL";
    if (mc === "OUT_PERSONNEL_POCKET_REPAY") return "OUT_POCKET_REPAY";
    if (mc === "OUT_PATRON_DEBT_REPAY") return "OUT_PATRON_DEBT_REPAY";
    if (mc === "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER") {
      if (cat === "POCKET_CLAIM_TRANSFER_TO_PATRON") return "OUT_POCKET_CLAIM_TO_PATRON";
      return "OUT_POCKET_CLAIM_TRANSFER";
    }
    if (mc === "OUT_PERSONNEL") {
      const per: Record<string, string> = {
        PER_SALARY: "OUT_PER_SALARY",
        PER_BONUS: "OUT_PER_BONUS",
        PER_ADVANCE: "OUT_PER_ADVANCE",
        PER_OVERTIME: "OUT_PER_OVERTIME",
        PER_COMMISSION: "OUT_PER_COMMISSION",
        PER_MEAL_ALLOWANCE: "OUT_PER_MEAL_ALLOWANCE",
        PER_TRANSPORT: "OUT_PER_TRANSPORT",
        PER_UNIFORM: "OUT_PER_UNIFORM",
        PER_HEALTH: "OUT_PER_HEALTH",
        PER_SOCIAL_SECURITY: "OUT_PER_SOCIAL_SECURITY",
        PER_TRAINING: "OUT_PER_TRAINING",
        PER_SEVERANCE: "OUT_PER_SEVERANCE",
        PER_OTHER: "OUT_PER_OTHER",
      };
      if (cat && per[cat]) return per[cat]!;
    }
    if (mc === "OUT_GOODS") {
      const g: Record<string, string> = {
        STK_PURCHASE: "OUT_GOODS_PURCHASE",
        STK_MATERIAL: "OUT_GOODS_MATERIAL",
        STK_OTHER: "OUT_GOODS_OTHER",
      };
      if (cat && g[cat]) return g[cat]!;
    }
    if (mc === "OUT_OPS") {
      const o: Record<string, string> = {
        OPS_RENT: "OUT_OPS_RENT",
        OPS_UTIL: "OUT_OPS_UTIL",
        OPS_FUEL: "OUT_OPS_FUEL",
        OPS_CARGO: "OUT_OPS_CARGO",
        OPS_MEAL: "OUT_OPS_MEAL",
        OPS_TOBACCO: "OUT_OPS_TOBACCO",
        OPS_MARKET: "OUT_OPS_MARKET",
        OPS_POS_BANK_FEE: "OUT_OPS_POS_BANK_FEE",
        OPS_INVOICE: "OUT_OPS_INVOICE",
        OPS_FRANCHISE_ROYALTY: "OUT_OPS_FRANCHISE_ROYALTY",
        OPS_FRANCHISE_MARKETING: "OUT_OPS_FRANCHISE_MARKETING",
        OPS_OTHER: "OUT_OPS_OTHER",
      };
      if (cat && o[cat]) return o[cat]!;
    }
    if (mc === "OUT_TAX") {
      const x: Record<string, string> = {
        TAX_WITHHOLDING: "OUT_TAX_WITHHOLDING",
        TAX_POS_EOD: "OUT_TAX_POS_EOD",
        TAX_VAT: "OUT_TAX_VAT",
        TAX_STAMP: "OUT_TAX_STAMP",
        TAX_MUNICIPAL: "OUT_TAX_MUNICIPAL",
        TAX_EXCISE: "OUT_TAX_EXCISE",
        TAX_SSI: "OUT_TAX_SSI",
        TAX_OTHER: "OUT_TAX_OTHER",
      };
      if (cat && x[cat]) return x[cat]!;
    }
    if (mc === "OUT_OTHER" && (cat === "EXP_OTHER" || cat === "")) return "OUT_OTHER_EXPENSE";
  }

  throw new Error(
    `Unable to resolve classificationCode for type=${ty} mainCategory=${mc} category=${cat}`
  );
}
