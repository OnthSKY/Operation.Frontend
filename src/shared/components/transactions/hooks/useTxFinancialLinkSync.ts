"use client";

import { useEffect } from "react";
import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * Personel gider akışı (financial link picker) için form alanı sync efektleri.
 *
 *  1) Personel değişince expenseFinancialLink (adv:/sal:) temizlenir.
 *  2) Avans/maaş pick gerekmezse expenseLinkPersonnelId temizlenir.
 *  3) Personel kart context'i (default linked id varsa) → expenseLinkPersonnelId
 *     otomatik o ID'ye set edilir.
 *  4) Advance pick aktif değilse advanceExpenseMode "existing" + effectiveYear "" reset.
 *  5) Advance mode değişince expenseFinancialLink temizlenir.
 *  6) Yeni avans (new_register) modu + open + effectiveYear boşsa default veya
 *     takvim yılı yazılır.
 */
export type UseTxFinancialLinkSyncInput = {
  open: boolean;
  expenseLinkPersonnelWatch: string | null | undefined;
  advanceExpenseModeWatch: string | null | undefined;
  categoryWatch: string | null | undefined;
  needsExpenseFinancialPersonnelPick: boolean;
  needsExpenseAdvancePick: boolean;
  needsExpenseAdvanceNewRegister: boolean;
  personnelLinkedExpenseContext: boolean;
  defaultLinkedPersonnelId: number | undefined;
  defaultEffectiveYear: number | undefined;
  setValue: UseFormSetValue<TxFormValues>;
  getValues: UseFormGetValues<TxFormValues>;
};

export function useTxFinancialLinkSync(input: UseTxFinancialLinkSyncInput): void {
  const {
    open,
    expenseLinkPersonnelWatch,
    advanceExpenseModeWatch,
    categoryWatch,
    needsExpenseFinancialPersonnelPick,
    needsExpenseAdvancePick,
    needsExpenseAdvanceNewRegister,
    personnelLinkedExpenseContext,
    defaultLinkedPersonnelId,
    defaultEffectiveYear,
    setValue,
    getValues,
  } = input;

  useEffect(() => {
    setValue("expenseFinancialLink", "");
  }, [expenseLinkPersonnelWatch, setValue]);

  useEffect(() => {
    if (!needsExpenseFinancialPersonnelPick) setValue("expenseLinkPersonnelId", "");
  }, [needsExpenseFinancialPersonnelPick, setValue]);

  useEffect(() => {
    if (
      !needsExpenseFinancialPersonnelPick ||
      !personnelLinkedExpenseContext ||
      defaultLinkedPersonnelId == null ||
      defaultLinkedPersonnelId <= 0
    )
      return;
    setValue("expenseLinkPersonnelId", String(defaultLinkedPersonnelId));
  }, [
    needsExpenseFinancialPersonnelPick,
    personnelLinkedExpenseContext,
    defaultLinkedPersonnelId,
    categoryWatch,
    setValue,
  ]);

  useEffect(() => {
    if (!needsExpenseAdvancePick) {
      setValue("advanceExpenseMode", "existing");
      setValue("effectiveYear", "");
    }
  }, [needsExpenseAdvancePick, setValue]);

  useEffect(() => {
    setValue("expenseFinancialLink", "");
  }, [advanceExpenseModeWatch, setValue]);

  useEffect(() => {
    if (!open || !needsExpenseAdvanceNewRegister) return;
    const cur = getValues("effectiveYear");
    if (String(cur ?? "").trim()) return;
    const y =
      defaultEffectiveYear != null &&
      defaultEffectiveYear >= 1900 &&
      defaultEffectiveYear <= 9999
        ? defaultEffectiveYear
        : new Date().getFullYear();
    setValue("effectiveYear", String(y));
  }, [open, needsExpenseAdvanceNewRegister, defaultEffectiveYear, getValues, setValue]);
}
