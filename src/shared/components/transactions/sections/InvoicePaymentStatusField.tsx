"use client";

import type { ControllerRenderProps, FieldErrors } from "react-hook-form";
import { useI18n } from "@/i18n/context";
import { Select } from "@/shared/ui/Select";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * Tedarikçi faturası satırı (`OUT_OPS_INVOICE` / OUT_OPS + OPS_INVOICE) için ödeme durumu
 * (UNPAID / PAID) seçici.
 */
export type InvoicePaymentStatusFieldProps = {
  field: ControllerRenderProps<TxFormValues, "invoicePaymentStatus">;
  errors: FieldErrors<TxFormValues>;
};

export function InvoicePaymentStatusField({ field, errors }: InvoicePaymentStatusFieldProps) {
  const { t } = useI18n();
  return (
    <div className="min-w-0 lg:col-span-2">
      <Select
        label={t("branch.invoicePaymentStatusLabel")}
        labelRequired
        options={[
          { value: "", label: t("branch.txSelectPlaceholder") },
          { value: "UNPAID", label: t("branch.invoicePaymentUnpaid") },
          { value: "PAID", label: t("branch.invoicePaymentPaid") },
        ]}
        name={field.name}
        value={String(field.value ?? "")}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        ref={field.ref}
        error={errors.invoicePaymentStatus?.message}
      />
    </div>
  );
}
