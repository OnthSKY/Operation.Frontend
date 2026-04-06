"use client";

import { useI18n } from "@/i18n/context";
import { financialBreakdownCategoryLabel } from "@/modules/reports/lib/financial-breakdown-labels";
import { ReportFinancialTimeSeriesCharts } from "@/modules/reports/components/ReportFinancialTimeSeriesCharts";
import type {
  FinancialBranchMonthlyBreakdownRow,
  FinancialMonthlyBreakdownRow,
  FinancialReport,
} from "@/types/reports";
import { Card } from "@/shared/components/Card";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { useMediaMinWidth } from "@/shared/lib/use-media-min-width";
import { useEffect, useMemo, useState } from "react";
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

  const storyLines = useMemo(() => {
    const lines: string[] = [];
    const row = data.totalsByCurrency.find((x) => x.currencyCode === ccy);
    const cmp = netCompare.find((x) => x.currencyCode === ccy);
    if (!row && !cmp) return lines;

    if (row) {
      lines.push(
        tpl(t("reports.storyNetPeriod"), {
          ccy,
          net: formatLocaleAmount(row.netCash, locale, ccy),
        })
      );
    }
    if (cmp && cmpFrom && cmpTo) {
      const dir =
        cmp.netDelta > 0
          ? t("reports.storyDirBetter")
          : cmp.netDelta < 0
            ? t("reports.storyDirWorse")
            : t("reports.storyDirFlat");
      lines.push(
        tpl(t("reports.storyVsPrevious"), {
          prevFrom: formatLocaleDate(cmpFrom, locale),
          prevTo: formatLocaleDate(cmpTo, locale),
          prevNet: formatLocaleAmount(cmp.netPrevious, locale, ccy),
          delta: formatLocaleAmount(cmp.netDelta, locale, ccy),
          dir,
        })
      );
    }

    const forCcy = trends.filter((x) => x.currencyCode === ccy);
    const up = forCcy.filter((x) => x.netDelta > 0).length;
    const down = forCcy.filter((x) => x.netDelta < 0).length;
    const flat = forCcy.length - up - down;
    if (forCcy.length > 0 && cmpFrom) {
      lines.push(
        tpl(t("reports.storyBranchTrendCounts"), { up, down, flat, ccy })
      );
    }

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
    if (worst) {
      lines.push(
        tpl(t("reports.storyWorstBranch"), {
          name: worst.branchName,
          delta: formatLocaleAmount(worst.netDelta, locale, ccy),
        })
      );
    }
    if (best && best.branchId !== worst?.branchId) {
      lines.push(
        tpl(t("reports.storyBestBranch"), {
          name: best.branchName,
          delta: formatLocaleAmount(best.netDelta, locale, ccy),
        })
      );
    }

    return lines;
  }, [
    data.totalsByCurrency,
    ccy,
    locale,
    t,
    trends,
    netCompare,
    cmpFrom,
    cmpTo,
  ]);

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
        .map((b) => ({
          name: smUp ? b.branchName : truncLabel(b.branchName, 14),
          nameFull: b.branchName,
          net: b.netCash,
        }))
        .sort((a, b) => b.net - a.net),
    [data.byBranch, ccy, smUp]
  );

  const branchDeltaData = useMemo(
    () =>
      trends
        .filter((b) => b.currencyCode === ccy)
        .map((b) => ({
          name: smUp ? b.branchName : truncLabel(b.branchName, 14),
          nameFull: b.branchName,
          delta: b.netDelta,
        }))
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 14),
    [trends, ccy, smUp]
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
        <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
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
        {cmpFrom && cmpTo ? (
          <p className="mb-3 text-xs text-zinc-500">
            {t("reports.compareCaption")}: {formatLocaleDate(cmpFrom, locale)} –{" "}
            {formatLocaleDate(cmpTo, locale)}
          </p>
        ) : null}
        <ul className="space-y-2 break-words text-sm leading-relaxed text-zinc-800">
          {storyLines.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-bold text-violet-600">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
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

        <Card title={t("reports.chartExpenseMix")}>
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
