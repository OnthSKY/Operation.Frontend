"use client";

import { useI18n } from "@/i18n/context";
import { Input } from "@/shared/ui/Input";
import { formatLocaleAmount, parseLocaleAmount } from "@/shared/lib/locale-amount";
import type { Locale } from "@/i18n/messages";
import type { UseFormRegisterReturn, UseFormSetValue } from "react-hook-form";
import type { TxFormValues } from "../lib/tx-form-types";

/**
 * IN (gelir) için nakit + kart kırılımı giriş alanları + toplam satırı.
 *
 * Blur sırasında değer yerel format'a normalize edilir
 * (örn. "1234,5" → "1.234,50 ₺").
 */
export type AmountSplitFieldsProps = {
  regCash: UseFormRegisterReturn;
  regCard: UseFormRegisterReturn;
  setValue: UseFormSetValue<TxFormValues>;
  /** Kullanıcı locale'i (TR vs EN ondalık ayırıcı). */
  locale: Locale;
  /** Şu anki para birimi (formatta gösterilir). */
  currencyCode: string;
  /** Nakit + kart > 0 olunca true; toplam satırı gösterilir. */
  splitActive: boolean;
  /** Toplam tutar (gösterim için). */
  splitTotal: number | null;
  /** Üstteki "nakit + kart önerilir" ipucunu gizle (day-close gibi compact ekranlar için). */
  hideHint?: boolean;
};

export function AmountSplitFields(props: AmountSplitFieldsProps) {
  const { t } = useI18n();
  const { regCash, regCard, setValue, locale, currencyCode, splitActive, splitTotal, hideHint } = props;

  return (
    <>
      {!hideHint ? (
        <p className="text-xs text-zinc-500 lg:col-span-2">
          {t("branch.txAmountSplitHint")}
        </p>
      ) : null}
      <div className="lg:col-span-2 grid grid-cols-2 gap-2 sm:gap-3">
        <div className="min-w-0">
          <Input
            label={t("branch.txAmountCash")}
            inputMode="decimal"
            autoComplete="off"
            name={regCash.name}
            ref={regCash.ref}
            onChange={regCash.onChange}
            onBlur={(e) => {
              regCash.onBlur(e);
              const n = parseLocaleAmount(e.target.value, locale);
              if (Number.isFinite(n) && n >= 0) {
                setValue("amountCash", formatLocaleAmount(n, locale, currencyCode));
              }
            }}
          />
        </div>
        <div className="min-w-0">
          <Input
            label={t("branch.txAmountCard")}
            inputMode="decimal"
            autoComplete="off"
            name={regCard.name}
            ref={regCard.ref}
            onChange={regCard.onChange}
            onBlur={(e) => {
              regCard.onBlur(e);
              const n = parseLocaleAmount(e.target.value, locale);
              if (Number.isFinite(n) && n >= 0) {
                setValue("amountCard", formatLocaleAmount(n, locale, currencyCode));
              }
            }}
          />
        </div>
      </div>
      {splitActive && splitTotal != null ? (
        <div className="lg:col-span-2 flex items-center justify-between gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            {t("branch.txAmountTotalLabel")}
          </span>
          <span className="text-lg font-bold tabular-nums text-emerald-950 sm:text-xl">
            {formatLocaleAmount(splitTotal, locale, currencyCode)}
          </span>
        </div>
      ) : null}
    </>
  );
}
