"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { fetchPersonnelAttributedExpenses } from "@/modules/branch/api/branch-transactions-api";
import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import { usePersonnelAdvancesAll } from "@/modules/personnel/hooks/usePersonnelQueries";
import type { Advance } from "@/types/advance";
import type { BranchTransaction } from "@/types/branch-transaction";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

function sortAdvancesDesc(rows: Advance[]): Advance[] {
  return [...rows].sort((a, b) => {
    const da = a.advanceDate.slice(0, 10);
    const db = b.advanceDate.slice(0, 10);
    if (da !== db) return db.localeCompare(da);
    return b.id - a.id;
  });
}

function attributedExpenseRowIsAdvance(row: BranchTransaction): boolean {
  const cat = String(row.category ?? "").trim().toUpperCase();
  if (cat === "PER_ADVANCE") return true;
  const lid = row.linkedAdvanceId;
  return lid != null && lid > 0;
}

function sourceAbbrev(t: (k: string) => string, st: string): string {
  const u = st.toUpperCase();
  if (u === "PATRON") return t("personnel.advanceSourceAbbrPatron");
  if (u === "BANK") return t("personnel.advanceSourceAbbrBank");
  if (u === "PERSONNEL_POCKET")
    return t("personnel.advanceSourceAbbrPersonnelPocket");
  return t("personnel.advanceSourceAbbrCash");
}

function sumAmountsByCurrency(
  rows: ReadonlyArray<{ amount: number; currencyCode?: string | null }>,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const c = String(r.currencyCode ?? "TRY")
      .trim()
      .toUpperCase();
    const code = /^[A-Z]{3}$/.test(c) ? c : "TRY";
    m.set(code, (m.get(code) ?? 0) + r.amount);
  }
  return m;
}

function formatCurrencyTotals(
  totals: Map<string, number>,
  locale: Locale,
  dash: string,
): string {
  if (totals.size === 0) return dash;
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ccy, amt]) => formatMoneyDash(amt, dash, locale, ccy))
    .join(" · ");
}

type CombinedDetail =
  | { kind: "advance"; id: number; sortDate: string; advance: Advance }
  | { kind: "expense"; id: number; sortDate: string; tx: BranchTransaction };

function buildCombinedDetails(
  advances: Advance[],
  expenses: BranchTransaction[],
  max: number,
): CombinedDetail[] {
  const adv = advances.map((advance) => ({
    kind: "advance" as const,
    id: advance.id,
    sortDate: advance.advanceDate.slice(0, 10),
    advance,
  }));
  const exp = expenses.map((tx) => ({
    kind: "expense" as const,
    id: tx.id,
    sortDate: String(tx.transactionDate ?? "").slice(0, 10),
    tx,
  }));
  return [...adv, ...exp]
    .sort((a, b) => {
      if (a.sortDate !== b.sortDate) return b.sortDate.localeCompare(a.sortDate);
      return b.id - a.id;
    })
    .slice(0, max);
}

function maxIsoDate(dates: string[]): string | null {
  const cleaned = dates
    .map((d) => d.slice(0, 10))
    .filter((d) => d.length >= 10);
  if (cleaned.length === 0) return null;
  return cleaned.reduce((a, b) => (a >= b ? a : b));
}

type Props = {
  personnelId: number;
  /** Varsa yalnız bu şubeye yazılmış avanslar (ve şube giderleri) */
  branchIdFilter?: number;
  /** Detay tablosunda en fazla kaç satır */
  maxDetailRows?: number;
  className?: string;
  /** Kartta kısa özet + details; tabloda sadece özet satırı */
  variant?: "card" | "inline";
  /**
   * true: personele yazılmış avans dışı giderleri de göster (personel listesi).
   * false: yalnız avans (şube personel kartı vb.).
   */
  showAttributedExpenses?: boolean;
  /** Tutarları varsayılan gizle, tıklayınca göster. */
  maskSensitiveAmounts?: boolean;
};

