"use client";

import { useBranchTransactions } from "@/modules/branch/hooks/useBranchQueries";
import type { Locale } from "@/i18n/messages";
import { usePersonnelDetailOverlay } from "@/shared/personnel-detail";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { useMemo } from "react";

const EPS = 0.005;

type Row = {
  personnelId: number;
  fullName: string;
  amount: number;
};

type PersonnelHandoverSource = "PERSONNEL_HELD_REGISTER_CASH" | "PERSONNEL_POCKET";

export function BranchPersonnelHandoverChips({
  branchId,
  date,
  source,
  enabled = true,
  locale,
  t,
  headingKey = "dashboard.dailyRegisterCardHeldRegisterCashTransferredToHeading",
}: {
  branchId: number;
  /** YYYY-MM-DD. */
  date: string;
  /** expensePaymentSource(s) to filter by. */
  source: PersonnelHandoverSource | readonly PersonnelHandoverSource[];
  enabled?: boolean;
  locale: Locale;
  t: (key: string) => string;
  /** i18n key for the heading shown above the chips. */
  headingKey?: string;
}) {
  const { openPersonnelDetail } = usePersonnelDetailOverlay();
  const query = useBranchTransactions(branchId, date, enabled);

  const rows = useMemo<Row[]>(() => {
    const list = query.data ?? [];
    const wanted = new Set(
      (Array.isArray(source) ? source : [source]).map((s) => s.toUpperCase())
    );
    const totals = new Map<number, Row>();
    for (const tx of list) {
      const src = String(tx.expensePaymentSource ?? "").trim().toUpperCase();
      if (!wanted.has(src)) continue;
      const pid = tx.expensePocketPersonnelId;
      if (!pid || pid <= 0) continue;
      const amt = Number(tx.amount) || 0;
      if (amt <= EPS) continue;
      const prev = totals.get(pid);
      if (prev) {
        prev.amount += amt;
      } else {
        totals.set(pid, {
          personnelId: pid,
          fullName: tx.expensePocketPersonnelFullName?.trim() || `#${pid}`,
          amount: amt,
        });
      }
    }
    return [...totals.values()].sort((a, b) => b.amount - a.amount);
  }, [query.data, source]);

  if (!enabled) return null;
  if (query.isPending) {
    return (
      <p className="mt-1 text-[11px] text-zinc-500">
        {t("common.loading")}
      </p>
    );
  }
  if (rows.length === 0) return null;

  return (
    <div className="mt-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {t(headingKey)}
      </p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {rows.map((r) => (
          <li key={r.personnelId}>
            <button
              type="button"
              onClick={() => openPersonnelDetail(r.personnelId)}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-medium text-rose-900 transition hover:border-rose-300 hover:bg-rose-50 active:scale-95"
            >
              <span className="truncate">{r.fullName}</span>
              <span className="shrink-0 font-semibold tabular-nums text-rose-700">
                {formatLocaleAmount(r.amount, locale)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
