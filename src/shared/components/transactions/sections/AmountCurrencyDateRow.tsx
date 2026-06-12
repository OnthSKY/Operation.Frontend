"use client";

import type {
  ControllerFieldState,
  ControllerRenderProps,
  FieldErrors,
} from "react-hook-form";
import { useI18n } from "@/i18n/context";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { DateField } from "@/shared/ui/DateField";
import type { SelectOption } from "@/shared/ui/Select";
import { DEFAULT_CURRENCY } from "@/shared/lib/iso4217-currencies";
import { formatLocaleAmount, parseLocaleAmount } from "@/shared/lib/locale-amount";
import type { Locale } from "@/i18n/messages";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * Para birimi + tarih + (split olmadığı durumda) tek tutar inputu.
 *
 * - Tutar inputu `amountLocked=true` iken readOnly + alt yardım metni gösterir.
 * - Tutar blur'unda yerel para formatına normalize edilir.
 * - `splitActive=true` ise tek tutar inputu gizlenir (cash/card split AmountSplitFields'tan gelir).
 */
export type AmountCurrencyDateRowProps = {
  currencyField: ControllerRenderProps<TxFormValues, "currencyCode">;
  currencyOptions: SelectOption[];
  dateField: ControllerRenderProps<TxFormValues, "transactionDate">;
  dateFieldState: ControllerFieldState;
  amountField: ControllerRenderProps<TxFormValues, "amount">;
  amountLocked: boolean;
  /** Locked iken alt yardım metni: POCKET_REPAY akışı farklı hint gösterir. */
  isPocketRepaySettlementUmbrellaMain: boolean;
  /** Split mod aktif mi (IN cash/card)? — true ise tek tutar gizlenir. */
  splitActive: boolean;
  locale: Locale;
  errors: FieldErrors<TxFormValues>;
};

export function AmountCurrencyDateRow(props: AmountCurrencyDateRowProps) {
  const { t } = useI18n();
  const {
    currencyField,
    currencyOptions,
    dateField,
    dateFieldState,
    amountField,
    amountLocked,
    isPocketRepaySettlementUmbrellaMain,
    splitActive,
    locale,
    errors,
  } = props;

  return (
    <>
      <div className="min-w-0">
        <DateField
          ref={dateField.ref}
          label={t("branch.txDateField")}
          labelRequired
          mode="datetime-local"
          name={dateField.name}
          value={dateField.value}
          onChange={dateField.onChange}
          onBlur={dateField.onBlur}
          error={dateFieldState.error?.message}
        />
      </div>
      <div className="min-w-0">
        <Select
          label={t("branch.txCurrency")}
          labelRequired
          options={currencyOptions}
          name={currencyField.name}
          value={String(currencyField.value ?? DEFAULT_CURRENCY)}
          onChange={(e) => currencyField.onChange(e.target.value)}
          onBlur={currencyField.onBlur}
          ref={currencyField.ref}
          error={errors.currencyCode?.message}
          disabled={amountLocked && !isPocketRepaySettlementUmbrellaMain}
        />
      </div>
      {!splitActive ? (
        <div className="min-w-0 lg:col-span-2">
          <Input
            label={t("branch.txAmount")}
            labelRequired
            inputMode="decimal"
            autoComplete="off"
            readOnly={amountLocked}
            name={amountField.name}
            value={amountField.value}
            onChange={(e) => amountField.onChange(e.target.value)}
            onBlur={(e) => {
              if (amountLocked) {
                amountField.onBlur();
                return;
              }
              const n = parseLocaleAmount(e.target.value, locale);
              if (Number.isFinite(n) && n > 0) {
                amountField.onChange(
                  formatLocaleAmount(n, locale, String(currencyField.value ?? ""))
                );
              }
              amountField.onBlur();
            }}
            ref={amountField.ref}
            error={errors.amount?.message}
          />
          {amountLocked ? (
            <p className="mt-1 text-xs text-zinc-500">
              {isPocketRepaySettlementUmbrellaMain
                ? t("branch.pocketRepayAmountFromSelectionHint")
                : t("branch.txAmountLockedHint")}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
