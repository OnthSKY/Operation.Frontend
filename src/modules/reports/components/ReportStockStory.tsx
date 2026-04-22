"use client";

import type { StockReport } from "@/types/reports";
import { MobileCard } from "@/components/mobile/MobileCard";
import { Card } from "@/shared/components/Card";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { format, parse } from "date-fns";
import { enUS, tr as trLocale } from "date-fns/locale";
import { useCallback, useMemo, type ReactNode } from "react";

type Props = { data: StockReport };

function StockStorySectionCard({
  title,
  icon,
  toneClassName = "text-violet-700",
  children,
}: {
  title: string;
  icon: string;
  toneClassName?: string;
  children: ReactNode;
}) {
  return (
    <MobileCard
      title={
        <span className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-sm">
            {icon}
          </span>
          <span className={cn("text-[0.65rem] font-bold uppercase tracking-[0.14em]", toneClassName)}>
            {title}
          </span>
        </span>
      }
      primaryFields={[
        <div key="content" className="min-w-0 flex-1 text-sm leading-relaxed text-zinc-800">
          {children}
        </div>,
      ]}
      className="h-full min-h-[6.5rem] ring-1 ring-zinc-100/90"
    />
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
  const formatQtyWithUnit = useCallback(
    (qty: number, unit?: string | null, fallbackUnit?: string) => {
      const unitNorm = String(unit ?? "").trim();
      if (unitNorm.length > 0) return `${fmtQty(qty)} ${unitNorm}`;
      if (fallbackUnit) return `${fmtQty(qty)} ${fallbackUnit}`;
      return fmtQty(qty);
    },
    [fmtQty]
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
    const topProductsAtBusiest = busiest
      ? (data.topProductFlows ?? [])
          .filter(
            (p) =>
              p.warehouseId === busiest.warehouseId &&
              p.turnover > 0 &&
              (p.productName?.trim() ?? "") !== ""
          )
          .sort((a, b) => b.turnover - a.turnover)
          .slice(0, 3)
      : [];
    const topOutboundAtMostOutWh = mostOutWh
      ? outbound
          .filter(
            (p) =>
              p.warehouseId === mostOutWh.warehouseId &&
              p.quantityOut > 0 &&
              (p.productName?.trim() ?? "") !== ""
          )
          .sort((a, b) => b.quantityOut - a.quantityOut)
          .slice(0, 3)
      : [];
    const topRouteProductMix = topRoute
      ? flows
          .filter(
            (f) =>
              f.warehouseId === topRoute.warehouseId &&
              f.branchId === topRoute.branchId &&
              f.totalQuantity > 0
          )
          .sort((a, b) => b.totalQuantity - a.totalQuantity)
          .slice(0, 4)
      : [];
    const topFlowRoutes = flows
      .filter((f) => f.totalQuantity > 0)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 4);
    const topOutboundProducts = outbound
      .filter((p) => p.quantityOut > 0)
      .sort((a, b) => b.quantityOut - a.quantityOut)
      .slice(0, 4);
    const topBranchProductMix = topBr
      ? branches
          .filter((b) => b.branchId === topBr.branchId && b.totalQuantityReceived > 0)
          .sort((a, b) => b.totalQuantityReceived - a.totalQuantityReceived)
          .slice(0, 4)
      : [];
    const topInboundBranches = branches
      .filter((b) => b.totalQuantityReceived > 0)
      .sort((a, b) => b.totalQuantityReceived - a.totalQuantityReceived)
      .slice(0, 4);

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
      topProductsAtBusiest,
      topOutboundAtMostOutWh,
      topRouteProductMix,
      topFlowRoutes,
      topOutboundProducts,
      topBranchProductMix,
      topInboundBranches,
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
    topProductsAtBusiest,
    topOutboundAtMostOutWh,
    topRouteProductMix,
    topFlowRoutes,
    topOutboundProducts,
    topBranchProductMix,
    topInboundBranches,
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
  const keyValueClass = "text-xl font-semibold tabular-nums text-zinc-900";

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
          <StockStorySectionCard
            title={t("reports.stockSecWarehouses")}
            icon="🏬"
            toneClassName="text-violet-700"
          >
            <div className="space-y-2">
              <p className={keyValueClass}>
                {formatQtyWithUnit(
                  busiest.quantityIn + busiest.quantityOut,
                  null,
                  t("reports.stockQtyUnitGeneric")
                )}
              </p>
              <p className="text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">{busiest.warehouseName}</span>{" "}
                en yoğun işlem hacmi.
              </p>
              {topProductsAtBusiest.length > 0 ? (
                <ul className="space-y-1 rounded-lg border border-zinc-200/80 bg-zinc-50/70 px-2.5 py-2 text-xs text-zinc-700">
                  {topProductsAtBusiest.map((p) => (
                    <li
                      key={`${p.warehouseId}-${p.productId ?? p.productName ?? "x"}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">
                        {p.productName?.trim() || t("reports.stockStoryUnknownProduct")}
                      </span>
                      <span className="shrink-0 tabular-nums font-medium text-zinc-900">
                        {formatQtyWithUnit(
                          p.turnover,
                          p.unit,
                          t("reports.stockQtyUnitGeneric")
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {mostOutWh && mostOutWh.quantityOut > 0 ? (
                <p className="text-sm text-zinc-600">
                  En yüksek çıkış:{" "}
                  <span className="font-medium text-zinc-900">{mostOutWh.warehouseName}</span>{" "}
                  (
                  {formatQtyWithUnit(
                    mostOutWh.quantityOut,
                    null,
                    t("reports.stockQtyUnitGeneric")
                  )}
                  ).
                </p>
              ) : null}
              {topOutboundAtMostOutWh.length > 0 ? (
                <ul className="space-y-1 text-xs text-zinc-600">
                  {topOutboundAtMostOutWh.map((p) => (
                    <li key={`${p.warehouseId}-${p.productId ?? p.productName ?? "x"}-out`}>
                      {p.productName?.trim() || t("reports.stockStoryUnknownProduct")} ·{" "}
                      {formatQtyWithUnit(
                        p.quantityOut,
                        p.unit,
                        t("reports.stockQtyUnitGeneric")
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </StockStorySectionCard>
        ) : null}

        {hasFlows && topRoute && topRoute.totalQuantity > 0 ? (
          <StockStorySectionCard
            title={t("reports.stockSecLanes")}
            icon="🔁"
            toneClassName="text-indigo-700"
          >
            <div>
              <p className={keyValueClass}>
                {formatQtyWithUnit(topRoute.totalQuantity, null, t("reports.stockQtyUnitGeneric"))}
              </p>
              <p className="mt-1 text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">{topRoute.warehouseName}</span>
                <span className="text-zinc-400"> → </span>
                <span className="font-medium text-zinc-900">{topRoute.branchName}</span>
              </p>
              <p className="text-sm text-zinc-600">
                {topRoute.productName?.trim() || t("reports.stockStoryUnknownProduct")}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Bu hatta ürün dağılımı
              </p>
              {topRouteProductMix.length > 0 ? (
                <ul className="space-y-1 rounded-lg border border-zinc-200/80 bg-zinc-50/70 px-2.5 py-2 text-xs text-zinc-700">
                  {topRouteProductMix.map((r, idx) => (
                    <li
                      key={`${r.warehouseId}-${r.branchId}-${r.productId ?? idx}-mix`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">
                        {r.productName?.trim() || t("reports.stockStoryUnknownProduct")}
                      </span>
                      <span className="shrink-0 tabular-nums font-medium text-zinc-900">
                        {formatQtyWithUnit(
                          r.totalQuantity,
                          r.unit,
                          t("reports.stockQtyUnitGeneric")
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Güçlü hatlar
              </p>
              {topFlowRoutes.length > 0 ? (
                <ol className="space-y-2 border-l-2 border-violet-200/90 pl-3 text-sm text-zinc-700">
                  {topFlowRoutes.map((r, idx) => (
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
                        · {r.productName?.trim() || t("reports.stockStoryUnknownProduct")}
                      </span>
                      <span className="text-zinc-500">
                        {" "}
                        ·{" "}
                        {formatQtyWithUnit(r.totalQuantity, r.unit, t("reports.stockQtyUnitGeneric"))} (
                        {r.movementLineCount}{" "}
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
          <StockStorySectionCard
            title={t("reports.stockSecProducts")}
            icon="📦"
            toneClassName="text-purple-700"
          >
            <p className={keyValueClass}>
              {formatQtyWithUnit(
                topProd.quantityOut,
                topProd.unit,
                t("reports.stockQtyUnitGeneric")
              )}
            </p>
            <p className="mt-1 text-sm text-zinc-700">
              <span className="font-medium text-zinc-900">
                {topProd.productName?.trim() || t("reports.stockStoryUnknownProduct")}
              </span>
            </p>
            <p className="text-sm text-zinc-600">{topProd.warehouseName} çıkışta lider.</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Çıkışta ilk ürünler
            </p>
            {topOutboundProducts.length > 0 ? (
              <ul className="space-y-1 rounded-lg border border-zinc-200/80 bg-zinc-50/70 px-2.5 py-2 text-xs text-zinc-700">
                {topOutboundProducts.map((p) => (
                  <li
                    key={`${p.warehouseId}-${p.productId ?? p.productName ?? "x"}-topout`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="min-w-0 truncate">
                      {p.productName?.trim() || t("reports.stockStoryUnknownProduct")}
                      <span className="text-zinc-500"> · {p.warehouseName}</span>
                    </span>
                    <span className="shrink-0 tabular-nums font-medium text-zinc-900">
                      {formatQtyWithUnit(
                        p.quantityOut,
                        p.unit,
                        t("reports.stockQtyUnitGeneric")
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </StockStorySectionCard>
        ) : null}

        {hasBranchInbound && topBr && topBr.totalQuantityReceived > 0 ? (
          <StockStorySectionCard
            title={t("reports.stockSecBranches")}
            icon="🏪"
            toneClassName="text-fuchsia-700"
          >
            <p className={keyValueClass}>
              {formatQtyWithUnit(
                topBr.totalQuantityReceived,
                topBr.unit,
                t("reports.stockQtyUnitGeneric")
              )}
            </p>
            <p className="mt-1 text-sm text-zinc-700">
              <span className="font-medium text-zinc-900">{topBr.branchName}</span> en çok mal
              girişi alan şube.
            </p>
            <p className="text-sm text-zinc-600">
              {topBr.productName?.trim() || t("reports.stockStoryUnknownProduct")}
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Bu şubede öne çıkan ürünler
            </p>
            {topBranchProductMix.length > 0 ? (
              <ul className="space-y-1 rounded-lg border border-zinc-200/80 bg-zinc-50/70 px-2.5 py-2 text-xs text-zinc-700">
                {topBranchProductMix.map((p, idx) => (
                  <li
                    key={`${p.branchId}-${p.productId ?? p.productName ?? idx}-branchmix`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">
                      {p.productName?.trim() || t("reports.stockStoryUnknownProduct")}
                    </span>
                    <span className="shrink-0 tabular-nums font-medium text-zinc-900">
                      {formatQtyWithUnit(
                        p.totalQuantityReceived,
                        p.unit,
                        t("reports.stockQtyUnitGeneric")
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              En çok alan şubeler
            </p>
            {topInboundBranches.length > 0 ? (
              <ul className="space-y-1 text-xs text-zinc-600">
                {topInboundBranches.map((b, idx) => (
                  <li key={`${b.branchId}-${idx}`}>
                    <span className="font-medium text-zinc-800">{b.branchName}</span> ·{" "}
                    {formatQtyWithUnit(
                      b.totalQuantityReceived,
                      b.unit,
                      t("reports.stockQtyUnitGeneric")
                    )}
                    {b.productName?.trim() ? (
                      <span className="text-zinc-500"> ({b.productName})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
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
