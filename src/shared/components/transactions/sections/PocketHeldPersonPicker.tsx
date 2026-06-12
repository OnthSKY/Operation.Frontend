"use client";

import type { ControllerRenderProps, FieldErrors } from "react-hook-form";
import { useI18n } from "@/i18n/context";
import { Select } from "@/shared/ui/Select";
import type { SelectOption } from "@/shared/ui/Select";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * OUT giderinde ödeme kaynağı PERSONNEL_POCKET veya PERSONNEL_HELD_REGISTER_CASH
 * seçildiğinde altta açılan personel seçici.
 *
 * - POCKET: aynı kişi listesi (held register varsa held listesi, yoksa standart).
 * - HELD: yalnız zimmetinde net kasa parası olanlar.
 */
export type PocketHeldPersonPickerProps = {
  /** Form'daki seçili expensePaymentSource (watch). */
  expensePaymentSource: string | null | undefined;
  field: ControllerRenderProps<TxFormValues, "expensePocketPersonnelId">;
  pocketOptions: SelectOption[];
  heldOptions: SelectOption[];
  /** Çoklu şube agregasyonu açıkken POCKET picker'da yüklenme bekleyebilir. */
  acrossBranchesEnabled: boolean;
  heldPickerLoading: boolean;
  /** Tarih boşken HELD picker farklı uyarı gösterir. */
  asOfDateYmd: string;
  /** Personel gideri akışında ipucu metnini gösterir (HELD seçildiğinde). */
  personnelExpenseFlow?: boolean;
  errors: FieldErrors<TxFormValues>;
};

export function PocketHeldPersonPicker(props: PocketHeldPersonPickerProps) {
  const { t } = useI18n();
  const {
    expensePaymentSource,
    field,
    pocketOptions,
    heldOptions,
    acrossBranchesEnabled,
    heldPickerLoading,
    asOfDateYmd,
    personnelExpenseFlow,
    errors,
  } = props;

  const src = String(expensePaymentSource ?? "").trim().toUpperCase();

  if (src === "PERSONNEL_POCKET") {
    const disabled = acrossBranchesEnabled && heldPickerLoading;
    return (
      <>
        <div className="min-w-0 lg:col-span-2">
          <Select
            label={t("branch.expensePocketPersonLabel")}
            labelRequired
            options={pocketOptions}
            name={field.name}
            value={String(field.value ?? "")}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={field.onBlur}
            ref={field.ref}
            error={errors.expensePocketPersonnelId?.message}
            disabled={disabled}
          />
        </div>
        {disabled ? (
          <p className="text-xs leading-relaxed text-zinc-500 lg:col-span-2">
            {t("branch.expenseHeldRegisterPersonPickerLoading")}
          </p>
        ) : pocketOptions.length <= 1 ? (
          <p className="text-xs leading-relaxed text-amber-900 lg:col-span-2">
            {acrossBranchesEnabled
              ? t("branch.expenseHeldRegisterPersonPickerEmpty")
              : t("branch.cashSettlementResponsibleEmpty")}
          </p>
        ) : null}
      </>
    );
  }

  if (src === "PERSONNEL_HELD_REGISTER_CASH") {
    return (
      <>
        <div className="min-w-0 lg:col-span-2">
          <Select
            label={t("branch.expenseHeldRegisterPersonLabel")}
            labelRequired
            options={heldOptions}
            name={field.name}
            value={String(field.value ?? "")}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={field.onBlur}
            ref={field.ref}
            error={errors.expensePocketPersonnelId?.message}
            disabled={heldPickerLoading}
          />
        </div>
        {heldPickerLoading ? (
          <p className="text-xs leading-relaxed text-zinc-500 lg:col-span-2">
            {t("branch.expenseHeldRegisterPersonPickerLoading")}
          </p>
        ) : heldOptions.length <= 1 ? (
          <p className="text-xs leading-relaxed text-amber-900 lg:col-span-2">
            {!asOfDateYmd
              ? t("branch.expenseHeldRegisterPersonPickerNeedDate")
              : t("branch.expenseHeldRegisterPersonPickerEmpty")}
          </p>
        ) : personnelExpenseFlow ? (
          <p className="text-xs leading-snug text-zinc-500 lg:col-span-2">
            {t("branch.expenseHeldRegisterPickerCrossBranchHint")}
          </p>
        ) : null}
      </>
    );
  }

  return null;
}
