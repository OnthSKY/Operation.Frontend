"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { UseFormReset } from "react-hook-form";
import { computeTxOpenResetState } from "../lib/tx-open-reset";
import type { TxFormValues, TxModalProps } from "../lib/tx-form-types";
import type { UseDayCloseBundleApi } from "./useDayCloseBundle";
import type { UsePocketRepaySettlementApi } from "./usePocketRepaySettlement";

/**
 * Modal her açıldığında (`open=true`) form'u props'lardan türetilmiş başlangıç state'ine
 * sıfırlar. Aynı zamanda dayCloseBundle, pocketRepay, makbuz dosyasını da temizler ve
 * prev{Type|Main}Ref'leri günceller.
 *
 * Pure computation `computeTxOpenResetState` ile saf hesaplama; bu hook yalnız side-effect.
 */
export type UseTxOpenResetInput = Pick<
  TxModalProps,
  | "open"
  | "defaultType"
  | "defaultMainCategory"
  | "defaultTransactionDate"
  | "defaultPocketRepayPersonnelId"
  | "defaultPocketRepayCurrencyCode"
  | "defaultExpensePaymentSource"
  | "defaultPocketClaimFromPersonnelId"
  | "defaultCategory"
  | "defaultSettlesCashHandoverTransactionId"
  | "defaultHandoverSettleKind"
  | "defaultHandoverCurrencyCode"
  | "defaultHandoverMaxAmount"
  | "defaultHandoverPoolTotalOnly"
  | "defaultLinkedPersonnelId"
  | "defaultEffectiveYear"
  | "personnelDirectExpenseEntry"
> & {
  orgMode: boolean;
  propBranchId: number | null;
  reset: UseFormReset<TxFormValues>;
  dayCloseBundle: UseDayCloseBundleApi;
  pocketRepay: UsePocketRepaySettlementApi;
  receiptPhotoRef: RefObject<HTMLInputElement | null>;
  setReceiptPhotoPick: Dispatch<SetStateAction<File | null>>;
  prevTypeRef: MutableRefObject<string>;
  prevMainRef: MutableRefObject<string>;
};

export function useTxOpenReset(input: UseTxOpenResetInput): void {
  const {
    open,
    orgMode,
    propBranchId,
    defaultType,
    defaultMainCategory,
    defaultTransactionDate,
    defaultPocketRepayPersonnelId,
    defaultPocketRepayCurrencyCode,
    defaultExpensePaymentSource,
    defaultPocketClaimFromPersonnelId,
    defaultCategory,
    defaultSettlesCashHandoverTransactionId,
    defaultHandoverSettleKind,
    defaultHandoverCurrencyCode,
    defaultHandoverMaxAmount,
    defaultHandoverPoolTotalOnly,
    defaultLinkedPersonnelId,
    defaultEffectiveYear,
    personnelDirectExpenseEntry,
    reset,
    dayCloseBundle,
    pocketRepay,
    receiptPhotoRef,
    setReceiptPhotoPick,
    prevTypeRef,
    prevMainRef,
  } = input;

  // dayCloseBundle / pocketRepay / refs / setters: side-effect hedefleri, trigger değiller.
  // Identity'leri değişince effect'in tekrar tetiklenmesini istemiyoruz (sonsuz reset döngüsü).
  const sideEffectRef = useRef({
    dayCloseBundle,
    pocketRepay,
    receiptPhotoRef,
    setReceiptPhotoPick,
    prevTypeRef,
    prevMainRef,
  });
  sideEffectRef.current = {
    dayCloseBundle,
    pocketRepay,
    receiptPhotoRef,
    setReceiptPhotoPick,
    prevTypeRef,
    prevMainRef,
  };

  useEffect(() => {
    if (!open) return;
    const { values, nextType, nextMain } = computeTxOpenResetState({
      orgMode,
      propBranchId,
      defaultType,
      defaultMainCategory,
      defaultTransactionDate,
      defaultPocketRepayPersonnelId,
      defaultPocketRepayCurrencyCode,
      defaultExpensePaymentSource,
      defaultPocketClaimFromPersonnelId,
      defaultCategory,
      defaultSettlesCashHandoverTransactionId,
      defaultHandoverSettleKind,
      defaultHandoverCurrencyCode,
      defaultHandoverMaxAmount,
      defaultHandoverPoolTotalOnly,
      defaultLinkedPersonnelId,
      defaultEffectiveYear,
      personnelDirectExpenseEntry,
    });
    reset(values);
    const side = sideEffectRef.current;
    side.pocketRepay.reset();
    side.dayCloseBundle.clearAll();
    side.prevTypeRef.current = nextType;
    side.prevMainRef.current = nextMain;
    if (side.receiptPhotoRef.current) side.receiptPhotoRef.current.value = "";
    side.setReceiptPhotoPick(null);
  }, [
    open,
    reset,
    defaultTransactionDate,
    defaultType,
    orgMode,
    propBranchId,
    defaultPocketRepayPersonnelId,
    defaultPocketRepayCurrencyCode,
    defaultExpensePaymentSource,
    defaultPocketClaimFromPersonnelId,
    defaultCategory,
    defaultSettlesCashHandoverTransactionId,
    defaultHandoverSettleKind,
    defaultHandoverCurrencyCode,
    defaultHandoverMaxAmount,
    defaultHandoverPoolTotalOnly,
    defaultLinkedPersonnelId,
    defaultMainCategory,
    defaultEffectiveYear,
    personnelDirectExpenseEntry,
  ]);
}
