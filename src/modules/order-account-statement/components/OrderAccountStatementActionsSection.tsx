"use client";

import type { Locale } from "@/i18n/messages";
import { formatLocaleAmountInput, parseLocaleAmount } from "@/shared/lib/locale-amount";
import { Checkbox } from "@/shared/ui/Checkbox";
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
    saveToSystem,
    setSaveToSystem,
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
    <>
      <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-800">Belge aksiyonlari</p>
          <span className="inline-flex rounded-md border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-medium text-indigo-700">
            Sisteme islenir
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-indigo-700">{t("reports.orderAccountStatementPaneFinanceHelp")}</p>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <Checkbox className="mt-0.5" checked={saveToSystem} onCheckedChange={setSaveToSystem} />
          <span className="min-w-0">
            <span className="font-medium text-zinc-800">{t("reports.orderAccountStatementSystemSaveToggle")}</span>
            <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">
              {t("reports.orderAccountStatementSystemSaveToggleHelp")}
            </span>
          </span>
        </label>
        <div className="mt-2">
          <Select
            label={t("reports.orderAccountStatementSystemBranchLabel")}
            name="order-account-system-branch"
            options={branchSelectOptions}
            value={linkedBranchId}
            onChange={(e) => setLinkedBranchId(e.target.value)}
            onBlur={() => {}}
            disabled={!saveToSystem}
          />
          {saveToSystem ? (
            <>
              <p className="mt-1 text-xs text-zinc-500">{t("reports.orderAccountStatementSystemBranchHelp")}</p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Secilen sube, belge icerigindeki "Sube" alanini otomatik doldurur.
              </p>
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                <p className="text-[11px] font-semibold text-amber-900">Açık bakiye (devreden cari)</p>
                <p className="mt-0.5 text-[11px] text-amber-800">
                  Bu tutar belge toplamına eklenir ve PDF çıktısında ayrıca gösterilir.
                </p>
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
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
