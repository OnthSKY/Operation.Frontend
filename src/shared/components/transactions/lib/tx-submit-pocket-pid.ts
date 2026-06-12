import {
  isPersonnelPocketRepayClassificationMain,
  isPocketClaimTransferClassificationMain,
} from "@/modules/branch/lib/branch-transaction-options";
import type { TxFormValues } from "./tx-form-types";

/**
 * Submit zamanı `expensePocketPersonnelId` zorunluluk + parse'i.
 *
 * Kuralları:
 *  - OUT + POCKET_REPAY umbrella → her zaman zorunlu
 *  - OUT + payment source PERSONNEL_POCKET | PERSONNEL_HELD_REGISTER_CASH → zorunlu
 *  - OUT + POCKET_CLAIM_TRANSFER (PATRON'a değil) → zorunlu (alıcı personel)
 *  - Aksi halde: opsiyonel (undefined)
 *
 * Saf — `notify` yok. Hata `errorKey` ile döner.
 */
export type SubmitPocketPidInput = {
  values: TxFormValues;
  /** Resolved effective expense payment source (UNPAID invoice ise null). */
  effExpensePay: string | null;
};

export type SubmitPocketPidResult =
  | { ok: true; expensePocketPersonnelId: number | undefined }
  | { ok: false; errorKey: string };

export function resolveSubmitPocketPid(
  input: SubmitPocketPidInput
): SubmitPocketPidResult {
  const { values, effExpensePay } = input;
  const ty = values.type.toUpperCase();
  if (ty !== "OUT") return { ok: true, expensePocketPersonnelId: undefined };

  const mainTrim = values.mainCategory.trim();
  const required =
    isPersonnelPocketRepayClassificationMain(mainTrim) ||
    effExpensePay === "PERSONNEL_POCKET" ||
    effExpensePay === "PERSONNEL_HELD_REGISTER_CASH";

  if (required) {
    const n = parseInt(values.expensePocketPersonnelId.trim(), 10);
    if (!Number.isFinite(n) || n <= 0) {
      return { ok: false, errorKey: "branch.txExpensePocketPersonnelRequired" };
    }
    return { ok: true, expensePocketPersonnelId: n };
  }

  // POCKET_CLAIM_TRANSFER (PATRON dışı) için "to" personeli zorunlu.
  if (isPocketClaimTransferClassificationMain(mainTrim)) {
    const cat = (values.category ?? "").trim().toUpperCase();
    const toPatronXfer =
      cat === "POCKET_CLAIM_TRANSFER_TO_PATRON" ||
      mainTrim.toUpperCase() === "OUT_POCKET_CLAIM_TO_PATRON";
    if (!toPatronXfer) {
      const n = parseInt(values.expensePocketPersonnelId.trim(), 10);
      if (!Number.isFinite(n) || n <= 0) {
        return { ok: false, errorKey: "branch.txExpensePocketPersonnelRequired" };
      }
      return { ok: true, expensePocketPersonnelId: n };
    }
  }

  return { ok: true, expensePocketPersonnelId: undefined };
}
