"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth/AuthContext";
import { canSeeFinancialReports } from "@/lib/auth/permissions";
import { isPersonnelPortalRole } from "@/lib/auth/roles";
import { fetchAllNonAdvancePersonnelAttributedExpenses } from "@/modules/branch/api/branch-transactions-api";
import { NonAdvanceExpenseSortBar } from "@/modules/personnel/components/NonAdvanceExpenseSortBar";
import {
  createPersonnelCostColumns,
  PersonnelCostMobileCard,
} from "@/modules/personnel/components/personnel-cost-list-blocks";
import {
  DEFAULT_NON_ADVANCE_EXPENSE_SORT,
  type NonAdvanceExpenseSort,
} from "@/modules/personnel/lib/non-advance-expense-sort";
import {
  buildPersonnelCostRows,
  clampSortForTab,
  expenseApiSortForTab,
  filterRowsByDateRange,
  filterRowsByMonth,
  groupRowsByCategory,
  groupRowsByMonth,
  type CategoryBucket,
  type CostsTab,
  type MonthBucket,
  sortPersonnelCostRows,
} from "@/modules/personnel/lib/personnel-cost-unified";
import { PersonnelCostsExpenseModal } from "@/modules/personnel/components/PersonnelCostsExpenseModal";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { useAllContractorPayments, useContractors } from "@/modules/contractors/hooks/useContractorQueries";
import { fetchAdvancesByPersonnel } from "@/modules/personnel/api/advances-api";
import {
  defaultPersonnelListFilters,
  personnelKeys,
  useAllAdvancesList,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import type { AdvanceListItem } from "@/types/advance";
import type { BranchTransaction } from "@/types/branch-transaction";
import { Card } from "@/shared/components/Card";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { PageContentSection } from "@/shared/components/PageContentSection";
import { PageHelpModal } from "@/shared/components/PageHelpModal";
import { PageTitleWithHelp } from "@/shared/components/PageTitleWithHelp";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { TABLE_TOOLBAR_ICON_BTN } from "@/shared/components/TableToolbar";
import { DataTable, ResponsiveTableFrame } from "@/shared/tables";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { Tooltip } from "@/shared/ui/Tooltip";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { useMatchMedia } from "@/shared/lib/use-match-media";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { AdvancePersonnelModal } from "./AdvancePersonnelModal";
import { PersonnelSettlementPrintModal } from "./PersonnelSettlementPrintModal";
import { filterNonAdvanceExpenseRows } from "./personnel-non-advance-expense-blocks";

function sumByCurrency(
  rows: { amount: number; currencyCode?: string | null }[]
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const c = String(r.currencyCode ?? "TRY").trim().toUpperCase() || "TRY";
    m.set(c, (m.get(c) ?? 0) + Number(r.amount));
  }
  return m;
}

function sortedCurrencyKeys(
  a: Map<string, number>,
  b: Map<string, number>
): string[] {
  return [...new Set([...a.keys(), ...b.keys()])].sort();
}

function splitPaymentSourceTotalsBody(
  m: Map<string, number>,
  dash: string,
  locale: Locale,
  emptyLabel: string
): ReactNode {
  const keys = [...m.keys()].sort();
  if (keys.length === 0) {
    return <p className="text-sm text-zinc-600">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-2">
      {keys.map((ccy) => (
        <div
          key={ccy}
          className="flex items-baseline justify-between gap-3 border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
        >
          <span className="text-xs font-medium text-zinc-500">{ccy}</span>
          <span className="font-semibold tabular-nums text-zinc-900">
            {formatMoneyDash(m.get(ccy) ?? 0, dash, locale, ccy)}
          </span>
        </div>
      ))}
    </div>
  );
}

type PatronBranchBucket = { key: string; label: string; totals: Map<string, number> };
type SourceBucketKey = "PATRON" | "PERSONNEL_POCKET" | "REGISTER";
type SourceBucketSummary = {
  key: SourceBucketKey;
  count: number;
  totals: Map<string, number>;
};
type PersonnelAmountStat = {
  name: string;
  totalTry: number;
  lineCount: number;
};

function bumpCurrencyMap(
  m: Map<string, number>,
  ccy: string | null | undefined,
  amt: unknown
): void {
  const c = String(ccy ?? "TRY").trim().toUpperCase() || "TRY";
  const n = Number(amt);
  if (!Number.isFinite(n)) return;
  m.set(c, (m.get(c) ?? 0) + n);
}

/** Patron kaynaklı avans + gider satırlarını şube / merkez üzerinden gruplar. */
function buildPatronTotalsByBranch(
  advances: AdvanceListItem[],
  expenses: BranchTransaction[],
  branchNameById: Map<number, string>,
  orgLabel: string
): PatronBranchBucket[] {
  const buckets = new Map<string, Map<string, number>>();
  const labels = new Map<string, string>();

  const touch = (key: string, label: string) => {
    if (!buckets.has(key)) {
      buckets.set(key, new Map());
      labels.set(key, label);
    }
  };

  for (const a of advances) {
    if (String(a.sourceType ?? "").trim().toUpperCase() !== "PATRON") continue;
    const bid = a.branchId != null && a.branchId > 0 ? a.branchId : null;
    const key = bid != null ? `b:${bid}` : "org";
    const label =
      bid != null
        ? a.branchName?.trim() || branchNameById.get(bid)?.trim() || `#${bid}`
        : orgLabel;
    touch(key, label);
    bumpCurrencyMap(buckets.get(key)!, a.currencyCode, a.amount);
  }

  for (const r of expenses) {
    if (String(r.expensePaymentSource ?? "").trim().toUpperCase() !== "PATRON")
      continue;
    const bid = r.branchId != null && r.branchId > 0 ? r.branchId : null;
    const key = bid != null ? `b:${bid}` : "org";
    const label =
      bid != null
        ? branchNameById.get(bid)?.trim() || `#${bid}`
        : orgLabel;
    touch(key, label);
    bumpCurrencyMap(buckets.get(key)!, r.currencyCode, r.amount);
  }

  const rows: PatronBranchBucket[] = [...buckets.entries()].map(([key, totals]) => ({
    key,
    label: labels.get(key) ?? key,
    totals,
  }));

  rows.sort((x, y) => {
    if (x.key === "org") return 1;
    if (y.key === "org") return -1;
    return x.label.localeCompare(y.label, undefined, { sensitivity: "base" });
  });

  return rows;
}

function patronByBranchTotalsBody(
  rows: PatronBranchBucket[],
  dash: string,
  locale: Locale,
  emptyLabel: string
): ReactNode {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-600">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.key}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-600">
            {row.label}
          </p>
          <div className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2">
            {splitPaymentSourceTotalsBody(row.totals, dash, locale, emptyLabel)}
          </div>
        </div>
      ))}
    </div>
  );
}

