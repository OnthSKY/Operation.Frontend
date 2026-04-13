"use client";

import type { Locale } from "@/i18n/messages";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type {
  CashPositionBranchRow,
  CashPositionTotalsRow,
} from "@/types/reports";

function tpl(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ""));
}

type Props = {
  branches: CashPositionBranchRow[];
  totals: CashPositionTotalsRow;
  t: (key: string) => string;
  locale: Locale;
};

export function ReportCashPatronHighlights({
  branches,
  totals,
  t,
  locale,
}: Props) {
  if (!branches.length) return null;
  let max = branches[0]!;
  for (const r of branches) {
    if (r.cumulativeCashBalance > max.cumulativeCashBalance) max = r;
  }
  return (
    <div className="space-y-2">
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
        {t("reports.cashPatronTotalsEyebrow")}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3 ring-1 ring-emerald-100/60">
          <p className="text-xs font-medium text-zinc-600">
            {t("reports.cashColDrawer")}
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">
            {formatLocaleAmount(totals.cumulativeCashBalance, locale)}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 ring-1 ring-amber-100/60">
          <p className="text-xs font-medium text-zinc-600">
            {t("reports.cashColPocketDebt")}
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">
            {formatLocaleAmount(
              totals.cumulativeNetRegisterOwesPersonnelPocket,
              locale
            )}
          </p>
        </div>
        <div className="rounded-xl border border-violet-200/80 bg-violet-50/50 p-3 ring-1 ring-violet-100/60">
          <p className="text-xs font-medium text-zinc-600">
            {t("reports.cashColPatronDebt")}
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">
            {formatLocaleAmount(totals.cumulativeNetRegisterOwesPatron, locale)}
          </p>
        </div>
      </div>
      <p className="text-xs leading-snug text-zinc-600">
        {tpl(t("reports.cashPatronMaxDrawer"), { name: max.branchName })}
      </p>
    </div>
  );
}
