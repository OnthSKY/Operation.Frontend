"use client";

import { useI18n } from "@/i18n/context";
import { financialBreakdownCategoryLabel } from "@/modules/reports/lib/financial-breakdown-labels";
import { reportBranchLabel } from "@/modules/reports/lib/report-branch-label";
import {
  ReportExpensePaymentMix,
  sortExpensePaymentRows,
} from "@/modules/reports/lib/report-expense-payment";
import { ReportFinancialTimeSeriesCharts } from "@/modules/reports/components/ReportFinancialTimeSeriesCharts";
import type {
  FinancialBranchMonthlyBreakdownRow,
  FinancialMonthlyBreakdownRow,
  FinancialReport,
} from "@/types/reports";
import { cn } from "@/lib/cn";
import { Card } from "@/shared/components/Card";
import { RechartsMeasureBox } from "@/shared/components/RechartsMeasureBox";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { useMediaMinWidth } from "@/shared/lib/use-media-min-width";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COL_INCOME = "#059669";
const COL_EXPENSE = "#dc2626";
const COL_DELTA_UP = "#047857";
const COL_DELTA_DOWN = "#b91c1c";
const CAT_COLORS = [
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#2563eb",
  "#0d9488",
  "#64748b",
];

function tpl(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ""));
}

function pctPart(numerator: number, denominator: number): number {
  if (!(denominator > 0) || !Number.isFinite(numerator)) return 0;
  return Math.min(100, Math.max(0, Math.round((numerator / denominator) * 100)));
}

export type ReportsFinancialStorySegment = "all" | "summary" | "charts" | "compare";

type Props = {
  data: FinancialReport;
  monthlyRows?: FinancialMonthlyBreakdownRow[] | null;
  branchMonthlyRows?: FinancialBranchMonthlyBreakdownRow[] | null;
  showBranchNetByMonth?: boolean;
  /** Ek finans filtresindeki para birimi; boşsa grafikler TRY veya ilk mevcut para birimini kullanır. */
  filterCurrencyCode?: string;
  /** false: kümülatif zaman serisi özetten çıkarılır (ayrı trend sayfasında). */
  includeCumulativeTrendCharts?: boolean;
  /** Sayfa kırılımı: özet / grafikler / karşılaştırma; all = tek sayfada hepsi (varsayılan). */
  storySegment?: ReportsFinancialStorySegment;
  /** Örn. özet sayfası üst boşluk (`mt-4`). */
  className?: string;
};

