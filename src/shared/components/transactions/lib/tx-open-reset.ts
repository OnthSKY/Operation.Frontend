import { defaultDateTimeFromInput } from "@/shared/lib/local-iso-date";
import { DEFAULT_CURRENCY } from "@/shared/lib/iso4217-currencies";
import {
  dayCloseDateTimeFromInput,
  formatHandoverAmountPrefill,
} from "./tx-day-close-helpers";
import type { TxFormValues, TxModalProps } from "./tx-form-types";

/**
 * Modal "open" anında form'a uygulanacak prefill state'i hesaplar.
 * Hangi prefill senaryosunun aktif olduğu props'lardan türetilir; sonuç saf bir nesne.
 *
 * Çıktı:
 *  - values: useForm reset()'e geçilecek FormValues
 *  - nextType: prev{Type|Main}Ref senkronizasyonu için seçilen tip
 *  - nextMain: ana kategori (ref'e yazılır)
 */
export type TxOpenResetState = {
  values: TxFormValues;
  nextType: string;
  nextMain: string;
};

type Input = Pick<
  TxModalProps,
  | "defaultType"
  | "defaultMainCategory"
  | "defaultTransactionDate"
  | "defaultPocketRepayPersonnelId"
  | "defaultPocketRepayCurrencyCode"
  | "defaultExpensePaymentSource"
  | "defaultPocketClaimFromPersonnelId"
  | "defaultCategory"
  | "defaultSettlesCashHandoverTransactionId"
  | "defaultHandoverSettleKind"
  | "defaultHandoverCurrencyCode"
  | "defaultHandoverMaxAmount"
  | "defaultHandoverPoolTotalOnly"
  | "defaultLinkedPersonnelId"
  | "defaultEffectiveYear"
  | "personnelDirectExpenseEntry"
> & {
  orgMode: boolean;
  propBranchId: number | null;
};

