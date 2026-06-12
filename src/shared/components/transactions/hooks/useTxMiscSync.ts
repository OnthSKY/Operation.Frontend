"use client";

import { useEffect } from "react";
import type { UseFormGetValues, UseFormSetValue, UseFormTrigger } from "react-hook-form";
import type { IncomeCashBranchManagerPersonRow } from "@/types/branch";
import type { TxFormValues } from "../lib/tx-form-types";
import type { UseDayCloseBundleApi } from "./useDayCloseBundle";

/**
 * Modal'da kalan dağınık küçük sync effect'leri toplar:
 *  - registerDayClose etkisi: orgMode iken bundle temizle.
 *  - registerDayClose etkisi: transactionDate'i 23:59 sabitle.
 *  - HELD / POCKET picker'da seçili personel listeden çıkmışsa form'dan temizle.
 *  - HELD / POCKET picker bağımlılıkları değişince expensePocketPersonnelId validasyonu tetikle.
 *  - Sub kategori değişimi etkisinde category validasyonu tetikle.
 *  - category değişince expenseFinancialLink temizle (financial-link sync tarafından zaten ele alınıyor olabilir;
 *    burada güvenlik için ikinci kez tetikleniyor).
 *  - incomeSplitActive değişince amount validasyonunu re-tetikle.
 */
export type UseTxMiscSyncInput = {
  registerDayClose: boolean;
  orgMode: boolean;
  dayCloseBundle: UseDayCloseBundleApi;
  expensePocketPickerUsesHeldTotals: boolean;
  heldRegisterPickerEnabled: boolean;
  expensePocketPersonnelWatch: string | null | undefined;
  heldRegisterCashRowsAggregated: IncomeCashBranchManagerPersonRow[];
  heldRegisterRowsForPicker: IncomeCashBranchManagerPersonRow[];
  heldRegisterAggregationFingerprint: string;
  needsSubCategory: boolean;
  categoryWatch: string | null | undefined;
  incomeSplitActive: boolean;
  setValue: UseFormSetValue<TxFormValues>;
  getValues: UseFormGetValues<TxFormValues>;
  trigger: UseFormTrigger<TxFormValues>;
};

export function useTxMiscSync(input: UseTxMiscSyncInput): void {
  const {
    registerDayClose,
    orgMode,
    dayCloseBundle,
    expensePocketPickerUsesHeldTotals,
    heldRegisterPickerEnabled,
    expensePocketPersonnelWatch,
    heldRegisterCashRowsAggregated,
    heldRegisterRowsForPicker,
    heldRegisterAggregationFingerprint,
    needsSubCategory,
    categoryWatch,
    incomeSplitActive,
    setValue,
    getValues,
    trigger,
  } = input;

  // registerDayClose veya orgMode değişince bundle ile temizlik.
  useEffect(() => {
    if (!registerDayClose || orgMode) {
      dayCloseBundle.clearAll();
    }
  }, [registerDayClose, orgMode, dayCloseBundle]);

  // registerDayClose iken transactionDate'i 23:59'a kilitle.
  useEffect(() => {
    if (!registerDayClose) return;
    const current = String(getValues("transactionDate") ?? "");
    const datePart = current.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return;
    const target = `${datePart}T23:59`;
    if (current.slice(0, 16) !== target) setValue("transactionDate", target);
  }, [registerDayClose, getValues, setValue]);

  // HELD/POCKET picker'da seçili personel listede yoksa expensePocketPersonnelId temizlenir.
  useEffect(() => {
    if (!expensePocketPickerUsesHeldTotals && !heldRegisterPickerEnabled) return;
    const sel = String(expensePocketPersonnelWatch ?? "").trim();
    if (!sel) return;
    const rows = expensePocketPickerUsesHeldTotals
      ? heldRegisterCashRowsAggregated
      : heldRegisterRowsForPicker;
    const inList = rows.some(
      (r) => r.personnelId != null && String(r.personnelId) === sel && r.amount > 0.005
    );
    if (!inList) setValue("expensePocketPersonnelId", "");
  }, [
    expensePocketPickerUsesHeldTotals,
    heldRegisterPickerEnabled,
    heldRegisterAggregationFingerprint,
    heldRegisterRowsForPicker,
    expensePocketPersonnelWatch,
    setValue,
    heldRegisterCashRowsAggregated,
  ]);

  // HELD/POCKET picker bağımlılıkları değişince validation tetikle.
  useEffect(() => {
    if (!expensePocketPickerUsesHeldTotals && !heldRegisterPickerEnabled) return;
    void trigger("expensePocketPersonnelId");
  }, [
    expensePocketPickerUsesHeldTotals,
    heldRegisterPickerEnabled,
    heldRegisterAggregationFingerprint,
    heldRegisterRowsForPicker,
    trigger,
  ]);

  // Alt kategori değişince validation tetikle.
  useEffect(() => {
    void trigger("category");
  }, [needsSubCategory, trigger]);

  // category değişince expenseFinancialLink yedek temizleme (financial-link sync de yapıyor).
  useEffect(() => {
    setValue("expenseFinancialLink", "");
  }, [categoryWatch, setValue]);

  // Split aktif iken amount validation tetikle.
  useEffect(() => {
    void trigger("amount");
  }, [incomeSplitActive, trigger]);
}
