"use client";

import { useI18n } from "@/i18n/context";
import type { StockReport } from "@/types/reports";
import { Card } from "@/shared/components/Card";
import { useMediaMinWidth } from "@/shared/lib/use-media-min-width";
import { useMemo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = [
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#2563eb",
  "#0d9488",
  "#64748b",
  "#059669",
];

type Props = { data: StockReport };

function tpl(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ""));
}

export function ReportStockCharts({ data }: Props) {
  const { t, locale } = useI18n();
  const smUp = useMediaMinWidth(640);
  const pieInner = smUp ? 44 : 36;
  const pieOuter = smUp ? 88 : 70;
  const legendStyle = { fontSize: smUp ? 12 : 10 } as const;

  const whPie = useMemo(
    () =>
      data.warehousePeriod
        .map((w, i) => ({
          name: w.warehouseName,
          value: w.quantityIn + w.quantityOut,
          fill: COLORS[i % COLORS.length],
        }))
        .filter((x) => x.value > 0),
    [data.warehousePeriod]
  );

  const brPie = useMemo(
    () =>
      data.branchReceipts
        .map((b, i) => ({
          name: b.branchName,
          value: b.totalQuantityReceived,
          fill: COLORS[i % COLORS.length],
        }))
        .filter((x) => x.value > 0),
    [data.branchReceipts]
  );

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

  const empty =
    whPie.length === 0 &&
    brPie.length === 0;

  const topReceipt = data.branchReceipts[0];
  const highlight =
    topReceipt && topReceipt.totalQuantityReceived > 0
      ? tpl(t("reports.stockHighlight"), {
          name: topReceipt.branchName,
          qty: topReceipt.totalQuantityReceived.toLocaleString(
            locale === "tr" ? "tr-TR" : "en-US",
            { maximumFractionDigits: 2 }
          ),
        })
      : null;

  if (empty) {
    return (
      <div className="flex flex-col gap-2">
        <p className="break-words text-xs leading-relaxed text-zinc-500">
          {t("reports.stockChartsHint")}
        </p>
        {highlight ? (
          <p className="break-words rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2 text-xs text-violet-950">
            {highlight}
          </p>
        ) : null}
        <Card title={t("reports.sectionStockCharts")}>
          <p className="text-sm text-zinc-500">{t("reports.empty")}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="break-words text-xs leading-relaxed text-zinc-500">
        {t("reports.stockChartsHint")}
      </p>
      {highlight ? (
        <p className="break-words rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2 text-xs text-violet-950">
          {highlight}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {whPie.length > 0 ? (
          <Card title={t("reports.chartWarehouseMix")}>
            <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 4, left: 0 }}>
                  <Pie
                    data={whPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={pieInner}
                    outerRadius={pieOuter}
                    paddingAngle={1}
                    label={false}
                  >
                    {whPie.map((x, i) => (
                      <Cell key={i} fill={x.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={fmtQty} />
                  <Legend wrapperStyle={legendStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : null}
        {brPie.length > 0 ? (
          <Card title={t("reports.chartBranchInboundMix")}>
            <div className="h-[220px] w-full min-w-0 sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 4, left: 0 }}>
                  <Pie
                    data={brPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={pieInner}
                    outerRadius={pieOuter}
                    paddingAngle={1}
                    label={false}
                  >
                    {brPie.map((x, i) => (
                      <Cell key={i} fill={x.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={fmtQty} />
                  <Legend wrapperStyle={legendStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
