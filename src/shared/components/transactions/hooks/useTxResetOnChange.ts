"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { UseFormSetValue } from "react-hook-form";
import {
  resetTxFieldsOnMainCategoryChange,
  resetTxFieldsOnTypeChange,
} from "../lib/tx-field-resets";
import type { TxFormValues } from "../lib/tx-form-types";
import type { UseDayCloseBundleApi } from "./useDayCloseBundle";
import type { UsePocketRepaySettlementApi } from "./usePocketRepaySettlement";

/**
 * txType veya mainCategory değiştiğinde form alanlarını otomatik reset eder.
 *
 *  - txType değişimi: tüm alanları sıfırla + dayCloseBundle.clearLines + pocketRepay.reset +
 *    makbuz dosyasını ve preview'u temizle.
 *  - mainCategory değişimi: sadece kategoriye bağlı alt alanları sıfırla.
 *
 * `prev*` ref'leri caller'dan gelir; modal başka yerde de (open reset etkisi) günceller.
 */
export type UseTxResetOnChangeInput = {
  txType: string;
  mainCategoryWatch: string | null | undefined;
  setValue: UseFormSetValue<TxFormValues>;
  dayCloseBundle: UseDayCloseBundleApi;
  pocketRepay: UsePocketRepaySettlementApi;
  receiptPhotoRef: RefObject<HTMLInputElement | null>;
  setReceiptPhotoPick: Dispatch<SetStateAction<File | null>>;
  prevTypeRef: MutableRefObject<string>;
  prevMainRef: MutableRefObject<string>;
};

export function useTxResetOnChange(input: UseTxResetOnChangeInput): void {
  const {
    txType,
    mainCategoryWatch,
    setValue,
    dayCloseBundle,
    pocketRepay,
    receiptPhotoRef,
    setReceiptPhotoPick,
    prevTypeRef,
    prevMainRef,
  } = input;

  useEffect(() => {
    if (prevTypeRef.current === txType) return;
    resetTxFieldsOnTypeChange(setValue);
    dayCloseBundle.clearLines();
    pocketRepay.reset();
    if (receiptPhotoRef.current) receiptPhotoRef.current.value = "";
    setReceiptPhotoPick(null);
    prevTypeRef.current = txType;
    // dayCloseBundle / pocketRepay referansları useDayCloseBundle / usePocketRepaySettlement
    // hook'larından gelir (stable identity); inline objects yok.
  }, [txType, setValue, dayCloseBundle, pocketRepay, receiptPhotoRef, setReceiptPhotoPick, prevTypeRef]);

  useEffect(() => {
    if (prevMainRef.current === mainCategoryWatch) return;
    resetTxFieldsOnMainCategoryChange(setValue);
    dayCloseBundle.clearLines();
    pocketRepay.reset();
    prevMainRef.current = String(mainCategoryWatch ?? "");
  }, [mainCategoryWatch, setValue, dayCloseBundle, pocketRepay, prevMainRef]);
}

/** prev{Type|Main} ref'lerini caller'da kolayca üretmek için yardımcı. */
export function useTxPrevRefs(): {
  prevType: MutableRefObject<string>;
  prevMain: MutableRefObject<string>;
} {
  const prevType = useRef<string>("");
  const prevMain = useRef<string>("");
  return { prevType, prevMain };
}
