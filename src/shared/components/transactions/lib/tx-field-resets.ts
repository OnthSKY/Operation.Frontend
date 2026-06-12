import type { UseFormSetValue } from "react-hook-form";
import type { TxFormValues } from "./tx-form-types";

/**
 * Form alanları için tekrar eden reset blokları. Saf — sadece `setValue` çağırır.
 *
 * useEffect içinde txType veya mainCategory değiştiğinde defalarca tekrar eden
 * 14+ setValue çağrısını tek yere taşır.
 */

/**
 * Hem txType hem mainCategory değişiminde sıfırlanan ortak alanlar.
 * (invoicePaymentStatus ayrı — sadece mainCategory değişiminde sıfırlanıyor.)
 */
export function resetTxSharedFields(setValue: UseFormSetValue<TxFormValues>): void {
  setValue("category", "");
  setValue("cashSettlementParty", "");
  setValue("cashSettlementPersonnelId", "");
  setValue("expensePaymentSource", "");
  setValue("expensePocketPersonnelId", "");
  setValue("pocketClaimFromPersonnelId", "");
  setValue("expenseFinancialLink", "");
  setValue("expenseLinkPersonnelId", "");
  setValue("advanceExpenseMode", "existing");
  setValue("effectiveYear", "");
  setValue("applyPatronDebtRepayFromDayClose", true);
  setValue("dayCloseBundledExpenseAmount", "");
  setValue("dayCloseBundledExpenseMainCategory", "");
  setValue("dayCloseBundledExpenseCategory", "");
  setValue("dayCloseBundledExpenseDescription", "");
  setValue("dayCloseBundledExpensePaymentSource", "");
}

/**
 * txType değiştiğinde ek olarak sıfırlanması gerekenler (mainCategory + nakit/kart).
 */
export function resetTxFieldsOnTypeChange(setValue: UseFormSetValue<TxFormValues>): void {
  setValue("mainCategory", "");
  setValue("amountCash", "");
  setValue("amountCard", "");
  resetTxSharedFields(setValue);
}

/**
 * mainCategory değiştiğinde ek olarak invoicePaymentStatus da sıfırlanır.
 */
export function resetTxFieldsOnMainCategoryChange(
  setValue: UseFormSetValue<TxFormValues>
): void {
  setValue("invoicePaymentStatus", "");
  resetTxSharedFields(setValue);
}
