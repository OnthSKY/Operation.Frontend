"use client";

import type { StockReport } from "@/types/reports";
import { Card } from "@/shared/components/Card";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { format, parse } from "date-fns";
import { enUS, tr as trLocale } from "date-fns/locale";
import { useCallback, useMemo, type ReactNode } from "react";

type Props = { data: StockReport };

function StockStorySectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[6.5rem] flex-col rounded-xl border border-zinc-200/85 bg-white p-4 shadow-sm ring-1 ring-zinc-100/90">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-violet-700">{title}</p>
      <div className="mt-2.5 min-w-0 flex-1 text-sm leading-relaxed text-zinc-800">{children}</div>
    </div>
  );
}

function tpl(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ""));
}

function parseYmd(ymd: string): Date {
  return parse(ymd.trim(), "yyyy-MM-dd", new Date());
}

export function ReportStockStory({ data }: Props) {
  const { t, locale } = useI18n();
  const dfLocale = locale === "tr" ? trLocale : enUS;

  const fmtQty = useCallback(
    (n: number) =>
      n.toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  const periodLabel = useMemo(() => {
    try {
      const a = format(parseYmd(data.dateFrom), "d MMM yyyy", { locale: dfLocale });
      const b = format(parseYmd(data.dateTo), "d MMM yyyy", { locale: dfLocale });
      return `${a} – ${b}`;
    } catch {
      return `${data.dateFrom} – ${data.dateTo}`;
    }
  }, [data.dateFrom, data.dateTo, dfLocale]);

  const model = useMemo(() => {
    const wh = data.warehousePeriod;
    const flows = data.warehouseToBranchFlows ?? [];
    const outbound = data.topOutboundProducts ?? [];
    const branches = data.branchReceipts ?? [];

    const sumIn = wh.reduce((a, w) => a + w.quantityIn, 0);
    const sumOut = wh.reduce((a, w) => a + w.quantityOut, 0);
    const sumMove = wh.reduce((a, w) => a + w.movementCount, 0);
    const net = sumIn - sumOut;

    let busiest = wh[0];
    for (const w of wh) {
      const t0 = (busiest?.quantityIn ?? 0) + (busiest?.quantityOut ?? 0);
      const t1 = w.quantityIn + w.quantityOut;
      if (t1 > t0) busiest = w;
    }

    let mostOutWh = wh[0];
    for (const w of wh) {
      if (w.quantityOut > (mostOutWh?.quantityOut ?? 0)) mostOutWh = w;
    }

    const topRoute = flows[0];
    const topProd = outbound[0];
    const topBr = branches[0];

    const hasWhActivity = wh.length > 0 && (sumIn > 0 || sumOut > 0 || sumMove > 0);
    const hasBranchInbound = branches.some((b) => b.totalQuantityReceived > 0);
    const hasFlows = flows.some((f) => f.totalQuantity > 0);
    const hasOutbound = outbound.some((p) => p.quantityOut > 0);

    const notes: string[] = [];
    if (sumOut > 0) {
      if (flows.length === 0) {
        notes.push(t("reports.stockNoteNoWarehouseLink"));
      } else {
        const flowSum = flows.reduce((a, f) => a + f.totalQuantity, 0);
        if (flowSum > 0 && flowSum < sumOut * 0.85) {
          notes.push(t("reports.stockNotePartialWarehouseLink"));
        }
      }
    }

    return {
      sumIn,
      sumOut,
      net,
      sumMove,
      busiest,
      mostOutWh,
      topRoute,
      topProd,
      topBr,
      flows,
      hasWhActivity,
      hasBranchInbound,
      hasFlows,
      hasOutbound,
      notes,
    };
  }, [data, t]);

  const {
    sumIn,
    sumOut,
    net,
    sumMove,
    busiest,
    mostOutWh,
    topRoute,
    topProd,
    topBr,
    flows,
    hasWhActivity,
    hasBranchInbound,
    hasFlows,
    hasOutbound,
    notes,
  } = model;

  const showAnything =
    hasWhActivity || hasBranchInbound || hasFlows || hasOutbound;

  if (!showAnything) {
    return (
      <Card
        title={t("reports.stockSummaryTitle")}
        description={periodLabel}
      >
        <p className="text-sm leading-relaxed text-zinc-600">
          {t("reports.stockSummaryEmpty")}
        </p>
      </Card>
    );
  }

  const kpiClass =
    "rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-3 py-2.5 text-center sm:px-4 sm:py-3";

  return (
    <Card
      title={t("reports.stockSummaryTitle")}
      description={tpl(t("reports.stockSummaryPeriodLine"), {
        period: periodLabel,
      })}
    >
      <p className="mb-4 text-sm leading-relaxed text-zinc-600">
        {t("reports.stockSummaryLead")}
      </p>

      {hasWhActivity ? (
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className={kpiClass}>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              {t("reports.stockKpiIn")}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-800">
              {fmtQty(sumIn)}
            </p>
          </div>
          <div className={kpiClass}>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              {t("reports.stockKpiOut")}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-orange-800">
              {fmtQty(sumOut)}
            </p>
          </div>
          <div className={kpiClass}>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              {t("reports.stockKpiNet")}
            </p>
            <p
              className={cn(
                "mt-1 text-lg font-semibold tabular-nums",
                net >= 0 ? "text-zinc-900" : "text-red-700"
              )}
            >
              {fmtQty(net)}
            </p>
          </div>
          <div className={kpiClass}>
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              {t("reports.stockKpiMovements")}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
              {sumMove}
            </p>
          </div>
        </div>
      ) : hasBranchInbound ? (
        <p className="mb-6 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
          {t("reports.stockSummaryNoWarehouseRows")}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        {hasWhActivity && busiest && busiest.quantityIn + busiest.quantityOut > 0 ? (
          <StockStorySectionCard title={t("reports.stockSecWarehouses")}>
            <div className="space-y-2">
              <p>
                {tpl(t("reports.stockSentenceBusiest"), {
                  name: busiest.warehouseName,
                  qty: fmtQty(busiest.quantityIn + busiest.quantityOut),
                })}
              </p>
              {mostOutWh && mostOutWh.quantityOut > 0 ? (
                <p>
                  {tpl(t("reports.stockSentenceMostOut"), {
                    name: mostOutWh.warehouseName,
                    qty: fmtQty(mostOutWh.quantityOut),
                  })}
                </p>
              ) : null}
            </div>
          </StockStorySectionCard>
        ) : null}

        {hasFlows && topRoute && topRoute.totalQuantity > 0 ? (
          <StockStorySectionCard title={t("reports.stockSecLanes")}>
            <div>
              <p>
                {tpl(t("reports.stockSentenceTopLane"), {
                  wh: topRoute.warehouseName,
                  br: topRoute.branchName,
                  qty: fmtQty(topRoute.totalQuantity),
                  lines: topRoute.movementLineCount,
                })}
              </p>
              {flows.length > 1 ? (
                <ol className="mt-3 space-y-2 border-l-2 border-violet-200/90 pl-3 text-sm text-zinc-700">
                  {flows.slice(0, 5).map((r, idx) => (
                    <li
                      key={`${r.warehouseId}-${r.branchId}-${idx}`}
                      className="tabular-nums"
                    >
                      <span className="font-medium text-zinc-900">
                        {r.warehouseName}
                      </span>
                      <span className="text-zinc-400"> → </span>
                      <span>{r.branchName}</span>
                      <span className="text-zinc-500">
                        {" "}
                        · {fmtQty(r.totalQuantity)} ({r.movementLineCount}{" "}
                        {t("reports.stockStoryLinesAbbr")})
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          </StockStorySectionCard>
        ) : null}

        {hasOutbound && topProd && topProd.quantityOut > 0 ? (
          <StockStorySectionCard title={t("reports.stockSecProducts")}>
            <p>
              {tpl(t("reports.stockSentenceTopProduct"), {
                prod:
                  topProd.productName?.trim() ||
                  t("reports.stockStoryUnknownProduct"),
                wh: topProd.warehouseName,
                qty: fmtQty(topProd.quantityOut),
              })}
            </p>
          </StockStorySectionCard>
        ) : null}

        {hasBranchInbound && topBr && topBr.totalQuantityReceived > 0 ? (
          <StockStorySectionCard title={t("reports.stockSecBranches")}>
            <p>
              {tpl(t("reports.stockSentenceTopBranch"), {
                name: topBr.branchName,
                qty: fmtQty(topBr.totalQuantityReceived),
              })}
            </p>
          </StockStorySectionCard>
        ) : null}
      </div>

      {notes.length > 0 ? (
        <div className="mt-6 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-3">
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-amber-900/80">
            {t("reports.stockNotesTitle")}
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-amber-950/90">
            {notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
