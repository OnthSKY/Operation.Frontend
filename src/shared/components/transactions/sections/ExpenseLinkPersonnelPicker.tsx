"use client";

import type { ControllerRenderProps } from "react-hook-form";
import { useI18n } from "@/i18n/context";
import { Select } from "@/shared/ui/Select";
import type { SelectOption } from "@/shared/ui/Select";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * Personel gider akışı için «hangi personel?» seçici.
 *
 * Modal'da iki ayrı yerde kullanılır: financial-link-personnel ve direct-personnel-pick.
 * Tek seçici komponente birleştirildi — kullanım yeri caller'ın görünürlük koşuluyla belirlenir.
 */
export type ExpenseLinkPersonnelPickerProps = {
  field: ControllerRenderProps<TxFormValues, "expenseLinkPersonnelId">;
  options: SelectOption[];
};

export function ExpenseLinkPersonnelPicker({
  field,
  options,
}: ExpenseLinkPersonnelPickerProps) {
  const { t } = useI18n();
  return (
    <div className="min-w-0 lg:col-span-2">
      <Select
        label={t("branch.txExpenseLinkPersonnelLabel")}
        labelRequired
        options={options}
        name={field.name}
        value={String(field.value ?? "")}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        ref={field.ref}
      />
      {options.length <= 1 ? (
        <p className="mt-1 text-xs text-amber-800">
          {t("branch.cashSettlementResponsibleEmpty")}
        </p>
      ) : null}
    </div>
  );
}
