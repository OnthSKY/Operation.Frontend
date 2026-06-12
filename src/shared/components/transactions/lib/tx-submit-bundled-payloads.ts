import { DAY_CLOSE_BUNDLED_OUT_MAINS } from "./tx-form-constants";
import type { DayCloseBundledConfirmedLine, TxFormValues } from "./tx-form-types";

/**
 * Gün sonu ile birlikte aynı güne giren bundled gider satırlarının validasyonu +
 * `createTx.mutateAsync` için payload listesi.
 *
 * Kurallar:
 *  - Bundled section AÇIK + draft tutar dolu ise: onaylanmamış taslak → hata
 *  - Her onaylı satır geçerli ana kategori (DAY_CLOSE_BUNDLED_OUT_MAINS) içermeli
 *  - Her onaylı satır geçerli payment source (REGISTER | PATRON) içermeli
 *  - En az 1 REGISTER ödemeli satır varsa şube zorunlu
 *
 * Saf — `notify` yok.
 */
export type SubmitBundledPayload = {
  amount: number;
  mainCategory: string;
  category: string | null;
  paymentSource: string;
  description: string | null;
};

export type SubmitBundledPayloadsInput = {
  registerDayClose: boolean;
  bundleOpen: boolean;
  /** Form'daki taslak tutar (henüz onaylanmadıysa). */
  draftAmountRaw: string;
  confirmedLines: DayCloseBundledConfirmedLine[];
  /** Şube id (kayıt sırasında REGISTER ödemeli satır varsa zorunlu). */
  effBranchId: number | undefined;
};

export type SubmitBundledPayloadsResult =
  | { ok: true; payloads: SubmitBundledPayload[] }
  | { ok: false; errorKey: string };

export function resolveSubmitBundledPayloads(
  input: SubmitBundledPayloadsInput
): SubmitBundledPayloadsResult {
  const { registerDayClose, bundleOpen, draftAmountRaw, confirmedLines, effBranchId } = input;
  if (!registerDayClose) return { ok: true, payloads: [] };

  if (bundleOpen && draftAmountRaw.trim() !== "") {
    return { ok: false, errorKey: "branch.txDayCloseBundledExpenseDraftNotConfirmed" };
  }

  const payloads: SubmitBundledPayload[] = [];
  for (const row of confirmedLines) {
    if (!DAY_CLOSE_BUNDLED_OUT_MAINS.has(row.mainCategory)) {
      return { ok: false, errorKey: "branch.txDayCloseBundledExpenseMainRequired" };
    }
    const src = row.paymentSource.trim().toUpperCase();
    if (src !== "REGISTER" && src !== "PATRON") {
      return { ok: false, errorKey: "branch.txDayCloseBundledExpensePaymentRequired" };
    }
    payloads.push({
      amount: row.amount,
      mainCategory: row.mainCategory,
      category: row.category,
      paymentSource: src,
      description: row.description,
    });
  }

  if (payloads.length > 0 && (effBranchId == null || effBranchId <= 0)) {
    return { ok: false, errorKey: "branch.txRegisterPaymentNeedBranch" };
  }

  return { ok: true, payloads };
}

/** TxFormValues türüne tip uyumu kontrolü için tek noktada referans (compiler check). */
export type _TxFormValuesShapeCheck = Pick<TxFormValues, "dayCloseBundledExpenseAmount">;
