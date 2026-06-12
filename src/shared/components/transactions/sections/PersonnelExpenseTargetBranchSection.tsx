"use client";

import type { ControllerRenderProps, FieldErrors } from "react-hook-form";
import { useI18n } from "@/i18n/context";
import { Select } from "@/shared/ui/Select";
import type { SelectOption } from "@/shared/ui/Select";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * Personel gider akışında (`personnelExpenseFlow`) "hangi şubenin kasasından"
 * sorusunu yöneten kart.
 *
 * - Şube preset edilmemişse (`canSelect=true`): seçici dropdown + düzenlenebilir hint.
 * - Şube zaten preset edilmişse: salt okunur şube adı + sabit hint.
 */
export type PersonnelExpenseTargetBranchSectionProps = {
  canSelect: boolean;
  field: ControllerRenderProps<TxFormValues, "personnelExpenseBranchId">;
  options: SelectOption[];
  /** Preset edilmiş şube adı (canSelect=false durumunda gösterilir). */
  resolvedBranchName: string;
  errors: FieldErrors<TxFormValues>;
};

export function PersonnelExpenseTargetBranchSection(
  props: PersonnelExpenseTargetBranchSectionProps
) {
  const { t } = useI18n();
  const { canSelect, field, options, resolvedBranchName, errors } = props;

  return (
    <div className="min-w-0 lg:col-span-2 rounded-lg border border-zinc-200 bg-zinc-50/90 px-3 py-2.5">
      {canSelect ? (
        <>
          <Select
            label={t("branch.txExpenseTargetBranchLabel")}
            options={options}
            name={field.name}
            value={String(field.value ?? "")}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={field.onBlur}
            ref={field.ref}
            error={errors.personnelExpenseBranchId?.message}
          />
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {t("branch.txExpenseTargetBranchHintEditable")}
          </p>
        </>
      ) : (
        <>
          <p className="text-xs font-medium text-zinc-500">
            {t("branch.txExpenseTargetBranchLabel")}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-900">
            {resolvedBranchName || t("branch.txExpenseTargetBranchUnknown")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {t("branch.txExpenseTargetBranchHintFixed")}
          </p>
        </>
      )}
    </div>
  );
}
