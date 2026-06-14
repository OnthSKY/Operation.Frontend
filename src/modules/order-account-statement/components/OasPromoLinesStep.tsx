"use client";

import { useI18n } from "@/i18n/context";
import { Checkbox } from "@/shared/ui/Checkbox";
import { PlusIcon } from "@/shared/ui/EyeIcon";
import { formatLocaleAmountInput, parseLocaleAmount } from "@/shared/lib/locale-amount";
import { emptyPromo } from "@/modules/order-account-statement/components/oas-helpers";
import {
  OasIconButton,
  OasTrashButton,
  StatementFormStep,
} from "@/modules/order-account-statement/components/oas-ui";
import type { PromoDraft } from "@/modules/order-account-statement/components/oas-types";

/**
 * "Promosyon / ikram" satırları + alınan avans alanını içeren form step'i.
 * Saf sunum + setter callback'leri. State'i kendi tutmaz — tüm değişiklikler
 * `setPromoLines` / `setAdvanceText` üzerinden orchestrator'a gider (single source).
 */
type Props = {
  promoLines: PromoDraft[];
  setPromoLines: React.Dispatch<React.SetStateAction<PromoDraft[]>>;
  advanceText: string;
  setAdvanceText: React.Dispatch<React.SetStateAction<string>>;
  receivedAdvancePostToLedger: boolean;
  setReceivedAdvancePostToLedger: React.Dispatch<React.SetStateAction<boolean>>;
  advanceDeduction: number;
  locale: "tr" | "en";
};