function truncLabel(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

type FinSummaryScope = "filter" | "cumulative" | "distribution" | "ranking";

const SCOPE_BADGE: Record<FinSummaryScope, string> = {
  filter: "border-violet-200/90 bg-violet-50 text-violet-900",
  cumulative: "border-teal-200/90 bg-teal-50 text-teal-900",
  distribution: "border-sky-200/90 bg-sky-50 text-sky-900",
  ranking: "border-zinc-300/90 bg-zinc-100 text-zinc-800",
};

const SCOPE_RAIL: Record<FinSummaryScope, string> = {
  filter: "bg-violet-500",
  cumulative: "bg-teal-500",
  distribution: "bg-sky-500",
  ranking: "bg-zinc-500",
};

function FinSummaryStorySection({
  t,
  scope,
  title,
  description,
  children,
}: {
  t: (key: string) => string;
  scope: FinSummaryScope;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const badgeKey =
    scope === "filter"
      ? "reports.finStoryScopeBadgeFilter"
      : scope === "cumulative"
        ? "reports.finStoryScopeBadgeCumulative"
        : scope === "distribution"
          ? "reports.finStoryScopeBadgeDistribution"
          : "reports.finStoryScopeBadgeRanking";
  return (
    <section className="min-w-0 scroll-mt-4 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/[0.025]">
      <div className="flex min-w-0 gap-0">
        <div
          className={cn("w-1 shrink-0 self-stretch", SCOPE_RAIL[scope])}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <header className="border-b border-zinc-100 px-3 py-3 sm:px-5 sm:py-4">
            <span
              className={cn(
                "inline-flex rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.14em]",
                SCOPE_BADGE[scope]
              )}
            >
              {t(badgeKey)}
            </span>
            <h2 className="mt-3 text-base font-semibold leading-snug text-zinc-900 sm:text-lg">
              {title}
            </h2>
            {description ? (
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 sm:text-sm">
                {description}
              </p>
            ) : null}
          </header>
          <div className="space-y-4 px-3 py-4 sm:space-y-5 sm:px-5 sm:py-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function ReportFinancialStoryCharts({
  data,
  monthlyRows,
  branchMonthlyRows,
  showBranchNetByMonth = false,
  filterCurrencyCode = "",
  includeCumulativeTrendCharts = true,
  storySegment = "all",
  className,
}: Props) {
  const { t, locale } = useI18n();
  const smUp = useMediaMinWidth(640);
  const lgUp = useMediaMinWidth(1024);
  const trends = data.branchTrends ?? [];
  const netCompare = data.netCompareByCurrency ?? [];
  const cmpFrom = data.comparePeriodFrom;
  const cmpTo = data.comparePeriodTo;

  const segment = storySegment;
  const execKpiBand =
    segment === "summary" ||
    (segment === "all" && !includeCumulativeTrendCharts);
  const showGradientHero =
    segment === "all" && includeCumulativeTrendCharts;
  const showRanking = segment === "all" || segment === "charts";
  const showFilterStory = segment === "all" || segment === "compare";
  const showDistribution = segment === "all" || segment === "charts";

  const currencies = useMemo(
    () => data.totalsByCurrency.map((x) => x.currencyCode),
    [data.totalsByCurrency]
  );
  const ccy = useMemo(() => {
    const want = filterCurrencyCode.trim();
    if (want && currencies.includes(want)) return want;
    if (currencies.includes("TRY")) return "TRY";
    return currencies[0] ?? "TRY";
  }, [filterCurrencyCode, currencies]);

  const ccyTotalsRow = useMemo(
    () => data.totalsByCurrency.find((x) => x.currencyCode === ccy) ?? null,
    [data.totalsByCurrency, ccy]
  );

  const incomeRegisterForCcy = useMemo(() => {
    if (!ccyTotalsRow) return null;
    const code = ccyTotalsRow.currencyCode;
    const rows = data.incomeRegisterBreakdownByCurrency ?? [];
    return (
      rows.find(
        (x) =>
          x.currencyCode.trim().toUpperCase() === code.trim().toUpperCase()
      ) ?? null
    );
  }, [data.incomeRegisterBreakdownByCurrency, ccyTotalsRow]);

  const expensePayBreakdownForCcy = useMemo(() => {
    if (!ccyTotalsRow) return null;
    const code = ccyTotalsRow.currencyCode;
    const rows = data.byExpensePaymentSource ?? [];
    const forCcy = rows.filter(
      (x) =>
        x.currencyCode.trim().toUpperCase() === code.trim().toUpperCase()
    );
    const ordered = sortExpensePaymentRows(forCcy);
    const total = ordered.reduce((s, x) => s + x.totalAmount, 0);
    return total > 0 ? ordered : null;
  }, [data.byExpensePaymentSource, ccyTotalsRow]);

  const expenseBranchTopForCcy = useMemo(() => {
    if (!ccyTotalsRow) return [];
    const code = ccyTotalsRow.currencyCode;
    return data.byBranch
      .filter(
        (b) =>
          b.currencyCode.trim().toUpperCase() === code.trim().toUpperCase() &&
          b.totalExpense > 0
      )
      .sort((a, b) => b.totalExpense - a.totalExpense)
      .slice(0, 6);
  }, [data.byBranch, ccyTotalsRow]);

  const summarySecondaryKpis = useMemo(() => {
    if (!execKpiBand && segment !== "compare") return null;
    const totals = data.totalsByCurrency.find((x) => x.currencyCode === ccy);
    const supplier = totals?.totalSupplierRegisterCashPaid ?? 0;
    const adv = data.advancesByCurrency.find((x) => x.currencyCode === ccy);
    const overheadRows = (data.generalOverheadAllocated ?? []).filter(
      (x) => x.currencyCode === ccy
    );
    const overheadSum = overheadRows.reduce((s, x) => s + x.totalAmount, 0);
    const overheadLines = overheadRows.reduce((s, x) => s + x.lineCount, 0);
    const vehicleRow = (data.vehicleExpensesOffRegister ?? []).find(
      (x) => x.currencyCode === ccy
    );
    return {
      supplier,
      advances: adv?.totalAmount ?? 0,
      advanceRecords: adv?.recordCount ?? 0,
      overheadSum,
      overheadLines,
      vehicle: vehicleRow?.totalAmount ?? 0,
      vehicleRecords: vehicleRow?.recordCount ?? 0,
    };
  }, [
    execKpiBand,
    ccy,
    data.totalsByCurrency,
    data.advancesByCurrency,
    data.generalOverheadAllocated,
    data.vehicleExpensesOffRegister,
  ]);

  const hasCumulativeCharts = useMemo(() => {
    if (segment !== "all" || !includeCumulativeTrendCharts) return false;
    const mon = monthlyRows?.some((r) => r.currencyCode === ccy) ?? false;
    if (mon) return true;
    if (!showBranchNetByMonth || !branchMonthlyRows?.length) return false;
    return branchMonthlyRows.some((r) => r.currencyCode === ccy);
  }, [
    segment,
    includeCumulativeTrendCharts,
    monthlyRows,
    branchMonthlyRows,
    ccy,
    showBranchNetByMonth,
  ]);

  const alertChips = useMemo(() => {
    const chips: { tone: "bad" | "warn"; text: string }[] = [];
    if (data.totalsByCurrency.some((r) => r.netCash < 0)) {
      chips.push({ tone: "bad", text: t("reports.chipNegativeNet") });
    }
    const outTotal = data.byCategory
      .filter((c) => c.type === "OUT")
      .reduce((s, c) => s + c.totalAmount, 0);
    if (outTotal > 0) {
      const top = [...data.byCategory]
        .filter((c) => c.type === "OUT")
        .sort((a, b) => b.totalAmount - a.totalAmount)[0];
      if (top && top.totalAmount / outTotal >= 0.35) {
        chips.push({
          tone: "warn",
          text: tpl(t("reports.chipTopExpense"), {
            cat: financialBreakdownCategoryLabel(top, t),
            pct: Math.round((top.totalAmount / outTotal) * 100),
          }),
        });
      }
    }
    return chips;
  }, [data.byCategory, data.totalsByCurrency, t]);

  const alertsRow =
    alertChips.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {alertChips.map((c, i) => (
          <span
            key={i}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              c.tone === "bad"
                ? "bg-red-100 text-red-900"
                : "bg-amber-100 text-amber-950"
            }`}
          >
            {c.text}
          </span>
        ))}
      </div>
    ) : null;

  const storyDeck = useMemo(() => {
    const row = data.totalsByCurrency.find((x) => x.currencyCode === ccy);
    const cmp = netCompare.find((x) => x.currencyCode === ccy);

    type PayMixItem = { label: string; pct: number; amount: number };

    let compare: {
      prevFrom: string;
      prevTo: string;
      netPrevious: number;
      netCurrent: number;
      netDelta: number;
      dirLabel: string;
    } | null = null;
    if (cmp && cmpFrom && cmpTo) {
      const dirLabel =
        cmp.netDelta > 0
          ? t("reports.storyDirBetter")
          : cmp.netDelta < 0
            ? t("reports.storyDirWorse")
            : t("reports.storyDirFlat");
      compare = {
        prevFrom: cmpFrom,
        prevTo: cmpTo,
        netPrevious: cmp.netPrevious,
        netCurrent: cmp.netCurrent,
        netDelta: cmp.netDelta,
        dirLabel,
      };
    }

    let payMix: { items: PayMixItem[] } | null = null;
    const paySrc = data.byExpensePaymentSource ?? [];
    const payForCcy = paySrc.filter((x) => x.currencyCode === ccy);
    const payTotal = payForCcy.reduce((s, x) => s + x.totalAmount, 0);
    if (payTotal > 0) {
      const ordered = sortExpensePaymentRows(payForCcy);
      payMix = {
        items: ordered.map((r) => {
          const pct = Math.round((r.totalAmount / payTotal) * 100);
          const label =
            r.expensePaymentSource.trim().toUpperCase() === "REGISTER"
              ? t("branch.expensePayRegisterShort")
              : r.expensePaymentSource.trim().toUpperCase() === "PATRON"
                ? t("branch.expensePayPatronShort")
                : r.expensePaymentSource.trim().toUpperCase() ===
                    "PERSONNEL_POCKET"
                  ? t("branch.expensePayPersonnelPocketShort")
                  : t("branch.expensePaymentUnset");
          return { label, pct, amount: r.totalAmount };
        }),
      };
    }

    const forCcy = trends.filter((x) => x.currencyCode === ccy);
    const up = forCcy.filter((x) => x.netDelta > 0).length;
    const down = forCcy.filter((x) => x.netDelta < 0).length;
    const flat = forCcy.length - up - down;
    const branchTrend =
      forCcy.length > 0 && cmpFrom ? { up, down, flat } : null;

    let worst: (typeof forCcy)[0] | null = null;
    for (const x of forCcy) {
      if (x.netDelta >= 0) continue;
      if (!worst || x.netDelta < worst.netDelta) worst = x;
    }
    let best: (typeof forCcy)[0] | null = null;
    for (const x of forCcy) {
      if (x.netDelta <= 0) continue;
      if (!best || x.netDelta > best.netDelta) best = x;
    }

    return {
      net: row ? { netCash: row.netCash } : null,
      compare,
      payMix,
      branchTrend,
      worst,
      best:
        best && best.branchId !== worst?.branchId
          ? {
              branchId: best.branchId,
              branchName: best.branchName,
              netDelta: best.netDelta,
            }
          : null,
    };
  }, [
    data.totalsByCurrency,
    ccy,
    t,
    trends,
    netCompare,
    cmpFrom,
    cmpTo,
    data.byExpensePaymentSource,
  ]);

  const hasStoryMore =
    Boolean(storyDeck.payMix) ||
    Boolean(storyDeck.branchTrend) ||
    Boolean(storyDeck.worst) ||
    Boolean(storyDeck.best);

  const [storyMoreOpen, setStoryMoreOpen] = useState(false);
  useEffect(() => {
    if (lgUp) setStoryMoreOpen(true);
  }, [lgUp]);

  const compareInner = useMemo((): ReactNode => {
    const cmp = storyDeck.compare;
    if (!cmp) return null;
    return (
      <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-zinc-950/[0.02]">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("reports.storyCardCompareTitle")}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {tpl(t("reports.storyCardCompareWindow"), {
            from: formatLocaleDate(cmp.prevFrom, locale),
            to: formatLocaleDate(cmp.prevTo, locale),
          })}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">
              {t("reports.storyCardComparePrevLabel")}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 sm:text-xl">
              {formatLocaleAmount(cmp.netPrevious, locale, ccy)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-zinc-500">
              {t("reports.storyCardCompareCurrentLabel")}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900 sm:text-xl">
              {formatLocaleAmount(cmp.netCurrent, locale, ccy)}
            </p>
          </div>
        </div>
        <div className="mt-4 border-t border-zinc-100 pt-3">
          <p className="text-xs font-medium text-zinc-500">
            {t("reports.storyCardCompareDiffLabel")}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold tabular-nums sm:text-3xl",
              cmp.netDelta > 0
                ? "text-emerald-700"
                : cmp.netDelta < 0
                  ? "text-red-700"
                  : "text-zinc-700"
            )}
          >
            {formatLocaleAmount(cmp.netDelta, locale, ccy)}
          </p>
        </div>
        <p className="mt-2 text-xs text-zinc-600">
          {tpl(t("reports.storyCardCompareTrend"), {
            dir: cmp.dirLabel,
          })}
        </p>
      </div>
    );
  }, [storyDeck.compare, locale, ccy, t]);

  const payMixInner = useMemo((): ReactNode => {
    if (!storyDeck.payMix) return null;
    return (
      <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-zinc-950/[0.02]">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("reports.storyCardPayMixTitle")}
        </p>
        {segment !== "compare" ? (
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {t("reports.storyCardPayMixCaption")}
          </p>
        ) : null}
        <div
          className={cn(
            "flex flex-wrap gap-2",
            segment === "compare" ? "mt-2" : "mt-3"
          )}
        >
          {storyDeck.payMix.items.map((item) => (
            <div
              key={item.label}
              className="min-w-[6.5rem] flex-1 rounded-lg border border-zinc-200/80 bg-zinc-50/90 px-3 py-2 lg:min-w-0 lg:flex-none"
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                {item.label}
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-zinc-900">
                {formatLocaleAmount(item.amount, locale, ccy)}
              </p>
              <p className="text-xs font-medium text-violet-700">~{item.pct}%</p>
            </div>
          ))}
        </div>
      </div>
    );
  }, [storyDeck.payMix, locale, ccy, t, segment]);

  const branchTrendInner = useMemo((): ReactNode => {
    if (!storyDeck.branchTrend) return null;
    return (
      <div className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-zinc-950/[0.02]">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("reports.storyCardBranchTrendTitle")}{" "}
          <span className="font-medium normal-case text-zinc-400">({ccy})</span>
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">
          {t("reports.storyCardBranchTrendCaption")}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-lg bg-emerald-50/90 px-1.5 py-3 text-center sm:px-2">
            <p className="text-2xl font-bold tabular-nums text-emerald-900 sm:text-3xl">
              {storyDeck.branchTrend.up}
            </p>
            <p className="mt-1 text-[0.6rem] font-semibold uppercase leading-tight tracking-wide text-emerald-800/90 sm:text-[0.65rem]">
              {t("reports.storyCardBranchUpLabel")}
            </p>
          </div>
          <div className="rounded-lg bg-red-50/90 px-1.5 py-3 text-center sm:px-2">
            <p className="text-2xl font-bold tabular-nums text-red-900 sm:text-3xl">
              {storyDeck.branchTrend.down}
            </p>
            <p className="mt-1 text-[0.6rem] font-semibold uppercase leading-tight tracking-wide text-red-900/85 sm:text-[0.65rem]">
              {t("reports.storyCardBranchDownLabel")}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-100/90 px-1.5 py-3 text-center sm:px-2">
            <p className="text-2xl font-bold tabular-nums text-zinc-800 sm:text-3xl">
              {storyDeck.branchTrend.flat}
            </p>
            <p className="mt-1 text-[0.6rem] font-semibold uppercase leading-tight tracking-wide text-zinc-600 sm:text-[0.65rem]">
              {t("reports.storyCardBranchFlatLabel")}
            </p>
          </div>
        </div>
      </div>
    );
  }, [storyDeck.branchTrend, ccy, t]);

  const spotlightInner = useMemo((): ReactNode => {
    if (!storyDeck.worst && !storyDeck.best) return null;
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {storyDeck.worst ? (
          <div className="rounded-xl border border-red-200/90 bg-red-50/35 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-900/80">
              {t("reports.storyCardWorstTitle")}
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-900 sm:text-lg">
              {reportBranchLabel(
                storyDeck.worst.branchId,
                storyDeck.worst.branchName,
                t
              )}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-red-800">
              Δ {formatLocaleAmount(storyDeck.worst.netDelta, locale, ccy)}
            </p>
            {storyDeck.worst.branchId !== 0 ? (
              <Link
                href={`/branches?openBranch=${storyDeck.worst.branchId}`}
                className="mt-3 inline-flex text-sm font-semibold text-red-800 underline-offset-2 hover:underline"
              >
                {t("reports.storyOpenBranchLink")}
              </Link>
            ) : null}
          </div>
        ) : null}
        {storyDeck.best ? (
          <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/35 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/80">
              {t("reports.storyCardBestTitle")}
            </p>
            <p className="mt-2 text-base font-semibold text-zinc-900 sm:text-lg">
              {reportBranchLabel(
                storyDeck.best.branchId,
                storyDeck.best.branchName,
                t
              )}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800">
              Δ {formatLocaleAmount(storyDeck.best.netDelta, locale, ccy)}
            </p>
            {storyDeck.best.branchId !== 0 ? (
              <Link
                href={`/branches?openBranch=${storyDeck.best.branchId}`}
                className="mt-3 inline-flex text-sm font-semibold text-emerald-800 underline-offset-2 hover:underline"
              >
                {t("reports.storyOpenBranchLink")}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }, [storyDeck.worst, storyDeck.best, locale, ccy, t]);

  const totalRow = data.totalsByCurrency.find((x) => x.currencyCode === ccy);
  const incomeExpenseData = totalRow
    ? [
        {
          name: t("reports.chartIncome"),
          value: totalRow.totalIncome,
          fill: COL_INCOME,
        },
        {
          name: t("reports.chartExpense"),
          value: totalRow.totalExpense,
          fill: COL_EXPENSE,
        },
      ]
    : [];

  const outPieData = useMemo(() => {
    const outCats = data.byCategory
      .filter((c) => c.type === "OUT" && c.currencyCode === ccy)
      .sort((a, b) => b.totalAmount - a.totalAmount);
    const top = outCats.slice(0, 6);
    const rest = outCats.slice(6).reduce((s, c) => s + c.totalAmount, 0);
    const pie = top.map((c, i) => ({
      name: financialBreakdownCategoryLabel(c, t),
      value: c.totalAmount,
      fill: CAT_COLORS[i % CAT_COLORS.length],
    }));
    if (rest > 0) {
      pie.push({
        name: t("reports.chartOther"),
        value: rest,
        fill: "#94a3b8",
      });
    }
    return pie;
  }, [data.byCategory, ccy, t]);

  const branchNetData = useMemo(
    () =>
      data.byBranch
        .filter((b) => b.currencyCode === ccy)
        .map((b) => {
          const full = reportBranchLabel(b.branchId, b.branchName, t);
          return {
            name: smUp ? full : truncLabel(full, 14),
            nameFull: full,
            net: b.netCash,
          };
        })
        .sort((a, b) => b.net - a.net),
    [data.byBranch, ccy, smUp, t]
  );

  const branchDeltaData = useMemo(
    () =>
      trends
        .filter((b) => b.currencyCode === ccy)
        .map((b) => {
          const full = reportBranchLabel(b.branchId, b.branchName, t);
          return {
            name: smUp ? full : truncLabel(full, 14),
            nameFull: full,
            delta: b.netDelta,
          };
        })
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 14),
    [trends, ccy, smUp, t]
  );

  const tooltipMoney = (code: string) => (value: unknown) => {
    const n =
      typeof value === "number"
        ? value
        : Array.isArray(value)
          ? Number(value[0])
          : Number(value);
    return formatLocaleAmount(Number.isFinite(n) ? n : 0, locale, code);
  };

  const barH = (rows: number) =>
    Math.min(smUp ? 420 : 360, (smUp ? 80 : 64) + rows * (smUp ? 34 : 30));

  const fmtAxisTick = (v: number) => {
    if (smUp) {
      return String(formatLocaleAmount(v, locale, ccy).replace(/\u00a0/g, " "));
    }
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 10_000) return `${(v / 1000).toFixed(0)}k`;
    if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return String(Math.round(v));
  };

  const pieOuterInc = smUp ? 88 : 68;
  const pieOuterExp = smUp ? 92 : 72;
  const pieInnerExp = smUp ? 52 : 40;
  const legendStyle = { fontSize: smUp ? 12 : 10 } as const;
  const yAxisW = smUp ? 108 : 76;

  if (!data.totalsByCurrency.length) {
    return (
      <Card title={t("reports.storyTitle")}>
        <p className="text-sm font-medium text-zinc-800">
          {t("reports.financialEmptyTitle")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          {t("reports.financialEmptyBody")}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
          <Link
            href="/branches"
            className="text-sm font-semibold text-violet-700 underline-offset-2 hover:underline"
          >
            {t("reports.financialEmptyCtaBranch")}
          </Link>
          <Link
            href="/guide"
            className="text-sm font-semibold text-violet-700 underline-offset-2 hover:underline"
          >
            {t("reports.financialEmptyCtaGuide")}
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col",
        segment === "summary" ||
        segment === "compare" ||
        segment === "charts"
          ? "gap-3 sm:gap-4"
          : "gap-5 sm:gap-8",
        className
      )}
    >
      {showGradientHero ? (
        <div className="rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-zinc-50/95 via-white to-violet-50/25 px-4 py-4 shadow-sm ring-1 ring-zinc-950/[0.02] sm:px-5 sm:py-5">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
            {t("reports.storyTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700 sm:text-[0.95rem]">
            {t("reports.finStoryPageLead")}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            {t("reports.storyDesc")}
          </p>
        </div>
      ) : segment === "summary" || segment === "compare" || segment === "charts" ? null : (
        <div className="rounded-xl border border-zinc-200/90 bg-white px-4 py-4 shadow-sm ring-1 ring-zinc-950/[0.02] sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
              {t("reports.storyTitle")}
            </h2>
            <p className="mt-1 text-xs font-medium tabular-nums text-zinc-500">
              {formatLocaleDate(data.dateFrom, locale)} –{" "}
              {formatLocaleDate(data.dateTo, locale)}
              <span className="mx-1.5 text-zinc-300">·</span>
              {ccy}
            </p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700 sm:text-[0.95rem]">
            {t("reports.finStoryPageLead")}
          </p>
        </div>
      )}

      {segment === "compare" && ccyTotalsRow && cmpFrom && cmpTo ? (
        <div className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-zinc-50/40 px-4 py-3 shadow-sm ring-1 ring-violet-950/[0.04] sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
            <div className="min-w-0 flex-1 rounded-lg border border-zinc-200/80 bg-white/90 px-3 py-2.5 sm:px-4 sm:py-3">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
                {t("reports.finCompareCurrentPeriodLabel")}
              </p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900 sm:text-base">
                {formatLocaleDate(data.dateFrom, locale)} –{" "}
                {formatLocaleDate(data.dateTo, locale)}
                <span className="ml-1.5 text-xs font-medium text-zinc-500">
                  · {ccy}
                </span>
              </p>
            </div>
            <div className="min-w-0 flex-1 rounded-lg border-2 border-violet-400/70 bg-violet-100/50 px-3 py-2.5 shadow-sm sm:px-4 sm:py-3">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-violet-900">
                {t("reports.finComparePriorPeriodLabel")}
              </p>
              <p className="mt-1 text-base font-bold tabular-nums text-violet-950 sm:text-lg">
                {formatLocaleDate(cmpFrom, locale)} –{" "}
                {formatLocaleDate(cmpTo, locale)}
              </p>
              <p className="mt-1 text-[0.7rem] leading-snug text-violet-900/90 sm:text-xs">
                {t("reports.finComparePriorPeriodHint")}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {segment === "charts" ? alertsRow : null}

      {(execKpiBand || segment === "compare") && ccyTotalsRow && summarySecondaryKpis ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-950/[0.02] sm:px-4 sm:py-3.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                {t("reports.colIncome")}
              </p>
              <p
                className={cn(
                  "mt-1 font-semibold tabular-nums text-emerald-800",
                  segment === "compare"
                    ? "text-xl sm:text-2xl"
                    : "text-lg sm:text-xl"
                )}
              >
                {formatLocaleAmount(ccyTotalsRow.totalIncome, locale, ccy)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {t("reports.colInCount")}: {ccyTotalsRow.incomeTransactionCount}
              </p>
              {ccyTotalsRow.totalIncome > 0 ? (
                incomeRegisterForCcy ? (
                  <div className="mt-2 space-y-1 border-t border-emerald-100/90 pt-2">
                    <div
                      className={cn(
                        "flex justify-between gap-2 leading-snug text-zinc-600",
                        segment === "compare"
                          ? "text-sm sm:text-base"
                          : "text-xs"
                      )}
                    >
                      <span className="min-w-0">{t("reports.finIncomeKpiPos")}</span>
                      <span className="max-w-[58%] shrink-0 text-right tabular-nums text-zinc-800">
                        <span>
                          {formatLocaleAmount(
                            incomeRegisterForCcy.incomeCard,
                            locale,
                            ccy
                          )}
                        </span>
                        <span className="block text-[0.7rem] font-normal normal-case text-zinc-500 sm:text-xs">
                          ·{" "}
                          {tpl(t("reports.finIncomeKpiPctOfIncome"), {
                            pct: pctPart(
                              incomeRegisterForCcy.incomeCard,
                              ccyTotalsRow.totalIncome
                            ),
                          })}
                        </span>
                      </span>
                    </div>
                    <div
                      className={cn(
                        "flex justify-between gap-2 leading-snug text-zinc-600",
                        segment === "compare"
                          ? "text-sm sm:text-base"
                          : "text-xs"
                      )}
                    >
                      <span className="min-w-0">{t("reports.finIncomeKpiCash")}</span>
                      <span className="max-w-[58%] shrink-0 text-right tabular-nums text-zinc-800">
                        <span>
                          {formatLocaleAmount(
                            incomeRegisterForCcy.incomeCash,
                            locale,
                            ccy
                          )}
                        </span>
                        <span className="block text-[0.7rem] font-normal normal-case text-zinc-500 sm:text-xs">
                          ·{" "}
                          {tpl(t("reports.finIncomeKpiPctOfIncome"), {
                            pct: pctPart(
                              incomeRegisterForCcy.incomeCash,
                              ccyTotalsRow.totalIncome
                            ),
                          })}
                        </span>
                      </span>
                    </div>
                    {incomeRegisterForCcy.incomeCash > 0 &&
                    (incomeRegisterForCcy.cashRemainsAtBranch !== 0 ||
                      incomeRegisterForCcy.cashPatron !== 0 ||
                      incomeRegisterForCcy.cashBranchManager !== 0 ||
                      incomeRegisterForCcy.cashUnspecified !== 0) ? (
                      <div className="ml-1 space-y-0.5 border-l border-zinc-200/90 pl-2 text-[0.8rem] leading-snug text-zinc-600 sm:text-xs">
                        {incomeRegisterForCcy.cashRemainsAtBranch !== 0 ? (
                          <div className="flex justify-between gap-2">
                            <span className="min-w-0">
                              {t("reports.finIncomeKpiCashDrawer")}
                            </span>
                            <span className="max-w-[58%] shrink-0 text-right tabular-nums text-zinc-800">
                              <span>
                                {formatLocaleAmount(
                                  incomeRegisterForCcy.cashRemainsAtBranch,
                                  locale,
                                  ccy
                                )}
                              </span>
                              <span className="block text-[0.65rem] font-normal normal-case text-zinc-500">
                                ·{" "}
                                {tpl(t("reports.finIncomeKpiPctOfCash"), {
                                  pct: pctPart(
                                    incomeRegisterForCcy.cashRemainsAtBranch,
                                    incomeRegisterForCcy.incomeCash
                                  ),
                                })}
                              </span>
                            </span>
                          </div>
                        ) : null}
                        {incomeRegisterForCcy.cashPatron !== 0 ? (
                          <div className="flex justify-between gap-2">
                            <span className="min-w-0">
                              {t("reports.finIncomeKpiCashPatron")}
                            </span>
                            <span className="max-w-[58%] shrink-0 text-right tabular-nums text-zinc-800">
                              <span>
                                {formatLocaleAmount(
                                  incomeRegisterForCcy.cashPatron,
                                  locale,
                                  ccy
                                )}
                              </span>
                              <span className="block text-[0.65rem] font-normal normal-case text-zinc-500">
                                ·{" "}
                                {tpl(t("reports.finIncomeKpiPctOfCash"), {
                                  pct: pctPart(
                                    incomeRegisterForCcy.cashPatron,
                                    incomeRegisterForCcy.incomeCash
                                  ),
                                })}
                              </span>
                            </span>
                          </div>
                        ) : null}
                        {incomeRegisterForCcy.cashBranchManager !== 0 ? (
                          <div className="flex justify-between gap-2">
                            <span className="min-w-0">
                              {t("reports.finIncomeKpiCashPersonnel")}
                            </span>
                            <span className="max-w-[58%] shrink-0 text-right tabular-nums text-zinc-800">
                              <span>
                                {formatLocaleAmount(
                                  incomeRegisterForCcy.cashBranchManager,
                                  locale,
                                  ccy
                                )}
                              </span>
                              <span className="block text-[0.65rem] font-normal normal-case text-zinc-500">
                                ·{" "}
                                {tpl(t("reports.finIncomeKpiPctOfCash"), {
                                  pct: pctPart(
                                    incomeRegisterForCcy.cashBranchManager,
                                    incomeRegisterForCcy.incomeCash
                                  ),
                                })}
                              </span>
                            </span>
                          </div>
                        ) : null}
                        {incomeRegisterForCcy.cashUnspecified !== 0 ? (
                          <div className="flex justify-between gap-2">
                            <span className="min-w-0">
                              {t("reports.finIncomeKpiCashOther")}
                            </span>
                            <span className="max-w-[58%] shrink-0 text-right tabular-nums text-zinc-800">
                              <span>
                                {formatLocaleAmount(
                                  incomeRegisterForCcy.cashUnspecified,
                                  locale,
                                  ccy
                                )}
                              </span>
                              <span className="block text-[0.65rem] font-normal normal-case text-zinc-500">
                                ·{" "}
                                {tpl(t("reports.finIncomeKpiPctOfCash"), {
                                  pct: pctPart(
                                    incomeRegisterForCcy.cashUnspecified,
                                    incomeRegisterForCcy.incomeCash
                                  ),
                                })}
                              </span>
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-snug text-zinc-500">
                    {t("reports.finIncomeKpiBreakdownMissing")}
                  </p>
                )
              ) : null}
            </div>
            <div className="rounded-xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-950/[0.02] sm:px-4 sm:py-3.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                {t("reports.colExpense")}
              </p>
              <p
                className={cn(
                  "mt-1 font-semibold tabular-nums text-red-800",
                  segment === "compare"
                    ? "text-xl sm:text-2xl"
                    : "text-lg sm:text-xl"
                )}
              >
                {formatLocaleAmount(ccyTotalsRow.totalExpense, locale, ccy)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {t("reports.colOutCount")}:{" "}
                {ccyTotalsRow.expenseTransactionCount}
              </p>
              {ccyTotalsRow.totalExpense > 0 ? (
                expensePayBreakdownForCcy ? (
                  <div className="mt-2 space-y-1 border-t border-red-100/90 pt-2">
                    {expensePayBreakdownForCcy.map((r) => {
                      const src = r.expensePaymentSource.trim().toUpperCase();
                      const label =
                        src === "REGISTER"
                          ? t("branch.expensePayRegisterShort")
                          : src === "PATRON"
                            ? t("branch.expensePayPatronShort")
                            : src === "PERSONNEL_POCKET"
                              ? t("branch.expensePayPersonnelPocketShort")
                              : t("branch.expensePaymentUnset");
                      return (
                        <div
                          key={src}
                          className="flex justify-between gap-2 text-xs leading-snug text-zinc-600"
                        >
                          <span className="min-w-0">{label}</span>
                          <span className="max-w-[58%] shrink-0 text-right tabular-nums text-zinc-800">
                            <span>
                              {formatLocaleAmount(
                                r.totalAmount,
                                locale,
                                ccy
                              )}
                            </span>
                            <span className="block text-[0.7rem] font-normal normal-case text-zinc-500 sm:text-xs">
                              ·{" "}
                              {tpl(t("reports.finExpenseKpiPctOfExpense"), {
                                pct: pctPart(
                                  r.totalAmount,
                                  ccyTotalsRow.totalExpense
                                ),
                              })}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                    {expenseBranchTopForCcy.length > 0 ? (
                      <div className="ml-1 mt-1 space-y-0.5 border-l border-zinc-200/90 pl-2 text-[0.8rem] leading-snug text-zinc-600 sm:text-xs">
                        <p className="font-medium text-zinc-500">
                          {t("reports.finExpenseKpiByBranch")}
                        </p>
                        {expenseBranchTopForCcy.map((b) => (
                          <div
                            key={`${b.branchId}-${b.currencyCode}`}
                            className="flex justify-between gap-2"
                          >
                            <span className="min-w-0">
                              {reportBranchLabel(
                                b.branchId,
                                b.branchName,
                                t
                              )}
                            </span>
                            <span className="max-w-[58%] shrink-0 text-right tabular-nums text-zinc-800">
                              <span>
                                {formatLocaleAmount(
                                  b.totalExpense,
                                  locale,
                                  ccy
                                )}
                              </span>
                              <span className="block text-[0.65rem] font-normal normal-case text-zinc-500">
                                ·{" "}
                                {tpl(t("reports.finExpenseKpiPctOfExpense"), {
                                  pct: pctPart(
                                    b.totalExpense,
                                    ccyTotalsRow.totalExpense
                                  ),
                                })}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs leading-snug text-zinc-500">
                    {t("reports.finExpenseKpiBreakdownMissing")}
                  </p>
                )
              ) : null}
            </div>
            <div
              className={cn(
                "rounded-xl border px-4 py-3 shadow-sm ring-1 ring-zinc-950/[0.02] sm:px-4 sm:py-3.5",
                ccyTotalsRow.netCash < 0
                  ? "border-red-200/90 bg-red-50/40"
                  : ccyTotalsRow.netCash > 0
                    ? "border-emerald-200/90 bg-emerald-50/35"
                    : "border-zinc-200/90 bg-zinc-50/50"
              )}
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                {t("reports.storyCardNetTitle")}
              </p>
              <p
                className={cn(
                  "mt-1 font-bold tabular-nums",
                  segment === "compare"
                    ? "text-2xl sm:text-3xl"
                    : "text-lg sm:text-xl",
                  ccyTotalsRow.netCash < 0
                    ? "text-red-900"
                    : ccyTotalsRow.netCash > 0
                      ? "text-emerald-900"
                      : "text-zinc-900"
                )}
              >
                {formatLocaleAmount(ccyTotalsRow.netCash, locale, ccy)}
              </p>
            </div>
          </div>

          {segment === "compare" ? null : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-950/[0.02] sm:px-4 sm:py-3.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                {t("reports.finSummaryKpiSupplierRegister")}
              </p>
              <p className="mt-1 text-base font-semibold tabular-nums text-violet-900 sm:text-lg">
                {formatLocaleAmount(
                  summarySecondaryKpis.supplier,
                  locale,
                  ccy
                )}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-950/[0.02] sm:px-4 sm:py-3.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                {t("reports.finSummaryKpiAdvances")}
              </p>
              <p className="mt-1 text-base font-semibold tabular-nums text-amber-900 sm:text-lg">
                {formatLocaleAmount(
                  summarySecondaryKpis.advances,
                  locale,
                  ccy
                )}
              </p>
              {summarySecondaryKpis.advanceRecords > 0 ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {tpl(t("reports.finSummaryKpiRowMetaRecords"), {
                    n: summarySecondaryKpis.advanceRecords,
                  })}
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-950/[0.02] sm:px-4 sm:py-3.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                {t("reports.finSummaryKpiOverhead")}
              </p>
              <p className="mt-1 text-base font-semibold tabular-nums text-zinc-800 sm:text-lg">
                {formatLocaleAmount(
                  summarySecondaryKpis.overheadSum,
                  locale,
                  ccy
                )}
              </p>
              {summarySecondaryKpis.overheadLines > 0 ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {tpl(t("reports.finSummaryKpiRowMetaLines"), {
                    n: summarySecondaryKpis.overheadLines,
                  })}
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-950/[0.02] sm:px-4 sm:py-3.5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                {t("reports.finSummaryKpiVehicleOffReg")}
              </p>
              <p className="mt-1 text-base font-semibold tabular-nums text-orange-900 sm:text-lg">
                {formatLocaleAmount(
                  summarySecondaryKpis.vehicle,
                  locale,
                  ccy
                )}
              </p>
              {summarySecondaryKpis.vehicleRecords > 0 ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {tpl(t("reports.finSummaryKpiRowMetaRecords"), {
                    n: summarySecondaryKpis.vehicleRecords,
                  })}
                </p>
              ) : null}
            </div>
          </div>
          )}
        </div>
      ) : null}

      {segment === "summary" ? alertsRow : null}

      {showRanking ? (
      <FinSummaryStorySection
        t={t}
        scope="ranking"
        title={t("reports.finStoryRankingSectionTitle")}
        description={t("reports.finStoryRankingSectionDesc")}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="min-w-0" title={t("reports.chartBranchNet")}>
            {branchNetData.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
            ) : (
              <div
                className="-mx-1 w-[calc(100%+0.5rem)] touch-pan-x overflow-x-auto overscroll-x-contain px-1 lg:mx-0 lg:w-full lg:overflow-visible lg:px-0"
                style={{ height: barH(branchNetData.length) }}
              >
                <RechartsMeasureBox
                  className="h-full min-w-[min(100%,280px)] lg:min-w-0"
                  style={{ minWidth: smUp ? undefined : 300 }}
                >
                  {({ width, height }) => (
                    <ResponsiveContainer width={width} height={height}>
                      <BarChart
                        data={branchNetData}
                        layout="vertical"
                        margin={{
                          top: 8,
                          right: smUp ? 12 : 4,
                          left: 0,
                          bottom: 8,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: smUp ? 11 : 9 }}
                          tickFormatter={fmtAxisTick}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={yAxisW}
                          tick={{ fontSize: smUp ? 11 : 9 }}
                        />
                        <Tooltip
                          formatter={tooltipMoney(ccy)}
                          labelFormatter={(_, payload) =>
                            (payload?.[0]?.payload as { nameFull?: string })
                              ?.nameFull ?? ""
                          }
                        />
                        <Bar
                          dataKey="net"
                          name={t("reports.colNet")}
                          radius={[0, 4, 4, 0]}
                        >
                          {branchNetData.map((e, i) => (
                            <Cell
                              key={i}
                              fill={e.net >= 0 ? COL_INCOME : COL_EXPENSE}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </RechartsMeasureBox>
              </div>
            )}
          </Card>

          <Card className="min-w-0" title={t("reports.chartBranchDelta")}>
            {branchDeltaData.length === 0 ? (
              <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
            ) : (
              <div
                className="-mx-1 w-[calc(100%+0.5rem)] touch-pan-x overflow-x-auto overscroll-x-contain px-1 lg:mx-0 lg:w-full lg:overflow-visible lg:px-0"
                style={{ height: barH(branchDeltaData.length) }}
              >
                <RechartsMeasureBox
                  className="h-full min-w-[min(100%,280px)] lg:min-w-0"
                  style={{ minWidth: smUp ? undefined : 300 }}
                >
                  {({ width, height }) => (
                    <ResponsiveContainer width={width} height={height}>
                      <BarChart
                        data={branchDeltaData}
                        layout="vertical"
                        margin={{
                          top: 8,
                          right: smUp ? 12 : 4,
                          left: 0,
                          bottom: 8,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                        <XAxis
                          type="number"
                          tick={{ fontSize: smUp ? 11 : 9 }}
                          tickFormatter={fmtAxisTick}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={yAxisW}
                          tick={{ fontSize: smUp ? 11 : 9 }}
                        />
                        <Tooltip
                          formatter={tooltipMoney(ccy)}
                          labelFormatter={(_, payload) =>
                            (payload?.[0]?.payload as { nameFull?: string })
                              ?.nameFull ?? ""
                          }
                        />
                        <Bar
                          dataKey="delta"
                          name={t("reports.colDeltaPrior")}
                          radius={[0, 4, 4, 0]}
                        >
                          {branchDeltaData.map((e, i) => (
                            <Cell
                              key={i}
                              fill={
                                e.delta >= 0 ? COL_DELTA_UP : COL_DELTA_DOWN
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </RechartsMeasureBox>
              </div>
            )}
          </Card>
        </div>
      </FinSummaryStorySection>
      ) : null}

      {showFilterStory ? (
      <FinSummaryStorySection
        t={t}
        scope="filter"
        title={t("reports.finStoryFilterSectionTitle")}
        description={
          segment === "compare"
            ? undefined
            : t("reports.finStoryFilterSectionDesc")
        }
      >
        {segment === "all" || segment === "compare" ? alertsRow : null}
        {cmpFrom && cmpTo && segment !== "compare" ? (
          <p className="text-xs text-zinc-500">
            {t("reports.compareCaption")}: {formatLocaleDate(cmpFrom, locale)} –{" "}
            {formatLocaleDate(cmpTo, locale)}
          </p>
        ) : null}

        {segment !== "compare" ? (
          <p className="text-xs leading-relaxed text-zinc-600 sm:text-sm">
            {t(execKpiBand ? "reports.storyDeckHintSummary" : "reports.storyDeckHint")}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:gap-4">
          {storyDeck.net && !execKpiBand ? (
            <div
              className={cn(
                "rounded-2xl border-2 p-4 sm:p-5",
                storyDeck.net.netCash < 0
                  ? "border-red-300 bg-gradient-to-br from-red-50/95 to-white"
                  : storyDeck.net.netCash > 0
                    ? "border-emerald-300/90 bg-gradient-to-br from-emerald-50/90 to-white"
                    : "border-zinc-200 bg-zinc-50/50"
              )}
            >
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-zinc-500">
                {t("reports.storyCardNetEyebrow")}
              </p>
              <p className="mt-1 text-base font-semibold text-zinc-900 sm:text-lg">
                {t("reports.storyCardNetTitle")}{" "}
                <span className="text-zinc-500">({ccy})</span>
              </p>
              <p
                className={cn(
                  "mt-2 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl",
                  storyDeck.net.netCash < 0
                    ? "text-red-800"
                    : storyDeck.net.netCash > 0
                      ? "text-emerald-800"
                      : "text-zinc-800"
                )}
              >
                {formatLocaleAmount(storyDeck.net.netCash, locale, ccy)}
              </p>
            </div>
          ) : null}

          {storyDeck.compare || payMixInner ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              {compareInner}
              {payMixInner ? (
                <div
                  className={
                    storyDeck.compare ? "hidden sm:block" : "block"
                  }
                >
                  {payMixInner}
                </div>
              ) : null}
            </div>
          ) : null}

          {!lgUp && hasStoryMore ? (
            <button
              type="button"
              className="min-h-11 w-full touch-manipulation rounded-xl border border-zinc-200 bg-zinc-50/90 px-4 py-3 text-left text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-100"
              onClick={() => setStoryMoreOpen((o) => !o)}
              aria-expanded={storyMoreOpen}
            >
              {storyMoreOpen
                ? t("reports.storyDetailsHide")
                : t("reports.storyDetailsShow")}
            </button>
          ) : null}

          {!lgUp && storyMoreOpen ? (
            <div className="flex flex-col gap-3 lg:hidden">
              {storyDeck.compare && payMixInner ? payMixInner : null}
              {branchTrendInner}
              {spotlightInner}
            </div>
          ) : null}

          <div className="hidden flex-col gap-3 lg:flex">
            {branchTrendInner}
            {spotlightInner}
          </div>
        </div>
      </FinSummaryStorySection>
      ) : null}

      {hasCumulativeCharts ? (
        <FinSummaryStorySection
          t={t}
          scope="cumulative"
          title={t("reports.finStoryCumulativeSectionTitle")}
          description={t("reports.finStoryCumulativeSectionDesc")}
        >
          <ReportFinancialTimeSeriesCharts
            t={t}
            locale={locale}
            currencyCode={ccy}
            monthlyRows={monthlyRows}
            branchMonthlyRows={branchMonthlyRows ?? undefined}
            showBranchNetByMonth={showBranchNetByMonth}
            suppressSectionIntro
          />
        </FinSummaryStorySection>
      ) : null}

      {showDistribution ? (
      <FinSummaryStorySection
        t={t}
        scope="distribution"
        title={t("reports.finStoryDistributionSectionTitle")}
        description={
          segment === "charts"
            ? undefined
            : t("reports.finStoryDistributionSectionDesc")
        }
      >
        <p className="text-xs leading-relaxed text-zinc-600 sm:text-sm">
          {t("reports.chartLegendHint")}
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="min-w-0" title={t("reports.chartIncomeVsExpense")}>
          <RechartsMeasureBox className="h-[220px] w-full min-w-0 sm:h-[260px]">
            {({ width, height }) => (
              <ResponsiveContainer width={width} height={height}>
                <PieChart margin={{ top: 0, right: 0, bottom: 4, left: 0 }}>
                  <Pie
                    data={incomeExpenseData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={pieOuterInc}
                    label={false}
                  >
                    {incomeExpenseData.map((x, i) => (
                      <Cell key={i} fill={x.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={tooltipMoney(ccy)} />
                  <Legend wrapperStyle={legendStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </RechartsMeasureBox>
        </Card>

        <Card
          className="min-w-0"
          title={t("reports.chartExpenseMix")}
          description={t("reports.chartExpenseMixCaption")}
        >
          <ReportExpensePaymentMix
            rows={data.byExpensePaymentSource ?? []}
            currencyCode={ccy}
            t={t}
            locale={locale}
          />
          {outPieData.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
          ) : (
            <RechartsMeasureBox className="h-[240px] w-full min-w-0 sm:h-[280px]">
              {({ width, height }) => (
                <ResponsiveContainer width={width} height={height}>
                  <PieChart margin={{ top: 0, right: 0, bottom: 4, left: 0 }}>
                    <Pie
                      data={outPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={pieInnerExp}
                      outerRadius={pieOuterExp}
                      paddingAngle={2}
                      label={false}
                    >
                      {outPieData.map((x, i) => (
                        <Cell key={i} fill={x.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={tooltipMoney(ccy)} />
                    <Legend wrapperStyle={legendStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </RechartsMeasureBox>
          )}
        </Card>
        </div>
      </FinSummaryStorySection>
      ) : null}
    </div>
  );
}