export function PersonnelAdvanceHistory({
  personnelId,
  branchIdFilter,
  maxDetailRows = 8,
  className,
  variant = "card",
  showAttributedExpenses = false,
  maskSensitiveAmounts = false,
}: Props) {
  const { t, locale } = useI18n();
  const dash = t("personnel.dash");
  const [inlineDetailsOpen, setInlineDetailsOpen] = useState(false);
  const [amountsRevealed, setAmountsRevealed] = useState(!maskSensitiveAmounts);
  useEffect(() => {
    setAmountsRevealed(!maskSensitiveAmounts);
  }, [maskSensitiveAmounts]);
  const { data = [], isPending: advPending, isError: advError } =
    usePersonnelAdvancesAll(personnelId);

  const {
    data: attrExpenses = [],
    isPending: expPending,
    isError: expError,
  } = useQuery({
    queryKey: ["personnel", "attributed-expenses", personnelId],
    queryFn: () => fetchPersonnelAttributedExpenses(personnelId),
    enabled: personnelId > 0 && showAttributedExpenses,
  });

  const filteredAdvances = useMemo(() => {
    let rows = sortAdvancesDesc(data);
    if (branchIdFilter != null && branchIdFilter > 0) {
      rows = rows.filter(
        (a) => a.branchId != null && a.branchId === branchIdFilter,
      );
    }
    return rows;
  }, [data, branchIdFilter]);

  const filteredExpenses = useMemo(() => {
    if (!showAttributedExpenses) return [];
    let rows = attrExpenses.filter((r) => !attributedExpenseRowIsAdvance(r));
    if (branchIdFilter != null && branchIdFilter > 0) {
      rows = rows.filter(
        (r) => r.branchId != null && r.branchId === branchIdFilter,
      );
    }
    return rows;
  }, [attrExpenses, branchIdFilter, showAttributedExpenses]);

  const advanceTotals = useMemo(
    () => sumAmountsByCurrency(filteredAdvances),
    [filteredAdvances],
  );

  const expenseTotals = useMemo(
    () => sumAmountsByCurrency(filteredExpenses),
    [filteredExpenses],
  );

  const advanceTotalsLabel = useMemo(
    () => formatCurrencyTotals(advanceTotals, locale, dash),
    [advanceTotals, locale, dash],
  );

  const expenseTotalsLabel = useMemo(
    () => formatCurrencyTotals(expenseTotals, locale, dash),
    [expenseTotals, locale, dash],
  );

  const summary = useMemo(() => {
    const advDates = filteredAdvances.map((a) => a.advanceDate);
    const expDates = filteredExpenses.map((r) =>
      String(r.transactionDate ?? ""),
    );
    const lastRaw = maxIsoDate([...advDates, ...expDates]);
    return {
      advCount: filteredAdvances.length,
      expCount: filteredExpenses.length,
      lastLabel: lastRaw
        ? formatLocaleDate(lastRaw, locale, dash)
        : null,
    };
  }, [filteredAdvances, filteredExpenses, locale, dash]);

  const combinedDetails = useMemo(
    () =>
      buildCombinedDetails(
        filteredAdvances,
        filteredExpenses,
        maxDetailRows,
      ),
    [filteredAdvances, filteredExpenses, maxDetailRows],
  );

  const combinedTotalRows =
    filteredAdvances.length + filteredExpenses.length;

  const pending = advPending || (showAttributedExpenses && expPending);
  const hasError = advError || (showAttributedExpenses && expError);

  if (pending) {
    return (
      <div className={cn("text-xs text-zinc-500", className)} aria-busy="true">
        {t("common.loading")}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={cn("space-y-1 text-xs text-red-600", className)}>
        {advError ? <p>{t("personnel.advanceHistoryError")}</p> : null}
        {showAttributedExpenses && expError ? (
          <p>{t("personnel.costsSummaryExpenseError")}</p>
        ) : null}
      </div>
    );
  }

  if (combinedTotalRows === 0) {
    return (
      <p className={cn("text-xs text-zinc-500", className)}>
        {showAttributedExpenses
          ? t("personnel.costsAttributedSummaryEmpty")
          : t("personnel.advanceHistoryEmpty")}
      </p>
    );
  }

  const inlineHeadline = showAttributedExpenses
    ? (() => {
        let h = t("personnel.costsSummaryHeadlineCore")
          .replace("{adv}", String(summary.advCount))
          .replace("{exp}", String(summary.expCount));
        if (summary.lastLabel) {
          h += ` · ${t("personnel.advanceHistoryLast")}: ${summary.lastLabel}`;
        }
        return h;
      })()
    : null;

  const totalsBlock = showAttributedExpenses ? (
    <div className="mt-1 space-y-2 text-xs leading-snug text-zinc-600">
      <p className="sm:text-xs">
        <span className="text-zinc-500">
          {t("personnel.costsSummaryTotalAdvancesLabel")}
        </span>{" "}
        <strong className="font-semibold text-zinc-900">
          {amountsRevealed ? advanceTotalsLabel : "***"}
        </strong>
        <span className="mx-1 text-zinc-300">·</span>
        <span className="text-zinc-500">
          {t("personnel.costsSummaryTotalExpensesLabel")}
        </span>{" "}
        <strong className="font-semibold text-zinc-900">
          {amountsRevealed ? expenseTotalsLabel : "***"}
        </strong>
      </p>
      {maskSensitiveAmounts ? (
        <button
          type="button"
          className="min-h-10 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-left text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 hover:text-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          onClick={() => setAmountsRevealed((v) => !v)}
          aria-label={
            amountsRevealed
              ? t("personnel.salaryHideAria")
              : t("personnel.salaryRevealAria")
          }
        >
          {t("personnel.amount")} ·{" "}
          {amountsRevealed
            ? t("personnel.costsSummaryHideDetail")
            : t("personnel.costsSummaryShowDetail")}
        </button>
      ) : null}
    </div>
  ) : null;

  if (variant === "inline") {
    return (
      <div className={cn("text-xs", className)}>
        <p className="text-zinc-600">
          {showAttributedExpenses && inlineHeadline ? (
            <span className="text-zinc-800">{inlineHeadline}</span>
          ) : (
            <>
              <span className="font-medium text-zinc-800">
                {summary.advCount}
              </span>{" "}
              {t("personnel.advanceHistoryCountSuffix")}
              {summary.lastLabel ? (
                <>
                  {" · "}
                  {t("personnel.advanceHistoryLast")}: {summary.lastLabel}
                </>
              ) : null}
            </>
          )}
        </p>
        {totalsBlock}
        <button
          type="button"
          className="mt-1.5 min-h-10 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-left text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 hover:text-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          aria-expanded={inlineDetailsOpen}
          onClick={() => setInlineDetailsOpen((v) => !v)}
        >
          {inlineDetailsOpen
            ? t("personnel.costsSummaryHideDetail")
            : t("personnel.costsSummaryShowDetail")}
        </button>
        {inlineDetailsOpen ? (
          <>
            <ul className="mt-1.5 space-y-1 border-t border-zinc-100 pt-1.5 text-zinc-600">
              {combinedDetails.map((row) =>
                row.kind === "advance" ? (
                  <li
                    key={`a-${row.advance.id}`}
                    className="flex flex-wrap justify-between gap-x-2 gap-y-0.5"
                  >
                    <span className="inline-flex flex-wrap items-center gap-1">
                      <span
                        className={cn(
                          "rounded border px-1 py-px text-xs font-semibold uppercase leading-none",
                          "border-amber-200 bg-amber-50 text-amber-900",
                        )}
                      >
                        {t("personnel.detailExpenseBadgeAdvance")}
                      </span>
                      <span className="tabular-nums text-zinc-700">
                        {formatLocaleDate(
                          row.advance.advanceDate,
                          locale,
                          dash,
                        )}
                      </span>
                    </span>
                    <span className="font-mono text-zinc-800">
                      {amountsRevealed
                        ? formatMoneyDash(
                            row.advance.amount,
                            dash,
                            locale,
                            row.advance.currencyCode,
                          )
                        : "***"}
                    </span>
                    <span className="w-full text-xs text-zinc-500 sm:w-auto">
                      {sourceAbbrev(t, row.advance.sourceType)} ·{" "}
                      {row.advance.effectiveYear}
                      {row.advance.hasLinkedRegisterExpense ? (
                        <span className="text-emerald-800">
                          {" "}
                          · {t("personnel.advanceRegisterExpenseInBranch")}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ) : (
                  <li
                    key={`e-${row.tx.id}`}
                    className="flex flex-wrap justify-between gap-x-2 gap-y-0.5"
                  >
                    <span className="inline-flex flex-wrap items-center gap-1">
                      <span
                        className={cn(
                          "rounded border px-1 py-px text-xs font-semibold uppercase leading-none",
                          "border-violet-200 bg-violet-50 text-violet-900",
                        )}
                      >
                        {t("personnel.detailExpenseBadgeExpense")}
                      </span>
                      <span className="tabular-nums text-zinc-700">
                        {formatLocaleDate(row.tx.transactionDate, locale, dash)}
                      </span>
                    </span>
                    <span className="font-mono text-zinc-800">
                      {amountsRevealed
                        ? formatMoneyDash(
                            row.tx.amount,
                            dash,
                            locale,
                            row.tx.currencyCode,
                          )
                        : "***"}
                    </span>
                    <span className="w-full text-xs text-zinc-500 sm:w-auto">
                      {txCategoryLine(row.tx.mainCategory, row.tx.category, t)}
                    </span>
                  </li>
                ),
              )}
            </ul>
            {combinedTotalRows > maxDetailRows ? (
              <p className="mt-1 text-xs text-zinc-400">
                +{combinedTotalRows - maxDetailRows}{" "}
                {t("personnel.advanceHistoryMore")}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  return (
    <details
      className={cn(
        "group rounded-lg border border-zinc-200/90 bg-zinc-50/50",
        className,
      )}
    >
      <summary className="cursor-pointer list-none px-3 py-2 text-sm text-zinc-700 marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
          <span className="font-medium text-zinc-900">
            {showAttributedExpenses
              ? t("personnel.costsSummaryHistoryTitle")
              : t("personnel.advanceHistoryTitle")}
          </span>
          <span className="text-zinc-500">
            (
            {showAttributedExpenses
              ? (() => {
                  let s = t("personnel.costsSummaryCardCounts")
                    .replace("{adv}", String(summary.advCount))
                    .replace("{exp}", String(summary.expCount));
                  if (summary.lastLabel) {
                    s += ` · ${t("personnel.advanceHistoryLast")} ${summary.lastLabel}`;
                  }
                  return s;
                })()
              : `${summary.advCount} · ${t("personnel.advanceHistoryLast")} ${summary.lastLabel ?? "—"}`}
            )
          </span>
          <span className="ml-1 text-xs text-zinc-400 group-open:hidden">
            {t("personnel.advanceHistoryExpand")}
          </span>
        </span>
      </summary>
      <div className="border-t border-zinc-200/80 px-3 py-2">
        {showAttributedExpenses && totalsBlock ? (
          <div className="mb-2">{totalsBlock}</div>
        ) : null}
        <ul className="space-y-2 text-sm">
          {combinedDetails.map((row) =>
            row.kind === "advance" ? (
              <li
                key={`a-${row.advance.id}`}
                className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-xs font-semibold leading-none",
                      "border-amber-200 bg-amber-50 text-amber-900",
                    )}
                  >
                    {t("personnel.detailExpenseBadgeAdvance")}
                  </span>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium tabular-nums text-zinc-800">
                      {formatLocaleDate(row.advance.advanceDate, locale, dash)}
                    </span>
                    <span className="font-mono text-zinc-900">
                      {amountsRevealed
                        ? formatMoneyDash(
                            row.advance.amount,
                            dash,
                            locale,
                            row.advance.currencyCode,
                          )
                        : "***"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  {sourceAbbrev(t, row.advance.sourceType)} ·{" "}
                  {t("personnel.effectiveYear")}: {row.advance.effectiveYear}
                  {branchIdFilter == null && (
                    <>
                      {" · "}
                      {t("personnel.tableBranch")}{" "}
                      {row.advance.branchId != null && row.advance.branchId > 0
                        ? `#${row.advance.branchId}`
                        : "—"}
                    </>
                  )}
                  {row.advance.hasLinkedRegisterExpense ? (
                    <span className="text-emerald-800">
                      {" · "}
                      {t("personnel.advanceRegisterExpenseInBranch")}
                    </span>
                  ) : null}
                </p>
                {row.advance.description ? (
                  <p className="text-xs text-zinc-600">
                    {row.advance.description}
                  </p>
                ) : null}
              </li>
            ) : (
              <li
                key={`e-${row.tx.id}`}
                className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-xs font-semibold leading-none",
                      "border-violet-200 bg-violet-50 text-violet-900",
                    )}
                  >
                    {t("personnel.detailExpenseBadgeExpense")}
                  </span>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium tabular-nums text-zinc-800">
                      {formatLocaleDate(row.tx.transactionDate, locale, dash)}
                    </span>
                    <span className="font-mono text-zinc-900">
                      {amountsRevealed
                        ? formatMoneyDash(
                            row.tx.amount,
                            dash,
                            locale,
                            row.tx.currencyCode,
                          )
                        : "***"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-zinc-600">
                  {txCategoryLine(
                    row.tx.mainCategory,
                    row.tx.category,
                    t,
                  )}
                </p>
                {branchIdFilter == null ? (
                  <p className="text-xs text-zinc-500">
                    {t("personnel.tableBranch")}{" "}
                    {row.tx.branchId != null && row.tx.branchId > 0
                      ? `#${row.tx.branchId}`
                      : t("personnel.detailExpenseBranchNone")}
                  </p>
                ) : null}
              </li>
            ),
          )}
        </ul>
        {combinedTotalRows > maxDetailRows ? (
          <p className="mt-2 text-xs text-zinc-400">
            +{combinedTotalRows - maxDetailRows}{" "}
            {t("personnel.advanceHistoryMore")}
          </p>
        ) : null}
      </div>
    </details>
  );
}