export function computeTxOpenResetState(input: Input): TxOpenResetState {
  const {
    orgMode,
    propBranchId,
    defaultType,
    defaultMainCategory,
    defaultTransactionDate,
    defaultPocketRepayPersonnelId,
    defaultPocketRepayCurrencyCode,
    defaultExpensePaymentSource,
    defaultPocketClaimFromPersonnelId,
    defaultCategory,
    defaultSettlesCashHandoverTransactionId,
    defaultHandoverSettleKind,
    defaultHandoverCurrencyCode,
    defaultHandoverMaxAmount,
    defaultHandoverPoolTotalOnly,
    defaultLinkedPersonnelId,
    defaultEffectiveYear,
    personnelDirectExpenseEntry,
  } = input;

  const pocketClaimPrefill =
    !orgMode &&
    propBranchId != null &&
    propBranchId > 0 &&
    String(defaultMainCategory ?? "").trim().toUpperCase() ===
      "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER" &&
    defaultPocketClaimFromPersonnelId != null &&
    defaultPocketClaimFromPersonnelId > 0;

  const handoverPrefill =
    !orgMode &&
    propBranchId != null &&
    propBranchId > 0 &&
    defaultHandoverSettleKind != null &&
    (defaultHandoverSettleKind === "expense_register" ||
      defaultHandoverSettleKind === "patron_register_debt_repay") &&
    (defaultHandoverPoolTotalOnly === true ||
      (defaultSettlesCashHandoverTransactionId != null &&
        defaultSettlesCashHandoverTransactionId > 0));

  const pocketRepayPrefill =
    !pocketClaimPrefill &&
    !handoverPrefill &&
    !orgMode &&
    defaultPocketRepayPersonnelId != null &&
    defaultPocketRepayPersonnelId > 0;

  const personnelExpensePrefill =
    defaultLinkedPersonnelId != null && defaultLinkedPersonnelId > 0;

  const personnelCostsDirectEntry =
    orgMode && personnelDirectExpenseEntry === true;

  const nextType =
    pocketClaimPrefill ||
    handoverPrefill ||
    personnelExpensePrefill ||
    personnelCostsDirectEntry
      ? "OUT"
      : orgMode
        ? "OUT"
        : pocketRepayPrefill
          ? "OUT"
          : (defaultType ?? "IN");

  const prefillCur = (defaultPocketRepayCurrencyCode ?? "").trim().toUpperCase();
  const currencyForReset =
    (pocketClaimPrefill || pocketRepayPrefill) && /^[A-Z]{3}$/.test(prefillCur)
      ? prefillCur
      : DEFAULT_CURRENCY;

  const pocketClaimCategory =
    String(defaultCategory ?? "").trim().toUpperCase() ===
    "POCKET_CLAIM_TRANSFER_TO_PATRON"
      ? "POCKET_CLAIM_TRANSFER_TO_PATRON"
      : "POCKET_CLAIM_TRANSFER";

  const repayPaySrc =
    String(defaultExpensePaymentSource ?? "REGISTER").trim().toUpperCase() ===
    "PATRON"
      ? "PATRON"
      : "REGISTER";

  const dayClosePrefill =
    !orgMode &&
    !pocketClaimPrefill &&
    !pocketRepayPrefill &&
    !handoverPrefill &&
    !personnelExpensePrefill &&
    !personnelCostsDirectEntry &&
    (defaultType ?? "IN") === "IN" &&
    String(defaultMainCategory ?? "").trim().toUpperCase() === "IN_DAY_CLOSE";

  const handoverCurRaw = (defaultHandoverCurrencyCode ?? "").trim().toUpperCase();
  const handoverCur = /^[A-Z]{3}$/.test(handoverCurRaw)
    ? handoverCurRaw
    : DEFAULT_CURRENCY;

  const nextMain = pocketClaimPrefill
    ? "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER"
    : handoverPrefill
      ? defaultHandoverSettleKind === "patron_register_debt_repay"
        ? "OUT_PATRON_DEBT_REPAY"
        : ""
      : pocketRepayPrefill
        ? "OUT_PERSONNEL_POCKET_REPAY"
        : personnelExpensePrefill || personnelCostsDirectEntry
          ? "OUT_PERSONNEL"
          : dayClosePrefill
            ? "IN_DAY_CLOSE"
            : "";

  const values: TxFormValues = {
    type: nextType,
    mainCategory: nextMain,
    category: pocketClaimPrefill
      ? pocketClaimCategory
      : handoverPrefill
        ? defaultHandoverSettleKind === "patron_register_debt_repay"
          ? "PATRON_DEBT_REPAY"
          : ""
        : pocketRepayPrefill
          ? "POCKET_REPAY"
          : "",
    amount:
      handoverPrefill &&
      defaultHandoverMaxAmount != null &&
      defaultHandoverMaxAmount > 0
        ? formatHandoverAmountPrefill(defaultHandoverMaxAmount)
        : "",
    amountCash: "",
    amountCard: "",
    currencyCode: handoverPrefill ? handoverCur : currencyForReset,
    transactionDate: dayClosePrefill
      ? dayCloseDateTimeFromInput(defaultTransactionDate)
      : defaultDateTimeFromInput(defaultTransactionDate),
    description: "",
    cashSettlementParty: "",
    cashSettlementPersonnelId: "",
    expensePaymentSource: handoverPrefill
      ? "REGISTER"
      : pocketRepayPrefill
        ? repayPaySrc
        : "",
    expensePocketPersonnelId: pocketRepayPrefill
      ? String(defaultPocketRepayPersonnelId)
      : "",
    pocketClaimFromPersonnelId: pocketClaimPrefill
      ? String(defaultPocketClaimFromPersonnelId)
      : "",
    expenseFinancialLink: "",
    expenseLinkPersonnelId:
      pocketClaimPrefill || handoverPrefill || !personnelExpensePrefill
        ? ""
        : String(defaultLinkedPersonnelId),
    advanceExpenseMode: "existing",
    effectiveYear:
      defaultEffectiveYear != null &&
      defaultEffectiveYear >= 1900 &&
      defaultEffectiveYear <= 9999
        ? String(defaultEffectiveYear)
        : "",
    personnelExpenseBranchId: "",
    invoicePaymentStatus: "",
    applyPatronDebtRepayFromDayClose: true,
    dayCloseBundledExpenseAmount: "",
    dayCloseBundledExpenseMainCategory: "",
    dayCloseBundledExpenseCategory: "",
    dayCloseBundledExpenseDescription: "",
    dayCloseBundledExpensePaymentSource: "",
    settlesCashHandoverTransactionId:
      handoverPrefill &&
      defaultHandoverPoolTotalOnly !== true &&
      defaultSettlesCashHandoverTransactionId != null &&
      defaultSettlesCashHandoverTransactionId > 0
        ? String(defaultSettlesCashHandoverTransactionId)
        : "",
  };

  return { values, nextType, nextMain };
}
