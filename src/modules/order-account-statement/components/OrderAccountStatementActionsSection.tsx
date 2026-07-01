"use client";

import type { Locale } from "@/i18n/messages";
import { formatLocaleAmountInput, parseLocaleAmount } from "@/shared/lib/locale-amount";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import type { Dispatch, SetStateAction } from "react";

type Props = {
  t: (key: string) => string;
  locale: Locale;
  saveToSystem: boolean;
  setSaveToSystem: Dispatch<SetStateAction<boolean>>;
  branchSelectOptions: SelectOption[];
  linkedBranchId: string;
  setLinkedBranchId: Dispatch<SetStateAction<string>>;
  previousBalanceText: string;
  setPreviousBalanceText: Dispatch<SetStateAction<string>>;
  applySelectedBranchOpenBalance: () => void;
  applyBranchOpenBalanceBusy: boolean;
  suggestionsBusy: boolean;
};

export function OrderAccountStatementActionsSection(props: Props) {
  const {
    t,
    locale,
    branchSelectOptions,
    linkedBranchId,
    setLinkedBranchId,
    previousBalanceText,
    setPreviousBalanceText,
    applySelectedBranchOpenBalance,
    applyBranchOpenBalanceBusy,
    suggestionsBusy,
  } = props;

  return (
    <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5">
      {/* Kaydetme aç/kapa önizleme ayarlarında — burada sadece şube + açık bakiye (kompakt). */}
      <Select
        label={t("reports.orderAccountStatementSystemBranchLabel")}
        name="order-account-system-branch"
        options={branchSelectOptions}
        value={linkedBranchId}
        onChange={(e) => setLinkedBranchId(e.target.value)}
        onBlur={() => {}}
      />
      {/* Şube seçimi belge başlığındaki şube alanını besler → görsel bağ (link ikonu). */}
      <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-violet-100">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        {t("reports.orderAccountStatementSystemBranchFillsTitle")}
      </div>
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-semibold text-amber-900">
            {t("reports.orderAccountStatementOpenBalanceTitle")}
          </p>
          <span className="text-[10px] text-amber-700">
            {t("reports.orderAccountStatementOpenBalanceHint")}
          </span>
        </div>
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            inputMode="decimal"
            className="w-full rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200/70"
            placeholder="0"
            value={previousBalanceText}
            onChange={(e) => setPreviousBalanceText(e.target.value)}
            onBlur={() => {
              const n = parseLocaleAmount(previousBalanceText, locale);
              if (Number.isFinite(n)) setPreviousBalanceText(formatLocaleAmountInput(Math.max(0, n), locale));
            }}
          />
          <Button
            type="button"
            variant="secondary"
            className="!min-h-9 !w-auto whitespace-nowrap px-2.5 text-xs"
            onClick={applySelectedBranchOpenBalance}
            disabled={applyBranchOpenBalanceBusy || suggestionsBusy}
          >
            {applyBranchOpenBalanceBusy ? t("reports.loading") : t("reports.orderAccountStatementSystemBranchBalanceUse")}
          </Button>
        </div>
      </div>
    </div>
  );
}
