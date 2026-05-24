"use client";

import { useBranchTransactions } from "@/modules/branch/hooks/useBranchQueries";
import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import type { Locale } from "@/i18n/messages";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { cn } from "@/lib/cn";
import { useMemo } from "react";

const EPS = 0.005;

type Tone = "rose" | "amber" | "violet" | "sky" | "zinc";

type Category = { label: string; amount: number };
type Group = {
  sourceKey: string;
  sourceLabel: string;
  tone: Tone;
  total: number;
  categories: Category[];
};

const TONE: Record<Tone, { bar: string; chip: string; border: string }> = {
  rose:   { bar: "bg-rose-500",   chip: "text-rose-800",   border: "border-rose-200" },
  amber:  { bar: "bg-amber-500",  chip: "text-amber-800",  border: "border-amber-200" },
  violet: { bar: "bg-violet-500", chip: "text-violet-800", border: "border-violet-200" },
  sky:    { bar: "bg-sky-500",    chip: "text-sky-800",    border: "border-sky-200" },
  zinc:   { bar: "bg-zinc-400",   chip: "text-zinc-700",   border: "border-zinc-200" },
};

function sourceMeta(src: string, t: (key: string) => string): { label: string; tone: Tone } {
  switch (src) {
    case "REGISTER":
      return { label: t("branch.expensePayRegisterShort"), tone: "rose" };
    case "PATRON":
      return { label: t("branch.expensePayPatronShort"), tone: "amber" };
    case "PERSONNEL_POCKET":
      return { label: t("branch.expensePayPersonnelPocketShort"), tone: "violet" };
    case "PERSONNEL_HELD_REGISTER_CASH":
      return { label: t("branch.expensePayPersonnelHeldRegisterCashShort"), tone: "sky" };
    default:
      return { label: t("dashboard.dailyRegisterExpenseSourceUnspecified"), tone: "zinc" };
  }
}

export function BranchExpenseSourceCategoryGroups({
  branchId,
  date,
  enabled = true,
  locale,
  t,
  total,
  showTotal = true,
  excludeSources,
  emptyHint,
}: {
  branchId: number;
  /** YYYY-MM-DD. */
  date: string;
  enabled?: boolean;
  locale: Locale;
  t: (key: string) => string;
  /** Authoritative total to display in the footer. */
  total: number;
  showTotal?: boolean;
  /** Payment sources to drop from the listing (e.g. ["REGISTER"]). */
  excludeSources?: readonly string[];
  /** Fallback text rendered when no groups remain after filtering. */
  emptyHint?: string | null;
}) {
  const query = useBranchTransactions(branchId, date, enabled);

  const groups = useMemo<Group[]>(() => {
    const list = query.data ?? [];
    const skipSet = excludeSources
      ? new Set(excludeSources.map((s) => s.toUpperCase()))
      : null;
    const m = new Map<string, Group>();
    for (const tx of list) {
      if (String(tx.type ?? "").trim().toUpperCase() !== "OUT") continue;
      const amt = Number(tx.amount) || 0;
      if (amt <= EPS) continue;
      const src = String(tx.expensePaymentSource ?? "").trim().toUpperCase() || "UNKNOWN";
      if (skipSet?.has(src)) continue;
      const meta = sourceMeta(src, t);
      const catLabel = txCategoryLine(tx.mainCategory, tx.category, t).trim() || t("personnel.dash");
      let g = m.get(src);
      if (!g) {
        g = {
          sourceKey: src,
          sourceLabel: meta.label,
          tone: meta.tone,
          total: 0,
          categories: [],
        };
        m.set(src, g);
      }
      g.total += amt;
      const existing = g.categories.find((c) => c.label === catLabel);
      if (existing) {
        existing.amount += amt;
      } else {
        g.categories.push({ label: catLabel, amount: amt });
      }
    }
    return [...m.values()]
      .map((g) => ({
        ...g,
        categories: [...g.categories].sort((a, b) => b.amount - a.amount),
      }))
      .sort((a, b) => b.total - a.total);
  }, [query.data, t, excludeSources]);

  if (!enabled) return null;
  if (query.isPending) {
    return <p className="text-[11px] text-zinc-500">{t("common.loading")}</p>;
  }
  if (groups.length === 0) {
    return (
      <p className="text-[11px] leading-relaxed text-zinc-500">
        {emptyHint ?? t("dashboard.dailyRegisterExpenseNoOutHint")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {groups.map((g) => {
          const tone = TONE[g.tone];
          return (
            <li
              key={g.sourceKey}
              className={cn("relative overflow-hidden rounded-xl border bg-white", tone.border)}
            >
              <span className={cn("absolute inset-y-0 left-0 w-1", tone.bar)} aria-hidden />
              <div className="pl-3 pr-3 py-2 sm:pl-4">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-[12px] font-bold uppercase tracking-wide", tone.chip)}>
                    {g.sourceLabel}
                  </span>
                  <span className="shrink-0 text-[13px] font-bold tabular-nums text-zinc-900">
                    {formatLocaleAmount(g.total, locale)}
                  </span>
                </div>
                <ul className="mt-1 space-y-0.5 border-t border-zinc-100 pt-1">
                  {g.categories.map((c) => (
                    <li
                      key={c.label}
                      className="flex items-start justify-between gap-2 text-[12px] leading-snug"
                    >
                      <span className="min-w-0 break-words text-zinc-700">{c.label}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-zinc-900">
                        {formatLocaleAmount(c.amount, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
      {showTotal ? (
        <div className="flex items-center justify-between border-t border-zinc-200 pt-2 text-[13px]">
          <span className="font-semibold text-zinc-600">
            {t("dashboard.dailyRegisterCardExpenseOutTotal")}
          </span>
          <span className="font-bold tabular-nums text-zinc-900">
            {formatLocaleAmount(total, locale)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
