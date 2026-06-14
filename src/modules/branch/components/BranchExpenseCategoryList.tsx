"use client";

import { useBranchTransactions } from "@/modules/branch/hooks/useBranchQueries";
import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import type { Locale } from "@/i18n/messages";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { cn } from "@/lib/cn";
import { useMemo } from "react";

const EPS = 0.005;

type Row = {
  key: string;
  label: string;
  amount: number;
};

export function BranchExpenseCategoryList({
  branchId,
  date,
  enabled = true,
  locale,
  t,
  emptyHint,
  includeSources,
  excludeClassifications,
  amountTextClassName,
}: {
  branchId: number;
  /** YYYY-MM-DD. */
  date: string;
  enabled?: boolean;
  locale: Locale;
  t: (key: string) => string;
  /** Optional fallback text when there are no OUT lines. */
  emptyHint?: string | null;
  /** If provided, only OUT rows whose expensePaymentSource is in this set are counted.
   *  Boş string ("") `null` / "UNSET" kaynaklarını kapsar. */
  includeSources?: readonly string[];
  /** If provided, OUT rows with these classification codes are excluded
   *  (örn. OUT_POCKET_REPAY, OUT_PATRON_DEBT_REPAY, OUT_POCKET_CLAIM_TRANSFER,
   *  OUT_POCKET_CLAIM_TO_PATRON — operasyonel P&L gideri olmayan kayıtlar). */
  excludeClassifications?: readonly string[];
  /** Override the amount column color (default orange-950). */
  amountTextClassName?: string;
}) {
  const query = useBranchTransactions(branchId, date, enabled);

  const rows = useMemo<Row[]>(() => {
    const list = query.data ?? [];
    const includeSet = includeSources
      ? new Set(includeSources.map((s) => s.toUpperCase()))
      : null;
    const excludeSet = excludeClassifications
      ? new Set(excludeClassifications.map((s) => s.toUpperCase()))
      : null;
    const totals = new Map<string, Row>();
    for (const tx of list) {
      if (String(tx.type ?? "").trim().toUpperCase() !== "OUT") continue;
      if (includeSet) {
        const src = String(tx.expensePaymentSource ?? "").trim().toUpperCase();
        if (!includeSet.has(src)) continue;
      }
      if (excludeSet) {
        const cls = String(tx.mainCategory ?? "").trim().toUpperCase();
        if (excludeSet.has(cls)) continue;
      }
      const amt = Number(tx.amount) || 0;
      if (amt <= EPS) continue;
      const label = txCategoryLine(tx.mainCategory, tx.category, t).trim() || t("personnel.dash");
      const key = label;
      const prev = totals.get(key);
      if (prev) {
        prev.amount += amt;
      } else {
        totals.set(key, { key, label, amount: amt });
      }
    }
    return [...totals.values()].sort((a, b) => b.amount - a.amount);
  }, [query.data, t, includeSources, excludeClassifications]);

  if (!enabled) return null;
  if (query.isPending) {
    return (
      <p className="text-[11px] text-zinc-500">{t("common.loading")}</p>
    );
  }
  if (rows.length === 0) {
    return emptyHint ? (
      <p className="text-[11px] text-zinc-500">{emptyHint}</p>
    ) : null;
  }

  return (
    <ul className="space-y-1">
      {rows.map((r) => (
        <li
          key={r.key}
          className="flex items-start justify-between gap-2 text-[12px] leading-snug"
        >
          <span className="min-w-0 break-words text-zinc-700">{r.label}</span>
          <span className={cn("shrink-0 font-semibold tabular-nums", amountTextClassName ?? "text-orange-950")}>
            {formatLocaleAmount(r.amount, locale)}
          </span>
        </li>
      ))}
    </ul>
  );
}
