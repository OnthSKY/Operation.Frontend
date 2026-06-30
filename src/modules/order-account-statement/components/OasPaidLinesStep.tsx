"use client";

import { useI18n } from "@/i18n/context";
import { PlusIcon } from "@/shared/ui/EyeIcon";
import { formatLocaleAmountInput, parseLocaleAmount } from "@/shared/lib/locale-amount";
import { emptyPaid } from "@/modules/order-account-statement/components/oas-helpers";
import {
  OasIconButton,
  OasTrashButton,
  StatementFormStep,
} from "@/modules/order-account-statement/components/oas-ui";
import type { PaidDraft } from "@/modules/order-account-statement/components/oas-types";

/**
 * "Bizim için ödenen" (paid-on-behalf) satırlarını listeleyen ve düzenleten
 * StatementFormStep'i. Promo step ile birebir aynı düzen — DRY için ortak
 * `OasAmountRowsStep` üretmek mümkün; şimdilik domain isimlendirmesi
 * (Promo vs Paid) açık tutmak için ayrı.
 */
type Props = {
  paidLines: PaidDraft[];
  setPaidLines: React.Dispatch<React.SetStateAction<PaidDraft[]>>;
  locale: "tr" | "en";
};

export function OasPaidLinesStep({ paidLines, setPaidLines, locale }: Props) {
  const { t } = useI18n();

  const updateRow = (id: string, patch: Partial<PaidDraft>) =>
    setPaidLines((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const removeRow = (id: string) =>
    setPaidLines((prev) => prev.filter((x) => x.id !== id));

  const blurAmount = (id: string, current: string) => {
    const n = parseLocaleAmount(current, locale);
    if (!Number.isFinite(n)) return;
    updateRow(id, { amount: n, amountText: formatLocaleAmountInput(n, locale) });
  };

  return (
    <StatementFormStep
      title={t("reports.orderAccountStatementStepExtraPaid")}
      description={t("reports.orderAccountStatementPaidOnBehalfHelp")}
      stepVisual={{ tone: "sky", icon: "paid" }}
      scopeKinds={["document", "system"]}
      actions={
        <OasIconButton
          title={t("reports.orderAccountStatementAddPaidLine")}
          aria-label={t("reports.orderAccountStatementAddPaidLine")}
          onClick={() => setPaidLines((p) => [...p, emptyPaid()])}
          className="!border-zinc-300 !text-zinc-700 hover:!text-zinc-900"
        >
          <PlusIcon className="h-6 w-6 shrink-0 text-current" />
        </OasIconButton>
      }
    >
      {paidLines.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-400">{t("reports.orderAccountStatementPaidEmpty")}</p>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="mt-3 space-y-2 lg:hidden">
            {paidLines.map((line, rowIndex) => (
              <li key={line.id} className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50/40 p-2">
                <span className="inline-flex h-7 min-w-[1.5rem] shrink-0 items-center justify-center rounded-md bg-zinc-200/80 text-[11px] font-bold text-zinc-700">
                  {rowIndex + 1}
                </span>
                <input
                  className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs"
                  placeholder={t("reports.orderAccountStatementColProduct")}
                  value={line.description}
                  onChange={(e) => updateRow(line.id, { description: e.target.value })}
                />
                <input
                  inputMode="decimal"
                  className="w-24 shrink-0 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums"
                  placeholder={t("reports.orderAccountStatementAmount")}
                  value={line.amountText}
                  onChange={(e) => updateRow(line.id, { amountText: e.target.value })}
                  onBlur={() => blurAmount(line.id, line.amountText)}
                />
                <OasTrashButton
                  label={t("reports.orderAccountStatementRemove")}
                  onClick={() => removeRow(line.id)}
                />
              </li>
            ))}
          </ul>
          {/* Desktop: table */}
          <div className="mt-3 hidden overflow-x-auto rounded-lg border border-zinc-200 lg:block">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                  <th scope="col" className="w-10 px-2 py-2.5 text-center">
                    {t("reports.orderAccountStatementColRow")}
                  </th>
                  <th scope="col" className="min-w-[10rem] px-3 py-2.5">
                    {t("reports.orderAccountStatementColProduct")}
                  </th>
                  <th scope="col" className="w-[7.5rem] px-2 py-2.5 text-right">
                    {t("reports.orderAccountStatementAmount")}
                  </th>
                  <th scope="col" className="w-24 px-2 py-2.5 text-center">
                    {t("reports.orderAccountStatementColActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paidLines.map((line, rowIndex) => (
                  <tr key={line.id} className="border-b border-zinc-100 last:border-b-0">
                    <td className="px-2 py-2 text-center text-xs text-zinc-500">{rowIndex + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border border-zinc-200 px-2 py-1.5"
                        value={line.description}
                        onChange={(e) => updateRow(line.id, { description: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        inputMode="decimal"
                        className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-right tabular-nums"
                        value={line.amountText}
                        onChange={(e) => updateRow(line.id, { amountText: e.target.value })}
                        onBlur={() => blurAmount(line.id, line.amountText)}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <div className="flex justify-center">
                        <OasTrashButton
                          label={t("reports.orderAccountStatementRemove")}
                          onClick={() => removeRow(line.id)}
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
    </StatementFormStep>
  );
}
