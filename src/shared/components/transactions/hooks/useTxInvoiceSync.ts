"use client";

import { useEffect } from "react";
import type { UseFormSetValue, UseFormTrigger } from "react-hook-form";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * Tedarikçi fatura satırı (OUT_OPS_INVOICE) için form alanı senkronizasyonu:
 *
 *  1) Invoice satırı değilse `invoicePaymentStatus` boş; satır ise ve değer yoksa default UNPAID.
 *  2) UNPAID iken `expensePaymentSource` + `expensePocketPersonnelId` otomatik temizlenir.
 *  3) UNPAID flag'i değişince ilgili alanların validasyonu re-trigger edilir.
 */
export type UseTxInvoiceSyncInput = {
  isInvoiceOpsLine: boolean;
  isInvoiceUnpaid: boolean;
  invoicePaymentWatch: string | null | undefined;
  setValue: UseFormSetValue<TxFormValues>;
  trigger: UseFormTrigger<TxFormValues>;
};

export function useTxInvoiceSync(input: UseTxInvoiceSyncInput): void {
  const { isInvoiceOpsLine, isInvoiceUnpaid, invoicePaymentWatch, setValue, trigger } = input;

  // 1) Invoice satırı yoksa status boş; varsa ve değer yoksa UNPAID default.
  useEffect(() => {
    if (!isInvoiceOpsLine) {
      setValue("invoicePaymentStatus", "");
      return;
    }
    if (!String(invoicePaymentWatch ?? "").trim()) {
      setValue("invoicePaymentStatus", "UNPAID");
    }
  }, [isInvoiceOpsLine, invoicePaymentWatch, setValue]);

  // 2) UNPAID iken ödeme kaynağı + cep personel id'yi temizle.
  useEffect(() => {
    if (!isInvoiceUnpaid) return;
    setValue("expensePaymentSource", "");
    setValue("expensePocketPersonnelId", "");
  }, [isInvoiceUnpaid, setValue]);

  // 3) UNPAID değişince ilgili alanların validasyonunu re-tetikle.
  useEffect(() => {
    void trigger("expensePaymentSource");
  }, [isInvoiceUnpaid, trigger]);

  useEffect(() => {
    void trigger("invoicePaymentStatus");
  }, [isInvoiceOpsLine, trigger]);
}
