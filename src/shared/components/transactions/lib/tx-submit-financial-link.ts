import type { TxFormValues } from "./tx-form-types";

/**
 * Submit zamanı `expenseFinancialLink` form alanını parse eder + advance/salary zorunluluk
 * kuralları doğrular.
 *
 * Format: `adv:{id}` veya `sal:{id}`. Eşik geçersizse undefined.
 *
 * Kurallar:
 *  - reqExpenseAdvance + advanceMode=existing → linkedAdvanceId pozitif olmalı
 *  - reqExpenseSalary → linkedSalaryPaymentId pozitif olmalı
 *
 * Saf — `notify` yok.
 */
export type SubmitFinancialLinkInput = {
  values: TxFormValues;
  reqExpenseAdvance: boolean;
  reqExpenseSalary: boolean;
  advanceMode: string;
};

export type SubmitFinancialLinkResult =
  | {
      ok: true;
      linkedAdvanceId: number | undefined;
      linkedSalaryPaymentId: number | undefined;
    }
  | { ok: false; errorKey: string };

export function resolveSubmitFinancialLink(
  input: SubmitFinancialLinkInput
): SubmitFinancialLinkResult {
  const { values, reqExpenseAdvance, reqExpenseSalary, advanceMode } = input;

  let linkedAdvanceId: number | undefined;
  let linkedSalaryPaymentId: number | undefined;
  const linkRaw = values.expenseFinancialLink.trim();
  if (linkRaw.startsWith("adv:")) {
    const n = parseInt(linkRaw.slice(4), 10);
    if (Number.isFinite(n) && n > 0) linkedAdvanceId = n;
  } else if (linkRaw.startsWith("sal:")) {
    const n = parseInt(linkRaw.slice(4), 10);
    if (Number.isFinite(n) && n > 0) linkedSalaryPaymentId = n;
  }

  if (
    reqExpenseAdvance &&
    advanceMode === "existing" &&
    (linkedAdvanceId == null || linkedAdvanceId <= 0)
  ) {
    return { ok: false, errorKey: "branch.txExpenseLinkRequired" };
  }
  if (reqExpenseSalary && (linkedSalaryPaymentId == null || linkedSalaryPaymentId <= 0)) {
    return { ok: false, errorKey: "branch.txExpenseLinkRequired" };
  }

  return { ok: true, linkedAdvanceId, linkedSalaryPaymentId };
}
