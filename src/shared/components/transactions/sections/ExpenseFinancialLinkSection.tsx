"use client";

import type { ControllerRenderProps, UseFormRegisterReturn, UseFormSetValue } from "react-hook-form";
import { useI18n } from "@/i18n/context";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import type { SelectOption } from "@/shared/ui/Select";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type { Locale } from "@/i18n/messages";
import type {
  ExpenseLinkAdvanceOption,
  ExpenseLinkSalaryPaymentOption,
} from "@/modules/branch/api/branches-api";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * Personel gider akışında «mevcut avans veya maaş ödemesini bağla» seçici grubu.
 * Üç alt bölüm:
 *   - Advance mode toggle (var olan / yeni avans yarat)
 *   - Var olan avans dropdown (advance picker)
 *   - Yeni avans için effective year input
 *   - Maaş/prim picker (advance picker'la aynı form alanını paylaşır)
 *
 * Tüm görünürlük caller'ın `needs…` flag'leri ile kontrol edilir.
 */
export type ExpenseFinancialLinkSectionProps = {
  needsAdvancePick: boolean;
  needsAdvanceExisting: boolean;
  needsAdvanceNewRegister: boolean;
  needsSalaryPick: boolean;
  useOrgExpenseLinks: boolean;
  advanceModeField: ControllerRenderProps<TxFormValues, "advanceExpenseMode">;
  finLinkField: ControllerRenderProps<TxFormValues, "expenseFinancialLink">;
  effectiveYearReg: UseFormRegisterReturn;
  advanceOptions: SelectOption[];
  salaryOptions: SelectOption[];
  advances: ExpenseLinkAdvanceOption[];
  salaries: ExpenseLinkSalaryPaymentOption[];
  advFetching: boolean;
  salaryFetching: boolean;
  linkPidNum: number;
  setValue: UseFormSetValue<TxFormValues>;
  locale: Locale;
};

export function ExpenseFinancialLinkSection(props: ExpenseFinancialLinkSectionProps) {
  const { t } = useI18n();
  const {
    needsAdvancePick,
    needsAdvanceExisting,
    needsAdvanceNewRegister,
    needsSalaryPick,
    useOrgExpenseLinks,
    advanceModeField,
    finLinkField,
    effectiveYearReg,
    advanceOptions,
    salaryOptions,
    advances,
    salaries,
    advFetching,
    salaryFetching,
    linkPidNum,
    setValue,
    locale,
  } = props;

  const onAdvanceLinkChange = (v: string) => {
    finLinkField.onChange(v);
    if (v.startsWith("adv:")) {
      const id = parseInt(v.slice(4), 10);
      const row = advances.find((x) => x.id === id);
      if (row) {
        setValue("amount", formatLocaleAmount(row.amount, locale, row.currencyCode));
        setValue("currencyCode", row.currencyCode);
      }
    }
  };

  const onSalaryLinkChange = (v: string) => {
    finLinkField.onChange(v);
    if (v.startsWith("sal:")) {
      const id = parseInt(v.slice(4), 10);
      const row = salaries.find((x) => x.id === id);
      if (row) {
        setValue("amount", formatLocaleAmount(row.amount, locale, row.currencyCode));
        setValue("currencyCode", row.currencyCode);
      }
    }
  };

  return (
    <>
      {needsAdvancePick ? (
        <>
          <div className="min-w-0 lg:col-span-2">
            <Select
              label={t("branch.txAdvanceModeLabel")}
              options={
                useOrgExpenseLinks
                  ? [{ value: "existing", label: t("branch.txAdvanceModeExisting") }]
                  : [
                      { value: "existing", label: t("branch.txAdvanceModeExisting") },
                      { value: "new_register", label: t("branch.txAdvanceModeNew") },
                    ]
              }
              name={advanceModeField.name}
              value={String(advanceModeField.value ?? "existing")}
              onChange={(e) => advanceModeField.onChange(e.target.value)}
              onBlur={advanceModeField.onBlur}
              ref={advanceModeField.ref}
            />
          </div>

          {needsAdvanceExisting ? (
            <div className="min-w-0 lg:col-span-2">
              <Select
                label={t("branch.txExpenseLinkAdvance")}
                labelRequired
                options={[
                  { value: "", label: t("branch.txExpenseLinkPick") },
                  ...advanceOptions,
                ]}
                name={finLinkField.name}
                value={String(finLinkField.value ?? "")}
                onChange={(e) => onAdvanceLinkChange(e.target.value)}
                onBlur={finLinkField.onBlur}
                ref={finLinkField.ref}
                disabled={linkPidNum <= 0 || (advFetching && advanceOptions.length === 0)}
              />
              {advFetching ? (
                <p className="mt-1 text-xs text-zinc-500">{t("common.loading")}</p>
              ) : null}
              {!advFetching && advanceOptions.length === 0 ? (
                <p className="mt-1 text-xs text-amber-800">
                  {linkPidNum <= 0
                    ? t("branch.txExpenseLinkPickPersonnelFirst")
                    : t("branch.txExpenseLinkEmpty")}
                </p>
              ) : null}
            </div>
          ) : null}

          {needsAdvanceNewRegister ? (
            <div className="min-w-0 space-y-2 rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 lg:col-span-2">
              <p className="text-xs leading-relaxed text-zinc-600 sm:text-sm">
                {t("branch.txAdvanceNewHint")}
              </p>
              <Input
                label={t("branch.txAdvanceEffectiveYear")}
                type="number"
                inputMode="numeric"
                min={1990}
                max={2100}
                autoComplete="off"
                name={effectiveYearReg.name}
                ref={effectiveYearReg.ref}
                onChange={effectiveYearReg.onChange}
                onBlur={effectiveYearReg.onBlur}
              />
            </div>
          ) : null}
        </>
      ) : null}

      {needsSalaryPick ? (
        <div className="min-w-0 lg:col-span-2">
          <Select
            label={t("branch.txExpenseLinkSalary")}
            labelRequired
            options={[
              { value: "", label: t("branch.txExpenseLinkPick") },
              ...salaryOptions,
            ]}
            name={finLinkField.name}
            value={String(finLinkField.value ?? "")}
            onChange={(e) => onSalaryLinkChange(e.target.value)}
            onBlur={finLinkField.onBlur}
            ref={finLinkField.ref}
            disabled={linkPidNum <= 0 || (salaryFetching && salaryOptions.length === 0)}
          />
          {salaryFetching ? (
            <p className="mt-1 text-xs text-zinc-500">{t("common.loading")}</p>
          ) : null}
          {!salaryFetching && salaryOptions.length === 0 ? (
            <p className="mt-1 text-xs text-amber-800">
              {linkPidNum <= 0
                ? t("branch.txExpenseLinkPickPersonnelFirst")
                : t("branch.txExpenseLinkEmpty")}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
