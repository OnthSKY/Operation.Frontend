"use client";

import { useEffect } from "react";
import type { UseFormGetValues, UseFormSetValue, UseFormTrigger } from "react-hook-form";
import {
  isNonPnlMemoClassificationMain,
  isOutPersonnelClassificationMain,
  isPatronDebtRepayClassificationMain,
  isPersonnelPocketRepayClassificationMain,
} from "@/modules/branch/lib/branch-transaction-options";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * OUT (gider) akışında ödeme kaynağı + nakit devri + cep personel id alanları
 * arasındaki tüm yan etki senkronizasyonları.
 *
 * 7 küçük useEffect tek hook'ta toplandı.
 */
export type UseTxExpensePaymentSyncInput = {
  txType: string;
  mainCategoryWatch: string | null | undefined;
  categoryWatch: string | null | undefined;
  expensePayWatch: string | null | undefined;
  cashPartyWatch: string | null | undefined;
  advanceExpenseModeWatch: string | null | undefined;
  resolvedBranchId: number | null;
  showCashSettlement: boolean;
  /**
   * Personel gideri akışı: target branch modal içinde seçildiği için
   * REGISTER/HELD seçiminin temizlenmesi gerekmez.
   */
  personnelExpenseFlow: boolean;
  setValue: UseFormSetValue<TxFormValues>;
  getValues: UseFormGetValues<TxFormValues>;
  trigger: UseFormTrigger<TxFormValues>;
};

export function useTxExpensePaymentSync(input: UseTxExpensePaymentSyncInput): void {
  const {
    txType,
    mainCategoryWatch,
    categoryWatch,
    expensePayWatch,
    cashPartyWatch,
    advanceExpenseModeWatch,
    resolvedBranchId,
    showCashSettlement,
    personnelExpenseFlow,
    setValue,
    getValues,
    trigger,
  } = input;

  // 1) Şube yokken REGISTER/HELD seçilirse kaynak temizlenir.
  //    Personel gideri akışında target branch modal içinde seçildiği için bu temizleme atlanır.
  useEffect(() => {
    if (personnelExpenseFlow) return;
    if (resolvedBranchId != null && resolvedBranchId > 0) return;
    const pay = String(expensePayWatch ?? "").trim().toUpperCase();
    if (pay !== "REGISTER" && pay !== "PERSONNEL_HELD_REGISTER_CASH") return;
    setValue("expensePaymentSource", "");
  }, [resolvedBranchId, expensePayWatch, personnelExpenseFlow, setValue]);

  // 1b) Personel gideri akışı: ödeme kaynağı şube kasası (REGISTER/HELD) değilse
  //     seçili target branch temizlenir. PATRON/cep ödemesi şubeden bağımsızdır;
  //     aksi halde gider yanlışlıkla personelin şubesine yazılır.
  useEffect(() => {
    if (!personnelExpenseFlow) return;
    const pay = String(expensePayWatch ?? "").trim().toUpperCase();
    if (pay === "REGISTER" || pay === "PERSONNEL_HELD_REGISTER_CASH") return;
    if (!String(getValues("personnelExpenseBranchId") ?? "").trim()) return;
    setValue("personnelExpenseBranchId", "");
  }, [personnelExpenseFlow, expensePayWatch, getValues, setValue]);

  // 2) personnelExpenseBranchId validasyonunu re-tetikle.
  useEffect(() => {
    void trigger("personnelExpenseBranchId");
  }, [expensePayWatch, resolvedBranchId, trigger]);

  // 3) Cash settlement görünmüyorsa party + personnel id temizle.
  useEffect(() => {
    if (!showCashSettlement) {
      setValue("cashSettlementParty", "");
      setValue("cashSettlementPersonnelId", "");
    }
  }, [showCashSettlement, setValue]);

  // 4) BRANCH_MANAGER seçili değilse settlement personnel id temizlenir.
  useEffect(() => {
    if (String(cashPartyWatch ?? "").trim().toUpperCase() !== "BRANCH_MANAGER")
      setValue("cashSettlementPersonnelId", "");
  }, [cashPartyWatch, setValue]);

  // 5) Party değişince validasyonu re-tetikle.
  useEffect(() => {
    void trigger("cashSettlementPersonnelId");
  }, [cashPartyWatch, trigger]);

  // 6) main/category/advance mode değişince expensePaymentSource validasyonunu tetikle.
  useEffect(() => {
    void trigger("expensePaymentSource");
  }, [mainCategoryWatch, txType, trigger]);

  useEffect(() => {
    void trigger("expensePaymentSource");
  }, [categoryWatch, trigger]);

  useEffect(() => {
    void trigger("expensePaymentSource");
  }, [advanceExpenseModeWatch, trigger]);

  // 7) OUT_PER_* + PERSONNEL_POCKET kombinasyonu geçersiz → temizle.
  useEffect(() => {
    const main = String(mainCategoryWatch ?? "").trim();
    const pay = String(expensePayWatch ?? "").trim().toUpperCase();
    if (!isOutPersonnelClassificationMain(main) || pay !== "PERSONNEL_POCKET") return;
    setValue("expensePaymentSource", "");
    setValue("expensePocketPersonnelId", "");
  }, [mainCategoryWatch, expensePayWatch, setValue]);

  // 8) main kategori bazlı expensePaymentSource + cep personel id sync.
  useEffect(() => {
    const main = String(mainCategoryWatch ?? "").trim();
    const pay = String(expensePayWatch ?? "").trim().toUpperCase();
    if (isNonPnlMemoClassificationMain(main)) {
      setValue("expensePaymentSource", "");
      setValue("expensePocketPersonnelId", "");
      return;
    }
    if (isPatronDebtRepayClassificationMain(main)) {
      setValue("expensePocketPersonnelId", "");
      return;
    }
    if (isPersonnelPocketRepayClassificationMain(main) && pay === "PERSONNEL_POCKET") {
      setValue("expensePaymentSource", "");
      return;
    }
    if (isPersonnelPocketRepayClassificationMain(main)) return;
    if (pay !== "PERSONNEL_POCKET" && pay !== "PERSONNEL_HELD_REGISTER_CASH")
      setValue("expensePocketPersonnelId", "");
  }, [expensePayWatch, mainCategoryWatch, setValue]);

  // 9) Cep personel id validation re-tetikle.
  useEffect(() => {
    void trigger("expensePocketPersonnelId");
  }, [expensePayWatch, mainCategoryWatch, trigger]);
}
