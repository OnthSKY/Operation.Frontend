"use client";

import { useMemo } from "react";
import {
  TX_MAIN_OUT,
  txCodeLabel,
  txMainNeedsSubCategory,
  txSubOptionsForRegisterExpenseModal,
} from "@/modules/branch/lib/branch-transaction-options";
import { formatLocaleAmount, parseLocaleAmount } from "@/shared/lib/locale-amount";
import type { Locale } from "@/i18n/messages";
import type { SelectOption } from "@/shared/ui/Select";
import { DAY_CLOSE_BUNDLED_OUT_MAINS } from "../lib/tx-form-constants";
import type { DayCloseBundledConfirmedLine } from "../lib/tx-form-types";

/**
 * Gün sonu bundled gider section'ı için derived state:
 *
 *  - `subOptions`: seçili ana kategoriye göre alt kategori listesi.
 *  - `needsSubCategory`: alt kategori zorunlu mu (umbrella'ya göre).
 *  - `preview`: kullanıcı taslak gider giriyorken görünen özet satırı + incomplete flag.
 *  - `tableDisplay`: onaylanmış satırlar için formatlanmış tablo verisi.
 */
export type UseDayCloseBundlePreviewInput = {
  mainValue: string | null | undefined;
  subValue: string | null | undefined;
  payValue: string | null | undefined;
  amountWatch: string | null | undefined;
  descWatch: string | null | undefined;
  confirmedLines: DayCloseBundledConfirmedLine[];
  mainOptions: SelectOption[];
  currencyWatch: string;
  locale: Locale;
  t: (key: string) => string;
};

export type DayCloseBundledPreview =
  | { line: string; incomplete: true }
  | { line: string; incomplete: false }
  | null;

export type DayCloseBundledTableRow = DayCloseBundledConfirmedLine & {
  mainLabel: string;
  subLabel: string;
  payLabel: string;
  amountFmt: string;
};

export function useDayCloseBundlePreview(input: UseDayCloseBundlePreviewInput) {
  const {
    mainValue,
    subValue,
    payValue,
    amountWatch,
    descWatch,
    confirmedLines,
    mainOptions,
    currencyWatch,
    locale,
    t,
  } = input;

  const mainTrim = String(mainValue ?? "").trim();
  const needsSubCategory = txMainNeedsSubCategory("OUT", mainTrim);

  const subOptions = useMemo<SelectOption[]>(() => {
    if (!mainTrim) return [{ value: "", label: t("branch.txSelectPlaceholder") }];
    return txSubOptionsForRegisterExpenseModal(mainTrim, t);
  }, [mainTrim, t]);

  const preview = useMemo<DayCloseBundledPreview>(() => {
    const raw = String(amountWatch ?? "").trim();
    if (!raw) return null;
    const amt = parseLocaleAmount(raw, locale);
    if (!Number.isFinite(amt) || amt <= 0) return null;
    if (!mainTrim || !DAY_CLOSE_BUNDLED_OUT_MAINS.has(mainTrim)) return null;
    const mainLabel = mainOptions.find((o) => o.value === mainTrim)?.label ?? mainTrim;
    const sub = String(subValue ?? "").trim();
    const subNeeded = txMainNeedsSubCategory("OUT", mainTrim);
    let subLabel: string | null = null;
    if (subNeeded) {
      if (!sub) {
        return {
          line: `${mainLabel} · ${formatLocaleAmount(amt, locale, currencyWatch)}`,
          incomplete: true,
        };
      }
      subLabel = subOptions.find((o) => o.value === sub)?.label ?? sub;
    }
    const pay = String(payValue ?? "").trim().toUpperCase();
    if (pay !== "REGISTER" && pay !== "PATRON") {
      return {
        line: `${mainLabel}${subLabel ? ` · ${subLabel}` : ""} · ${formatLocaleAmount(amt, locale, currencyWatch)}`,
        incomplete: true,
      };
    }
    const payLabel =
      pay === "REGISTER" ? t("branch.expensePayRegister") : t("branch.expensePayPatron");
    const desc = String(descWatch ?? "").trim();
    const base = `${mainLabel}${subLabel ? ` · ${subLabel}` : ""} · ${payLabel} · ${formatLocaleAmount(amt, locale, currencyWatch)}`;
    return { line: desc ? `${base} — ${desc}` : base, incomplete: false };
  }, [
    amountWatch,
    descWatch,
    payValue,
    mainTrim,
    subValue,
    mainOptions,
    subOptions,
    currencyWatch,
    locale,
    t,
  ]);

  const tableDisplay = useMemo<DayCloseBundledTableRow[]>(
    () =>
      confirmedLines.map((line) => {
        const mainRow = TX_MAIN_OUT.find((x) => x.value === line.mainCategory);
        const mainLabel =
          mainRow?.labelKey != null
            ? t(mainRow.labelKey)
            : txCodeLabel(line.mainCategory, t) || line.mainCategory;
        let subLabel = "—";
        if (line.category) {
          const opts = txSubOptionsForRegisterExpenseModal(line.mainCategory, t);
          subLabel =
            opts.find((o) => o.value === line.category)?.label ??
            txCodeLabel(line.category, t) ??
            line.category;
        }
        const payLabel =
          line.paymentSource === "REGISTER"
            ? t("branch.expensePayRegister")
            : t("branch.expensePayPatron");
        return {
          ...line,
          mainLabel,
          subLabel,
          payLabel,
          amountFmt: formatLocaleAmount(line.amount, locale, currencyWatch),
        };
      }),
    [currencyWatch, confirmedLines, locale, t]
  );

  return { subOptions, needsSubCategory, preview, tableDisplay };
}
