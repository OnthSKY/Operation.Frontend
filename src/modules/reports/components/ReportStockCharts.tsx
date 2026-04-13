"use client";

import { useI18n } from "@/i18n/context";
import type { StockReport } from "@/types/reports";
import { Card } from "@/shared/components/Card";
import { useMediaMinWidth } from "@/shared/lib/use-media-min-width";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ReportStockStory } from "@/modules/reports/components/ReportStockStory";
import Link from "next/link";

const COL_IN = "#059669";
const COL_OUT = "#ea580c";
const COL_BRANCH = "#7c3aed";

type Props = { data: StockReport };

function truncLabel(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

export function ReportStockCharts({ data }: Props) {
  const { t, locale } = useI18n();
  const smUp = useMediaMinWidth(640);

  const fmtQty = (value: unknown) => {
    const n =
      typeof value === "number"
        ? value
        : Array.isArray(value)
          ? Number(value[0])
          : Number(value);
    return (Number.isFinite(n) ? n : 0).toLocaleString(
      locale === "tr" ? "tr-TR" : "en-US",
      { maximumFractionDigits: 2 }
    );
  };

  const fmtAxisTick = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 10_000) return `${(v / 1000).toFixed(0)}k`;
    if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return String(Math.round(v * 100) / 100);
  };

  const yAxisW = smUp ? 112 : 80;
  const labelMax = smUp ? 22 : 14;

  const barH = (rows: number) =>
    Math.min(smUp ? 440 : 380, (smUp ? 88 : 72) + rows * (smUp ? 36 : 32));

  const whBar = useMemo(() => {
    const rows = data.warehousePeriod
      .map((w) => ({
        name: truncLabel(w.warehouseName, labelMax),
        nameFull: w.warehouseName,
        qtyIn: w.quantityIn,
        qtyOut: w.quantityOut,
        total: w.quantityIn + w.quantityOut,
      }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);
    return rows;
  }, [data.warehousePeriod, labelMax]);

  const brBar = useMemo(() => {
    const rows = data.branchReceipts
      .map((b) => ({
        name: truncLabel(b.branchName, labelMax),
        nameFull: b.branchName,
        qty: b.totalQuantityReceived,
      }))
      .filter((x) => x.qty > 0)
      .sort((a, b) => b.qty - a.qty);
    return rows;
  }, [data.branchReceipts, labelMax]);

  const empty = whBar.length === 0 && brBar.length === 0;

  const legendStyle = { fontSize: smUp ? 12 : 10 } as const;

  if (empty) {
    return (
      <div className="flex flex-col gap-4">
        <ReportStockStory data={data} />
        <Card
          title={t("reports.sectionStockCharts")}
          description={t("reports.stockChartsHint")}
        >
          <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            {t("reports.stockEmptyHint")}
          </p>
          <Link
            href="/warehouses"
            className="mt-3 inline-block text-sm font-semibold text-violet-700 underline-offset-2 hover:underline"
          >
            {t("reports.stockEmptyCtaWarehouse")}
          </Link>
        </Card>
      </div>
    );
  }

  const chartScrollWrap =
    "-mx-1 w-[calc(100%+0.5rem)] min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain px-1 sm:mx-0 sm:w-full sm:overflow-visible sm:px-0";

  return (
    <div className="flex flex-col gap-4">
      <ReportStockStory data={data} />
      <div>
        <h2 className="text-base font-semibold text-zinc-900">
          {t("reports.stockChartsSectionTitle")}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          {t("reports.stockChartsHint")}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {whBar.length > 0 ? (
          <Card
            title={t("reports.chartWarehouseMix")}
            description={t("reports.stockChartWarehouseDesc")}
          >
            <div className={chartScrollWrap} style={{ height: barH(whBar.length) }}>
              <div
                className="h-full min-w-[min(100%,280px)] sm:min-w-0"
                style={{ minWidth: smUp ? undefined : 300 }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={whBar}
                    layout="vertical"
                    margin={{
                      top: 8,
                      right: smUp ? 16 : 8,
                      left: 0,
                      bottom: 8,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e4e4e7"
                      horizontal={false}
                    />
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
                      formatter={(v) => fmtQty(v)}
                      labelFormatter={(_, payload) =>
                        (payload?.[0]?.payload as { nameFull?: string })
                          ?.nameFull ?? ""
                      }
                    />
                    <Legend wrapperStyle={legendStyle} />
                    <Bar
                      dataKey="qtyIn"
                      name={t("reports.colQtyIn")}
                      stackId="wh"
                      fill={COL_IN}
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="qtyOut"
                      name={t("reports.colQtyOut")}
                      stackId="wh"
                      fill={COL_OUT}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        ) : null}

        {brBar.length > 0 ? (
          <Card
            title={t("reports.chartBranchInboundMix")}
            description={t("reports.stockChartBranchDesc")}
          >
            <div className={chartScrollWrap} style={{ height: barH(brBar.length) }}>
              <div
                className="h-full min-w-[min(100%,280px)] sm:min-w-0"
                style={{ minWidth: smUp ? undefined : 300 }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={brBar}
                    layout="vertical"
                    margin={{
                      top: 8,
                      right: smUp ? 16 : 8,
                      left: 0,
                      bottom: 8,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e4e4e7"
                      horizontal={false}
                    />
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
                      formatter={(v) => fmtQty(v)}
                      labelFormatter={(_, payload) =>
                        (payload?.[0]?.payload as { nameFull?: string })
                          ?.nameFull ?? ""
                      }
                    />
                    <Legend wrapperStyle={legendStyle} />
                    <Bar
                      dataKey="qty"
                      name={t("reports.colReceiptQty")}
                      fill={COL_BRANCH}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
