/**
 * Human-readable labels for ledger classification codes (branch_transactions.classification_code).
 * Used wherever a raw code like OUT_PER_UNIFORM would otherwise leak into the UI.
 */
export const ledgerClass = {
  // Income
  IN_DAY_CLOSE: "Day close",
  IN_SALES_RETAIL: "Retail sales",
  IN_SALES_WHOLESALE: "Wholesale sales",
  IN_SERVICE_CONSULT: "Consulting income",
  IN_SERVICE_REPAIR: "Repair/service income",
  IN_OTHER_MISC: "Miscellaneous income",
  IN_PATRON_CASH: "Patron cash in",

  // Personnel costs
  OUT_PER_SALARY: "Salary",
  OUT_PER_BONUS: "Bonus",
  OUT_PER_ADVANCE: "Advance",
  OUT_PER_OVERTIME: "Overtime",
  OUT_PER_COMMISSION: "Commission",
  OUT_PER_MEAL_ALLOWANCE: "Meal allowance",
  OUT_PER_TRANSPORT: "Transport",
  OUT_PER_UNIFORM: "Uniform",
  OUT_PER_HEALTH: "Health",
  OUT_PER_SOCIAL_SECURITY: "Social security",
  OUT_PER_TRAINING: "Training",
  OUT_PER_SEVERANCE: "Severance",
  OUT_PER_OTHER: "Other personnel cost",

  // Legacy register
  OUT_REGISTER_EXPENSE: "Register expense",
  OUT_REGISTER_ADVANCE: "Register advance (legacy)",
  OUT_REGISTER_SALARY: "Register salary (legacy)",

  // Goods
  OUT_GOODS_PURCHASE: "Goods purchase",
  OUT_GOODS_MATERIAL: "Materials",
  OUT_GOODS_OTHER: "Other goods cost",

  // Operations
  OUT_OPS_RENT: "Rent",
  OUT_OPS_UTIL: "Utilities",
  OUT_OPS_MARKET: "Marketing",
  OUT_OPS_MEAL: "Meals",
  OUT_OPS_TOBACCO: "Tobacco",
  OUT_OPS_FUEL: "Fuel",
  OUT_OPS_CARGO: "Cargo",
  OUT_OPS_INVOICE: "Supplier invoice expense",
  OUT_OPS_POS_BANK_FEE: "POS/bank fee",
  OUT_OPS_FRANCHISE_ROYALTY: "Franchise royalty",
  OUT_OPS_FRANCHISE_MARKETING: "Franchise marketing",
  OUT_OPS_OTHER: "Other operations expense",

  // Taxes
  OUT_TAX_WITHHOLDING: "Tax withholding",
  OUT_TAX_POS_EOD: "POS end-of-day tax",
  OUT_TAX_VAT: "VAT",
  OUT_TAX_STAMP: "Stamp tax",
  OUT_TAX_MUNICIPAL: "Municipal tax",
  OUT_TAX_EXCISE: "Excise tax",
  OUT_TAX_SSI: "Social security tax",
  OUT_TAX_OTHER: "Other taxes",

  // Misc / cash flow
  OUT_OTHER_EXPENSE: "Other expense",
  OUT_CONTRACTOR_PAYMENT: "Contractor payment",
  OUT_POCKET_REPAY: "Pocket repayment",
  OUT_PATRON_DEBT_REPAY: "Patron debt repayment",
  OUT_POCKET_CLAIM_TRANSFER: "Pocket claim transfer",
  OUT_POCKET_CLAIM_TO_PATRON: "Pocket claim to patron",
  MEMO_NON_PNL: "Memo (non-P&L)",
  OVERHEAD_POOL_HEADER: "Overhead pool",
} as const;
