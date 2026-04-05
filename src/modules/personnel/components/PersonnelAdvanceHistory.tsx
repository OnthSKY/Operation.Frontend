"use client";

import { useI18n } from "@/i18n/context";
import { usePersonnelAdvancesAll } from "@/modules/personnel/hooks/usePersonnelQueries";
import type { Advance } from "@/types/advance";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { cn } from "@/lib/cn";
import { useMemo } from "react";

function formatAdvanceDay(iso: string): string {
  const d = iso?.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso ?? "—";
  return new Date(d + "T12:00:00").toLocaleDateString();
}

function sortAdvancesDesc(rows: Advance[]): Advance[] {
  return [...rows].sort((a, b) => {
    const da = a.advanceDate.slice(0, 10);
    const db = b.advanceDate.slice(0, 10);
    if (da !== db) return db.localeCompare(da);
    return b.id - a.id;
  });
}

function sourceAbbrev(t: (k: string) => string, st: string): string {
  const u = st.toUpperCase();
  if (u === "PATRON") return t("personnel.advanceSourceAbbrPatron");
  if (u === "BANK") return t("personnel.advanceSourceAbbrBank");
  return t("personnel.advanceSourceAbbrCash");
}

type Props = {
  personnelId: number;
  /** Varsa yalnız bu şubeye yazılmış avanslar */
  branchIdFilter?: number;
  /** Detay tablosunda en fazla kaç satır */
  maxDetailRows?: number;
  className?: string;
  /** Kartta kısa özet + details; tabloda sadece özet satırı */
  variant?: "card" | "inline";
};

export function PersonnelAdvanceHistory({
  personnelId,
  branchIdFilter,
  maxDetailRows = 8,
  className,
  variant = "card",
}: Props) {
  const { t, locale } = useI18n();
  const { data = [], isPending, isError } = usePersonnelAdvancesAll(personnelId);

  const filtered = useMemo(() => {
    let rows = sortAdvancesDesc(data);
    if (branchIdFilter != null && branchIdFilter > 0) {
      rows = rows.filter((a) => a.branchId === branchIdFilter);
    }
    return rows;
  }, [data, branchIdFilter]);

  const summary = useMemo(() => {
    if (filtered.length === 0) {
      return { count: 0, lastLabel: null as string | null };
    }
    const top = filtered[0];
    return {
      count: filtered.length,
      lastLabel: formatAdvanceDay(top.advanceDate),
    };
  }, [filtered]);

  if (isPending) {
    return (
      <div className={cn("text-xs text-zinc-500", className)} aria-busy="true">
        {t("common.loading")}
      </div>
    );
  }

  if (isError) {
    return (
      <p className={cn("text-xs text-red-600", className)}>
        {t("personnel.advanceHistoryError")}
      </p>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className={cn("text-xs text-zinc-500", className)}>
        {t("personnel.advanceHistoryEmpty")}
      </p>
    );
  }

  const detailRows = filtered.slice(0, maxDetailRows);

  if (variant === "inline") {
    return (
      <div className={cn("text-xs", className)}>
        <p className="text-zinc-600">
          <span className="font-medium text-zinc-800">{summary.count}</span>{" "}
          {t("personnel.advanceHistoryCountSuffix")}
          {summary.lastLabel ? (
            <>
              {" · "}
              {t("personnel.advanceHistoryLast")}: {summary.lastLabel}
            </>
          ) : null}
        </p>
        <ul className="mt-1.5 space-y-1 border-t border-zinc-100 pt-1.5 text-zinc-600">
          {detailRows.map((a) => (
            <li key={a.id} className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
              <span className="tabular-nums text-zinc-700">
                {formatAdvanceDay(a.advanceDate)}
              </span>
              <span className="font-mono text-zinc-800">
                {formatMoneyDash(a.amount, "—", locale, a.currencyCode)}
              </span>
              <span className="w-full text-[11px] text-zinc-500 sm:w-auto">
                {sourceAbbrev(t, a.sourceType)} · {a.effectiveYear}
              </span>
            </li>
          ))}
        </ul>
        {filtered.length > maxDetailRows ? (
          <p className="mt-1 text-[11px] text-zinc-400">
            +{filtered.length - maxDetailRows} {t("personnel.advanceHistoryMore")}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <details className={cn("group rounded-lg border border-zinc-200/90 bg-zinc-50/50", className)}>
      <summary className="cursor-pointer list-none px-3 py-2 text-sm text-zinc-700 marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
          <span className="font-medium text-zinc-900">
            {t("personnel.advanceHistoryTitle")}
          </span>
          <span className="text-zinc-500">
            ({summary.count} · {t("personnel.advanceHistoryLast")}{" "}
            {summary.lastLabel ?? "—"})
          </span>
          <span className="ml-1 text-xs text-zinc-400 group-open:hidden">
            {t("personnel.advanceHistoryExpand")}
          </span>
        </span>
      </summary>
      <div className="border-t border-zinc-200/80 px-3 py-2">
        <ul className="space-y-2 text-sm">
          {detailRows.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium tabular-nums text-zinc-800">
                  {formatAdvanceDay(a.advanceDate)}
                </span>
                <span className="font-mono text-zinc-900">
                  {formatMoneyDash(a.amount, "—", locale, a.currencyCode)}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                {sourceAbbrev(t, a.sourceType)} · {t("personnel.effectiveYear")}:{" "}
                {a.effectiveYear}
                {branchIdFilter == null && (
                  <>
                    {" · "}
                    {t("personnel.tableBranch")} #{a.branchId}
                  </>
                )}
              </p>
              {a.description ? (
                <p className="text-xs text-zinc-600">{a.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
        {filtered.length > maxDetailRows ? (
          <p className="mt-2 text-xs text-zinc-400">
            +{filtered.length - maxDetailRows} {t("personnel.advanceHistoryMore")}
          </p>
        ) : null}
      </div>
    </details>
  );
}