function normalizeAdvancePaymentSource(code: string | null | undefined): SourceBucketKey | null {
  const u = String(code ?? "").trim().toUpperCase();
  if (u === "PATRON") return "PATRON";
  if (u === "PERSONNEL_HELD_REGISTER_CASH" || u === "PERSONNEL_POCKET")
    return "PERSONNEL_POCKET";
  if (u === "CASH" || u === "BANK" || u === "") return "REGISTER";
  return null;
}

function normalizeExpensePaymentSource(code: string | null | undefined): SourceBucketKey | null {
  const u = String(code ?? "").trim().toUpperCase();
  if (u === "PATRON") return "PATRON";
  if (u === "PERSONNEL_POCKET" || u === "PERSONNEL_HELD_REGISTER_CASH")
    return "PERSONNEL_POCKET";
  if (u === "REGISTER") return "REGISTER";
  return null;
}

function CostsIconAdvance({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-5 w-5 shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="5" />
      <path d="M12 13v7M9 20h6" />
      <path d="M17 4h3M18.5 2.5v3" />
    </svg>
  );
}

function CostsIconExpense({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-5 w-5 shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function CostsIconPrint({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-5 w-5 shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 9V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  );
}

type PaymentSourceSplitSummary = {
  branch: Map<string, number>;
  sourceBuckets: SourceBucketSummary[];
};

type KpiCardProps = {
  label: string;
  totals: Map<string, number>;
  hint: string;
  emphasis?: boolean;
  pending: boolean;
  t: (key: string) => string;
  locale: Locale;
};

function KpiCard({
  label,
  totals,
  hint,
  emphasis,
  pending,
  t,
  locale,
}: KpiCardProps) {
  const dash = t("personnel.costsKpiEmpty");
  const keys = [...totals.keys()].sort((a, b) => {
    if (a === "TRY") return -1;
    if (b === "TRY") return 1;
    return a.localeCompare(b);
  });
  const primaryKey = keys[0];
  const primaryAmount = primaryKey ? totals.get(primaryKey) ?? 0 : 0;
  const others = keys.slice(1);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        emphasis
          ? "border-violet-200 bg-violet-50/60"
          : "border-zinc-200 bg-white"
      )}
    >
      <p
        className={cn(
          "text-xs font-medium uppercase tracking-wide",
          emphasis ? "text-violet-700" : "text-zinc-500"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-semibold tabular-nums leading-tight sm:text-[1.6rem]",
          emphasis ? "text-violet-950" : "text-zinc-900"
        )}
      >
        {pending
          ? t("common.loading")
          : primaryKey
            ? formatMoneyDash(primaryAmount, dash, locale, primaryKey)
            : dash}
      </p>
      {!pending && others.length > 0 ? (
        <p className="mt-1 text-xs text-zinc-500">
          {others
            .map((k) => formatMoneyDash(totals.get(k) ?? 0, dash, locale, k))
            .join(" · ")}
        </p>
      ) : null}
      <p
        className={cn(
          "mt-2 text-xs",
          emphasis ? "text-violet-700/80" : "text-zinc-500"
        )}
      >
        {hint}
      </p>
    </div>
  );
}

function CurrencyTotalsRight({
  totals,
  dash,
  locale,
  emptyLabel,
}: {
  totals: Map<string, number>;
  dash: string;
  locale: Locale;
  emptyLabel: string;
}) {
  const keys = [...totals.keys()].sort((a, b) => {
    if (a === "TRY") return -1;
    if (b === "TRY") return 1;
    return a.localeCompare(b);
  });
  if (keys.length === 0) {
    return <span className="text-xs text-zinc-500">{emptyLabel}</span>;
  }
  return (
    <span className="flex flex-col items-end text-right">
      {keys.map((ccy) => (
        <span
          key={ccy}
          className={cn(
            "tabular-nums",
            ccy === "TRY"
              ? "text-sm font-semibold text-zinc-900"
              : "text-xs text-zinc-500"
          )}
        >
          {formatMoneyDash(totals.get(ccy) ?? 0, dash, locale, ccy)}
        </span>
      ))}
    </span>
  );
}

type PersonnelCostsTopSummaryProps = {
  t: (key: string) => string;
  locale: Locale;
  pending: boolean;
  advSums: Map<string, number>;
  expSums: Map<string, number>;
  combinedSums: Map<string, number>;
  contractorNetSums: Map<string, number>;
  contractorOwed: number;
  contractorPaid: number;
  contractorPending: boolean;
  advanceCount: number;
  expenseCount: number;
  categoryBuckets: CategoryBucket[];
  sourceBuckets: SourceBucketSummary[];
  monthlyBuckets: MonthBucket[];
  monthFilter: string;
  onMonthFilterChange: (ym: string) => void;
  formatMonthLabel: (ym: string) => string;
};

