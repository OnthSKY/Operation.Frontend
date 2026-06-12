import {
  isNonPnlMemoClassificationMain,
  isPatronDebtRepayClassificationMain,
  isPersonnelPocketRepayClassificationMain,
  isPocketClaimTransferClassificationMain,
} from "@/modules/branch/lib/branch-transaction-options";
import type { TxFormValues } from "./tx-form-types";

/**
 * Submit zamanı ödeme kaynağı + UNPAID fatura + kasa devri (handover settle) çözümü.
 *
 * Çıktı:
 *  - `expensePaymentSource`: form'da seçili (normalize)
 *  - `effExpensePay`: UNPAID supplier invoice ise null (henüz ödenmedi); diğer her durumda raw
 *  - `allowsCashHandoverSettle`: bu satır kasa devri (handover) bağına izin verir mi
 *  - `settlesCashHandoverTransactionId`: form'dan parse edilmiş, izin verilmişse pozitif int
 *
 * Hatalar:
 *  - Invoice satırı: status UNPAID/PAID dışıysa
 *  - Handover id geçersiz veya izin verilmemişse
 */
export type SubmitPaymentSourceInput = {
  values: TxFormValues;
  /** Trim'lenmiş mainCategory. */
  mainTrim: string;
  /** branchTxFormIsSupplierInvoiceLine sonucu. */
  isInvoiceRow: boolean;
};

export type SubmitPaymentSourceResult =
  | {
      ok: true;
      expensePaymentSource: string | null;
      effExpensePay: string | null;
      allowsCashHandoverSettle: boolean;
      settlesCashHandoverTransactionId: number | undefined;
      invStatusUpper: string;
    }
  | { ok: false; errorKey: string };

export function resolveSubmitPaymentSource(
  input: SubmitPaymentSourceInput
): SubmitPaymentSourceResult {
  const { values, mainTrim, isInvoiceRow } = input;
  const ty = values.type.toUpperCase();
  const invStatusUpper = values.invoicePaymentStatus.trim().toUpperCase();

  // Invoice satırı zorunlu UNPAID/PAID.
  if (isInvoiceRow && invStatusUpper !== "UNPAID" && invStatusUpper !== "PAID") {
    return { ok: false, errorKey: "branch.txNotifyIncomplete" };
  }

  // Payment source ham → normalize.
  const expensePaymentSource =
    ty === "OUT" &&
    !isNonPnlMemoClassificationMain(mainTrim) &&
    !isPocketClaimTransferClassificationMain(mainTrim)
      ? values.expensePaymentSource.trim()
        ? values.expensePaymentSource.trim().toUpperCase()
        : null
      : null;

  // UNPAID supplier invoice: kasayı etkilemez → effExpensePay null.
  const effExpensePay =
    isInvoiceRow && invStatusUpper === "UNPAID" ? null : expensePaymentSource;

  // Kasa devri (handover) bağı izinli mi?
  const allowsCashHandoverSettle =
    ty === "OUT" &&
    effExpensePay != null &&
    (effExpensePay === "REGISTER" || effExpensePay === "PATRON") &&
    !isPersonnelPocketRepayClassificationMain(mainTrim) &&
    !isPocketClaimTransferClassificationMain(mainTrim) &&
    (!isPatronDebtRepayClassificationMain(mainTrim) || effExpensePay === "REGISTER") &&
    !isNonPnlMemoClassificationMain(mainTrim) &&
    !(isInvoiceRow && invStatusUpper === "UNPAID");

  // Handover id formdan parse + izin kontrol.
  let settlesCashHandoverTransactionId: number | undefined;
  const settlesRaw = values.settlesCashHandoverTransactionId.trim();
  if (settlesRaw !== "") {
    const sid = parseInt(settlesRaw, 10);
    if (!Number.isFinite(sid) || sid <= 0) {
      return { ok: false, errorKey: "branch.txSettlesCashHandoverInvalid" };
    }
    if (!allowsCashHandoverSettle) {
      return { ok: false, errorKey: "branch.txSettlesCashHandoverNotAllowed" };
    }
    settlesCashHandoverTransactionId = sid;
  }

  return {
    ok: true,
    expensePaymentSource,
    effExpensePay,
    allowsCashHandoverSettle,
    settlesCashHandoverTransactionId,
    invStatusUpper,
  };
}
