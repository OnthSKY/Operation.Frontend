import { isOutPersonnelClassificationMain } from "@/modules/branch/lib/branch-transaction-options";
import type { TxFormValues } from "./tx-form-types";

/**
 * Submit zamanı: OUT_PERSONNEL + PER_ADVANCE / PER_SALARY / PER_BONUS satırlarında
 * `linkedFinancialPersonnelId` zorunluluğu + parse + advance mode tespiti.
 *
 * Çıktı:
 *  - `reqExpenseAdvance`: advance link gerekiyor mu?
 *  - `reqExpenseSalary`: salary link gerekiyor mu?
 *  - `linkFinancialPid`: parse edilmiş personel id (geçersiz olabilir)
 *  - `advanceMode`: "existing" | "new_register"
 *
 * Hata:
 *  - Link gerekirken pid geçersiz: errorKey
 */
export type SubmitExpenseLinkInput = {
  values: TxFormValues;
  /** Trim'lenmiş mainCategory. */
  mainTrim: string;
  /** outPersonnelCategoryEffective sonucu (UPPER). */
  scUpper: string;
};

export type SubmitExpenseLinkResult =
  | {
      ok: true;
      reqExpenseAdvance: boolean;
      reqExpenseSalary: boolean;
      linkFinancialPid: number;
      advanceMode: string;
    }
  | { ok: false; errorKey: string };

export function resolveSubmitExpenseLink(
  input: SubmitExpenseLinkInput
): SubmitExpenseLinkResult {
  const { values, mainTrim, scUpper } = input;
  const ty = values.type.toUpperCase();

  const reqExpenseAdvance =
    ty === "OUT" &&
    isOutPersonnelClassificationMain(mainTrim) &&
    scUpper === "PER_ADVANCE";
  const reqExpenseSalary =
    ty === "OUT" &&
    isOutPersonnelClassificationMain(mainTrim) &&
    (scUpper === "PER_SALARY" || scUpper === "PER_BONUS");

  const linkFinancialPid = parseInt(values.expenseLinkPersonnelId.trim(), 10);

  if (
    (reqExpenseAdvance || reqExpenseSalary) &&
    (!Number.isFinite(linkFinancialPid) || linkFinancialPid <= 0)
  ) {
    return { ok: false, errorKey: "branch.txExpenseLinkPersonnelRequired" };
  }

  const advanceMode = values.advanceExpenseMode.trim() || "existing";

  return { ok: true, reqExpenseAdvance, reqExpenseSalary, linkFinancialPid, advanceMode };
}
