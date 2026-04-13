"use client";

import { useBranchStockReceiptsPaged } from "@/modules/branch/hooks/useBranchQueries";
import {
  WarehouseProductScopeFilters,
  type WarehouseScopeFiltersValue,
} from "@/modules/warehouse/components/WarehouseProductScopeFilters";
import { warehouseScopeEffectiveCategoryId } from "@/modules/warehouse/lib/warehouse-scope-filters";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import {
  formatWarehouseShipmentDisplay,
  warehouseMovementShipmentGroupKey,
} from "@/shared/lib/in-batch-group-label";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { Button } from "@/shared/ui/Button";
import { CollapsibleMobileFilters } from "@/shared/components/CollapsibleMobileFilters";
import { DateField } from "@/shared/ui/DateField";
import type { BranchStockReceiptRow } from "@/types/branch";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const PAGE_SIZE = 20;

function kv(label: string, value: ReactNode) {
  return (
    <div className="min-w-0">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-0.5 break-words text-sm text-zinc-900">{value}</div>
    </div>
  );
}

function receiptPreviewLines(rows: BranchStockReceiptRow[]): string {
  if (rows.length === 0) return "";
  if (rows.length === 1) {
    const m = rows[0];
    const u = m.unit?.trim() ? ` ${m.unit}` : "";
    return `${m.productName} · ${m.quantity}${u}`;
  }
  const head = rows.slice(0, 2).map((m) => m.productName);
  const more = rows.length - head.length;
  return more > 0 ? `${head.join(", ")} +${more}` : head.join(", ");
}

function BranchReceiptLineCard({
  row,
  fmtDate,
  t,
  hideShipmentGroup,
}: {
  row: BranchStockReceiptRow;
  fmtDate: (iso: string) => string;
  t: (key: string) => string;
  hideShipmentGroup?: boolean;
}) {
  const batchCell = formatWarehouseShipmentDisplay(
    row.inBatchGroupId ?? null,
    row.warehouseMovementId ?? row.id
  );
  return (
    <div className="touch-manipulation rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-800">{fmtDate(row.movementDate)}</p>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
          {t("products.typeIn")}
        </span>
      </div>
      <div className="mt-3">
        {row.parentProductName?.trim() ? (
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800">
            {row.parentProductName}
          </p>
        ) : null}
        <p className="text-base font-semibold leading-snug text-zinc-900">
          {row.productName}
          {row.unit ? (
            <span className="ml-1.5 text-sm font-normal text-zinc-500">({row.unit})</span>
          ) : null}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0">
        <span className="text-2xl font-bold tabular-nums text-zinc-900">{row.quantity}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {t("products.colQty")}
        </span>
      </div>
      <div className="mt-4 space-y-3 border-t border-zinc-100 pt-3">
        {!hideShipmentGroup
          ? kv(
              t("warehouse.movementBatchGroup"),
              <span className="font-mono text-xs" title={batchCell.title}>
                {batchCell.text}
              </span>
            )
          : null}
        {kv(
          t("branch.stockColWarehouse"),
          row.warehouseName?.trim() ? (
            <span className="text-sm font-medium text-violet-900">{row.warehouseName.trim()}</span>
          ) : (
            "—"
          )
        )}
      </div>
    </div>
  );
}

type Props = {
  branchId: number;
};

