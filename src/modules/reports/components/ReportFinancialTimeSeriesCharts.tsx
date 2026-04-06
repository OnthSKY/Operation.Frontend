"use client";

import type { Locale } from "@/i18n/messages";
import type {
  FinancialBranchMonthlyBreakdownRow,
  FinancialMonthlyBreakdownRow,
} from "@/types/reports";
import { Card } from "@/shared/components/Card";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { useMediaMinWidth } from "@/shared/lib/use-media-min-width";
import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

export function ReportFinancialTimeSeriesCharts({
  t,
  locale,
  currencyCode,
  monthlyRows,
  branchMonthlyRows,
  showBranchNetByMonth,
}: {
  t: TFn;
  locale: Locale;
  currencyCode: string;
  monthlyRows: FinancialMonthlyBreakdownRow[] | null | undefined;
  branchMonthlyRows: FinancialBranchMonthlyBreakdownRow[] | undefined;
  showBranchNetByMonth: boolean;
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
        name: r.branchName,
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

    return { rows, branchMeta };
  }, [branchMonthlyRows, currencyCode, locale, showBranchNetByMonth]);

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

  if (!monthlyChartData.length && !branchChart?.rows.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {monthlyChartData.length > 0 ? (
        <div>
          <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
            {t("reports.sectionMonthlyTrends")}
          </p>
          <p className="mb-3 break-words text-xs leading-relaxed text-zinc-500">
            {t("reports.chartMonthlyTrendCaption")}
          </p>
          <Card title={t("reports.chartMonthlyExpenseNet")}>
            <div className="h-[240px] w-full min-w-0 sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyChartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" tick={{ fontSize: smUp ? 11 : 9 }} />
                  <YAxis
                    tick={{ fontSize: smUp ? 11 : 9 }}
                    tickFormatter={fmtAxisTick}
                    width={smUp ? 72 : 56}
                  />
                  <Tooltip
                    formatter={(v) => tooltipMoney(v)}
                    labelFormatter={(_, p) =>
                      (p?.[0]?.payload as { label?: string })?.label ?? ""
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: smUp ? 12 : 10 }} />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name={t("reports.chartMonthlyExpense")}
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name={t("reports.chartMonthlyNet")}
                    stroke="#059669"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      ) : null}

      {branchChart && branchChart.rows.length > 0 && branchChart.branchMeta.length > 0 ? (
        <div>
          <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
            {t("reports.sectionBranchMonthly")}
          </p>
          <p className="mb-3 break-words text-xs leading-relaxed text-zinc-500">
            {t("reports.chartBranchMonthlyHint")}
          </p>
          <Card title={t("reports.chartBranchMonthlyNet")}>
            <div className="h-[260px] w-full min-w-0 sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={branchChart.rows}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="label" tick={{ fontSize: smUp ? 11 : 9 }} />
                  <YAxis
                    tick={{ fontSize: smUp ? 11 : 9 }}
                    tickFormatter={fmtAxisTick}
                    width={smUp ? 72 : 56}
                  />
                  <Tooltip formatter={(v) => tooltipMoney(v)} />
                  <Legend wrapperStyle={{ fontSize: smUp ? 11 : 10 }} />
                  {branchChart.branchMeta.map((b, i) => (
                    <Line
                      key={b.id}
                      type="monotone"
                      dataKey={`b${b.id}`}
                      name={b.name}
                      stroke={BRANCH_LINE_COLORS[i % BRANCH_LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