function PersonnelCostsTopSummary({
  t,
  locale,
  pending,
  advSums,
  expSums,
  combinedSums,
  contractorNetSums,
  contractorOwed,
  contractorPaid,
  contractorPending,
  advanceCount,
  expenseCount,
  categoryBuckets,
  sourceBuckets,
  monthlyBuckets,
  monthFilter,
  onMonthFilterChange,
  formatMonthLabel,
}: PersonnelCostsTopSummaryProps) {
  const dash = t("personnel.dash");
  const empty = t("personnel.costsSummaryEmpty");
  const countTpl = t("personnel.costsCategoryCount");

  return (
    <div className="space-y-4">
      <KpiCard
        label={t("personnel.costsKpiContractorExpense")}
        totals={contractorNetSums}
        hint={`${t("personnel.costsKpiContractorOwed")}: ${formatMoneyDash(
          contractorOwed,
          dash,
          locale,
          "TRY"
        )} · ${t("personnel.costsKpiContractorPaid")}: ${formatMoneyDash(
          contractorPaid,
          dash,
          locale,
          "TRY"
        )}`}
        pending={contractorPending}
        t={t}
        locale={locale}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label={t("personnel.costsKpiTotalAdvance")}
          totals={advSums}
          hint={countTpl.replace("{count}", String(advanceCount))}
          pending={pending}
          t={t}
          locale={locale}
        />
        <KpiCard
          label={t("personnel.costsKpiTotalExpense")}
          totals={expSums}
          hint={countTpl.replace("{count}", String(expenseCount))}
          pending={pending}
          t={t}
          locale={locale}
        />
        <KpiCard
          label={t("personnel.costsKpiTotalPersonnel")}
          totals={combinedSums}
          hint={t("personnel.costsKpiTotalPersonnelHint")}
          emphasis
          pending={pending}
          t={t}
          locale={locale}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card
          title={t("personnel.costsCategoryCardTitle")}
          description={t("personnel.costsCategoryCardDesc")}
        >
          {pending ? (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          ) : categoryBuckets.length === 0 ? (
            <p className="text-sm text-zinc-600">{empty}</p>
          ) : (
            <ul className="space-y-2">
              {categoryBuckets.map((b) => (
                <li
                  key={b.key}
                  className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        b.isAdvance ? "text-violet-900" : "text-zinc-900"
                      )}
                    >
                      {b.label}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {countTpl.replace("{count}", String(b.count))}
                    </p>
                  </div>
                  <CurrencyTotalsRight
                    totals={b.totals}
                    dash={dash}
                    locale={locale}
                    emptyLabel={empty}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={t("personnel.costsPaymentMethodCardTitle")}
          description={t("personnel.costsPaymentMethodCardDesc")}
        >
          {pending ? (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          ) : (
            <ul className="space-y-2">
              {sourceBuckets.map((bucket) => {
                const label =
                  bucket.key === "PATRON"
                    ? t("personnel.costsSourceBucketPatron")
                    : bucket.key === "PERSONNEL_POCKET"
                      ? t("personnel.costsSourceBucketPersonnelPocket")
                      : t("personnel.costsSourceBucketRegister");
                return (
                  <li
                    key={bucket.key}
                    className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-2 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {label}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {countTpl.replace("{count}", String(bucket.count))}
                      </p>
                    </div>
                    <CurrencyTotalsRight
                      totals={bucket.totals}
                      dash={dash}
                      locale={locale}
                      emptyLabel={empty}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card
        title={t("personnel.costsMonthlyCardTitle")}
        description={t("personnel.costsMonthlyCardDesc")}
        headerActions={
          monthFilter ? (
            <button
              type="button"
              onClick={() => onMonthFilterChange("")}
              className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
            >
              {t("personnel.costsMonthlyClearFilter")}
            </button>
          ) : undefined
        }
      >
        {pending ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : monthlyBuckets.length === 0 ? (
          <p className="text-sm text-zinc-600">
            {t("personnel.costsMonthlyEmpty")}
          </p>
        ) : (
          <div
            role="group"
            aria-label={t("personnel.costsMonthlyCardTitle")}
            className="space-y-1.5"
          >
            {monthlyBuckets.map((bucket) => {
              const active = bucket.ym === monthFilter;
              return (
                <button
                  key={bucket.ym}
                  type="button"
                  onClick={() =>
                    onMonthFilterChange(active ? "" : bucket.ym)
                  }
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70",
                    active
                      ? "border-violet-300 bg-violet-50 text-violet-900"
                      : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {formatMonthLabel(bucket.ym)}
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-xs">
                    <span className="text-zinc-500">
                      {countTpl.replace("{count}", String(bucket.count))}
                    </span>
                    <CurrencyTotalsRight
                      totals={bucket.totals}
                      dash={dash}
                      locale={locale}
                      emptyLabel={empty}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

type PersonnelCostsSummaryPanelsProps = {
  t: (key: string) => string;
  locale: Locale;
  advancesPending: boolean;
  expensesPending: boolean;
  patronByBranchRows: PatronBranchBucket[];
  paymentSourceSplit: PaymentSourceSplitSummary;
  advSums: Map<string, number>;
  expSums: Map<string, number>;
  personnelAmountStats: {
    topByAmount: PersonnelAmountStat | null;
    topByLines: PersonnelAmountStat | null;
    lowByAmount: PersonnelAmountStat | null;
  };
};

function PersonnelCostsSummaryPanels({
  t,
  locale,
  advancesPending,
  expensesPending,
  patronByBranchRows,
  paymentSourceSplit,
  advSums,
  expSums,
  personnelAmountStats,
}: PersonnelCostsSummaryPanelsProps) {
  const pending = advancesPending || expensesPending;
  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-xs leading-relaxed text-zinc-600">
          {t("personnel.costsPaymentSourceSplitHint")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:gap-4">
          <Card
            title={t("personnel.costsPatronOutCardTitle")}
            description={t("personnel.costsPatronOutCardDesc")}
          >
            {pending ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : (
              patronByBranchTotalsBody(
                patronByBranchRows,
                t("personnel.dash"),
                locale,
                t("personnel.costsSummaryEmpty")
              )
            )}
          </Card>
          <Card
            title={t("personnel.costsBranchOutCardTitle")}
            description={t("personnel.costsBranchOutCardDesc")}
          >
            {pending ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : (
              splitPaymentSourceTotalsBody(
                paymentSourceSplit.branch,
                t("personnel.dash"),
                locale,
                t("personnel.costsSummaryEmpty")
              )
            )}
          </Card>
        </div>
        <Card
          title={t("personnel.costsSourceBreakdownTitle")}
          description={t("personnel.costsSourceBreakdownDesc")}
        >
          {pending ? (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          ) : (
            <div className="space-y-3">
              {paymentSourceSplit.sourceBuckets.map((bucket) => (
                <div
                  key={bucket.key}
                  className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                      {bucket.key === "PATRON"
                        ? t("personnel.costsSourceBucketPatron")
                        : bucket.key === "PERSONNEL_POCKET"
                          ? t("personnel.costsSourceBucketPersonnelPocket")
                          : t("personnel.costsSourceBucketRegister")}
                    </p>
                    <p className="text-xs font-medium text-zinc-500">
                      {t("personnel.costsSourceBucketCountLabel")}: {bucket.count}
                    </p>
                  </div>
                  {splitPaymentSourceTotalsBody(
                    bucket.totals,
                    t("personnel.dash"),
                    locale,
                    t("personnel.costsSummaryEmpty")
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Card className="mt-4" title={t("personnel.costsSummaryTitle")}>
        {pending ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-xs leading-relaxed text-zinc-600">
              {t("personnel.costsSummaryHint")}
            </p>
            {sortedCurrencyKeys(advSums, expSums).map((ccy) => {
              const a = advSums.get(ccy) ?? 0;
              const e = expSums.get(ccy) ?? 0;
              const dash = t("personnel.dash");
              return (
                <div
                  key={ccy}
                  className="grid gap-2 rounded-lg border border-zinc-100 bg-white/80 p-3 sm:grid-cols-3"
                >
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {t("personnel.costsSummaryAdvances")} ({ccy})
                    </p>
                    <p className="mt-0.5 font-semibold tabular-nums text-zinc-900">
                      {formatMoneyDash(a, dash, locale, ccy)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {t("personnel.costsSummaryRegisterExpenses")} ({ccy})
                    </p>
                    <p className="mt-0.5 font-semibold tabular-nums text-zinc-900">
                      {formatMoneyDash(e, dash, locale, ccy)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                      {t("personnel.costsSummaryCombined")} ({ccy})
                    </p>
                    <p className="mt-0.5 font-semibold tabular-nums text-violet-950">
                      {formatMoneyDash(a + e, dash, locale, ccy)}
                    </p>
                  </div>
                </div>
              );
            })}
            {sortedCurrencyKeys(advSums, expSums).length === 0 && (
              <p className="text-zinc-600">{t("personnel.costsSummaryEmpty")}</p>
            )}
            <div className="grid gap-2 rounded-lg border border-violet-100 bg-violet-50/40 p-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                  {t("personnel.costsTopReceiver")}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-violet-950">
                  {personnelAmountStats.topByAmount?.name ?? t("personnel.dash")}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                  {t("personnel.costsTopLineReceiver")}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-violet-950">
                  {personnelAmountStats.topByLines?.name ?? t("personnel.dash")}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                  {t("personnel.costsLowestReceiver")}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-violet-950">
                  {personnelAmountStats.lowByAmount?.name ?? t("personnel.dash")}
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

export function PersonnelCostsScreen() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const personnelPortal = isPersonnelPortalRole(user?.role);
  const myPersonnelId = user?.personnelId;

  const tab = useMemo((): CostsTab => {
    if (personnelPortal) return "advances";
    const v = searchParams.get("tab")?.toLowerCase();
    if (v === "advances" || v === "expenses") return v;
    if (v === "contractorpayments") return "contractorPayments";
    return "all";
  }, [searchParams, personnelPortal]);

  const setTab = useCallback(
    (next: CostsTab) => {
      if (personnelPortal) return;
      const p = new URLSearchParams(searchParams.toString());
      if (next === "all") p.delete("tab");
      else p.set("tab", next);
      const qs = p.toString();
      router.replace(qs ? `/personnel/costs?${qs}` : "/personnel/costs", {
        scroll: false,
      });
    },
    [router, searchParams, personnelPortal]
  );

  const { data: branches = [] } = useBranchesList();
  const { data: personnelListResult } = usePersonnelList(
    defaultPersonnelListFilters,
    !personnelPortal
  );
  const personnelRaw = personnelListResult?.items ?? [];
  const [yearInput, setYearInput] = useState("");
  const [personnelValue, setPersonnelValue] = useState("");
  const [branchValue, setBranchValue] = useState("");
  /** null = use automatic default (20 narrow / 500 desktop) */
  const [limitInput, setLimitInput] = useState<string | null>(null);
  const [paymentFromValue, setPaymentFromValue] = useState("");
  /** Filtre: boş | yalnız avans | yalnız gider (birleşik liste). */
  const [costsRowKindFilter, setCostsRowKindFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  /** YYYY-MM drill-down filter; "" disables. */
  const [monthFilter, setMonthFilter] = useState("");
  const [settlementPrintOpen, setSettlementPrintOpen] = useState(false);
  const [expenseTxOpen, setExpenseTxOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [pageHelpOpen, setPageHelpOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isNarrow = useMatchMedia("(max-width: 767px)");
  const defaultLimitNum = isNarrow ? 20 : 50;
  const defaultLimitStr = String(defaultLimitNum);
  const limitFieldValue = limitInput ?? defaultLimitStr;
  const [costsSort, setCostsSort] = useState<NonAdvanceExpenseSort>(
    DEFAULT_NON_ADVANCE_EXPENSE_SORT
  );

  useEffect(() => {
    setCostsSort((s) => clampSortForTab(tab, s));
  }, [tab]);

  useEffect(() => {
    setCostsRowKindFilter("");
    setMonthFilter("");
  }, [tab]);

  useEffect(() => {
    setFiltersOpen(false);
  }, [tab]);

  const costsHeaderPersonnelId = useMemo(() => {
    const pe = personnelValue.trim();
    const pid = pe ? parseInt(pe, 10) : NaN;
    return Number.isFinite(pid) && pid > 0 ? pid : undefined;
  }, [personnelValue]);

  const activePersonnel = useMemo(
    () => personnelRaw.filter((p) => !p.isDeleted),
    [personnelRaw]
  );

  const personnelOptions = useMemo(() => {
    const rows = personnelRaw
      .filter((p) => !p.isDeleted)
      .slice()
      .sort((a, b) =>
        personnelDisplayName(a).localeCompare(personnelDisplayName(b), undefined, {
          sensitivity: "base",
        })
      );
    return [
      { value: "", label: t("personnel.allAdvancesAnyPersonnel") },
      ...rows.map((p) => ({
        value: String(p.id),
        label: personnelDisplayName(p),
      })),
    ];
  }, [personnelRaw, t]);

  const listParams = useMemo(() => {
    const y = yearInput.trim();
    const yearParsed = y ? parseInt(y, 10) : NaN;
    const effectiveYear =
      Number.isFinite(yearParsed) && yearParsed >= 1900 && yearParsed <= 9999
        ? yearParsed
        : undefined;
    const pe = personnelValue.trim();
    const pid = pe ? parseInt(pe, 10) : 0;
    const br = branchValue.trim();
    const bid = br ? parseInt(br, 10) : 0;
    const lim = limitFieldValue.trim();
    const limParsed = lim ? parseInt(lim, 10) : defaultLimitNum;
    const limit =
      Number.isFinite(limParsed) && limParsed >= 1 && limParsed <= 1000
        ? limParsed
        : defaultLimitNum;
    return {
      effectiveYear,
      personnelId: pid > 0 ? pid : undefined,
      branchId: bid > 0 ? bid : undefined,
      limit,
    };
  }, [yearInput, personnelValue, branchValue, limitFieldValue, defaultLimitNum]);

  const allAdvancesQuery = useAllAdvancesList(listParams, !personnelPortal);
  const ownAdvancesQuery = useQuery({
    queryKey: personnelKeys.advances(
      myPersonnelId ?? 0,
      listParams.effectiveYear
    ),
    queryFn: () =>
      fetchAdvancesByPersonnel(myPersonnelId!, listParams.effectiveYear),
    enabled:
      personnelPortal && myPersonnelId != null && myPersonnelId > 0,
  });

  const expenseFetchSort = useMemo(
    () => expenseApiSortForTab(tab, costsSort),
    [tab, costsSort]
  );

  const expensesQuery = useQuery({
    queryKey: personnelKeys.nonAdvanceAttributedExpenses(expenseFetchSort),
    queryFn: () =>
      fetchAllNonAdvancePersonnelAttributedExpenses(expenseFetchSort),
    enabled: !personnelPortal,
  });

  const advancesData: AdvanceListItem[] = useMemo(() => {
    if (personnelPortal) {
      const raw = ownAdvancesQuery.data ?? [];
      const dash = t("personnel.dash");
      const pname = user?.fullName?.trim() || dash;
      return raw.map((a) => ({
        ...a,
        personnelFullName: pname,
        branchName:
          branches.find((b) => b.id === a.branchId)?.name?.trim() || dash,
      }));
    }
    return allAdvancesQuery.data ?? [];
  }, [
    personnelPortal,
    ownAdvancesQuery.data,
    allAdvancesQuery.data,
    branches,
    user?.fullName,
    t,
  ]);

  const expenseFilterOpts = useMemo(
    () => ({
      branchId: listParams.branchId,
      personnelId: listParams.personnelId,
      year: listParams.effectiveYear,
    }),
    [listParams.branchId, listParams.personnelId, listParams.effectiveYear]
  );

  const expensesScopedOnly = useMemo(() => {
    const raw = expensesQuery.data ?? [];
    return filterNonAdvanceExpenseRows(raw, expenseFilterOpts);
  }, [expensesQuery.data, expenseFilterOpts]);

  const paymentSourceSplit = useMemo(() => {
    const branch = new Map<string, number>();
    const sourceBuckets: Record<SourceBucketKey, SourceBucketSummary> = {
      PATRON: { key: "PATRON", count: 0, totals: new Map<string, number>() },
      PERSONNEL_POCKET: {
        key: "PERSONNEL_POCKET",
        count: 0,
        totals: new Map<string, number>(),
      },
      REGISTER: { key: "REGISTER", count: 0, totals: new Map<string, number>() },
    };

    const addBucket = (
      bucket: SourceBucketKey | null,
      ccy: string | null | undefined,
      amt: unknown
    ) => {
      if (!bucket) return;
      sourceBuckets[bucket].count += 1;
      bumpCurrencyMap(sourceBuckets[bucket].totals, ccy, amt);
    };

    for (const a of advancesData) {
      const bucket = normalizeAdvancePaymentSource(a.sourceType);
      addBucket(bucket, a.currencyCode, a.amount);
      if (bucket === "REGISTER") bumpCurrencyMap(branch, a.currencyCode, a.amount);
    }
    for (const r of expensesScopedOnly) {
      const bucket = normalizeExpensePaymentSource(r.expensePaymentSource);
      addBucket(bucket, r.currencyCode, r.amount);
      if (bucket === "REGISTER") bumpCurrencyMap(branch, r.currencyCode, r.amount);
    }
    return {
      branch,
      sourceBuckets: [
        sourceBuckets.PATRON,
        sourceBuckets.PERSONNEL_POCKET,
        sourceBuckets.REGISTER,
      ],
    };
  }, [advancesData, expensesScopedOnly]);

  const paymentFromNorm = paymentFromValue.trim().toUpperCase();

  const advancesFiltered = useMemo(() => {
    if (!paymentFromNorm) return advancesData;
    return advancesData.filter((a) => {
      const st = String(a.sourceType ?? "").trim().toUpperCase();
      if (paymentFromNorm === "REGISTER") return st === "CASH" || st === "";
      if (paymentFromNorm === "PATRON") return st === "PATRON";
      if (paymentFromNorm === "PERSONNEL_POCKET")
        return st === "PERSONNEL_HELD_REGISTER_CASH" || st === "PERSONNEL_POCKET";
      return false;
    });
  }, [advancesData, paymentFromNorm]);

  const expensesFiltered = useMemo(() => {
    const raw = expensesQuery.data ?? [];
    let rows = filterNonAdvanceExpenseRows(raw, expenseFilterOpts);
    if (!paymentFromNorm) return rows;
    return rows.filter(
      (r) =>
        String(r.expensePaymentSource ?? "").trim().toUpperCase() ===
        paymentFromNorm
    );
  }, [expensesQuery.data, expenseFilterOpts, paymentFromNorm]);

  const advancesPending = personnelPortal
    ? ownAdvancesQuery.isPending
    : allAdvancesQuery.isPending;
  const advancesError = personnelPortal
    ? ownAdvancesQuery.isError
    : allAdvancesQuery.isError;
  const advancesErr = personnelPortal
    ? ownAdvancesQuery.error
    : allAdvancesQuery.error;
  const refetchAdvances = personnelPortal
    ? ownAdvancesQuery.refetch
    : allAdvancesQuery.refetch;

  const advSums = useMemo(
    () => sumByCurrency(advancesFiltered),
    [advancesFiltered]
  );
  const expSums = useMemo(
    () => sumByCurrency(expensesFiltered),
    [expensesFiltered]
  );

  const combinedSums = useMemo(() => {
    const m = new Map<string, number>(advSums);
    for (const [k, v] of expSums) m.set(k, (m.get(k) ?? 0) + v);
    return m;
  }, [advSums, expSums]);

  // Dış çalışan (taşeron) gideri (lifetime). Üstte NET = Σ yapılan iş (toplam gider);
  // altında kırılım: Ödenen (Σ ödeme) · Borç (Σ bakiye = kalan, hâlâ borçluyuz).
  // Personel toplam maliyetine KATILMAZ; en üstte ayrı kart.
  const contractorsQuery = useContractors(false);
  const contractorTotals = useMemo(() => {
    let work = 0;
    let paid = 0;
    let debt = 0;
    for (const c of contractorsQuery.data ?? []) {
      work += Number(c.totalWork) || 0;
      paid += Number(c.totalPaid) || 0;
      debt += Number(c.balance) || 0;
    }
    return { work, paid, debt };
  }, [contractorsQuery.data]);
  // Üst (net) = kalan borç bakiyesi (Σ balance = borçlanan − ödenen).
  const contractorNetSums = useMemo(() => {
    const m = new Map<string, number>();
    if ((contractorsQuery.data?.length ?? 0) > 0) m.set("TRY", contractorTotals.debt);
    return m;
  }, [contractorsQuery.data?.length, contractorTotals.debt]);

  /** Filtreler uygulanmış, tab/kind/month'tan bağımsız tüm satırlar. */
  const allFilteredRows = useMemo(
    () => buildPersonnelCostRows(advancesFiltered, expensesFiltered, "all"),
    [advancesFiltered, expensesFiltered]
  );

  const advanceCategoryLabel = t("personnel.costsCategoryAdvanceLabel");
  const uncategorizedLabel = t("personnel.costsCategoryUncategorized");
  // Ham ledger kodunu (OUT_PER_UNIFORM vb.) okunaklı, çok dilli etikete çevir; eşleşme yoksa kodu bırak.
  const resolveCategoryLabel = useCallback(
    (code: string) => {
      const key = `ledgerClass.${code}`;
      const label = t(key);
      return label === key ? code : label;
    },
    [t]
  );
  const categoryBuckets = useMemo(
    () =>
      groupRowsByCategory(
        allFilteredRows,
        advanceCategoryLabel,
        uncategorizedLabel,
        resolveCategoryLabel
      ),
    [allFilteredRows, advanceCategoryLabel, uncategorizedLabel, resolveCategoryLabel]
  );

  const monthlyBuckets = useMemo(
    () => groupRowsByMonth(allFilteredRows),
    [allFilteredRows]
  );

  const monthLabelFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
        year: "numeric",
        month: "long",
      }),
    [locale]
  );

  const formatMonthLabel = useCallback(
    (ym: string) => {
      const [yStr, mStr] = ym.split("-");
      const y = Number(yStr);
      const m = Number(mStr);
      if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
        return ym;
      }
      return monthLabelFormatter.format(new Date(y, m - 1, 1));
    },
    [monthLabelFormatter]
  );

  const branchOptions = useMemo(
    () => [
      { value: "", label: t("personnel.allAdvancesAnyBranch") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const paymentFromOptions = useMemo(
    () => [
      { value: "", label: t("personnel.costsFilterPaymentFromAll") },
      { value: "REGISTER", label: t("personnel.detailAdvanceSourceFilterBranch") },
      { value: "PATRON", label: t("personnel.detailAdvanceSourceFilterPatron") },
    ],
    [t]
  );

  const rowKindFilterOptions = useMemo(
    () => [
      { value: "", label: t("personnel.costsFilterRowKindAll") },
      { value: "advance", label: t("personnel.costsFilterRowKindAdvance") },
      { value: "expense", label: t("personnel.costsFilterRowKindExpense") },
      { value: "contractorPayment", label: t("personnel.costsFilterRowKindContractor") },
    ],
    [t]
  );

  const filtersActive = useMemo(() => {
    const pay = paymentFromValue.trim() !== "";
    const kind = costsRowKindFilter.trim().toLowerCase();
    const kindOn = kind === "advance" || kind === "expense" || kind === "contractorpayment";
    const dateOn = dateFromFilter.trim() !== "" || dateToFilter.trim() !== "";
    if (personnelPortal) {
      return yearInput.trim() !== "" || pay || kindOn || dateOn;
    }
    const lim = limitFieldValue.trim();
    const limitCustom =
      limitInput !== null && lim !== "" && lim !== defaultLimitStr;
    return (
      yearInput.trim() !== "" ||
      personnelValue !== "" ||
      branchValue !== "" ||
      limitCustom ||
      pay ||
      kindOn ||
      dateOn
    );
  }, [
    personnelPortal,
    yearInput,
    personnelValue,
    branchValue,
    limitFieldValue,
    limitInput,
    defaultLimitStr,
    paymentFromValue,
    dateFromFilter,
    dateToFilter,
    costsRowKindFilter,
  ]);

  const branchNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const b of branches) m.set(b.id, b.name);
    return m;
  }, [branches]);

  const patronByBranchRows = useMemo(
    () =>
      buildPatronTotalsByBranch(
        advancesData,
        expensesScopedOnly,
        branchNameById,
        t("personnel.nonAdvanceExpenseBranchOrg")
      ),
    [advancesData, expensesScopedOnly, branchNameById, t]
  );

  // Dış çalışan ödemeleri (yalnız "all" görünümünde tabloya eklenir; KPI/kırılımlara girmez).
  // Yıl (ödeme tarihi), şube ve ödeme-kaynağı filtrelerine uyar; personel filtresi aktifse gizlenir
  // (ödemeler bir personele bağlı değildir).
  const contractorPaymentsQuery = useAllContractorPayments(!personnelPortal);
  const contractorPaymentsFiltered = useMemo(() => {
    if (personnelPortal || listParams.personnelId) return [];
    const all = contractorPaymentsQuery.data ?? [];
    const year = listParams.effectiveYear;
    const bid = listParams.branchId;
    const src = paymentFromNorm;
    return all.filter((p) => {
      if (year) {
        const y = Number.parseInt(String(p.paymentDate).slice(0, 4), 10);
        if (y !== year) return false;
      }
      if (bid && p.branchId !== bid) return false;
      if (src === "REGISTER" && p.paymentSource !== "BRANCH_REGISTER") return false;
      if (src === "PATRON" && p.paymentSource !== "PATRON") return false;
      return true;
    });
  }, [
    contractorPaymentsQuery.data,
    personnelPortal,
    listParams.personnelId,
    listParams.effectiveYear,
    listParams.branchId,
    paymentFromNorm,
  ]);

  const combinedRaw = useMemo(
    () => buildPersonnelCostRows(advancesFiltered, expensesFiltered, tab, contractorPaymentsFiltered),
    [advancesFiltered, expensesFiltered, tab, contractorPaymentsFiltered]
  );

  const displaySort = useMemo(
    () => clampSortForTab(tab, costsSort),
    [tab, costsSort]
  );

  const displayRows = useMemo(() => {
    if (tab === "expenses" && displaySort === "categoryTotalDesc") {
      return combinedRaw;
    }
    return sortPersonnelCostRows(combinedRaw, displaySort);
  }, [tab, combinedRaw, displaySort]);

  const displayRowsFiltered = useMemo(() => {
    const k = costsRowKindFilter.trim().toLowerCase();
    const kindFiltered =
      k === "advance" || k === "expense"
        ? displayRows.filter((r) => r.kind === k)
        : k === "contractorpayment"
          ? displayRows.filter((r) => r.kind === "contractorPayment")
          : displayRows;
    const dateFiltered = filterRowsByDateRange(
      kindFiltered,
      dateFromFilter || null,
      dateToFilter || null
    );
    return filterRowsByMonth(dateFiltered, monthFilter || null);
  }, [displayRows, costsRowKindFilter, monthFilter, dateFromFilter, dateToFilter]);

  const personnelAmountStats = useMemo(() => {
    const dash = t("personnel.dash");
    const stats = new Map<string, PersonnelAmountStat>();
    const touch = (rawName: string | null | undefined, amount: number, ccy: string) => {
      const name = rawName?.trim() || dash;
      const item = stats.get(name) ?? { name, totalTry: 0, lineCount: 0 };
      item.lineCount += 1;
      if (String(ccy ?? "TRY").trim().toUpperCase() === "TRY") item.totalTry += amount;
      stats.set(name, item);
    };

    for (const row of displayRowsFiltered) {
      if (row.kind === "advance") {
        touch(
          row.advance.personnelFullName,
          Number(row.advance.amount),
          row.advance.currencyCode
        );
        continue;
      }
      // Dış çalışan ödemeleri personel değil → "en çok alan" istatistiğine girmez.
      if (row.kind === "contractorPayment") continue;
      touch(
        row.expense.linkedPersonnelFullName ??
          row.expense.expensePocketPersonnelFullName ??
          row.expense.linkedAdvancePersonnelFullName,
        Number(row.expense.amount),
        row.expense.currencyCode
      );
    }

    const arr = [...stats.values()];
    const byAmountDesc = arr
      .slice()
      .sort((a, b) => b.totalTry - a.totalTry || b.lineCount - a.lineCount);
    const byAmountAsc = arr
      .slice()
      .sort((a, b) => a.totalTry - b.totalTry || a.lineCount - b.lineCount);
    const byLineDesc = arr.slice().sort((a, b) => b.lineCount - a.lineCount || b.totalTry - a.totalTry);

    return {
      topByAmount: byAmountDesc[0] ?? null,
      topByLines: byLineDesc[0] ?? null,
      lowByAmount: byAmountAsc[0] ?? null,
    };
  }, [displayRowsFiltered, t]);

  const todayIso = useMemo(() => localIsoDate(), []);
  const costColumns = useMemo(
    () => createPersonnelCostColumns(t, locale, branchNameById, todayIso),
    [t, locale, branchNameById, todayIso]
  );

  const listLoading = useMemo(() => {
    if (personnelPortal) return advancesPending;
    if (tab === "advances") return advancesPending;
    if (tab === "expenses") return expensesQuery.isPending;
    if (tab === "contractorPayments") return contractorPaymentsQuery.isPending;
    return advancesPending || expensesQuery.isPending;
  }, [personnelPortal, tab, advancesPending, expensesQuery.isPending, contractorPaymentsQuery.isPending]);

  const showAdvancesBlockError =
    advancesError && (personnelPortal || tab === "all" || tab === "advances");
  const showExpensesBlockError =
    !personnelPortal && expensesQuery.isError && (tab === "all" || tab === "expenses");

  const tabBtnClass = (active: boolean) =>
    cn(
      "min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-4",
      active
        ? "border-violet-300 bg-violet-50 text-violet-900"
        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
    );

  useEffect(() => {
    if (!personnelPortal) return;
    const tParam = searchParams.get("tab")?.toLowerCase();
    if (tParam === "expenses" || tParam === "all") {
      router.replace("/personnel/costs", { scroll: false });
    }
  }, [personnelPortal, searchParams, router]);

  const personnelCostsPageHelpItems = useMemo(
    () => [
      { text: t("pageHelp.personnelCosts.step1") },
      { text: t("pageHelp.personnelCosts.step2") },
      {
        text: t("pageHelp.personnelCosts.step3"),
        ...(canSeeFinancialReports(user)
          ? {
              link: {
                href: "/reports/financial/tables",
                label: t("pageHelp.personnelCosts.step3Link"),
              },
            }
          : {}),
      },
    ],
    [t, user]
  );

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-4 px-4 pb-8 pt-4 sm:gap-6 sm:px-6 lg:px-8">
      <PageContentSection
        variant="intro"
        eyebrow={t("common.pageSectionIntro")}
        sectionLabelId="personnel-costs-section-intro"
      >
        <PageTitleWithHelp
          title={t("personnel.costsTitle")}
          subtitle={t("personnel.costsDesc")}
          onHelpClick={() => setPageHelpOpen(true)}
          helpAriaLabel={t("common.pageHelpHintLabel")}
        />
      </PageContentSection>

      <PageHelpModal
        open={pageHelpOpen}
        onClose={() => setPageHelpOpen(false)}
        description={t("pageHelp.personnelCosts.intro")}
        listVariant="ordered"
        guideTab="personnel"
        items={personnelCostsPageHelpItems}
      />

      {!personnelPortal ? (
        <PageContentSection
          variant="surface"
          eyebrow={t("common.pageSectionSummary")}
          sectionLabelId="personnel-costs-section-summary"
        >
          <PersonnelCostsTopSummary
            t={t}
            locale={locale}
            pending={advancesPending || expensesQuery.isPending}
            advSums={advSums}
            expSums={expSums}
            combinedSums={combinedSums}
            contractorNetSums={contractorNetSums}
            contractorOwed={contractorTotals.work}
            contractorPaid={contractorTotals.paid}
            contractorPending={contractorsQuery.isPending}
            advanceCount={advancesFiltered.length}
            expenseCount={expensesFiltered.length}
            categoryBuckets={categoryBuckets}
            sourceBuckets={paymentSourceSplit.sourceBuckets}
            monthlyBuckets={monthlyBuckets}
            monthFilter={monthFilter}
            onMonthFilterChange={setMonthFilter}
            formatMonthLabel={formatMonthLabel}
          />
          <details className="group mt-4 rounded-xl border border-zinc-200/90 bg-white/85 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-zinc-900 sm:px-4 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 leading-snug">
                {t("personnel.costsDetailSectionToggle")}
              </span>
              <svg
                className="h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="border-t border-zinc-100 px-3 pb-4 pt-3 sm:px-4">
              <PersonnelCostsSummaryPanels
                t={t}
                locale={locale}
                advancesPending={advancesPending}
                expensesPending={expensesQuery.isPending}
                patronByBranchRows={patronByBranchRows}
                paymentSourceSplit={paymentSourceSplit}
                advSums={advSums}
                expSums={expSums}
                personnelAmountStats={personnelAmountStats}
              />
            </div>
          </details>
        </PageContentSection>
      ) : null}

      <PageContentSection
        variant="plain"
        sectionAriaLabel={t("common.pageSectionMain")}
        sectionLabelId="personnel-costs-section-main"
        mobileFrame="flush"
      >
        <div className="min-w-0 bg-white" aria-labelledby="personnel-costs-table-title">
          {!personnelPortal ? (
            <div
              className={cn(
                "flex flex-wrap gap-2 border-b border-zinc-100 bg-zinc-50/80 px-2 py-2 sm:px-3",
                "max-sm:sticky max-sm:top-0 max-sm:z-10 max-sm:bg-zinc-50/95 max-sm:backdrop-blur-sm supports-[backdrop-filter]:max-sm:bg-zinc-50/90"
              )}
              role="tablist"
              aria-label={t("personnel.costsTabsAria")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === "all"}
                className={tabBtnClass(tab === "all")}
                onClick={() => setTab("all")}
              >
                {t("personnel.costsTabAll")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "advances"}
                className={tabBtnClass(tab === "advances")}
                onClick={() => setTab("advances")}
              >
                {t("personnel.costsTabAdvances")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "expenses"}
                className={tabBtnClass(tab === "expenses")}
                onClick={() => setTab("expenses")}
              >
                {t("personnel.costsTabExpenses")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "contractorPayments"}
                className={tabBtnClass(tab === "contractorPayments")}
                onClick={() => setTab("contractorPayments")}
              >
                {t("personnel.costsTabContractor")}
              </button>
            </div>
          ) : null}

          <div className="border-b border-zinc-100 bg-white px-3 py-3 sm:px-4 sm:py-3.5">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <h2
                id="personnel-costs-table-title"
                className="min-w-0 text-base font-semibold leading-snug tracking-tight text-zinc-900 sm:text-[1.0625rem]"
              >
                {t("personnel.costsTableHeading")}
              </h2>
              <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2">
                <Tooltip content={t("personnel.allAdvancesFilters")} delayMs={200}>
                  <button
                    type="button"
                    className={cn(
                      "relative flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/90 text-zinc-700 shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70",
                      filtersActive && "border-violet-300 bg-violet-50/90 text-violet-900"
                    )}
                    aria-label={t("common.filters")}
                    aria-expanded={filtersOpen}
                    onClick={() => setFiltersOpen(true)}
                  >
                    <FilterFunnelIcon className="h-5 w-5" />
                    {filtersActive ? (
                      <span
                        className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </Tooltip>
                {!personnelPortal ? (
                  <>
                    <Tooltip content={t("personnel.costsAddAdvance")} delayMs={200}>
                      <Button
                        type="button"
                        variant="secondary"
                        className={TABLE_TOOLBAR_ICON_BTN}
                        disabled={activePersonnel.length === 0}
                        onClick={() => setAdvanceOpen(true)}
                        aria-label={t("personnel.costsAddAdvance")}
                      >
                        <CostsIconAdvance className="h-5 w-5" />
                      </Button>
                    </Tooltip>
                    <Tooltip content={t("personnel.costsAddPersonnelExpense")} delayMs={200}>
                      <Button
                        type="button"
                        variant="primary"
                        className={TABLE_TOOLBAR_ICON_BTN}
                        onClick={() => setExpenseTxOpen(true)}
                        aria-label={t("personnel.costsAddPersonnelExpense")}
                      >
                        <CostsIconExpense className="h-5 w-5" />
                      </Button>
                    </Tooltip>
                    <Tooltip content={t("personnel.settlementPrintOpen")} delayMs={200}>
                      <Button
                        type="button"
                        variant="secondary"
                        className={TABLE_TOOLBAR_ICON_BTN}
                        onClick={() => setSettlementPrintOpen(true)}
                        aria-label={t("personnel.settlementPrintOpen")}
                      >
                        <CostsIconPrint className="h-5 w-5" />
                      </Button>
                    </Tooltip>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-3 p-4 sm:p-5">
            {monthFilter ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200 bg-violet-50/70 px-3 py-2 text-sm text-violet-900">
                <span>
                  {t("personnel.costsMonthlyActiveLine").replace(
                    "{label}",
                    formatMonthLabel(monthFilter)
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setMonthFilter("")}
                  className="rounded-md border border-violet-300 bg-white px-2 py-1 text-xs font-medium text-violet-800 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
                >
                  {t("personnel.costsMonthlyClearFilter")}
                </button>
              </div>
            ) : null}
            <NonAdvanceExpenseSortBar
              value={displaySort}
              onChange={setCostsSort}
              t={t}
              includeCategorySort={!personnelPortal && tab === "expenses"}
              groupAriaLabelKey="personnel.costsSortGroupAria"
            />
            <p className="text-xs leading-relaxed text-zinc-500">
              {personnelPortal
                ? t("personnel.costsSortHintPortal")
                : tab === "expenses"
                  ? t("personnel.nonAdvanceSortServerHint")
                  : t("personnel.costsSortHint")}
            </p>
            {showAdvancesBlockError ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-red-600">{toErrorMessage(advancesErr)}</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={() => refetchAdvances()}
                >
                  {t("common.retry")}
                </Button>
              </div>
            ) : null}
            {showExpensesBlockError ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-red-600">
                  {toErrorMessage(expensesQuery.error)}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={() => void expensesQuery.refetch()}
                >
                  {t("common.retry")}
                </Button>
              </div>
            ) : null}
            {listLoading ? (
              <p className="text-sm text-zinc-500" aria-busy="true">
                {t("common.loading")}
              </p>
            ) : null}
            {!listLoading && displayRowsFiltered.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("personnel.costsUnifiedEmpty")}</p>
            ) : null}
            {!listLoading && displayRowsFiltered.length > 0 ? (
              <>
                <ResponsiveTableFrame
                  mobileProps={{ "aria-label": t("personnel.costsUnifiedTableTitle") }}
                  desktopInsetScroll
                  mobile={displayRowsFiltered.map((row) => (
                    <PersonnelCostMobileCard
                      key={row.key}
                      row={row}
                      locale={locale}
                      t={t}
                      branchNameById={branchNameById}
                      todayIso={todayIso}
                    />
                  ))}
                  desktop={
                    <DataTable
                      columns={costColumns}
                      rows={displayRowsFiltered}
                      getRowKey={(r) => r.key}
                      tableClassName="w-full min-w-0 lg:min-w-[70rem] xl:min-w-[78rem]"
                    />
                  }
                />
                {!personnelPortal ? (
                  <p className="text-xs leading-relaxed text-zinc-500">
                    {t("personnel.nonAdvanceExpensesFootnote")}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

      <RightDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t("personnel.allAdvancesFilters")}
        closeLabel={t("common.close")}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-1">
            <Input
              name="effectiveYear"
              label={t("personnel.allAdvancesYearOptional")}
              type="number"
              inputMode="numeric"
              min={1900}
              max={9999}
              placeholder={t("personnel.fieldOptionalPlaceholder")}
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                name="dateFromFilter"
                type="date"
                label={t("personnel.costsFilterDateFrom")}
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
              <Input
                name="dateToFilter"
                type="date"
                label={t("personnel.costsFilterDateTo")}
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
            </div>
            <Select
              name="paymentFromFilter"
              label={t("personnel.costsColPaymentFrom")}
              options={paymentFromOptions}
              value={paymentFromValue}
              onChange={(e) => setPaymentFromValue(e.target.value)}
              onBlur={() => {}}
            />
            <Select
              name="costsRowKindFilter"
              label={t("personnel.costsFilterRowKind")}
              options={rowKindFilterOptions}
              value={costsRowKindFilter}
              onChange={(e) => setCostsRowKindFilter(e.target.value)}
              onBlur={() => {}}
            />
            {!personnelPortal ? (
              <>
                <Select
                  name="personnelFilter"
                  label={t("personnel.tableName")}
                  options={personnelOptions}
                  value={personnelValue}
                  onChange={(e) => setPersonnelValue(e.target.value)}
                  onBlur={() => {}}
                />
                <Select
                  name="branchFilter"
                  label={t("personnel.tableBranch")}
                  options={branchOptions}
                  value={branchValue}
                  onChange={(e) => setBranchValue(e.target.value)}
                  onBlur={() => {}}
                />
                <Input
                  name="limit"
                  label={t("personnel.allAdvancesLimit")}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  value={limitFieldValue}
                  onChange={(e) => setLimitInput(e.target.value)}
                />
              </>
            ) : null}
          </div>
          {!personnelPortal ? (
            <p className="text-xs text-zinc-500">{t("personnel.allAdvancesLimitHint")}</p>
          ) : null}
          {!personnelPortal ? (
            <p className="text-xs text-zinc-500">{t("personnel.costsFiltersFootnote")}</p>
          ) : null}
          <p className="text-xs text-zinc-500">{t("personnel.costsFilterPaymentFromHint")}</p>
        </div>
      </RightDrawer>
      </PageContentSection>

      {!personnelPortal ? (
        <>
          <PersonnelCostsExpenseModal
            open={expenseTxOpen}
            onClose={() => setExpenseTxOpen(false)}
            defaultLinkedPersonnelId={costsHeaderPersonnelId}
            defaultEffectiveYear={listParams.effectiveYear}
          />
          <AdvancePersonnelModal
            open={advanceOpen}
            onClose={() => setAdvanceOpen(false)}
            personnel={activePersonnel}
            initialPersonnelId={costsHeaderPersonnelId ?? null}
          />
          <PersonnelSettlementPrintModal
            open={settlementPrintOpen}
            onClose={() => setSettlementPrintOpen(false)}
            branches={branches}
            personnelList={personnelRaw}
            branchNameById={branchNameById}
            locale={locale}
          />
        </>
      ) : null}
    </div>
  );
}
