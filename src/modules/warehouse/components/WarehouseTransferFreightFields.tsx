"use client";

import { useI18n } from "@/i18n/context";
import { Input } from "@/shared/ui/Input";
import type { SelectOption } from "@/shared/ui/Select";
import { Select } from "@/shared/ui/Select";
import { useMemo } from "react";

export type WarehouseFreightPaymentSource = "REGISTER" | "PATRON" | "PERSONNEL_POCKET";

type Props = {
  freightAmount: string;
  onFreightAmountChange: (v: string) => void;
  freightPaymentSource: WarehouseFreightPaymentSource;
  onFreightPaymentSourceChange: (v: WarehouseFreightPaymentSource) => void;
  freightPocketPersonnelId: string;
  onFreightPocketPersonnelIdChange: (v: string) => void;
  freightNote: string;
  onFreightNoteChange: (v: string) => void;
  personnelSelectOptions: SelectOption[];
  disabled: boolean;
};

export function WarehouseTransferFreightFields({
  freightAmount,
  onFreightAmountChange,
  freightPaymentSource,
  onFreightPaymentSourceChange,
  freightPocketPersonnelId,
  onFreightPocketPersonnelIdChange,
  freightNote,
  onFreightNoteChange,
  personnelSelectOptions,
  disabled,
}: Props) {
  const { t } = useI18n();
  const fr = Number(freightAmount.replace(",", "."));
  const freightActive = Number.isFinite(fr) && fr > 0;

  const payOptions = useMemo<SelectOption[]>(
    () => [
      { value: "REGISTER", label: t("branch.expensePayRegister") },
      { value: "PATRON", label: t("branch.expensePayPatron") },
      { value: "PERSONNEL_POCKET", label: t("branch.expensePayPersonnelPocket") },
    ],
    [t]
  );

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white px-3 py-3">
      <p className="text-sm font-medium text-zinc-800">{t("warehouse.transferFreightSection")}</p>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        label={t("warehouse.transferFreightAmount")}
        value={freightAmount}
        onChange={(e) => onFreightAmountChange(e.target.value)}
        disabled={disabled}
      />
      {freightActive ? (
        <>
          <Select
            label={t("warehouse.transferFreightPaymentSource")}
            labelRequired
            name="wh-transfer-freight-pay"
            options={payOptions}
            value={freightPaymentSource}
            onChange={(e) =>
              onFreightPaymentSourceChange(e.target.value as WarehouseFreightPaymentSource)
            }
            onBlur={() => {}}
            disabled={disabled}
          />
          {freightPaymentSource === "PERSONNEL_POCKET" ? (
            <Select
              label={t("warehouse.transferFreightPocketPersonnel")}
              labelRequired
              name="wh-transfer-freight-pocket"
              options={personnelSelectOptions}
              value={freightPocketPersonnelId}
              onChange={(e) => onFreightPocketPersonnelIdChange(e.target.value)}
              onBlur={() => {}}
              disabled={disabled}
            />
          ) : null}
        </>
      ) : null}
      <Input
        type="text"
        autoComplete="off"
        label={t("warehouse.transferFreightNote")}
        placeholder={t("warehouse.transferFreightNotePlaceholder")}
        value={freightNote}
        onChange={(e) => onFreightNoteChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
