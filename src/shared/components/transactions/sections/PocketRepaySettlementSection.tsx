"use client";

import type { ControllerRenderProps, FieldErrors } from "react-hook-form";
import { useI18n } from "@/i18n/context";
import { Select } from "@/shared/ui/Select";
import type { SelectOption } from "@/shared/ui/Select";
import type { Locale } from "@/i18n/messages";
import { PersonnelPocketPriorLinesPicker } from "@/modules/branch/components/PersonnelPocketPriorLinesPicker";
import { DEFAULT_CURRENCY } from "@/shared/lib/iso4217-currencies";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * OUT_PERSONNEL_POCKET_REPAY akışı: kasa veya patron tarafından personelin cep
 * borcunu kapatma. İki bölüm:
 *   1) Personel seçici (kimin cep borcu kapatılıyor)
 *   2) Borç kapatma için seçilen önceki cep giderleri picker'ı (tutarı + currency'i kilitler)
 *
 * Sadece umbrella POCKET_REPAY + ödeme kaynağı REGISTER/PATRON iken render eder;
 * aksi halde null döner. Caller görünürlük kararı vermek zorunda değil.
 */
export type PocketRepaySettlementSectionProps = {
  umbrellaActive: boolean;
  expensePaymentSource: string | null | undefined;
  field: ControllerRenderProps<TxFormValues, "expensePocketPersonnelId">;
  branchStaffOptions: SelectOption[];
  errors: FieldErrors<TxFormValues>;
  // Önceki cep giderleri picker:
  personnelId: number;
  resolvedBranchId: number | null;
  modalOpen: boolean;
  locale: Locale;
  formCurrencyCode: string;
  onSettlementChange: (ids: number[], sum: number, currencyOk: boolean) => void;
};

export function PocketRepaySettlementSection(props: PocketRepaySettlementSectionProps) {
  const { t } = useI18n();
  const {
    umbrellaActive,
    expensePaymentSource,
    field,
    branchStaffOptions,
    errors,
    personnelId,
    resolvedBranchId,
    modalOpen,
    locale,
    formCurrencyCode,
    onSettlementChange,
  } = props;

  const src = String(expensePaymentSource ?? "").trim().toUpperCase();
  const visible = umbrellaActive && (src === "REGISTER" || src === "PATRON");
  if (!visible) return null;

  return (
    <>
      <div className="mt-2 min-w-0 lg:col-span-2">
        <Select
          label={t("branch.expensePocketRepayPersonLabel")}
          labelRequired
          options={branchStaffOptions}
          name={field.name}
          value={String(field.value ?? "")}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={field.onBlur}
          ref={field.ref}
          error={errors.expensePocketPersonnelId?.message}
        />
      </div>
      {branchStaffOptions.length <= 1 ? (
        <p className="text-xs leading-relaxed text-amber-900 lg:col-span-2">
          {t("branch.cashSettlementResponsibleEmpty")}
        </p>
      ) : null}

      {personnelId > 0 ? (
        <div className="mt-2 min-w-0 lg:col-span-2">
          <PersonnelPocketPriorLinesPicker
            branchId={resolvedBranchId ?? 0}
            personnelId={personnelId}
            enabled={modalOpen && umbrellaActive && personnelId > 0}
            excludeSettledPocketExpenses={true}
            locale={locale}
            t={t}
            formCurrencyCode={formCurrencyCode || DEFAULT_CURRENCY}
            onSettlementChange={onSettlementChange}
          />
        </div>
      ) : null}
    </>
  );
}
