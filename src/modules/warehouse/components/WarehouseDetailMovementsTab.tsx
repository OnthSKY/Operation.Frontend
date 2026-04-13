"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  WarehouseProductScopeFilters,
  type WarehouseScopeFiltersValue,
} from "@/modules/warehouse/components/WarehouseProductScopeFilters";
import { warehouseScopeEffectiveCategoryId } from "@/modules/warehouse/lib/warehouse-scope-filters";
import { useWarehouseMovementsPage } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { warehouseMovementInvoicePhotoUrl } from "@/modules/warehouse/api/warehouse-movements-api";
import type { WarehouseMovementItem, WarehouseMovementsPageParams } from "@/types/warehouse";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import {
  formatWarehouseShipmentDisplay,
  warehouseMovementShipmentGroupKey,
} from "@/shared/lib/in-batch-group-label";
import { useEffect, useMemo, useState, type ReactNode } from "react";

function movementKv(label: string, value: ReactNode) {
  return (
    <div className="min-w-0">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-0.5 break-words text-sm text-zinc-900">{value}</div>
    </div>
  );
}

function shipmentListPreview(movements: WarehouseMovementItem[]): string {
  if (movements.length === 0) return "";
  if (movements.length === 1) {
    const m = movements[0];
    const u = m.unit?.trim() ? ` ${m.unit}` : "";
    return `${m.productName} · ${m.quantity}${u}`;
  }
  const head = movements.slice(0, 2).map((m) => m.productName);
  const more = movements.length - head.length;
  return more > 0 ? `${head.join(", ")} +${more}` : head.join(", ");
}

function shipmentBranchSummary(movements: WarehouseMovementItem[]): string | null {
  const names = [
    ...new Set(
      movements
        .map((m) => m.outDestinationBranchName?.trim())
        .filter((s): s is string => Boolean(s && s.length > 0))
    ),
  ];
  if (names.length === 0) return null;
  const first = names[0];
  if (names.length === 1) return first ?? null;
  return `${first ?? ""} +${names.length - 1}`;
}

