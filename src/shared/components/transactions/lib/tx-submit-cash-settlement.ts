import type { TxFormValues } from "./tx-form-types";

/**
 * Submit zamanı kasa nakit devri çözümü:
 *   - Devir partisi (party) hangi durumda zorunlu?
 *   - BRANCH_MANAGER seçilince sorumlu personel id parse + zorunluluk.
 *
 * Saf — `notify` yok.
 */
export type SubmitCashSettlementInput = {
  values: TxFormValues;
  /** IN_DAY_CLOSE veya kasa kapanışı satırı mı? */
  registerDayClose: boolean;
  /** cashAmount > 0 ise kasaya nakit geliyor → devir gerekir. */
  hasCashPortion: boolean;
};

export type SubmitCashSettlementResult =
  | {
      ok: true;
      cashSettlementParty: string | null;
      cashSettlementPersonnelId: number | undefined;
    }
  | { ok: false; errorKey: string };

export function resolveSubmitCashSettlement(
  input: SubmitCashSettlementInput
): SubmitCashSettlementResult {
  const { values, registerDayClose, hasCashPortion } = input;

  let cashSettlementParty: string | null = null;
  if (registerDayClose || hasCashPortion) {
    const p = values.cashSettlementParty.trim();
    cashSettlementParty = p ? p.toUpperCase() : null;
  }

  let cashSettlementPersonnelId: number | undefined;
  if (cashSettlementParty === "BRANCH_MANAGER") {
    const sp = values.cashSettlementPersonnelId.trim();
    const n = parseInt(sp, 10);
    if (!Number.isFinite(n) || n <= 0) {
      return { ok: false, errorKey: "branch.txNotifyIncomplete" };
    }
    cashSettlementPersonnelId = n;
  }

  return { ok: true, cashSettlementParty, cashSettlementPersonnelId };
}
