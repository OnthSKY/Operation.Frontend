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
      <p className="mt-1 text-[11px] text-zinc-500">
        {t("reports.orderAccountStatementSystemBranchHelp")}
      </p>
      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-semibold text-amber-900">
            {t("reports.orderAccountStatementOpenBalanceTitle")}
          </p>
          <span className="text-[10px] text-amber-700">
            {t("reports.orderAccountStatementOpenBalanceHint")}
          </span>
        </div>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            inputMode="decimal"
            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200/70"
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
            className="!min-h-10 !w-auto whitespace-nowrap px-3 text-xs"
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
