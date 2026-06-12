import type { PocketRepaySettlementState } from "../hooks/usePocketRepaySettlement";

/**
 * Submit zamanı OUT_PERSONNEL_POCKET_REPAY satırı için seçilen önceki cep gider
 * satırlarının (settlement) doğrulanması.
 *
 * Kurallar:
 *  - En az 1 satır seçili olmalı
 *  - Tüm satırların para birimi formdakiyle uyumlu olmalı
 *  - Form tutarı (amount) seçili satırların toplamıyla eşleşmeli (tolerans 0.009)
 *
 * Saf — `notify` yok.
 */
export type SubmitPocketRepayInput = {
  /** Trim'lenmiş mainCategory. */
  mainTrim: string;
  /** Submit anındaki settlement seçim özeti. */
  settlement: PocketRepaySettlementState;
  /** Submit anındaki çözülmüş tutar. */
  amount: number;
};

export type SubmitPocketRepayResult =
  | { ok: true }
  | { ok: false; errorKey: string };

export function resolveSubmitPocketRepay(
  input: SubmitPocketRepayInput
): SubmitPocketRepayResult {
  const { mainTrim, settlement, amount } = input;
  if (mainTrim.toUpperCase() !== "OUT_PERSONNEL_POCKET_REPAY") return { ok: true };

  if (settlement.ids.length === 0) {
    return { ok: false, errorKey: "branch.pocketRepayPickRequired" };
  }
  if (!settlement.currencyOk) {
    return { ok: false, errorKey: "branch.pocketPriorCurrencyMismatch" };
  }
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.abs(amount - settlement.sum) > 0.009
  ) {
    return { ok: false, errorKey: "branch.pocketRepayAmountMismatch" };
  }
  return { ok: true };
}
