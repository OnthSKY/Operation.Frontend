"use client";

import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";

/**
 * Gün sonu kasa kapanışında: girilen nakit gelir − kasa giderleri = aktarılacak net nakit.
 * Salt görsel kart; hiçbir state veya callback yok. Üst component görünürlük kararı verir.
 */
export type DayCloseCashHandoverSummaryCardProps = {
  enteredCashIncome: number;
  priorRegisterExpenses: number;
  bundledRegisterExpenses: number;
  netCashHandover: number;
  locale: Locale;
  currencyCode: string;
};

export function DayCloseCashHandoverSummaryCard(
  props: DayCloseCashHandoverSummaryCardProps
) {
  const { t } = useI18n();
  const {
    enteredCashIncome,
    priorRegisterExpenses,
    bundledRegisterExpenses,
    netCashHandover,
    locale,
    currencyCode,
  } = props;

  return (
    <div className="min-w-0 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 lg:col-span-2">
      <p className="mb-2 text-xs font-semibold text-indigo-900">
        {t("branch.txCashHandoverSummaryTitle")}
      </p>
      <Row label={t("branch.txCashHandoverEnteredCash")}>
        {formatLocaleAmount(enteredCashIncome, locale, currencyCode)}
      </Row>
      {priorRegisterExpenses > 0 ? (
        <Row
          label={t("branch.txCashHandoverPriorExpenses")}
          negative
        >
          -{formatLocaleAmount(priorRegisterExpenses, locale, currencyCode)}
        </Row>
      ) : null}
      {bundledRegisterExpenses > 0 ? (
        <Row
          label={t("branch.txCashHandoverBundledExpenses")}
          negative
        >
          -{formatLocaleAmount(bundledRegisterExpenses, locale, currencyCode)}
        </Row>
      ) : null}
      <div className="mt-1.5 flex items-center justify-between border-t border-indigo-200/60 pt-1.5 text-sm font-semibold text-indigo-950">
        <span>{t("branch.txCashHandoverNetTransfer")}</span>
        <span className="font-mono">
          {formatLocaleAmount(netCashHandover, locale, currencyCode)}
        </span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-indigo-600/90">
        {t("branch.txCashHandoverHint")}
      </p>
    </div>
  );
}

function Row({
  label,
  children,
  negative,
}: {
  label: string;
  children: React.ReactNode;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5 text-xs text-indigo-800">
      <span>{label}</span>
      <span
        className={`font-mono ${negative ? "text-red-700" : ""}`}
      >
        {children}
      </span>
    </div>
  );
}
