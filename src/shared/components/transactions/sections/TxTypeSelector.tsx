"use client";

import type { ControllerRenderProps, FieldErrors } from "react-hook-form";
import { useI18n } from "@/i18n/context";
import { Select } from "@/shared/ui/Select";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * IN / OUT type seçici (orgMode/personel akışta OUT'a kilitli).
 *
 * Modal grid içinde kullanılır; col-span-2 layout. Görsel olarak en üstteki form alanı.
 */
export type TxTypeSelectorProps = {
  field: ControllerRenderProps<TxFormValues, "type">;
  orgMode: boolean;
  personnelExpenseFlow: boolean;
  errors: FieldErrors<TxFormValues>;
};

export function TxTypeSelector(props: TxTypeSelectorProps) {
  const { t } = useI18n();
  const { field, orgMode, personnelExpenseFlow, errors } = props;

  const locked = orgMode || personnelExpenseFlow;
  const options = locked
    ? [{ value: "OUT", label: t("branch.txTypeOut") }]
    : [
        { value: "IN", label: t("branch.txTypeIn") },
        { value: "OUT", label: t("branch.txTypeOut") },
      ];

  return (
    <div className="min-w-0">
      <Select
        label={t("branch.txType")}
        labelRequired
        options={options}
        name={field.name}
        value={String(field.value ?? "IN")}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        ref={field.ref}
        disabled={locked}
        error={errors.type?.message}
      />
    </div>
  );
}
