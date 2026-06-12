"use client";

import type { ControllerRenderProps, FieldErrors } from "react-hook-form";
import { useI18n } from "@/i18n/context";
import { Select } from "@/shared/ui/Select";
import type { SelectOption } from "@/shared/ui/Select";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * Ana kategori + alt kategori select çifti + routing uyarısı.
 *
 *  - Ana kategori personel akışında otomatik gizlenir (`hideMain=true`).
 *  - Routing hint (örn. OUT_PERSONNEL umbrella seçildiğinde "personel modülünden gir" uyarısı)
 *    `routingHintKey` doluysa amber callout olarak gösterilir.
 *  - Alt kategori sadece `needsSubCategory=true` iken çıkar; `mainCategoryValue` boşken disable olur.
 */
export type MainAndSubCategorySelectsProps = {
  hideMain: boolean;
  mainField: ControllerRenderProps<TxFormValues, "mainCategory">;
  mainOptions: SelectOption[];
  /** i18n key veya null. */
  routingHintKey: string | null | undefined;
  needsSubCategory: boolean;
  subField: ControllerRenderProps<TxFormValues, "category">;
  subOptions: SelectOption[];
  mainCategoryValue: string | null | undefined;
  errors: FieldErrors<TxFormValues>;
};

export function MainAndSubCategorySelects(props: MainAndSubCategorySelectsProps) {
  const { t } = useI18n();
  const {
    hideMain,
    mainField,
    mainOptions,
    routingHintKey,
    needsSubCategory,
    subField,
    subOptions,
    mainCategoryValue,
    errors,
  } = props;

  return (
    <>
      {!hideMain ? (
        <div className="min-w-0 lg:col-span-2">
          <Select
            label={t("branch.txMainCategory")}
            labelRequired
            options={mainOptions}
            name={mainField.name}
            value={String(mainField.value ?? "")}
            onChange={(e) => mainField.onChange(e.target.value)}
            onBlur={mainField.onBlur}
            ref={mainField.ref}
            error={errors.mainCategory?.message}
          />
        </div>
      ) : null}

      {routingHintKey ? (
        <div className="min-w-0 lg:col-span-2">
          <p className="rounded-lg border border-amber-200/75 bg-amber-50/55 px-3 py-2 text-xs leading-relaxed text-amber-950 sm:text-sm">
            {t(routingHintKey)}
          </p>
        </div>
      ) : null}

      {needsSubCategory ? (
        <div className="min-w-0 lg:col-span-2">
          <Select
            label={t("branch.txSubCategory")}
            labelRequired
            options={subOptions}
            name={subField.name}
            value={String(subField.value ?? "")}
            onChange={(e) => subField.onChange(e.target.value)}
            onBlur={subField.onBlur}
            ref={subField.ref}
            disabled={!mainCategoryValue}
            error={errors.category?.message}
          />
        </div>
      ) : null}
    </>
  );
}
