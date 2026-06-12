"use client";

import { useEffect } from "react";
import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import {
  isPatronDebtRepayClassificationMain,
  isPocketClaimTransferClassificationMain,
} from "@/modules/branch/lib/branch-transaction-options";
import { computeAutoCategoryInjection } from "../lib/tx-auto-category";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * Form'da mainCategory/category değiştiğinde otomatik tetiklenen 3 senkronizasyon:
 *
 *  1) POCKET_CLAIM_TRANSFER_TO_PATRON seçildiğinde alıcı personel id'sini temizle (TO_PATRON ise alıcı yok).
 *  2) Auto-kategori injection: belirli mainCategory + tip kombinasyonlarında category alanını otomatik doldur
 *     veya nakit/kart kırılımı alanlarını temizle.
 *  3) OUT_PATRON_DEBT_REPAY seçilince ödeme kaynağı otomatik REGISTER olur, cep personel id temizlenir.
 *
 * Tek hook → modal'daki 3 ayrı useEffect bloğu (24 satır) burada toplanır.
 */
export type UseTxCategorySyncInput = {
  txType: string;
  mainCategoryWatch: string | null | undefined;
  categoryWatch: string | null | undefined;
  setValue: UseFormSetValue<TxFormValues>;
  getValues: UseFormGetValues<TxFormValues>;
};

export function useTxCategorySync(input: UseTxCategorySyncInput): void {
  const { txType, mainCategoryWatch, categoryWatch, setValue, getValues } = input;

  // 1) POCKET_CLAIM_TRANSFER_TO_PATRON: alıcı personel id boşalır.
  useEffect(() => {
    const m = String(mainCategoryWatch ?? "").trim();
    const c = (String(categoryWatch ?? "").trim() || "").toUpperCase();
    const mU = m.toUpperCase();
    if (
      isPocketClaimTransferClassificationMain(m) &&
      (c === "POCKET_CLAIM_TRANSFER_TO_PATRON" || mU === "OUT_POCKET_CLAIM_TO_PATRON")
    ) {
      setValue("expensePocketPersonnelId", "");
    }
  }, [mainCategoryWatch, categoryWatch, setValue]);

  // 2) Auto-kategori injection.
  useEffect(() => {
    const inj = computeAutoCategoryInjection({
      type: txType,
      mainCategory: mainCategoryWatch,
      currentCategory: getValues("category"),
    });
    if (inj.nextCategory !== undefined) setValue("category", inj.nextCategory);
    if (inj.shouldClearCashCard) {
      setValue("amountCash", "");
      setValue("amountCard", "");
    }
  }, [txType, mainCategoryWatch, setValue, getValues]);

  // 3) OUT_PATRON_DEBT_REPAY: ödeme kaynağı kasaya kilitlenir.
  useEffect(() => {
    const m = String(mainCategoryWatch ?? "").trim();
    if (txType.toUpperCase() === "OUT" && isPatronDebtRepayClassificationMain(m)) {
      setValue("expensePaymentSource", "REGISTER");
      setValue("expensePocketPersonnelId", "");
    }
  }, [txType, mainCategoryWatch, setValue]);
}
