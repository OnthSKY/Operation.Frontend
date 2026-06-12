import { parseLocaleAmount } from "@/shared/lib/locale-amount";
import type { Locale } from "@/i18n/messages";
import { isPatronCashIncomeMain } from "@/modules/branch/lib/branch-transaction-options";
import type { TxFormValues } from "./tx-form-types";

/**
 * Submit zamanında tutar (toplam + cash/card kırılımı) hesabı + kuralları.
 * Saf — `notify` yok, `t` yok. Hata durumunda `ok:false` + i18n key döner.
 */
export type SubmitAmountsInput = {
  values: TxFormValues;
  locale: Locale;
  /** IN_DAY_CLOSE veya benzeri gün kapanışı satırı mı? */
  registerDayClose: boolean;
  /** Gün kapanışı durumunda nakit toplamından düşülecek miktar (REGISTER ödemeli bundled gider + günün gider toplamı). */
  totalDeductible: number;
};

export type SubmitAmountsResult =
  | {
      ok: true;
      amount: number;
      cashAmount: number | null;
      cardAmount: number | null;
      /** IN + (amountCash ya da amountCard) doluysa true — nakit/kart split mod. */
      splitIncome: boolean;
    }
  | { ok: false; errorKey: string };

export function resolveSubmitAmounts(input: SubmitAmountsInput): SubmitAmountsResult {
  const { values, locale, registerDayClose, totalDeductible } = input;

  const splitIncome =
    values.type.toUpperCase() === "IN" &&
    (values.amountCash.trim() !== "" || values.amountCard.trim() !== "");

  // IN_PATRON_CASH/IN_PATRON: nakit + kart kırılımı kabul etmez.
  if (
    values.type.toUpperCase() === "IN" &&
    isPatronCashIncomeMain(values.mainCategory) &&
    splitIncome
  ) {
    return { ok: false, errorKey: "branch.txPatronCashNoSplit" };
  }

  let amount: number;
  let cashAmount: number | null = null;
  let cardAmount: number | null = null;

  if (splitIncome) {
    const c = parseLocaleAmount(values.amountCash, locale);
    const k = parseLocaleAmount(values.amountCard, locale);
    if (!Number.isFinite(c) || c < 0 || !Number.isFinite(k) || k < 0) {
      return { ok: false, errorKey: "branch.txSplitIncomplete" };
    }
    amount = c + k;
    if (amount <= 0) {
      return { ok: false, errorKey: "branch.txAmountInvalid" };
    }
    cashAmount = registerDayClose ? Math.max(0, c - totalDeductible) : c;
    cardAmount = k;
  } else {
    amount = parseLocaleAmount(values.amount, locale);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, errorKey: "branch.txAmountInvalid" };
    }
    if (registerDayClose && totalDeductible > 0) {
      cashAmount = Math.max(0, amount - totalDeductible);
    }
  }

  return { ok: true, amount, cashAmount, cardAmount, splitIncome };
}
