import {
  isNonPnlMemoClassificationMain,
  isPatronCashIncomeMain,
  isPatronDebtRepayClassificationMain,
  isPersonnelPocketRepayClassificationMain,
  isPocketClaimTransferClassificationMain,
} from "@/modules/branch/lib/branch-transaction-options";

/**
 * mainCategory + type'a göre `category` alanı için otomatik enjeksiyon hesaplar.
 * Saf — React, form, side effect yok.
 *
 * `nextCategory`:
 *   - `undefined` → kullanıcının seçimine dokunma
 *   - string → bu değeri category alanına yaz (boş string dahil)
 *
 * `shouldClearCashCard`: amountCash + amountCard alanlarının temizlenmesi gerekiyor mu
 * (patron nakit girişlerinde nakit/kart kırılımı tutulmaz).
 */
export type AutoCategoryInput = {
  type: string;
  mainCategory: string | null | undefined;
  /** Mevcut category değeri (claim transfer'ın koşullu enjeksiyonu için). */
  currentCategory: string | null | undefined;
};

export type AutoCategoryResult = {
  nextCategory?: string;
  shouldClearCashCard: boolean;
};

export function computeAutoCategoryInjection(
  input: AutoCategoryInput
): AutoCategoryResult {
  const ty = String(input.type ?? "").trim().toUpperCase();
  const m = String(input.mainCategory ?? "").trim();
  const mUpper = m.toUpperCase();

  if (ty === "OUT") {
    if (isPersonnelPocketRepayClassificationMain(m)) {
      return {
        nextCategory: mUpper === "OUT_POCKET_REPAY" ? "" : "POCKET_REPAY",
        shouldClearCashCard: false,
      };
    }
    if (isPocketClaimTransferClassificationMain(m)) {
      const curCat = String(input.currentCategory ?? "").trim();
      if (!curCat && mUpper === "OUT_PERSONNEL_POCKET_CLAIM_TRANSFER") {
        return { nextCategory: "POCKET_CLAIM_TRANSFER", shouldClearCashCard: false };
      }
      return { shouldClearCashCard: false };
    }
    if (isPatronDebtRepayClassificationMain(m)) {
      return { nextCategory: "PATRON_DEBT_REPAY", shouldClearCashCard: false };
    }
    if (isNonPnlMemoClassificationMain(m)) {
      return {
        nextCategory: mUpper === "MEMO_NON_PNL" ? "" : "NON_PNL_MEMO",
        shouldClearCashCard: false,
      };
    }
    return { shouldClearCashCard: false };
  }

  if (ty === "IN") {
    if (m === "IN_DAY_CLOSE") {
      return { nextCategory: "", shouldClearCashCard: false };
    }
    if (isPatronCashIncomeMain(m)) {
      return {
        nextCategory: mUpper === "IN_PATRON_CASH" ? "" : "PATRON_CASH",
        shouldClearCashCard: true,
      };
    }
  }

  return { shouldClearCashCard: false };
}
