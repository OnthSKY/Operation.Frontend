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

type Props = {
  data: FinancialReport;
  monthlyRows?: FinancialMonthlyBreakdownRow[] | null;
  branchMonthlyRows?: FinancialBranchMonthlyBreakdownRow[] | null;
  showBranchNetByMonth?: boolean;
};

function truncLabel(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

export function ReportFinancialStoryCharts({
  data,
  monthlyRows,
  branchMonthlyRows,
  showBranchNetByMonth = false,
}: Props) {
  const { t, locale } = useI18n();
  const smUp = useMediaMinWidth(640);
  const trends = data.branchTrends ?? [];
  const netCompare = data.netCompareByCurrency ?? [];
  const cmpFrom = data.comparePeriodFrom;
  const cmpTo = data.comparePeriodTo;

  const currencies = useMemo(
    () => data.totalsByCurrency.map((x) => x.currencyCode),
    [data.totalsByCurrency]
  );
  const [ccy, setCcy] = useState("TRY");

  useEffect(() => {
    if (!currencies.length) return;
    if (!currencies.includes(ccy)) {
      setCcy(currencies.includes("TRY") ? "TRY" : currencies[0]);
    }
  }, [currencies, ccy]);

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

  const storyDeck = useMemo(() => {
    const row = data.totalsByCurrency.find((x) => x.currencyCode === ccy);
    const cmp = netCompare.find((x) => x.currencyCode === ccy);

    type PayMixItem = { label: string; pct: number; amount: number };

    let compare: {
      prevFrom: string;
      prevTo: string;
      netPrevious: number;
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
    if (smUp) setStoryMoreOpen(true);
  }, [smUp]);

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
        <p className="mt-3 text-xs text-zinc-500">
          {t("reports.storyCardComparePrevLabel")}
        </p>
        <p className="text-lg font-semibold tabular-nums text-zinc-900">
          {formatLocaleAmount(cmp.netPrevious, locale, ccy)}
        </p>
        <p className="mt-3 text-xs font-medium text-zinc-500">
          {t("reports.storyCardCompareDeltaLabel")}
        </p>
        <p
          className={cn(
            "text-2xl font-bold tabular-nums",
            cmp.netDelta > 0
              ? "text-emerald-700"
              : cmp.netDelta < 0
                ? "text-red-700"
                : "text-zinc-700"
          )}
        >
          {formatLocaleAmount(cmp.netDelta, locale, ccy)}
        </p>
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
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          {t("reports.storyCardPayMixCaption")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {storyDeck.payMix.items.map((item) => (
            <div
              key={item.label}
              className="min-w-[6.5rem] flex-1 rounded-lg border border-zinc-200/80 bg-zinc-50/90 px-3 py-2 sm:min-w-0 sm:flex-none"
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
  }, [storyDeck.payMix, locale, ccy, t]);

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
    <div className="flex flex-col gap-4 sm:gap-6">
      <Card title={t("reports.storyTitle")} description={t("reports.storyDesc")}>
        {alertChips.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
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
        ) : null}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("reports.chartCurrency")}
          </span>
          <select
            value={ccy}
            onChange={(e) => setCcy(e.target.value)}
            className="min-h-11 min-w-[5.5rem] rounded-lg border border-zinc-200 px-3 py-2 text-base font-medium sm:min-h-0 sm:px-2 sm:py-1.5 sm:text-sm"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-zinc-500">
          {t("reports.chartCurrencyScopeHint")}
        </p>
        {cmpFrom && cmpTo ? (
          <p className="mb-3 text-xs text-zinc-500">
            {t("reports.compareCaption")}: {formatLocaleDate(cmpFrom, locale)} –{" "}
            {formatLocaleDate(cmpTo, locale)}
          </p>
        ) : null}

        <p className="mb-3 text-xs leading-relaxed text-zinc-600">
          {t("reports.storyDeckHint")}
        </p>

        <div className="flex flex-col gap-3 sm:gap-4">
          {storyDeck.net ? (
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

          {!smUp && hasStoryMore ? (
            <button
              type="button"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/90 px-4 py-3 text-left text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-100"
              onClick={() => setStoryMoreOpen((o) => !o)}
              aria-expanded={storyMoreOpen}
            >
              {storyMoreOpen
                ? t("reports.storyDetailsHide")
                : t("reports.storyDetailsShow")}
            </button>
          ) : null}

          {!smUp && storyMoreOpen ? (
            <div className="flex flex-col gap-3 sm:hidden">
              {storyDeck.compare && payMixInner ? payMixInner : null}
              {branchTrendInner}
              {spotlightInner}
            </div>
          ) : null}

          <div className="hidden flex-col gap-3 sm:flex">
            {branchTrendInner}
            {spotlightInner}
          </div>
        </div>
      </Card>

      <ReportFinancialTimeSeriesCharts
        t={t}
        locale={locale}
        currencyCode={ccy}
        monthlyRows={monthlyRows}
        branchMonthlyRows={branchMonthlyRows ?? undefined}
        showBranchNetByMonth={showBranchNetByMonth}
      />

      <div>
        <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
          {t("reports.sectionCharts")}
        </p>
        <p className="mb-3 break-words text-xs leading-relaxed text-zinc-500">
          {t("reports.chartLegendHint")}
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={t("reports.chartIncomeVsExpense")}>
          <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
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
          </div>
        </Card>

        <Card
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
            <div className="h-[240px] w-full min-w-0 sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
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
            </div>
          )}
        </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title={t("reports.chartBranchNet")}>
          {branchNetData.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
          ) : (
            <div
              className="-mx-1 w-[calc(100%+0.5rem)] touch-pan-x overflow-x-auto overscroll-x-contain px-1 sm:mx-0 sm:w-full sm:overflow-visible sm:px-0"
              style={{ height: barH(branchNetData.length) }}
            >
              <div
                className="h-full min-w-[min(100%,280px)] sm:min-w-0"
                style={{ minWidth: smUp ? undefined : 300 }}
              >
                <ResponsiveContainer width="100%" height="100%">
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
              </div>
            </div>
          )}
        </Card>

        <Card title={t("reports.chartBranchDelta")}>
          {branchDeltaData.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
          ) : (
            <div
              className="-mx-1 w-[calc(100%+0.5rem)] touch-pan-x overflow-x-auto overscroll-x-contain px-1 sm:mx-0 sm:w-full sm:overflow-visible sm:px-0"
              style={{ height: barH(branchDeltaData.length) }}
            >
              <div
                className="h-full min-w-[min(100%,280px)] sm:min-w-0"
                style={{ minWidth: smUp ? undefined : 300 }}
              >
                <ResponsiveContainer width="100%" height="100%">
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
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
