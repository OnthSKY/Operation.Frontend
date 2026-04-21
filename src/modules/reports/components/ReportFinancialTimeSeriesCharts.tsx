"use client";

import type { Locale } from "@/i18n/messages";
import { reportBranchLabel } from "@/modules/reports/lib/report-branch-label";
import type {
  FinancialBranchMonthlyBreakdownRow,
  FinancialMonthlyBreakdownRow,
} from "@/types/reports";
import { Card } from "@/shared/components/Card";
import { RechartsMeasureBox } from "@/shared/components/RechartsMeasureBox";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { useMediaMinWidth } from "@/shared/lib/use-media-min-width";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TFn = (key: string) => string;

const BRANCH_LINE_COLORS = [
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#2563eb",
  "#0d9488",
  "#ca8a04",
  "#64748b",
  "#059669",
];

const COL_NET = "#059669";
const COL_EXPENSE = "#dc2626";

function monthTickLabel(iso: string, locale: Locale): string {
  const ymd = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return iso;
  const dt = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    month: "short",
    year: "numeric",
  });
}

function truncLabel(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

export function ReportFinancialTimeSeriesCharts({
  t,
  locale,
  currencyCode,
  monthlyRows,
  branchMonthlyRows,
  showBranchNetByMonth,
  suppressSectionIntro = false,
}: {
  t: TFn;
  locale: Locale;
  currencyCode: string;
  monthlyRows: FinancialMonthlyBreakdownRow[] | null | undefined;
  branchMonthlyRows: FinancialBranchMonthlyBreakdownRow[] | undefined;
  showBranchNetByMonth: boolean;
  suppressSectionIntro?: boolean;
}) {
  const smUp = useMediaMinWidth(640);

  const monthlyChartData = useMemo(() => {
    if (!monthlyRows?.length) return [];
    const forCcy = monthlyRows.filter((r) => r.currencyCode === currencyCode);
    return [...forCcy]
      .sort((a, b) => a.monthStart.localeCompare(b.monthStart))
      .map((r) => ({
        key: r.monthStart,
        label: monthTickLabel(r.monthStart, locale),
        expense: r.totalExpense,
        net: r.netCash,
      }));
  }, [monthlyRows, currencyCode, locale]);

  const useMonthlyBars = monthlyChartData.length > 0 && monthlyChartData.length <= 2;

  const branchChart = useMemo(() => {
    if (!showBranchNetByMonth || !branchMonthlyRows?.length) return null;
    const forCcy = branchMonthlyRows.filter(
      (r) => r.currencyCode === currencyCode
    );
    if (!forCcy.length) return null;

    const branchScores = new Map<number, { name: string; score: number }>();
    for (const r of forCcy) {
      const prev = branchScores.get(r.branchId);
      branchScores.set(r.branchId, {
        name: reportBranchLabel(r.branchId, r.branchName, t),
        score: (prev?.score ?? 0) + Math.abs(r.netCash),
      });
    }
    const topBranchIds = [...branchScores.entries()]
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 8)
      .map(([id]) => id);

    const months = [...new Set(forCcy.map((r) => r.monthStart))].sort((a, b) =>
      a.localeCompare(b)
    );

    const rows = months.map((m) => {
      const label = monthTickLabel(m, locale);
      const pt: Record<string, string | number> = { key: m, label };
      for (const bid of topBranchIds) {
        const row = forCcy.find(
          (x) => x.monthStart === m && x.branchId === bid
        );
        pt[`b${bid}`] = row?.netCash ?? 0;
      }
      return pt;
    });

    const branchMeta = topBranchIds.map((id) => ({
      id,
      name: branchScores.get(id)?.name ?? `#${id}`,
    }));

    return { rows, branchMeta, monthCount: months.length };
  }, [branchMonthlyRows, currencyCode, locale, showBranchNetByMonth, t]);

  const branchSingleMonthBars = useMemo(() => {
    if (!branchChart || branchChart.monthCount !== 1 || !branchChart.rows[0]) {
      return null;
    }
    const row = branchChart.rows[0];
    return branchChart.branchMeta
      .map((b) => {
        const net = Number(row[`b${b.id}`] ?? 0);
        return {
          id: b.id,
          label: truncLabel(b.name, smUp ? 26 : 12),
          labelFull: b.name,
          net,
        };
      })
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [branchChart, smUp]);

  const fmtAxisTick = (v: number) => {
    if (smUp) {
      return String(
        formatLocaleAmount(v, locale, currencyCode).replace(/\u00a0/g, " ")
      );
    }
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 10_000) return `${(v / 1000).toFixed(0)}k`;
    if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return String(Math.round(v));
  };

  const tooltipMoney = (value: unknown) => {
    const n =
      typeof value === "number"
        ? value
        : Array.isArray(value)
          ? Number(value[0])
          : Number(value);
    return formatLocaleAmount(Number.isFinite(n) ? n : 0, locale, currencyCode);
  };

  const monthlyBarH = Math.min(320, 140 + monthlyChartData.length * 72);
  const branchBarH = branchSingleMonthBars
    ? Math.min(440, 72 + branchSingleMonthBars.length * 44)
    : 320;

  const showDotsOnMonthlyLine =
    monthlyChartData.length >= 3 && monthlyChartData.length <= 14;

  if (!monthlyChartData.length && !branchChart?.rows.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {monthlyChartData.length > 0 ? (
        <div>
          {!suppressSectionIntro ? (
            <>
              <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
                {t("reports.sectionMonthlyTrends")}
              </p>
              <p className="mb-3 break-words text-xs leading-relaxed text-zinc-500">
                {t("reports.chartMonthlyTrendCaption")}
              </p>
            </>
          ) : null}
          <Card
            className="min-w-0"
            title={t("reports.chartMonthlyExpenseNet")}
            description={useMonthlyBars ? t("reports.chartMonthlyBarsNote") : undefined}
          >
            {useMonthlyBars ? (
              <RechartsMeasureBox
                className="w-full min-w-0"
                style={{ height: monthlyBarH }}
              >
                {({ width, height }) => (
                  <ResponsiveContainer width={width} height={height}>
                    <BarChart
                      data={monthlyChartData}
                      margin={{ top: 12, right: 12, left: 4, bottom: 28 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: smUp ? 12 : 10 }} />
                      <YAxis
                        tick={{ fontSize: smUp ? 11 : 9 }}
                        tickFormatter={fmtAxisTick}
                        width={smUp ? 76 : 60}
                      />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                      <Tooltip
                        formatter={(v) => tooltipMoney(v)}
                        labelFormatter={(_, p) =>
                          (p?.[0]?.payload as { label?: string })?.label ?? ""
                        }
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e4e4e7",
                          fontSize: 12,
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: smUp ? 12 : 10, paddingTop: 8 }}
                      />
                      <Bar
                        dataKey="net"
                        name={t("reports.chartMonthlyNet")}
                        fill={COL_NET}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={52}
                      >
                        {monthlyChartData.map((d, i) => (
                          <Cell
                            key={`n-${i}`}
                            fill={d.net >= 0 ? COL_NET : "#b91c1c"}
                          />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="expense"
                        name={t("reports.chartMonthlyExpense")}
                        fill={COL_EXPENSE}
                        radius={[6, 6, 0, 0]}
                        maxBarSize={52}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </RechartsMeasureBox>
            ) : (
              <RechartsMeasureBox className="h-[248px] w-full min-w-0 sm:h-[292px]">
                {({ width, height }) => (
                  <ResponsiveContainer width={width} height={height}>
                    <LineChart
                      data={monthlyChartData}
                      margin={{ top: 12, right: 12, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                      <XAxis dataKey="label" tick={{ fontSize: smUp ? 12 : 10 }} />
                      <YAxis
                        tick={{ fontSize: smUp ? 11 : 9 }}
                        tickFormatter={fmtAxisTick}
                        width={smUp ? 76 : 60}
                      />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                      <Tooltip
                        formatter={(v) => tooltipMoney(v)}
                        labelFormatter={(_, p) =>
                          (p?.[0]?.payload as { label?: string })?.label ?? ""
                        }
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e4e4e7",
                          fontSize: 12,
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: smUp ? 12 : 10, paddingTop: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="expense"
                        name={t("reports.chartMonthlyExpense")}
                        stroke={COL_EXPENSE}
                        strokeWidth={2.5}
                        dot={
                          showDotsOnMonthlyLine
                            ? { r: 3, strokeWidth: 2, fill: COL_EXPENSE }
                            : false
                        }
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="net"
                        name={t("reports.chartMonthlyNet")}
                        stroke={COL_NET}
                        strokeWidth={2.5}
                        dot={
                          showDotsOnMonthlyLine
                            ? { r: 3, strokeWidth: 2, fill: COL_NET }
                            : false
                        }
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </RechartsMeasureBox>
            )}
          </Card>
        </div>
      ) : null}

      {branchChart && branchChart.rows.length > 0 && branchChart.branchMeta.length > 0 ? (
        <div>
          {!suppressSectionIntro ? (
            <>
              <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
                {t("reports.sectionBranchMonthly")}
              </p>
              <p className="mb-3 break-words text-xs leading-relaxed text-zinc-500">
                {t("reports.chartBranchMonthlyHint")}
              </p>
            </>
          ) : null}
          <Card
            className="min-w-0"
            title={t("reports.chartBranchMonthlyNet")}
            description={
              branchSingleMonthBars
                ? t("reports.chartBranchSingleMonthBarsNote")
                : undefined
            }
          >
            {branchSingleMonthBars ? (
              <RechartsMeasureBox
                className="w-full min-w-0"
                style={{ height: branchBarH }}
              >
                {({ width, height }) => (
                  <ResponsiveContainer width={width} height={height}>
                    <BarChart
                      layout="vertical"
                      data={branchSingleMonthBars}
                      margin={{ top: 8, right: smUp ? 20 : 12, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal />
                      <XAxis
                        type="number"
                        tick={{ fontSize: smUp ? 11 : 9 }}
                        tickFormatter={fmtAxisTick}
                      />
                      <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="4 4" />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={smUp ? 148 : 92}
                        tick={{ fontSize: smUp ? 11 : 9 }}
                      />
                      <Tooltip
                        formatter={(v) => tooltipMoney(v)}
                        labelFormatter={(_, p) => {
                          const pl = p?.[0]?.payload as { labelFull?: string };
                          return pl?.labelFull ?? "";
                        }}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e4e4e7",
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: smUp ? 12 : 10 }} />
                      <Bar
                        dataKey="net"
                        name={t("reports.chartMonthlyNet")}
                        radius={[0, 6, 6, 0]}
                        maxBarSize={28}
                      >
                        {branchSingleMonthBars.map((e, i) => (
                          <Cell
                            key={e.id}
                            fill={e.net >= 0 ? COL_NET : "#b91c1c"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </RechartsMeasureBox>
            ) : (
              <RechartsMeasureBox className="h-[268px] w-full min-w-0 sm:h-[328px]">
                {({ width, height }) => (
                  <ResponsiveContainer width={width} height={height}>
                    <LineChart
                      data={branchChart.rows}
                      margin={{ top: 12, right: 12, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                      <XAxis dataKey="label" tick={{ fontSize: smUp ? 12 : 10 }} />
                      <YAxis
                        tick={{ fontSize: smUp ? 11 : 9 }}
                        tickFormatter={fmtAxisTick}
                        width={smUp ? 76 : 60}
                      />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                      <Tooltip
                        formatter={(v) => tooltipMoney(v)}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e4e4e7",
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: smUp ? 11 : 10, paddingTop: 4 }} />
                      {branchChart.branchMeta.map((b, i) => (
                        <Line
                          key={b.id}
                          type="monotone"
                          dataKey={`b${b.id}`}
                          name={b.name}
                          stroke={
                            BRANCH_LINE_COLORS[i % BRANCH_LINE_COLORS.length]
                          }
                          strokeWidth={2.5}
                          dot={
                            branchChart.rows.length <= 5
                              ? {
                                  r: 3,
                                  strokeWidth: 2,
                                  fill: BRANCH_LINE_COLORS[i % BRANCH_LINE_COLORS.length],
                                }
                              : false
                          }
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </RechartsMeasureBox>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