function WarehouseMovementMobileCard({
  m,
  fmtDate,
  t,
  hideShipmentGroup,
}: {
  m: WarehouseMovementItem;
  fmtDate: (iso: string) => string;
  t: (key: string) => string;
  hideShipmentGroup?: boolean;
}) {
  const typeIn = m.type === "IN";
  const typeLabel = typeIn ? t("products.typeIn") : t("products.typeOut");
  const batchCell = formatWarehouseShipmentDisplay(m.inBatchGroupId, m.id);
  return (
    <div className="touch-manipulation rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-800">{fmtDate(m.movementDate)}</p>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
            typeIn ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"
          )}
        >
          {typeLabel}
        </span>
      </div>
      <div className="mt-3">
        {m.parentProductName?.trim() ? (
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-violet-800">
            {m.parentProductName}
          </p>
        ) : null}
        <p className="text-base font-semibold leading-snug text-zinc-900">
          {m.productName}
          {m.unit ? (
            <span className="ml-1.5 text-sm font-normal text-zinc-500">({m.unit})</span>
          ) : null}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0">
        <span className="text-2xl font-bold tabular-nums text-zinc-900">{m.quantity}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {t("products.colQty")}
        </span>
      </div>
      <div className="mt-4 space-y-3 border-t border-zinc-100 pt-3">
        {!hideShipmentGroup
          ? movementKv(
              t("warehouse.movementBatchGroup"),
              <span className="font-mono text-xs" title={batchCell.title}>
                {batchCell.text}
              </span>
            )
          : null}
        {m.type === "OUT" && m.outDestinationBranchName?.trim()
          ? movementKv(
              t("warehouse.movementOutBranch"),
              <span className="text-sm font-medium text-violet-900">{m.outDestinationBranchName.trim()}</span>
            )
          : null}
        {movementKv(t("warehouse.movementNote"), m.description?.trim() ? m.description : "—")}
        {movementKv(t("warehouse.movementCheckedBy"), m.checkedByPersonnelName ?? "—")}
        {movementKv(t("warehouse.movementApprovedBy"), m.approvedByPersonnelName ?? "—")}
        {m.type === "IN" && m.hasInvoicePhoto ? (
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
              {t("warehouse.mColInvoice")}
            </p>
            <a
              href={warehouseMovementInvoicePhotoUrl(m.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
            >
              {t("warehouse.openInvoicePhoto")}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

type Props = {
  warehouseId: number;
  enabled: boolean;
};

export function WarehouseDetailMovementsTab({ warehouseId, enabled }: Props) {
  const { t, locale } = useI18n();
  const { data: branches = [] } = useBranchesList();
  const [scope, setScope] = useState<WarehouseScopeFiltersValue>({
    mainCategoryId: null,
    subCategoryId: null,
    parentProductId: null,
    productId: null,
  });
  const [type, setType] = useState("");
  const [branchId, setBranchId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedShipmentKeys, setExpandedShipmentKeys] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  useEffect(() => {
    setScope({
      mainCategoryId: null,
      subCategoryId: null,
      parentProductId: null,
      productId: null,
    });
    setType("");
    setBranchId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, [warehouseId]);

  useEffect(() => {
    setPage(1);
  }, [
    scope.mainCategoryId,
    scope.subCategoryId,
    scope.parentProductId,
    scope.productId,
    type,
    branchId,
    dateFrom,
    dateTo,
  ]);

  const params = useMemo((): WarehouseMovementsPageParams => {
    const tNorm: "IN" | "OUT" | "" =
      type === "IN" || type === "OUT" ? type : "";
    const b =
      branchId !== "" && Number(branchId) > 0 ? Math.trunc(Number(branchId)) : undefined;
    const resolvedProductId =
      scope.productId != null && scope.productId > 0
        ? scope.productId
        : scope.parentProductId != null && scope.parentProductId > 0
          ? scope.parentProductId
          : undefined;
    const categoryId = warehouseScopeEffectiveCategoryId(scope) ?? undefined;
    return {
      page,
      pageSize: PAGE_SIZE,
      categoryId,
      productId: resolvedProductId,
      type: tNorm,
      branchId: b,
      dateFrom: dateFrom.length === 10 ? dateFrom : undefined,
      dateTo: dateTo.length === 10 ? dateTo : undefined,
    };
  }, [
    page,
    scope.mainCategoryId,
    scope.subCategoryId,
    scope.parentProductId,
    scope.productId,
    type,
    branchId,
    dateFrom,
    dateTo,
  ]);

  const { data, isPending, isError, error, refetch, isFetching } = useWarehouseMovementsPage(
    warehouseId,
    params,
    enabled
  );

  const typeOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("products.filterTypeAll") },
      { value: "IN", label: t("products.typeIn") },
      { value: "OUT", label: t("products.typeOut") },
    ],
    [t]
  );

  const branchOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("warehouse.filterAllBranches") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const items = data?.items ?? [];

  const shipmentGroups = useMemo(() => {
    const map = new Map<string, WarehouseMovementItem[]>();
    for (const m of items) {
      const k = warehouseMovementShipmentGroupKey(m.inBatchGroupId, m.id);
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
  const totalInQty = Number(data?.totalInQuantity ?? 0);
  const totalOutQty = Number(data?.totalOutQuantity ?? 0);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <WarehouseProductScopeFilters value={scope} onChange={setScope} />
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 [&>*]:min-w-0">
        <Select
          label={t("products.filterType")}
          options={typeOptions}
          value={type}
          onChange={(e) => setType(e.target.value)}
          onBlur={() => {}}
          name="wh-mv-type"
          className="min-w-0 max-w-full"
        />
        <div className="col-span-full min-w-0 sm:col-span-2 lg:col-span-1 xl:col-span-1">
          <Select
            label={t("warehouse.filterMovementBranch")}
            options={branchOptions}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            onBlur={() => {}}
            name="wh-mv-branch"
            className="min-w-0 max-w-full"
          />
          <p className="mt-1 text-[0.65rem] leading-snug text-zinc-500">
            {t("warehouse.filterMovementBranchHint")}
          </p>
        </div>
        <div
          className={cn(
            "col-span-full grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:col-span-2 lg:col-span-3 xl:col-span-2"
          )}
        >
          <DateField
            label={t("products.filterDateFrom")}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="min-w-0 max-w-full"
          />
          <DateField
            label={t("products.filterDateTo")}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="min-w-0 max-w-full"
          />
        </div>
        <div className="col-span-full flex items-end sm:col-span-2 lg:col-span-3 xl:col-span-1">
          <Button
            type="button"
            variant="secondary"
            className="min-h-12 w-full touch-manipulation"
            onClick={() => refetch()}
          >
            {t("products.filterApplyRefresh")}
          </Button>
        </div>
      </div>

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
              {t("warehouse.movementsTotalsTitle")}
            </p>
            <div className="mt-2 grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
              <div className="min-w-0 rounded-md border border-emerald-200/80 bg-emerald-50/90 px-3 py-2.5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-900">
                  {t("warehouse.movementsTotalsIn")}
                </p>
                <p className="mt-0.5 truncate text-lg font-bold tabular-nums text-emerald-950 sm:text-xl">
                  {formatLocaleAmount(totalInQty, locale)}
                </p>
              </div>
              <div className="min-w-0 rounded-md border border-red-200/80 bg-red-50/90 px-3 py-2.5">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-red-900">
                  {t("warehouse.movementsTotalsOut")}
                </p>
                <p className="mt-0.5 truncate text-lg font-bold tabular-nums text-red-950 sm:text-xl">
                  {formatLocaleAmount(totalOutQty, locale)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[0.65rem] leading-snug text-zinc-500 sm:text-xs">
              {t("warehouse.movementsTotalsHint")}
            </p>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-zinc-600">{t("warehouse.movementsEmpty")}</p>
          ) : (
            <>
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 sm:text-sm">
            {t("warehouse.movementsPageShipmentSummary")
              .replace("{{shipments}}", String(shipmentGroups.length))
              .replace("{{lines}}", String(items.length))}
          </p>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {shipmentGroups.map(({ key, movements }) => {
              const open = expandedShipmentKeys.has(key);
              const sample = movements[0];
              const batchCell = formatWarehouseShipmentDisplay(sample.inBatchGroupId, sample.id);
              const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");
              const typeSet = new Set(movements.map((x) => x.type));
              const singleType = typeSet.size === 1 ? sample.type : null;
              const typeLabel =
                singleType === "IN"
                  ? t("products.typeIn")
                  : singleType === "OUT"
                    ? t("products.typeOut")
                    : `${t("products.typeIn")}/${t("products.typeOut")}`;
              const preview = shipmentListPreview(movements);
              const branchSummary = shipmentBranchSummary(movements);
              return (
                <div key={key} className="min-w-0 bg-white first:rounded-t-lg last:rounded-b-lg">
                  <button
                    type="button"
                    className="flex w-full flex-wrap touch-manipulation items-center gap-x-2 gap-y-1 px-3 py-2.5 text-left text-sm transition-colors hover:bg-zinc-50 sm:gap-x-3 sm:py-2"
                    aria-expanded={open}
                    aria-label={t("warehouse.shipmentGroupToggleAria")}
                    aria-controls={`wh-shipment-${safeKey}`}
                    id={`wh-shipment-h-${safeKey}`}
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
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-tight sm:text-xs",
                        singleType === "IN" && "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/80",
                        singleType === "OUT" && "bg-red-100 text-red-900 ring-1 ring-red-200/80",
                        singleType === null && "bg-zinc-200 text-zinc-800 ring-1 ring-zinc-300/80"
                      )}
                    >
                      {typeLabel}
                    </span>
                    {branchSummary ? (
                      <span
                        className="max-w-[min(100%,11rem)] shrink-0 truncate rounded-full border border-violet-300 bg-violet-100 px-2 py-0.5 text-[0.65rem] font-bold tracking-tight text-violet-950 shadow-sm ring-1 ring-violet-200/90 sm:max-w-[14rem] sm:text-xs"
                        title={branchSummary}
                      >
                        {branchSummary}
                      </span>
                    ) : null}
                    <span className="shrink-0 tabular-nums text-xs text-zinc-500">
                      {movements.length}×
                    </span>
                    <span className="min-w-0 flex-1 basis-[min(100%,12rem)] truncate text-xs text-zinc-600 sm:text-sm">
                      {preview}
                    </span>
                  </button>
                  {open ? (
                    <div
                      className="space-y-2 border-t border-zinc-100 bg-zinc-50/60 px-2 py-2 sm:px-3"
                      id={`wh-shipment-${safeKey}`}
                      role="region"
                      aria-labelledby={`wh-shipment-h-${safeKey}`}
                    >
                      {movements.map((m) => (
                        <WarehouseMovementMobileCard
                          key={m.id}
                          m={m}
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
            </>
          )}
        </>
      ) : null}

      {!isPending && totalCount > 0 && (
        <div className="flex min-w-0 flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-sm text-zinc-600">
            {(page - 1) * PAGE_SIZE + 1}
            {"–"}
            {Math.min(page * PAGE_SIZE, totalCount)} · {t("products.pagingTotal")} {totalCount}
          </p>
          <div className="flex min-w-0 flex-wrap items-stretch gap-2 sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 min-w-0 flex-1 touch-manipulation sm:flex-none"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("products.pagingPrev")}
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
              {t("products.pagingNext")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
