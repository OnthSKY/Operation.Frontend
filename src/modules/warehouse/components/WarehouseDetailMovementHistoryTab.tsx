"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import {
  WarehouseProductScopeFilters,
  type WarehouseScopeFiltersValue,
} from "@/modules/warehouse/components/WarehouseProductScopeFilters";
import { EditWarehouseInboundBatchModal } from "@/modules/warehouse/components/EditWarehouseInboundBatchModal";
import { EditWarehouseInboundMovementFullModal } from "@/modules/warehouse/components/EditWarehouseInboundMovementFullModal";
import { EditWarehouseOutboundShipmentMovementModal } from "@/modules/warehouse/components/EditWarehouseOutboundShipmentMovementModal";
import { WarehouseMovementInvoicePreviewModal } from "@/modules/warehouse/components/WarehouseMovementInvoicePreviewModal";
import { WarehouseMovementRowCard } from "@/modules/warehouse/components/WarehouseMovementRowCard";
import { warehouseScopeEffectiveCategoryId } from "@/modules/warehouse/lib/warehouse-scope-filters";
import {
  useSoftDeleteWarehouseInboundMovement,
  useSoftDeleteWarehouseOutboundShipmentMovement,
  useWarehouseMovementsPage,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { Tooltip } from "@/shared/ui/Tooltip";
import type { WarehouseMovementItem, WarehouseMovementsPageParams } from "@/types/warehouse";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import {
  formatWarehouseShipmentDisplay,
  warehouseMovementShipmentGroupKey,
} from "@/shared/lib/in-batch-group-label";
import { ChevronDownIcon, EyeIcon, PlusIcon, PencilIcon } from "@/shared/ui/EyeIcon";
import { movementToolbarIconButtonClass } from "@/modules/warehouse/lib/movement-toolbar-icon";
import { TrashIcon } from "@/shared/ui/TrashIcon";
import { useCallback, useEffect, useMemo, useState } from "react";

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

const PAGE_SIZE = 20;
const DRAWER_SELECT_Z = 280;

type Props = {
  warehouseId: number;
  enabled: boolean;
  /** Özetten geçiş: ALL boş tür; IN/OUT giriş/çıkış segmenti. */
  historyTypeIntent?: "" | "ALL" | "IN" | "OUT";
  onHistoryTypeIntentConsumed?: () => void;
};

/** Depo detay modalı — üst seviye «Hareket geçmişi» sekmesi (filtre çekmecesi + sayfalı liste). */
export function WarehouseDetailMovementHistoryTab({
  warehouseId,
  enabled,
  historyTypeIntent = "",
  onHistoryTypeIntentConsumed,
}: Props) {
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
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [editInboundOpen, setEditInboundOpen] = useState(false);
  const [editInboundTarget, setEditInboundTarget] = useState<{
    movementBatchId: string | null;
    soloMovementId: number | null;
    defaultBusinessDate: string;
  } | null>(null);
  const [inboundFullMovementId, setInboundFullMovementId] = useState<number | null>(null);
  const [outboundShipmentMovementId, setOutboundShipmentMovementId] = useState<number | null>(null);
  const [invoicePreviewTarget, setInvoicePreviewTarget] = useState<{
    movementId: number;
    title: string;
    subtitle: string;
  } | null>(null);
  const softDeleteInboundM = useSoftDeleteWarehouseInboundMovement();
  const softDeleteOutboundShipmentM = useSoftDeleteWarehouseOutboundShipmentMovement();

  const confirmDeleteInboundFromRow = useCallback(
    (m: WarehouseMovementItem) => {
      if (m.type !== "IN") return;
      notifyConfirmToast({
        toastId: `wh-inbound-del-row-${warehouseId}-${m.id}`,
        title: t("warehouse.editInboundFullDeleteTitle"),
        message: (
          <>
            <p>{t("warehouse.editInboundFullDeleteBody")}</p>
            <p className="mt-2 break-words font-medium text-zinc-900">{m.productName}</p>
          </>
        ),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("common.delete"),
        onConfirm: async () => {
          try {
            await softDeleteInboundM.mutateAsync({ warehouseId, movementId: m.id });
            notify.success(t("warehouse.editInboundFullDeleted"));
          } catch (e) {
            notify.error(toErrorMessage(e));
          }
        },
      });
    },
    [softDeleteInboundM, t, warehouseId]
  );

  const confirmDeleteOutboundShipmentFromRow = useCallback(
    (m: WarehouseMovementItem) => {
      if (m.type !== "OUT" || !m.isDepotToBranchShipment) return;
      notifyConfirmToast({
        toastId: `wh-outbound-shipment-del-row-${warehouseId}-${m.id}`,
        title: t("warehouse.editOutboundShipmentDeleteTitle"),
        message: (
          <>
            <p>{t("warehouse.editOutboundShipmentDeleteBody")}</p>
            <p className="mt-2 break-words font-medium text-zinc-900">{m.productName}</p>
          </>
        ),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("common.delete"),
        onConfirm: async () => {
          try {
            await softDeleteOutboundShipmentM.mutateAsync({ warehouseId, movementId: m.id });
            notify.success(t("warehouse.editOutboundShipmentDeleted"));
          } catch (e) {
            notify.error(toErrorMessage(e));
          }
        },
      });
    },
    [softDeleteOutboundShipmentM, t, warehouseId]
  );

  const expandShipmentGroup = useCallback((groupKey: string) => {
    setExpandedShipmentKeys((prev) => {
      const next = new Set(prev);
      next.add(groupKey);
      return next;
    });
  }, []);

  const onCollapsedInboundProductClick = useCallback(
    (groupKey: string, movements: WarehouseMovementItem[]) => {
      const ins = movements.filter((m) => m.type === "IN");
      if (ins.length === 1) {
        setInboundFullMovementId(ins[0].id);
        return;
      }
      expandShipmentGroup(groupKey);
      notify.info(t("warehouse.movementHistoryExpandForEditLines"));
    },
    [expandShipmentGroup, t]
  );

  const onCollapsedInboundInvoiceViewClick = useCallback(
    (groupKey: string, movements: WarehouseMovementItem[]) => {
      const withPhoto = movements.filter((m) => m.type === "IN" && m.hasInvoicePhoto);
      if (withPhoto.length === 1) {
        setInvoicePreviewTarget({
          movementId: withPhoto[0].id,
          title: t("warehouse.movementInvoicePreviewTitle"),
          subtitle: withPhoto[0].productName,
        });
        return;
      }
      if (withPhoto.length > 1) {
        const sorted = [...withPhoto].sort((a, b) => a.id - b.id);
        setInvoicePreviewTarget({
          movementId: sorted[0].id,
          title: t("warehouse.movementInvoicePreviewTitle"),
          subtitle: sorted[0].productName,
        });
        return;
      }
      expandShipmentGroup(groupKey);
      notify.info(t("warehouse.movementHistoryExpandForEditLines"));
    },
    [expandShipmentGroup, t]
  );

  /** Fatura yokken: tek veya çok satırda görsel ilk giriş hareketine eklenir (API ile uyumlu). */
  const onCollapsedInboundInvoiceAddClick = useCallback(
    (movements: WarehouseMovementItem[]) => {
      const ins = movements.filter((m) => m.type === "IN");
      if (ins.length === 0) return;
      const target = [...ins].sort((a, b) => a.id - b.id)[0];
      setInboundFullMovementId(target.id);
    },
    []
  );

  const onCollapsedOutboundPreviewClick = useCallback(
    (groupKey: string, movements: WarehouseMovementItem[]) => {
      const outs = movements.filter((m) => m.type === "OUT");
      if (outs.length === 0) return;
      if (!outs.every((m) => m.isDepotToBranchShipment === true)) {
        expandShipmentGroup(groupKey);
        notify.info(t("warehouse.movementHistoryExpandForEditLines"));
        return;
      }
      if (outs.length === 1) {
        setOutboundShipmentMovementId(outs[0].id);
        return;
      }
      expandShipmentGroup(groupKey);
      notify.info(t("warehouse.movementHistoryOutboundExpandLines"));
    },
    [expandShipmentGroup, t]
  );

  useEffect(() => {
    setFiltersDrawerOpen(false);
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
    setInboundFullMovementId(null);
    setOutboundShipmentMovementId(null);
  }, [warehouseId]);

  useEffect(() => {
    if (!enabled) return;
    const intent = historyTypeIntent;
    if (!intent) return;
    if (intent === "ALL") setType("");
    else if (intent === "IN" || intent === "OUT") setType(intent);
    onHistoryTypeIntentConsumed?.();
  }, [enabled, historyTypeIntent, onHistoryTypeIntentConsumed]);

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

  const movementFiltersActive = useMemo(() => {
    if (
      scope.mainCategoryId != null ||
      scope.subCategoryId != null ||
      scope.parentProductId != null ||
      scope.productId != null
    ) {
      return true;
    }
    if (type === "IN" || type === "OUT") return true;
    if (branchId !== "" && Number(branchId) > 0) return true;
    if (dateFrom.length === 10 || dateTo.length === 10) return true;
    return false;
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

  const historyQueryEnabled = enabled;
  const { data, isPending, isError, error, refetch, isFetching } = useWarehouseMovementsPage(
    warehouseId,
    params,
    historyQueryEnabled
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
  const filterInboundGroups = data?.inboundShipmentGroupCount ?? 0;
  const filterOutboundGroups = data?.outboundShipmentGroupCount ?? 0;
  const outboundByBranch = data?.outboundByBranch ?? [];

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-zinc-200/80 pb-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 sm:text-base">{t("warehouse.movementsHistoryTitle")}</h2>
        <div
          role="tablist"
          aria-label={t("warehouse.movementsTypeSegmentAria")}
          className="flex w-full snap-x snap-mandatory gap-1.5 overflow-x-auto [-webkit-overflow-scrolling:touch] sm:w-auto sm:flex-wrap sm:overflow-visible"
        >
          {(
            [
              { v: "" as const, label: t("warehouse.movementsTypeSegmentAll") },
              { v: "IN" as const, label: t("warehouse.movementsTypeSegmentInbound") },
              { v: "OUT" as const, label: t("warehouse.movementsTypeSegmentOutbound") },
            ] as const
          ).map(({ v, label }) => (
            <button
              key={v || "all"}
              type="button"
              role="tab"
              aria-selected={type === v}
              className={cn(
                "min-h-10 shrink-0 snap-start rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:text-sm",
                type === v
                  ? "bg-violet-700 text-white shadow-sm ring-1 ring-violet-600/80"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              )}
              onClick={() => setType(v)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
        <Tooltip content={t("warehouse.movementsFiltersToggle")} delayMs={200}>
          <button
            type="button"
            className="relative flex h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            aria-expanded={filtersDrawerOpen}
            aria-haspopup="dialog"
            aria-label={t("warehouse.movementsFilterIconAria")}
            onClick={() => setFiltersDrawerOpen(true)}
          >
            <FilterFunnelIcon className="h-5 w-5" />
            {movementFiltersActive ? (
              <span
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white"
                aria-hidden
              />
            ) : null}
          </button>
        </Tooltip>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 touch-manipulation"
          onClick={() => void refetch()}
        >
          {t("products.filterApplyRefresh")}
        </Button>
        </div>
      </div>

      <div
        className="rounded-xl border border-violet-200/80 bg-violet-50/50 px-3 py-3 shadow-sm ring-1 ring-violet-950/[0.04] sm:px-4 sm:py-3.5"
        role="note"
      >
        <p className="text-xs font-semibold text-violet-950 sm:text-sm">{t("warehouse.movementsHistoryEditGuideTitle")}</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-violet-900 sm:text-sm sm:leading-snug">
          <li>{t("warehouse.movementsHistoryEditGuide1")}</li>
          <li>{t("warehouse.movementsHistoryEditGuide2")}</li>
          <li>{t("warehouse.movementsHistoryEditGuide3")}</li>
        </ul>
      </div>

      <RightDrawer
        open={filtersDrawerOpen}
        onClose={() => setFiltersDrawerOpen(false)}
        title={t("warehouse.movementsFiltersTitle")}
        closeLabel={t("common.close")}
        backdropCloseRequiresConfirm={false}
        className="max-w-lg"
        rootClassName={OVERLAY_Z_TW.modalNested}
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs leading-relaxed text-zinc-600">{t("warehouse.movementsFilterDrawerHint")}</p>
          <WarehouseProductScopeFilters
            value={scope}
            onChange={setScope}
            menuZIndex={DRAWER_SELECT_Z}
          />
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 sm:col-span-2">
              <Select
                label={t("warehouse.filterMovementBranch")}
                options={branchOptions}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                onBlur={() => {}}
                name="wh-mv-branch"
                menuZIndex={DRAWER_SELECT_Z}
                className="min-w-0 max-w-full"
              />
              <p className="mt-1 text-[0.65rem] leading-snug text-zinc-500">
                {t("warehouse.filterMovementBranchHint")}
              </p>
            </div>
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
          <Button
            type="button"
            className="min-h-11 w-full"
            onClick={() => {
              void refetch();
              setFiltersDrawerOpen(false);
            }}
          >
            {t("warehouse.movementsFilterApplyClose")}
          </Button>
        </div>
      </RightDrawer>

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
            <div className="mt-3 space-y-3 border-t border-zinc-200/80 pt-3">
              <p className="text-[0.65rem] leading-snug text-zinc-700 sm:text-xs">
                {t("warehouse.movementsFilterGroupCounts")
                  .replace("{{in}}", String(filterInboundGroups))
                  .replace("{{out}}", String(filterOutboundGroups))}
              </p>
              {outboundByBranch.length > 0 ? (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-800">
                    {t("warehouse.movementsOutboundByBranchTitle")}
                  </p>
                  <p className="mt-1 text-[0.65rem] leading-snug text-zinc-500 sm:text-xs">
                    {t("warehouse.movementsOutboundByBranchHint")}
                  </p>
                  <div className="mt-2 overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50/50">
                    <table className="w-full min-w-[260px] border-collapse text-left text-xs text-zinc-800">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-100/80">
                          <th className="px-2 py-1.5 font-semibold sm:px-3">
                            {t("warehouse.movementsOutboundByBranchColBranch")}
                          </th>
                          <th className="px-2 py-1.5 text-right font-semibold tabular-nums sm:px-3">
                            {t("warehouse.movementsOutboundByBranchColQty")}
                          </th>
                          <th className="px-2 py-1.5 text-right font-semibold tabular-nums sm:px-3">
                            {t("warehouse.movementsOutboundByBranchColLines")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {outboundByBranch.map((row) => (
                          <tr key={row.branchId} className="border-b border-zinc-200/80 last:border-0">
                            <td className="max-w-[10rem] truncate px-2 py-1.5 sm:max-w-none sm:px-3">
                              {row.branchName || "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums sm:px-3">
                              {formatLocaleAmount(Number(row.totalQuantity), locale)}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums sm:px-3">
                              {row.movementLineCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
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
              const hasInvoiceAttachment = movements.some((m) => m.type === "IN" && m.hasInvoicePhoto);
              const inboundLines = movements.filter((m) => m.type === "IN");
              const singleInbound = inboundLines.length === 1 ? inboundLines[0]! : null;
              const outLines = movements.filter((m) => m.type === "OUT");
              const allDepotOutbound =
                outLines.length > 0 && outLines.every((m) => m.isDepotToBranchShipment === true);
              const hasSideActions =
                singleType === "IN" || (singleType === "OUT" && allDepotOutbound);
              return (
                <div
                  key={key}
                  className="rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm ring-1 ring-zinc-950/[0.04] sm:p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-3">
                      <button
                        type="button"
                        className="flex w-full min-h-12 items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/90 px-3 py-2.5 text-left text-sm touch-manipulation text-zinc-800 transition-colors hover:bg-zinc-100/90 lg:min-h-0 lg:justify-start lg:border-0 lg:bg-transparent lg:px-1 lg:py-1"
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
                        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
                          <span
                            className={cn(
                              "inline-flex shrink-0 text-zinc-400 transition-transform duration-200",
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
                              className="max-w-full shrink truncate rounded-full border border-violet-300 bg-violet-100 px-2 py-0.5 text-[0.65rem] font-bold tracking-tight text-violet-950 ring-1 ring-violet-200/90 sm:max-w-[14rem] sm:text-xs"
                              title={branchSummary}
                            >
                              {branchSummary}
                            </span>
                          ) : null}
                          <span className="shrink-0 tabular-nums text-xs text-zinc-500">
                            {movements.length}×
                          </span>
                        </span>
                      </button>

                      <div className="flex min-w-0 flex-col gap-2">
                        {singleType === "IN" ? (
                          <div className="min-w-0 rounded-lg border border-emerald-200/70 bg-emerald-50/40 p-2.5 sm:border-0 sm:bg-transparent sm:p-0">
                            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-900 sm:hidden">
                              {t("warehouse.movementsTypeSegmentInbound")}
                            </p>
                            <div className="grid min-w-0 grid-cols-[auto,minmax(0,1fr)] items-start gap-x-2 gap-y-1">
                              <div className="hidden shrink-0 flex-nowrap gap-1.5 self-start sm:flex sm:gap-2">
                                {hasInvoiceAttachment ? (
                                  <Tooltip content={t("warehouse.movementHistoryRowOpenInvoiceView")} delayMs={220}>
                                    <button
                                      type="button"
                                      aria-label={t("warehouse.movementHistoryRowOpenInvoiceView")}
                                      className={movementToolbarIconButtonClass(
                                        "border border-sky-200/90 bg-gradient-to-b from-sky-50 to-sky-100/90 text-sky-950 shadow-sm shadow-sky-900/10 ring-1 ring-sky-200/70 transition hover:from-sky-100 hover:to-sky-50"
                                      )}
                                      onClick={() => onCollapsedInboundInvoiceViewClick(key, movements)}
                                    >
                                      <EyeIcon className="h-5 w-5" />
                                    </button>
                                  </Tooltip>
                                ) : (
                                  <Tooltip content={t("warehouse.movementHistoryRowOpenInvoiceAdd")} delayMs={220}>
                                    <button
                                      type="button"
                                      aria-label={t("warehouse.movementHistoryRowOpenInvoiceAdd")}
                                      className={movementToolbarIconButtonClass(
                                        "border border-dashed border-emerald-300/90 bg-emerald-50/70 text-emerald-900 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100/80"
                                      )}
                                      onClick={() => onCollapsedInboundInvoiceAddClick(movements)}
                                    >
                                      <PlusIcon className="h-5 w-5" />
                                    </button>
                                  </Tooltip>
                                )}
                                <Tooltip content={t("warehouse.movementHistoryRowOpenProductEdit")} delayMs={220}>
                                  <button
                                    type="button"
                                    aria-label={t("warehouse.movementHistoryRowOpenProductEdit")}
                                    className={movementToolbarIconButtonClass(
                                      "border border-violet-200 bg-violet-50/90 text-violet-950 transition hover:bg-violet-100"
                                    )}
                                    onClick={() => onCollapsedInboundProductClick(key, movements)}
                                  >
                                    <PencilIcon className="h-5 w-5" aria-hidden />
                                  </button>
                                </Tooltip>
                              </div>
                              <p className="min-w-0 break-words text-sm leading-snug text-zinc-700 [overflow-wrap:anywhere]">
                                {preview}
                              </p>
                            </div>

                            <div className="mt-2 grid grid-cols-1 gap-2 sm:hidden">
                              {hasInvoiceAttachment ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="min-h-11 w-full justify-start border-sky-200/90 bg-sky-50 text-sky-950 hover:bg-sky-100"
                                  onClick={() => onCollapsedInboundInvoiceViewClick(key, movements)}
                                >
                                  <EyeIcon className="h-5 w-5" />
                                  <span className="ml-2">{t("warehouse.movementHistoryRowOpenInvoiceView")}</span>
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="min-h-11 w-full justify-start border-emerald-200/90 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                                  onClick={() => onCollapsedInboundInvoiceAddClick(movements)}
                                >
                                  <PlusIcon className="h-5 w-5" />
                                  <span className="ml-2">{t("warehouse.movementHistoryRowOpenInvoiceAdd")}</span>
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-11 w-full justify-start border-violet-200/90 bg-violet-50 text-violet-950 hover:bg-violet-100"
                                onClick={() => onCollapsedInboundProductClick(key, movements)}
                              >
                                <PencilIcon className="h-5 w-5" aria-hidden />
                                <span className="ml-2">{t("warehouse.movementHistoryRowOpenProductEdit")}</span>
                              </Button>
                            </div>
                          </div>
                        ) : singleType === "OUT" && allDepotOutbound ? (
                          <div className="min-w-0 rounded-lg border border-red-200/70 bg-red-50/35 p-2.5 sm:border-0 sm:bg-transparent sm:p-0">
                            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-red-900 sm:hidden">
                              {t("warehouse.movementsTypeSegmentOutbound")}
                            </p>
                            <div className="grid min-w-0 grid-cols-[auto,minmax(0,1fr)] items-start gap-x-2 gap-y-1">
                              <div className="hidden sm:block">
                                <Tooltip content={t("warehouse.movementHistoryOutboundEditCollapsed")} delayMs={220}>
                                  <button
                                    type="button"
                                    aria-label={t("warehouse.movementHistoryOutboundEditCollapsed")}
                                    className={movementToolbarIconButtonClass(
                                      "border border-red-200 bg-red-50/90 text-red-950 transition hover:bg-red-100"
                                    )}
                                    onClick={() => onCollapsedOutboundPreviewClick(key, movements)}
                                  >
                                    <PencilIcon className="h-5 w-5" aria-hidden />
                                  </button>
                                </Tooltip>
                              </div>
                              <p className="min-w-0 break-words text-sm leading-snug text-zinc-700 [overflow-wrap:anywhere]">
                                {preview}
                              </p>
                            </div>
                            <div className="mt-2 sm:hidden">
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-11 w-full justify-start border-red-200/90 bg-red-50 text-red-950 hover:bg-red-100"
                                onClick={() => onCollapsedOutboundPreviewClick(key, movements)}
                              >
                                <PencilIcon className="h-5 w-5" aria-hidden />
                                <span className="ml-2">{t("warehouse.movementHistoryOutboundEditCollapsed")}</span>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="min-w-0 rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2 text-sm leading-snug text-zinc-700">
                            {preview}
                          </p>
                        )}
                      </div>
                    </div>

                    {hasSideActions ? (
                      <div
                        className={cn(
                          "w-full min-w-0 shrink-0 flex-row flex-wrap content-start items-center justify-start gap-2 overflow-x-auto border-t border-zinc-200 pt-3 [-webkit-overflow-scrolling:touch] lg:w-auto lg:flex-col lg:items-stretch lg:justify-start lg:overflow-visible lg:border-t-0 lg:border-l lg:border-zinc-200 lg:pl-4 lg:pt-0",
                          singleType === "IN" || (singleType === "OUT" && allDepotOutbound)
                            ? "hidden sm:flex"
                            : "flex"
                        )}
                      >
                        {singleType === "IN" ? (
                          <>
                            {singleInbound ? (
                              <Tooltip content={t("warehouse.movementHistoryActionRowDelete")} delayMs={220}>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  aria-label={t("warehouse.movementHistoryActionRowDelete")}
                                  className={movementToolbarIconButtonClass(
                                    "border-red-200/90 text-red-800 hover:bg-red-50"
                                  )}
                                  onClick={() => confirmDeleteInboundFromRow(singleInbound)}
                                >
                                  <TrashIcon className="h-5 w-5 shrink-0" aria-hidden />
                                </Button>
                              </Tooltip>
                            ) : inboundLines.length > 1 ? (
                              <Tooltip content={t("warehouse.movementHistoryOpenInboundToDelete")} delayMs={220}>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  aria-label={t("warehouse.movementHistoryOpenInboundToDelete")}
                                  className={movementToolbarIconButtonClass(
                                    "border-red-200/90 text-red-800 hover:bg-red-50"
                                  )}
                                  onClick={() => expandShipmentGroup(key)}
                                >
                                  <TrashIcon className="h-5 w-5 shrink-0" aria-hidden />
                                </Button>
                              </Tooltip>
                            ) : null}
                            <Tooltip content={t("warehouse.editInboundBatchHint")} delayMs={280}>
                              <Button
                                type="button"
                                variant="secondary"
                                aria-label={t("warehouse.movementHistoryActionEditDates")}
                                className={movementToolbarIconButtonClass()}
                                onClick={() => {
                                  const trimmedBatch = sample.inBatchGroupId?.trim() ?? "";
                                  setEditInboundTarget({
                                    movementBatchId: trimmedBatch || null,
                                    soloMovementId: trimmedBatch ? null : sample.id,
                                    defaultBusinessDate:
                                      sample.movementDate.length >= 10
                                        ? sample.movementDate.slice(0, 10)
                                        : sample.movementDate,
                                  });
                                  setEditInboundOpen(true);
                                }}
                              >
                                <PencilIcon className="h-5 w-5 shrink-0" aria-hidden />
                              </Button>
                            </Tooltip>
                          </>
                        ) : singleType === "OUT" && allDepotOutbound ? (
                          outLines.length === 1 ? (
                            <Tooltip content={t("warehouse.movementHistoryActionShipmentDelete")} delayMs={220}>
                              <Button
                                type="button"
                                variant="secondary"
                                aria-label={t("warehouse.movementHistoryActionShipmentDelete")}
                                className={movementToolbarIconButtonClass(
                                  "border-red-200/90 text-red-800 hover:bg-red-50"
                                )}
                                onClick={() => confirmDeleteOutboundShipmentFromRow(outLines[0])}
                              >
                                <TrashIcon className="h-5 w-5 shrink-0" aria-hidden />
                              </Button>
                            </Tooltip>
                          ) : (
                            <Tooltip content={t("warehouse.movementHistoryOpenLinesToEdit")} delayMs={220}>
                              <Button
                                type="button"
                                variant="secondary"
                                aria-label={t("warehouse.movementHistoryOpenLinesToEdit")}
                                className={movementToolbarIconButtonClass()}
                                onClick={() => expandShipmentGroup(key)}
                              >
                                <ChevronDownIcon className="h-5 w-5 shrink-0" aria-hidden />
                              </Button>
                            </Tooltip>
                          )
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {open ? (
                    <div
                      className="mt-3 space-y-2 border-t border-zinc-100 bg-zinc-50/70 px-1 py-3 sm:px-2"
                      id={`wh-shipment-${safeKey}`}
                      role="region"
                      aria-labelledby={`wh-shipment-h-${safeKey}`}
                    >
                      {movements.map((m) => (
                        <WarehouseMovementRowCard
                          key={m.id}
                          m={m}
                          fmtDate={fmtDate}
                          t={t}
                          hideShipmentGroup
                          warehouseId={warehouseId}
                          onEditInboundFull={(row) => {
                            if (row.type === "IN") setInboundFullMovementId(row.id);
                          }}
                          onDeleteInbound={confirmDeleteInboundFromRow}
                          onEditOutboundShipment={(row) => {
                            if (row.type === "OUT" && row.isDepotToBranchShipment) {
                              setOutboundShipmentMovementId(row.id);
                            }
                          }}
                          onDeleteOutboundShipment={confirmDeleteOutboundShipmentFromRow}
                          onPreviewInvoice={(row) => {
                            if (row.type !== "IN" || !row.hasInvoicePhoto) return;
                            setInvoicePreviewTarget({
                              movementId: row.id,
                              title: t("warehouse.movementInvoicePreviewTitle"),
                              subtitle: row.productName,
                            });
                          }}
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
      {editInboundTarget ? (
        <EditWarehouseInboundBatchModal
          open={editInboundOpen}
          warehouseId={warehouseId}
          movementBatchId={editInboundTarget.movementBatchId}
          soloMovementId={editInboundTarget.soloMovementId}
          defaultBusinessDate={editInboundTarget.defaultBusinessDate}
          onClose={() => {
            setEditInboundOpen(false);
            setEditInboundTarget(null);
          }}
        />
      ) : null}

      <EditWarehouseInboundMovementFullModal
        open={inboundFullMovementId != null}
        warehouseId={warehouseId}
        movementId={inboundFullMovementId}
        onClose={() => setInboundFullMovementId(null)}
      />

      <EditWarehouseOutboundShipmentMovementModal
        open={outboundShipmentMovementId != null}
        warehouseId={warehouseId}
        movementId={outboundShipmentMovementId}
        onClose={() => setOutboundShipmentMovementId(null)}
      />
      <WarehouseMovementInvoicePreviewModal
        open={invoicePreviewTarget != null}
        movementId={invoicePreviewTarget?.movementId ?? null}
        title={invoicePreviewTarget?.title ?? t("warehouse.movementInvoicePreviewTitle")}
        subtitle={invoicePreviewTarget?.subtitle}
        t={t}
        onClose={() => setInvoicePreviewTarget(null)}
      />
    </div>
  );
}
