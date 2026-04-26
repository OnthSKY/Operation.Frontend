"use client";

import { fillDashboardTemplate } from "@/modules/dashboard/components/dashboard-utils";
import { useWarehouseMovementsPage, useWarehouseStock } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { warehouseMovementShipmentGroupKey } from "@/shared/lib/in-batch-group-label";
import { useI18n } from "@/i18n/context";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/lib/cn";
import type { WarehouseProductStockRow } from "@/types/product";
import { useMemo } from "react";

function countParentProductGroupsWithStock(rows: WarehouseProductStockRow[]): number {
  const positive = rows.filter((r) => r.quantity > 0);
  const roots = new Set<number>();
  for (const r of positive) {
    const pid = r.parentProductId;
    roots.add(pid != null && pid > 0 ? pid : r.productId);
  }
  return roots.size;
}

const MOVEMENT_SAMPLE = 100;

const cardBase =
  "flex min-h-0 min-w-0 flex-col rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-zinc-200/80 sm:p-5";

type Props = {
  warehouseId: number;
  enabled: boolean;
  onOpenMovementsTab?: () => void;
  onOpenInboundMovementsTab?: () => void;
};

export function WarehouseSummaryKpiCards({
  warehouseId,
  enabled,
  onOpenMovementsTab,
  onOpenInboundMovementsTab,
}: Props) {
  const { t, locale } = useI18n();

  const stockQ = useWarehouseStock(enabled ? warehouseId : null, {});
  const movSampleQ = useWarehouseMovementsPage(
    enabled ? warehouseId : null,
    { page: 1, pageSize: MOVEMENT_SAMPLE },
    enabled
  );
  const movInCountQ = useWarehouseMovementsPage(
    enabled ? warehouseId : null,
    { page: 1, pageSize: 1, type: "IN" },
    enabled
  );
  const movOutCountQ = useWarehouseMovementsPage(
    enabled ? warehouseId : null,
    { page: 1, pageSize: 1, type: "OUT" },
    enabled
  );

  const rows = stockQ.data ?? [];
  const distinctSku = useMemo(() => new Set(rows.filter((r) => r.quantity > 0).map((r) => r.productId)).size, [rows]);
  const totalUnits = useMemo(() => rows.reduce((s, r) => s + Math.max(0, r.quantity), 0), [rows]);
  const parentProductGroupCount = useMemo(() => countParentProductGroupsWithStock(rows), [rows]);

  const movItems = movSampleQ.data?.items ?? [];
  const totalMovementLines = movSampleQ.data?.totalCount ?? 0;
  const totalInQty = Number(movSampleQ.data?.totalInQuantity ?? 0);
  const totalOutQty = Number(movSampleQ.data?.totalOutQuantity ?? 0);
  const inLineCount = movInCountQ.data?.totalCount ?? 0;
  const outLineCount = movOutCountQ.data?.totalCount ?? 0;

  const shipmentKeysInSample = useMemo(() => {
    const s = new Set<string>();
    for (const m of movItems) {
      s.add(warehouseMovementShipmentGroupKey(m.inBatchGroupId, m.id));
    }
    return s.size;
  }, [movItems]);

  const inWithInvoiceSample = useMemo(
    () => movItems.filter((m) => m.type === "IN" && m.hasInvoicePhoto).length,
    [movItems]
  );

  const loading =
    stockQ.isPending ||
    movSampleQ.isPending ||
    movInCountQ.isPending ||
    movOutCountQ.isPending;
  const err =
    stockQ.isError
      ? stockQ.error
      : movSampleQ.isError
        ? movSampleQ.error
        : movInCountQ.isError
          ? movInCountQ.error
          : movOutCountQ.isError
            ? movOutCountQ.error
            : null;

  const shipmentExact =
    totalMovementLines > 0 &&
    totalMovementLines <= MOVEMENT_SAMPLE &&
    movItems.length === totalMovementLines;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">{t("warehouse.summaryKpiHeading")}</h2>
          <p className="text-xs leading-relaxed text-zinc-600 sm:text-sm">{t("warehouse.summaryKpiIntro")}</p>
        </div>
        {onOpenMovementsTab || onOpenInboundMovementsTab ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end">
            {onOpenMovementsTab ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full shrink-0 sm:min-h-10 sm:w-auto"
                onClick={onOpenMovementsTab}
              >
                {t("warehouse.summaryKpiOpenMovements")}
              </Button>
            ) : null}
            {onOpenInboundMovementsTab ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full shrink-0 border-emerald-200/90 text-emerald-950 ring-emerald-100/80 hover:bg-emerald-50/90 sm:min-h-10 sm:w-auto"
                onClick={onOpenInboundMovementsTab}
              >
                {t("warehouse.summaryKpiOpenInboundMovements")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {err ? (
        <p className="text-sm text-red-600">{toErrorMessage(err)}</p>
      ) : loading ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
          <div className={cardBase}>
            <div className="h-1 w-10 shrink-0 rounded-full bg-gradient-to-r from-zinc-600/90 to-zinc-700/85" />
            <p className="mt-3 text-[0.65rem] font-bold uppercase tracking-wide text-zinc-600">
              {t("warehouse.summaryKpiStockTitle")}
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="min-w-0 text-zinc-500">{t("warehouse.summaryKpiSkuPositive")}</dt>
                <dd className="text-2xl font-semibold tabular-nums text-zinc-900">{distinctSku}</dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-zinc-100 pt-2">
                <dt className="min-w-0 text-zinc-500">{t("warehouse.summaryKpiStockUnitsSum")}</dt>
                <dd className="text-xl font-semibold tabular-nums text-zinc-900">
                  {formatLocaleAmount(totalUnits, locale)}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-zinc-100 pt-2">
                <dt className="min-w-0 text-zinc-500">{t("warehouse.summaryKpiParentProductGroups")}</dt>
                <dd className="text-xl font-semibold tabular-nums text-zinc-900">{parentProductGroupCount}</dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-zinc-100 pt-2">
                <dt className="min-w-0 text-zinc-500">{t("warehouse.summaryKpiOutQuantityTotal")}</dt>
                <dd className="text-xl font-semibold tabular-nums text-rose-900">
                  {formatLocaleAmount(totalOutQty, locale)}
                </dd>
              </div>
            </dl>
            <p className="mt-auto pt-3 text-[0.65rem] leading-snug text-zinc-500">{t("warehouse.summaryKpiStockFoot")}</p>
          </div>

          <div className={cardBase}>
            <div className="h-1 w-10 shrink-0 rounded-full bg-gradient-to-r from-violet-600/90 to-indigo-600/85" />
            <p className="mt-3 text-[0.65rem] font-bold uppercase tracking-wide text-violet-900/80">
              {t("warehouse.summaryKpiShipmentTitle")}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-zinc-900">{shipmentKeysInSample}</p>
            <p className="mt-1 text-xs text-zinc-600">{t("warehouse.summaryKpiShipmentSubtitle")}</p>
            <p className="mt-3 text-[0.65rem] leading-snug text-zinc-500">
              {totalMovementLines === 0
                ? t("warehouse.summaryKpiShipmentEmpty")
                : shipmentExact
                  ? fillDashboardTemplate(t("warehouse.summaryKpiShipmentExactHint"), {
                      lines: String(totalMovementLines),
                    })
                  : fillDashboardTemplate(t("warehouse.summaryKpiShipmentPartialHint"), {
                      sample: String(MOVEMENT_SAMPLE),
                      lines: String(totalMovementLines),
                    })}
            </p>
          </div>

          <div className={cardBase}>
            <div className="h-1 w-10 shrink-0 rounded-full bg-gradient-to-r from-emerald-600/90 to-teal-600/85" />
            <p className="mt-3 text-[0.65rem] font-bold uppercase tracking-wide text-emerald-900/80">
              {t("warehouse.summaryKpiInOutLinesTitle")}
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="min-w-0 text-zinc-500">{t("warehouse.summaryKpiMovementLinesTotal")}</dt>
                <dd className="text-xl font-semibold tabular-nums text-zinc-900">{totalMovementLines}</dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="min-w-0 text-zinc-500">{t("warehouse.summaryKpiInLines")}</dt>
                <dd className="text-lg font-semibold tabular-nums text-emerald-900">{inLineCount}</dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <dt className="min-w-0 text-zinc-500">{t("warehouse.summaryKpiOutLines")}</dt>
                <dd className="text-lg font-semibold tabular-nums text-rose-900">{outLineCount}</dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-zinc-100 pt-2">
                <dt className="min-w-0 text-zinc-500">{t("warehouse.summaryKpiInWithInvoiceSample")}</dt>
                <dd className="tabular-nums font-semibold text-zinc-900">{inWithInvoiceSample}</dd>
              </div>
            </dl>
            <p className="mt-auto pt-3 text-[0.65rem] leading-snug text-zinc-500">
              {t("warehouse.summaryKpiInOutLinesFoot")}
            </p>
          </div>

          <div className={cn(cardBase, "min-[420px]:col-span-2 xl:col-span-1")}>
            <div className="h-1 w-10 shrink-0 rounded-full bg-gradient-to-r from-rose-600/90 to-red-600/85" />
            <p className="mt-3 text-[0.65rem] font-bold uppercase tracking-wide text-rose-900/80">
              {t("warehouse.summaryKpiLifetimeQtyTitle")}
            </p>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2.5">
                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-900">
                  {t("warehouse.movementsTotalsIn")}
                </dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-emerald-950">
                  {formatLocaleAmount(totalInQty, locale)}
                </dd>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/80 px-3 py-2.5">
                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-rose-900">
                  {t("warehouse.movementsTotalsOut")}
                </dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-rose-950">
                  {formatLocaleAmount(totalOutQty, locale)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[0.65rem] leading-snug text-zinc-500">{t("warehouse.summaryKpiLifetimeQtyFoot")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