export function OasPromoLinesStep({
  promoLines,
  setPromoLines,
  advanceText,
  setAdvanceText,
  receivedAdvancePostToLedger,
  setReceivedAdvancePostToLedger,
  advanceDeduction,
  locale,
}: Props) {
  const { t } = useI18n();

  const updateRow = (id: string, patch: Partial<PromoDraft>) =>
    setPromoLines((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const removeRow = (id: string) =>
    setPromoLines((prev) => prev.filter((x) => x.id !== id));

  const blurAmount = (id: string, current: string) => {
    const n = parseLocaleAmount(current, locale);
    if (!Number.isFinite(n)) return;
    updateRow(id, { amount: n, amountText: formatLocaleAmountInput(n, locale) });
  };

  return (
    <StatementFormStep
      title={t("reports.orderAccountStatementStepPromoLines")}
      description={t("reports.orderAccountStatementPromoLinesHelp")}
      stepVisual={{ tone: "amber", icon: "promo" }}
      scopeKinds={["document", "system"]}
      actions={
        <OasIconButton
          title={t("reports.orderAccountStatementAddPromoLine")}
          aria-label={t("reports.orderAccountStatementAddPromoLine")}
          onClick={() => setPromoLines((p) => [...p, emptyPromo()])}
          className="!border-zinc-300 !text-zinc-700 hover:!text-zinc-900"
        >
          <PlusIcon className="h-6 w-6 shrink-0 text-current" />
        </OasIconButton>
      }
    >
      <p className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[11px] text-zinc-800 ring-1 ring-zinc-950/[0.04]">
        {t("reports.orderAccountStatementGiftAutoHint")}
      </p>
      {promoLines.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-400">{t("reports.orderAccountStatementPromoLinesEmpty")}</p>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="mt-3 space-y-3 lg:hidden">
            {promoLines.map((row, rowIndex) => (
              <li key={row.id} className="rounded-lg border border-zinc-200 bg-zinc-50/40 p-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-200/80 pb-2">
                  <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md bg-zinc-200/90 text-xs font-bold text-zinc-800">
                    {rowIndex + 1}
                  </span>
                  <OasTrashButton
                    label={t("reports.orderAccountStatementRemove")}
                    onClick={() => removeRow(row.id)}
                  />
                </div>
                <label className="mt-2 block text-xs font-medium text-zinc-600">
                  {t("reports.orderAccountStatementPromoLineDesc")}
                  <input
                    className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-sm"
                    value={row.description}
                    onChange={(e) => updateRow(row.id, { description: e.target.value })}
                  />
                </label>
                <label className="mt-2 block text-xs font-medium text-zinc-600">
                  {t("reports.orderAccountStatementPromoLineAmount")}
                  <input
                    inputMode="decimal"
                    className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-2 text-right text-sm tabular-nums"
                    value={row.amountText}
                    onChange={(e) => updateRow(row.id, { amountText: e.target.value })}
                    onBlur={() => blurAmount(row.id, row.amountText)}
                  />
                </label>
              </li>
            ))}
          </ul>
          {/* Desktop: table */}
          <div className="mt-3 hidden overflow-x-auto rounded-lg border border-zinc-200 lg:block">
            <table className="w-full min-w-[24rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-100 text-xs font-semibold text-zinc-900">
                  <th className="w-10 px-2 py-2 text-center">{t("reports.orderAccountStatementColRow")}</th>
                  <th className="px-3 py-2">{t("reports.orderAccountStatementPromoLineDesc")}</th>
                  <th className="w-[7.5rem] px-2 py-2 text-right">{t("reports.orderAccountStatementPromoLineAmount")}</th>
                  <th className="w-20 px-2 py-2 text-center">{t("reports.orderAccountStatementColActions")}</th>
                </tr>
              </thead>
              <tbody>
                {promoLines.map((row, rowIndex) => (
                  <tr key={row.id} className="border-b border-zinc-100 last:border-b-0">
                    <td className="px-2 py-2 text-center text-xs text-zinc-500">{rowIndex + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border border-zinc-200 px-2 py-1.5"
                        value={row.description}
                        onChange={(e) => updateRow(row.id, { description: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        inputMode="decimal"
                        className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-right tabular-nums"
                        value={row.amountText}
                        onChange={(e) => updateRow(row.id, { amountText: e.target.value })}
                        onBlur={() => blurAmount(row.id, row.amountText)}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <div className="flex justify-center">
                        <OasTrashButton
                          label={t("reports.orderAccountStatementRemove")}
                          onClick={() => removeRow(row.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="mt-4">
        <section className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 shadow-sm ring-1 ring-zinc-950/[0.02]">
          <label className="block text-sm">
            <span className="mb-1.5 inline-flex items-center gap-2 text-zinc-700">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M10 2.75a.75.75 0 01.75.75v.87a5.75 5.75 0 014.88 4.88h.87a.75.75 0 010 1.5h-.87a5.75 5.75 0 01-4.88 4.88v.87a.75.75 0 01-1.5 0v-.87a5.75 5.75 0 01-4.88-4.88h-.87a.75.75 0 010-1.5h.87a5.75 5.75 0 014.88-4.88V3.5a.75.75 0 01.75-.75zm0 3a4.25 4.25 0 100 8.5 4.25 4.25 0 000-8.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <span className="font-medium">{t("reports.orderAccountStatementAdvanceShort")}</span>
            </span>
            <input
              inputMode="decimal"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm tabular-nums shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-300/60"
              placeholder="0"
              value={advanceText}
              onChange={(e) => setAdvanceText(e.target.value)}
              onBlur={() => {
                const n = parseLocaleAmount(advanceText, locale);
                if (Number.isFinite(n)) setAdvanceText(formatLocaleAmountInput(Math.max(0, n), locale));
              }}
            />
          </label>
          {advanceDeduction > 0 ? (
            <label className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={receivedAdvancePostToLedger}
                onCheckedChange={(next) => setReceivedAdvancePostToLedger(next === true)}
              />
              <span className="min-w-0">
                <span className="font-medium text-zinc-800">
                  {t("reports.orderAccountStatementReceivedAdvancePostToLedger")}
                </span>
                <span className="mt-0.5 block text-[11px] font-normal text-zinc-500">
                  {t("reports.orderAccountStatementReceivedAdvancePostToLedgerHelp")}
                </span>
              </span>
            </label>
          ) : null}
        </section>
      </div>
    </StatementFormStep>
  );
}
