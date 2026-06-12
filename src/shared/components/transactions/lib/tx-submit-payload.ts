import type { CreateBranchTransactionInput } from "@/types/branch-transaction";
import type { PocketRepaySettlementState } from "../hooks/usePocketRepaySettlement";
import type { TxFormValues } from "./tx-form-types";

/**
 * `createTx.mutateAsync` için tam payload üreten saf builder.
 *
 * Submit içinde 2 yerde çağrılır:
 *  - Yeni avans yarattıktan sonra → caller `extra.linkedAdvanceId = createdAdvanceId` geçer
 *  - Ana akış → caller `extra` vermez; builder linkedAdvanceId/SalaryPaymentId/Pocket… alanlarını
 *    diğer resolver çıktılarından doldurur
 *
 * Saf — yan etki, validation veya format dönüşümü yok.
 */
export type BuildTxCreatePayloadInput = {
  values: TxFormValues;
  effBranchId: number | undefined;
  /** Çözülmüş kategori (auto-injection sonrası). */
  categoryOut: string | null;
  /** UPPER currency. */
  currencyCode: string;
  amount: number;
  cashAmount: number | null;
  cardAmount: number | null;
  cashSettlementParty: string | null;
  cashSettlementPersonnelId: number | undefined;
  expensePaymentSource: string | null;
  expensePocketPersonnelId: number | undefined;
  /** branchTxFormIsSupplierInvoiceLine sonucu. */
  isInvoiceRow: boolean;
  /** Invoice payment status (UNPAID|PAID veya boş). */
  invStatusUpper: string;
  receiptFile: File | null;
  /** Avans/Maaş linked id (resolveSubmitFinancialLink çıktısı). */
  linkedAdvanceId: number | undefined;
  linkedSalaryPaymentId: number | undefined;
  /** OUT_PERSONNEL gider akışında zorunlu linked personnel id (resolveSubmitExpenseLink çıktısı). */
  linkFinancialPid: number;
  reqExpenseAdvance: boolean;
  reqExpenseSalary: boolean;
  advanceMode: string;
  /** Pocket claim transfer + personnel-direct gider akışı için (resolveSubmitLinkedPersonnel). */
  linkedPersonnelIdOut: number | undefined;
  /** OUT_PERSONNEL_POCKET_REPAY için settlement seçimi. */
  pocketRepaySettlement: PocketRepaySettlementState;
  /** Trim'lenmiş mainCategory (POCKET_REPAY tespiti için). */
  mainTrim: string;
  /** Gün sonu PATRON modunda otomatik borç kapatma toggle. */
  registerDayClose: boolean;
  /** Kasa devri (handover) settle bağı (resolveSubmitPaymentSource çıktısı). */
  settlesCashHandoverTransactionId: number | undefined;
};

export function buildTxCreatePayload(
  input: BuildTxCreatePayloadInput,
  extra?: Partial<CreateBranchTransactionInput>
): CreateBranchTransactionInput {
  const {
    values,
    effBranchId,
    categoryOut,
    currencyCode,
    amount,
    cashAmount,
    cardAmount,
    cashSettlementParty,
    cashSettlementPersonnelId,
    expensePaymentSource,
    expensePocketPersonnelId,
    isInvoiceRow,
    invStatusUpper,
    receiptFile,
    linkedAdvanceId,
    linkedSalaryPaymentId,
    linkFinancialPid,
    reqExpenseAdvance,
    reqExpenseSalary,
    advanceMode,
    linkedPersonnelIdOut,
    pocketRepaySettlement,
    mainTrim,
    registerDayClose,
    settlesCashHandoverTransactionId,
  } = input;

  const includeFinancialPid =
    (reqExpenseSalary || (reqExpenseAdvance && advanceMode === "existing")) &&
    linkFinancialPid > 0;

  const payload: CreateBranchTransactionInput = {
    branchId: effBranchId,
    type: values.type,
    mainCategory: values.mainCategory.trim() || null,
    category: categoryOut,
    amount,
    cashAmount,
    cardAmount,
    currencyCode,
    transactionDate: values.transactionDate,
    description: values.description.trim() || null,
    cashSettlementParty,
    cashSettlementPersonnelId,
    ...(registerDayClose && cashSettlementParty === "PATRON"
      ? { applyPatronDebtRepayFromDayClose: values.applyPatronDebtRepayFromDayClose }
      : {}),
    expensePaymentSource,
    ...(expensePocketPersonnelId != null && expensePocketPersonnelId > 0
      ? { expensePocketPersonnelId }
      : {}),
    ...(isInvoiceRow ? { invoicePaymentStatus: invStatusUpper } : {}),
    receiptPhoto: receiptFile,
    ...(linkedAdvanceId != null && linkedAdvanceId > 0 ? { linkedAdvanceId } : {}),
    ...(linkedSalaryPaymentId != null && linkedSalaryPaymentId > 0
      ? { linkedSalaryPaymentId }
      : {}),
    ...(includeFinancialPid ? { linkedFinancialPersonnelId: linkFinancialPid } : {}),
    ...(mainTrim.toUpperCase() === "OUT_PERSONNEL_POCKET_REPAY"
      ? { linkedPocketExpenseTransactionIds: [...pocketRepaySettlement.ids] }
      : {}),
    ...(linkedPersonnelIdOut != null && linkedPersonnelIdOut > 0
      ? { linkedPersonnelId: linkedPersonnelIdOut }
      : {}),
    ...(settlesCashHandoverTransactionId != null
      ? { settlesCashHandoverTransactionId }
      : {}),
    ...extra,
  };

  return payload;
}

/**
 * Gün sonu ile birlikte yazılan bundled gider satırlarının (mainCategory + amount + paymentSource)
 * minimal payload formu — `buildTxCreatePayload`'a göre küçük; submit içinde for-loop ile yazılır.
 */
export type BuildBundledPayloadInput = {
  branchId: number | undefined;
  currencyCode: string;
  transactionDate: string;
  line: {
    amount: number;
    mainCategory: string;
    category: string | null;
    paymentSource: string;
    description: string | null;
  };
};

export function buildBundledPayload(
  input: BuildBundledPayloadInput
): CreateBranchTransactionInput {
  const { branchId, currencyCode, transactionDate, line } = input;
  return {
    branchId,
    type: "OUT",
    mainCategory: line.mainCategory,
    category: line.category,
    amount: line.amount,
    currencyCode,
    transactionDate,
    description: line.description,
    expensePaymentSource: line.paymentSource,
  };
}
