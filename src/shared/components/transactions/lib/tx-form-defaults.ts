import { defaultDateTimeFromInput } from "@/shared/lib/local-iso-date";
import { DEFAULT_CURRENCY } from "@/shared/lib/iso4217-currencies";
import { readLastUsed, RECENT_BUCKETS } from "@/shared/lib/recent-values-store";
import { dayCloseDateTimeFromInput } from "./tx-day-close-helpers";
import type { TxFormValues } from "./tx-form-types";

/**
 * useForm `defaultValues` için ilk değerleri üretir. Modal mount anında bir kez çağrılır.
 * Modal sonradan props değiştiğinde reset() ile useEffect içinde tekrar eder.
 */
export type TxFormDefaultsInput = {
  defaultType?: "IN" | "OUT";
  defaultMainCategory?: string;
  defaultTransactionDate?: string;
};

export function buildTxFormDefaults(input: TxFormDefaultsInput): TxFormValues {
  const isDayClose =
    String(input.defaultMainCategory ?? "").trim().toUpperCase() === "IN_DAY_CLOSE";

  // Akıllı default'lar: kullanıcının son kullandığı seçimleri localStorage'dan okur.
  // Sadece gün sonu DIŞINDA uygulanır — gün sonunun kendine ait kuralları var.
  // İlk açılışta veya localStorage boşsa "" kalır (mevcut davranış).
  const lastExpensePaymentSource = isDayClose ? "" : String(readLastUsed(RECENT_BUCKETS.txExpensePaymentSource) ?? "");
  const lastCashSettlementParty = isDayClose ? "" : String(readLastUsed(RECENT_BUCKETS.txCashSettlementParty) ?? "");

  return {
    type: input.defaultType ?? "IN",
    mainCategory: "",
    category: "",
    amount: "",
    amountCash: "",
    amountCard: "",
    currencyCode: DEFAULT_CURRENCY,
    transactionDate: isDayClose
      ? dayCloseDateTimeFromInput(input.defaultTransactionDate)
      : defaultDateTimeFromInput(input.defaultTransactionDate),
    description: "",
    cashSettlementParty: lastCashSettlementParty,
    cashSettlementPersonnelId: "",
    expensePaymentSource: lastExpensePaymentSource,
    expensePocketPersonnelId: "",
    pocketClaimFromPersonnelId: "",
    invoicePaymentStatus: "",
    expenseFinancialLink: "",
    expenseLinkPersonnelId: "",
    advanceExpenseMode: "existing",
    effectiveYear: "",
    personnelExpenseBranchId: "",
    applyPatronDebtRepayFromDayClose: true,
    dayCloseBundledExpenseAmount: "",
    dayCloseBundledExpenseMainCategory: "",
    dayCloseBundledExpenseCategory: "",
    dayCloseBundledExpenseDescription: "",
    dayCloseBundledExpensePaymentSource: "",
    settlesCashHandoverTransactionId: "",
  };
}
