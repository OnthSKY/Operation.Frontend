import {
  isOutPersonnelClassificationMain,
  isPocketClaimTransferClassificationMain,
  outPersonnelSubcategoryNeedsFinancialLink,
} from "@/modules/branch/lib/branch-transaction-options";
import type { TxFormValues } from "./tx-form-types";

/**
 * Submit zamanı `linkedPersonnelIdOut` çözümü iki senaryo için:
 *
 *  1) POCKET_CLAIM_TRANSFER: alacağı devreden personel (FROM) zorunlu.
 *     PATRON'a değil ise FROM ≠ TO kontrolü de yapılır.
 *  2) Personel direkt gider akışı (`personnelExpenseFlow`): OUT_PERSONNEL + financial
 *     link gerektirmeyen alt kategorilerde linked personnel zorunlu.
 *
 * Saf — `notify` yok.
 */
export type SubmitLinkedPersonnelInput = {
  values: TxFormValues;
  /** Trim'lenmiş mainCategory. */
  mainTrim: string;
  /** outPersonnelCategoryEffective sonucu (UPPER). */
  scUpper: string;
  /** Önce çözülmüş expensePocketPersonnelId (POCKET_CLAIM_TRANSFER TO). */
  expensePocketPersonnelId: number | undefined;
  /** Personel kart akışı aktif mi? */
  personnelExpenseFlow: boolean;
  /** Modal'a verilmiş default personel id (varsa). */
  defaultLinkedPersonnelId: number | undefined;
  /** OUT_PERSONNEL + financial link gerekiyor → zaten resolveSubmitExpenseLink doğrular; burada fallback. */
  linkFinancialPid: number;
};

export type SubmitLinkedPersonnelResult =
  | { ok: true; linkedPersonnelIdOut: number | undefined }
  | { ok: false; errorKey: string };

export function resolveSubmitLinkedPersonnel(
  input: SubmitLinkedPersonnelInput
): SubmitLinkedPersonnelResult {
  const {
    values,
    mainTrim,
    scUpper,
    expensePocketPersonnelId,
    personnelExpenseFlow,
    defaultLinkedPersonnelId,
    linkFinancialPid,
  } = input;

  if (isPocketClaimTransferClassificationMain(mainTrim)) {
    const fromN = parseInt(values.pocketClaimFromPersonnelId.trim(), 10);
    if (!Number.isFinite(fromN) || fromN <= 0) {
      return { ok: false, errorKey: "branch.txPocketClaimTransferFromRequired" };
    }
    const catXfer = (values.category ?? "").trim().toUpperCase();
    const toPatronXfer =
      catXfer === "POCKET_CLAIM_TRANSFER_TO_PATRON" ||
      mainTrim.toUpperCase() === "OUT_POCKET_CLAIM_TO_PATRON";
    if (
      !toPatronXfer &&
      expensePocketPersonnelId != null &&
      fromN === expensePocketPersonnelId
    ) {
      return { ok: false, errorKey: "branch.txPocketClaimTransferSamePerson" };
    }
    return { ok: true, linkedPersonnelIdOut: fromN };
  }

  if (
    isOutPersonnelClassificationMain(mainTrim) &&
    !outPersonnelSubcategoryNeedsFinancialLink(scUpper) &&
    personnelExpenseFlow
  ) {
    const lp =
      defaultLinkedPersonnelId != null && defaultLinkedPersonnelId > 0
        ? defaultLinkedPersonnelId
        : linkFinancialPid > 0
          ? linkFinancialPid
          : 0;
    if (lp <= 0) {
      return { ok: false, errorKey: "branch.txOrgPerOtherNeedPersonnel" };
    }
    return { ok: true, linkedPersonnelIdOut: lp };
  }

  return { ok: true, linkedPersonnelIdOut: undefined };
}