export function BranchStockInboundPanel({ branchId }: Props) {
  const { t, locale } = useI18n();
  const [scope, setScope] = useState<WarehouseScopeFiltersValue>({
    mainCategoryId: null,
    subCategoryId: null,
    parentProductId: null,
    productId: null,
  });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedShipmentKeys, setExpandedShipmentKeys] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  useEffect(() => {
    const today = localIsoDate();
    setScope({
      mainCategoryId: null,
      subCategoryId: null,
      parentProductId: null,
      productId: null,
    });
    setDateFrom(today);
    setDateTo(today);
    setPage(1);
    setExpandedShipmentKeys(new Set());
  }, [branchId]);

  useEffect(() => {
    setPage(1);
  }, [
    scope.mainCategoryId,
    scope.subCategoryId,
    scope.parentProductId,
    scope.productId,
    dateFrom,
    dateTo,
  ]);

  const params = useMemo(() => {
    const categoryId = warehouseScopeEffectiveCategoryId(scope) ?? undefined;
    const leafProductId =
      scope.productId != null && scope.productId > 0 ? scope.productId : undefined;
    const parentProductId =
      leafProductId == null && scope.parentProductId != null && scope.parentProductId > 0
        ? scope.parentProductId
        : undefined;

    return {
      page,
      pageSize: PAGE_SIZE,
      dateFrom: dateFrom.length === 10 ? dateFrom : undefined,
      dateTo: dateTo.length === 10 ? dateTo : undefined,
      categoryId,
      parentProductId,
      productId: leafProductId,
    };
  }, [
    page,
    scope.mainCategoryId,
    scope.subCategoryId,
    scope.parentProductId,
    scope.productId,
    dateFrom,
    dateTo,
  ]);

  const { data, isPending, isError, error, refetch, isFetching } = useBranchStockReceiptsPaged(
    branchId,
    params,
    true
  );

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const filteredTotalQty = Number(data?.filteredTotalQuantity ?? 0) || 0;

  const shipmentGroups = useMemo(() => {
    const map = new Map<string, BranchStockReceiptRow[]>();
    for (const m of items) {
      const k = warehouseMovementShipmentGroupKey(
        m.inBatchGroupId ?? null,
        m.warehouseMovementId ?? m.id
      );
      const g = map.get(k) ?? [];
      g.push(m);
      map.set(k, g);
    }
    for (const g of map.values()) {
      g.sort((a, b) => {
        const c = b.movementDate.localeCompare(a.movementDate);
        if (c !== 0) return c;
        return b.id - a.id;
      });
    }
    return Array.from(map.entries())
      .map(([key, movements]) => ({ key, movements }))
      .sort((a, b) => {
        const d = b.movements[0].movementDate.localeCompare(a.movements[0].movementDate);
        if (d !== 0) return d;
        return b.movements[0].id - a.movements[0].id;
      });
  }, [items]);

  const fmtDate = (iso: string) => formatLocaleDate(iso, locale);

  const today = localIsoDate();
  const filtersActive = useMemo(() => {
    return Boolean(
      warehouseScopeEffectiveCategoryId(scope) != null ||
        scope.parentProductId != null ||
        scope.productId != null ||
        dateFrom !== today ||
        dateTo !== today ||
        (dateFrom === "" && dateTo === "")
    );
  }, [scope, dateFrom, dateTo, today]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600">{t("branch.stockHint")}</p>

      <WarehouseProductScopeFilters value={scope} onChange={setScope} />

      <CollapsibleMobileFilters
        title={t("common.filters")}
        toggleAriaLabel={t("common.filters")}
        active={filtersActive}
        resetKey={`${branchId}-stock`}
        expandLabel={t("common.filtersShow")}
        collapseLabel={t("common.filtersHide")}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <DateField
            label={t("branch.filterDateFrom")}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="min-w-0"
          />
          <DateField
            label={t("branch.filterDateTo")}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="min-w-0"
          />
        </div>
      </CollapsibleMobileFilters>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          onClick={() => {
            const d = localIsoDate();
            setDateFrom(d);
            setDateTo(d);
            setPage(1);
          }}
        >
          {t("branch.filterToday")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11"
          onClick={() => {
            setDateFrom("");
            setDateTo("");
            setPage(1);
          }}
        >
          {t("branch.filterAllDates")}
        </Button>
        <Button type="button" variant="secondary" className="min-h-11" onClick={() => void refetch()}>
          {t("branch.filterApplyRefresh")}
        </Button>
      </div>

      {dateFrom.length === 10 && dateFrom === dateTo ? (
        <p className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-950">
          {t("branch.stockSingleDayBanner").replace("{date}", dateFrom)}
        </p>
      ) : null}

      {isError && <p className="text-sm text-red-600">{toErrorMessage(error)}</p>}

      {isPending && !data ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : !isError && data ? (
        <>
          <div
            className={cn(
              "rounded-lg border border-zinc-200 bg-white p-3 shadow-sm sm:p-4",
              isFetching && "opacity-70"
            )}
          >
            <p className="text-xs font-semibold text-zinc-800 sm:text-sm">
              {t("branch.stockReceiptsTotalsTitle")}
            </p>
            <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:gap-3">
              <div className="min-w-0 rounded-md border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-900">
                  {t("branch.stockReceiptsFilteredTotalQty")}
                </p>
                <p className="mt-0.5 truncate text-lg font-bold tabular-nums text-emerald-950 sm:text-xl">
                  {formatLocaleAmount(filteredTotalQty, locale)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[0.65rem] leading-snug text-zinc-500 sm:text-xs">
              {t("branch.stockReceiptsTotalsHint")}
            </p>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-zinc-600">{t("branch.noStockReceipts")}</p>
          ) : (
            <>
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 sm:text-sm">
                {t("branch.stockReceiptsPageShipmentSummary")
                  .replace("{{shipments}}", String(shipmentGroups.length))
                  .replace("{{lines}}", String(items.length))}
              </p>
              <div className="flex min-h-0 min-w-0 flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white sm:hidden">
                {shipmentGroups.map(({ key, movements }) => {
                  const open = expandedShipmentKeys.has(key);
                  const sample = movements[0];
                  const batchCell = formatWarehouseShipmentDisplay(
                    sample.inBatchGroupId ?? null,
                    sample.warehouseMovementId ?? sample.id
                  );
                  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
                  const preview = receiptPreviewLines(movements);
                  return (
                    <div key={key} className="min-w-0 bg-white first:rounded-t-lg last:rounded-b-lg">
                      <button
                        type="button"
                        className="flex w-full touch-manipulation flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5 text-left text-sm transition-colors hover:bg-zinc-50 sm:gap-x-3 sm:py-2"
                        aria-expanded={open}
                        aria-label={t("warehouse.shipmentGroupToggleAria")}
                        onClick={() =>
                          setExpandedShipmentKeys((prev) => {
                            const next = new Set(prev);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          })
                        }
                      >
                        <span
                          className={cn(
                            "shrink-0 text-zinc-400 transition-transform duration-200",
                            open && "rotate-180"
                          )}
                          aria-hidden
                        >
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                        <span
                          className="shrink-0 font-mono text-[0.7rem] text-zinc-600 sm:text-xs"
                          title={batchCell.title ?? batchCell.text}
                        >
                          {batchCell.text}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500 sm:text-sm">
                          {fmtDate(sample.movementDate)}
                        </span>
                        <span className="shrink-0 tabular-nums text-xs text-zinc-500">
                          {movements.length}×
                        </span>
                        <span className="min-w-0 flex-1 basis-[min(100%,12rem)] truncate text-xs text-zinc-600 sm:text-sm">
                          {preview}
                        </span>
                      </button>
                      {open ? (
                        <div className="space-y-2 border-t border-zinc-100 bg-zinc-50/60 px-2 py-2">
                          {movements.map((row) => (
                            <BranchReceiptLineCard
                              key={row.id}
                              row={row}
                              fmtDate={fmtDate}
                              t={t}
                              hideShipmentGroup
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="hidden min-h-0 min-w-0 flex-1 flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white sm:flex">
                {shipmentGroups.map(({ key, movements }) => {
                  const open = expandedShipmentKeys.has(key);
                  const sample = movements[0];
                  const batchCell = formatWarehouseShipmentDisplay(
                    sample.inBatchGroupId ?? null,
                    sample.warehouseMovementId ?? sample.id
                  );
                  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
                  const preview = receiptPreviewLines(movements);
                  return (
                    <div key={key} className="min-w-0 bg-white first:rounded-t-lg last:rounded-b-lg">
                      <button
                        type="button"
                        className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2.5 text-left text-sm transition-colors hover:bg-zinc-50 sm:gap-x-3 sm:py-2"
                        aria-expanded={open}
                        aria-label={t("warehouse.shipmentGroupToggleAria")}
                        aria-controls={`br-shipment-${safeKey}`}
                        id={`br-shipment-h-${safeKey}`}
                        onClick={() =>
                          setExpandedShipmentKeys((prev) => {
                            const next = new Set(prev);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          })
                        }
                      >
                        <span
                          className={cn(
                            "shrink-0 text-zinc-400 transition-transform duration-200",
                            open && "rotate-180"
                          )}
                          aria-hidden
                        >
                          <svg className="h-4 w-4 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                        <span
                          className="shrink-0 font-mono text-[0.7rem] text-zinc-600 sm:text-xs"
                          title={batchCell.title ?? batchCell.text}
                        >
                          {batchCell.text}
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-xs text-zinc-500 sm:text-sm">
                          {fmtDate(sample.movementDate)}
                        </span>
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-semibold tracking-tight text-emerald-900 ring-1 ring-emerald-200/80 sm:text-xs">
                          {t("products.typeIn")}
                        </span>
                        <span className="shrink-0 tabular-nums text-xs text-zinc-500">
                          {movements.length}×
                        </span>
                        <span className="min-w-0 flex-1 basis-[min(100%,12rem)] truncate text-xs text-zinc-600 sm:text-sm">
                          {preview}
                        </span>
                      </button>
                      {open ? (
                        <div
                          className="border-t border-zinc-100 bg-zinc-50/60 px-3 py-3"
                          id={`br-shipment-${safeKey}`}
                          role="region"
                          aria-labelledby={`br-shipment-h-${safeKey}`}
                        >
                          <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
                            <table className="min-w-full text-sm">
                              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                <tr>
                                  <th className="px-3 py-2">{t("branch.stockColDate")}</th>
                                  <th className="px-3 py-2">{t("branch.stockColProduct")}</th>
                                  <th className="px-3 py-2 text-right">{t("branch.stockColQty")}</th>
                                  <th className="hidden px-3 py-2 md:table-cell">
                                    {t("branch.stockColWarehouse")}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100">
                                {movements.map((row) => (
                                  <tr key={row.id}>
                                    <td className="whitespace-nowrap px-3 py-2 text-zinc-700">
                                      {fmtDate(row.movementDate)}
                                    </td>
                                    <td className="px-3 py-2 font-medium text-zinc-900">
                                      {row.parentProductName?.trim() ? (
                                        <span className="mb-0.5 block text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800">
                                          {row.parentProductName}
                                        </span>
                                      ) : null}
                                      {row.productName}
                                      {row.unit ? (
                                        <span className="font-normal text-zinc-500"> ({row.unit})</span>
                                      ) : null}
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">{row.quantity}</td>
                                    <td className="hidden px-3 py-2 text-zinc-600 md:table-cell">
                                      {row.warehouseName?.trim() ?? "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {totalCount > 0 ? (
                <div className="flex min-w-0 flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="min-w-0 text-sm text-zinc-600">
                    {(page - 1) * PAGE_SIZE + 1}
                    {"–"}
                    {Math.min(page * PAGE_SIZE, totalCount)} · {t("branch.pagingTotal")} {totalCount}
                  </p>
                  <div className="flex min-w-0 flex-wrap items-stretch gap-2 sm:items-center sm:justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 min-w-0 flex-1 touch-manipulation sm:flex-none"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      {t("branch.pagingPrev")}
                    </Button>
                    <span className="flex min-w-[4.5rem] shrink-0 items-center justify-center text-sm tabular-nums text-zinc-700">
                      {page} / {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 min-w-0 flex-1 touch-manipulation sm:flex-none"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      {t("branch.pagingNext")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
