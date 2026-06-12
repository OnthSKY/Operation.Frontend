"use client";

import type { ControllerRenderProps, FieldErrors } from "react-hook-form";
import { useI18n } from "@/i18n/context";
import { Select } from "@/shared/ui/Select";
import type { SelectOption } from "@/shared/ui/Select";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * OUT_PERSONNEL_POCKET_CLAIM_TRANSFER: bir personelin cep alacağını başka bir personele
 * (veya PATRON'a) devretme akışı.
 *
 * - «From» personel her zaman seçilir (cep alacağı kimden devrediliyor).
 * - «To» personel sadece POCKET_CLAIM_TRANSFER alt akışında (PATRON'a değil).
 *
 * Caller'dan gelen kontrolün doğru olduğunu varsayar; sadece görünür olduğunda render eder.
 */
export type PocketClaimTransferSectionProps = {
  /** Alt kategori (POCKET_CLAIM_TRANSFER | POCKET_CLAIM_TRANSFER_TO_PATRON). */
  subCategory: string | null | undefined;
  branchStaffOptions: SelectOption[];
  fromField: ControllerRenderProps<TxFormValues, "pocketClaimFromPersonnelId">;
  toField: ControllerRenderProps<TxFormValues, "expensePocketPersonnelId">;
  errors: FieldErrors<TxFormValues>;
};

export function PocketClaimTransferSection(props: PocketClaimTransferSectionProps) {
  const { t } = useI18n();
  const { subCategory, branchStaffOptions, fromField, toField, errors } = props;

  const toPatron =
    String(subCategory ?? "").trim().toUpperCase() === "POCKET_CLAIM_TRANSFER_TO_PATRON";

  return (
    <div className="min-w-0 space-y-3 lg:col-span-2">
      <p className="text-xs leading-relaxed text-zinc-600">
        {t("branch.txPocketClaimTransferModalHint")}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label={t("branch.txPocketClaimTransferFromLabel")}
          labelRequired
          options={branchStaffOptions}
          name={fromField.name}
          value={String(fromField.value ?? "")}
          onChange={(e) => fromField.onChange(e.target.value)}
          onBlur={fromField.onBlur}
          ref={fromField.ref}
          error={errors.pocketClaimFromPersonnelId?.message}
        />
        {!toPatron ? (
          <Select
            label={t("branch.txPocketClaimTransferToLabel")}
            labelRequired
            options={branchStaffOptions}
            name={toField.name}
            value={String(toField.value ?? "")}
            onChange={(e) => toField.onChange(e.target.value)}
            onBlur={toField.onBlur}
            ref={toField.ref}
            error={errors.expensePocketPersonnelId?.message}
          />
        ) : null}
      </div>
      {branchStaffOptions.length <= 1 ? (
        <p className="text-xs leading-relaxed text-amber-900">
          {t("branch.cashSettlementResponsibleEmpty")}
        </p>
      ) : null}
    </div>
  );
}
