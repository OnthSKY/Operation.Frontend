"use client";

import type { Locale } from "@/i18n/messages";
import { formatMoneyDash } from "@/shared/lib/locale-amount";

const cardCls =
  "rounded-lg border border-zinc-200/90 bg-white p-2 shadow-sm shadow-zinc-900/5 sm:rounded-xl sm:p-3";
const labelCls =
  "truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-xs sm:font-medium sm:normal-case sm:tracking-normal";
const valueCls =
  "mt-0.5 truncate font-mono text-xs font-semibold tabular-nums text-zinc-900 sm:mt-1 sm:text-base";

/**
 * Costs sekmesi üst kısmı: 3-kolon Toplam / Avans / Gider özet kartları.
 * Mobil 3-col, sm+ aynı 3-col (boş yer kalmasın diye).
 * Tüm hesaplama caller tarafında yapılır; bileşen sadece sunum.
 */
export function PersonnelCostsSummaryCards({
  combinedTotal,
  advanceTotal,
  expenseTotal,
  currencyCode,
  locale,
  dash,
}: {
  combinedTotal: number;
  advanceTotal: number;
  expenseTotal: number;
  currencyCode: string;
  locale: Locale;
  dash: string;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
      <article className={cardCls}>
        <p className={labelCls}>Toplam</p>
        <p className={valueCls}>
          {formatMoneyDash(combinedTotal, dash, locale, currencyCode)}
        </p>
      </article>
      <article className={cardCls}>
        <p className={labelCls}>Avans</p>
        <p className={valueCls}>
          {formatMoneyDash(advanceTotal, dash, locale, currencyCode)}
        </p>
      </article>
      <article className={cardCls}>
        <p className={labelCls}>Gider</p>
        <p className={valueCls}>
          {formatMoneyDash(expenseTotal, dash, locale, currencyCode)}
        </p>
      </article>
    </div>
  );
}
