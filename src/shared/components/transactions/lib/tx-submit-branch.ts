import { isPocketClaimTransferClassificationMain } from "@/modules/branch/lib/branch-transaction-options";
import type { TxFormValues } from "./tx-form-types";

/**
 * Submit zamanı şube id'sini çözer ve şube zorunluluğu kurallarını doğrular.
 *
 * Öncelik:
 *  1) propBranchId (modal'dan verilmiş)
 *  2) personnelExpenseFlow aktifse formdan seçilen personnelExpenseBranchId
 *  3) Yoksa undefined
 *
 * Kasa veya zimmetli-kasa ödeme + OUT ise şube zorunlu.
 * POCKET_CLAIM_TRANSFER için şube zorunlu (cep alacağı şubeye bağlı).
 */
export type SubmitBranchInput = {
  values: TxFormValues;
  propBranchId: number | null;
  personnelExpenseFlow: boolean;
  /** Resolved effective expense payment source (UNPAID invoice ise null). */
  effExpensePay: string | null;
  /** Trim'lenmiş mainCategory. */
  mainTrim: string;
};

export type SubmitBranchResult =
  | { ok: true; effBranchId: number | undefined }
  | { ok: false; errorKey: string };

export function resolveSubmitBranch(input: SubmitBranchInput): SubmitBranchResult {
  const { values, propBranchId, personnelExpenseFlow, effExpensePay, mainTrim } = input;

  const pickBranchSubmit = parseInt(
    String(values.personnelExpenseBranchId ?? "").trim(),
    10
  );
  // Personel gideri akışında şube yalnızca ödeme kaynağı şube kasası
  // (REGISTER / zimmetli kasa) iken gönderilir. PATRON/cep gibi kaynaklar
  // şubeden bağımsızdır; seçili şube yok sayılır.
  const isRegisterBasedPay =
    effExpensePay === "REGISTER" ||
    effExpensePay === "PERSONNEL_HELD_REGISTER_CASH";
  const branchForTx =
    propBranchId != null && propBranchId > 0
      ? propBranchId
      : personnelExpenseFlow &&
          isRegisterBasedPay &&
          Number.isFinite(pickBranchSubmit) &&
          pickBranchSubmit > 0
        ? pickBranchSubmit
        : null;
  const effBranchId =
    branchForTx != null && branchForTx > 0 ? branchForTx : undefined;

  const ty = values.type.toUpperCase();
  const needBranchForRegister =
    (effExpensePay === "REGISTER" ||
      effExpensePay === "PERSONNEL_HELD_REGISTER_CASH") &&
    ty === "OUT";
  if (needBranchForRegister && (effBranchId == null || effBranchId <= 0)) {
    return { ok: false, errorKey: "branch.txRegisterPaymentNeedBranch" };
  }

  if (
    isPocketClaimTransferClassificationMain(mainTrim) &&
    (effBranchId == null || effBranchId <= 0)
  ) {
    return { ok: false, errorKey: "branch.txPocketClaimTransferNeedBranch" };
  }

  return { ok: true, effBranchId };
}
