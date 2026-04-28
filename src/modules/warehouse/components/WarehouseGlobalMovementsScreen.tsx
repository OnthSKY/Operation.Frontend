"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  fetchWarehouseGlobalMovements,
  type WarehouseGlobalMovementsFilters,
  type WarehouseGlobalMovementRow,
} from "@/modules/warehouse/api/warehouse-global-movements-api";
import { warehouseMovementInvoicePhotoUrl } from "@/modules/warehouse/api/warehouse-movements-api";
import { useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import {
  WarehouseProductScopeFilters,
  type WarehouseScopeFiltersValue,
} from "@/modules/warehouse/components/WarehouseProductScopeFilters";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatWarehouseShipmentDisplay } from "@/shared/lib/in-batch-group-label";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ResponsiveTableFrame } from "@/shared/tables/ResponsiveTableFrame";

const PAGE_SIZE = 25;
const DRAWER_SELECT_Z = 280;

function shipmentGroupKeyForRow(row: WarehouseGlobalMovementRow): string {
  return row.inBatchGroupId?.trim() ? `batch:${row.inBatchGroupId.trim()}` : `single:${row.id}`;
}

export function WarehouseGlobalMovementsScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { data: warehouses = [] } = useWarehousesList();
  const { data: branches = [] } = useBranchesList();
  const [scope, setScope] = useState<WarehouseScopeFiltersValue>({
    mainCategoryId: null,
    subCategoryId: null,
    parentProductId: null,
    productId: null,
  });
  const [warehouseId, setWarehouseId] = useState("");
  const [type, setType] = useState("");
  const [branchId, setBranchId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [
    scope.mainCategoryId,
    scope.subCategoryId,
    scope.parentProductId,
    scope.productId,
    warehouseId,
    type,
    branchId,
    dateFrom,
    dateTo,
  ]);

  const filters = useMemo<WarehouseGlobalMovementsFilters>(
    () => ({
      scope,
      warehouseId:
        warehouseId !== "" && Number(warehouseId) > 0 ? Math.trunc(Number(warehouseId)) : undefined,
      type: type === "IN" || type === "OUT" ? type : "",
      branchId: branchId !== "" && Number(branchId) > 0 ? Math.trunc(Number(branchId)) : undefined,
      dateFrom: dateFrom.length === 10 ? dateFrom : undefined,
      dateTo: dateTo.length === 10 ? dateTo : undefined,
    }),
    [scope, warehouseId, type, branchId, dateFrom, dateTo]
  );

  const { data = [], isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["warehouse-global-movements", filters] as const,
    queryFn: () => fetchWarehouseGlobalMovements(filters),
    placeholderData: (prev) => prev,
  });

  const warehouseOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("warehouse.globalFilterWarehouseAll") },
      ...warehouses.map((w) => ({ value: String(w.id), label: w.name })),
    ],
    [t, warehouses]
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

  const totalCount = data.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const items = data.slice(pageStart, pageStart + PAGE_SIZE);
  const totalInShipmentCount = useMemo(
    () => new Set(data.filter((x) => x.type === "IN").map((x) => shipmentGroupKeyForRow(x))).size,
    [data]
  );
  const totalOutShipmentCount = useMemo(
    () => new Set(data.filter((x) => x.type === "OUT").map((x) => shipmentGroupKeyForRow(x))).size,
    [data]
  );
  const movementFiltersActive = useMemo(() => {
    if (scope.mainCategoryId != null || scope.subCategoryId != null || scope.parentProductId != null || scope.productId != null) return true;
    if (warehouseId !== "" && Number(warehouseId) > 0) return true;
    if (type === "IN" || type === "OUT") return true;
    if (branchId !== "" && Number(branchId) > 0) return true;
    if (dateFrom.length === 10 || dateTo.length === 10) return true;
    return false;
  }, [scope, warehouseId, type, branchId, dateFrom, dateTo]);
  const openMovementDetail = (row: WarehouseGlobalMovementRow) => {
    const params = new URLSearchParams({
      openWarehouse: String(row.warehouseId),
      openWarehouseTab: "history",
      openMovementId: String(row.id),
    });
    router.push(`/warehouses?${params.toString()}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-3 pb-6 sm:p-4 sm:pb-10">
      <div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
          {t("warehouse.globalMovementsTitle")}
        </h1>
        <p className="text-sm text-zinc-500">{t("warehouse.globalMovementsSubtitle")}</p>
      </div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"
          aria-expanded={filtersDrawerOpen}
          aria-haspopup="dialog"
          aria-label={t("warehouse.movementsFilterIconAria")}
          onClick={() => setFiltersDrawerOpen(true)}
        >
          <FilterFunnelIcon className="h-5 w-5" />
          {movementFiltersActive ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white" aria-hidden />
          ) : null}
        </button>
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
        <div className="space-y-4 pb-2">
          <Select
            label={t("warehouse.globalFilterWarehouse")}
            options={warehouseOptions}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            onBlur={() => {}}
            name="global-wh-mv-warehouse"
          />
          <Select
            label={t("products.filterType")}
            options={typeOptions}
            value={type}
            onChange={(e) => setType(e.target.value)}
            onBlur={() => {}}
            name="global-wh-mv-type"
          />
          <Select
            label={t("warehouse.filterMovementBranch")}
            options={branchOptions}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            onBlur={() => {}}
            name="global-wh-mv-branch"
          />
          <DateField
            label={t("products.filterDateFrom")}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <DateField
            label={t("products.filterDateTo")}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <WarehouseProductScopeFilters value={scope} onChange={setScope} menuZIndex={DRAWER_SELECT_Z} />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => {
                void refetch();
                setFiltersDrawerOpen(false);
              }}
            >
              {t("warehouse.movementsFilterApplyClose")}
            </Button>
          </div>
        </div>
      </RightDrawer>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
          <p className="text-xs text-zinc-500">{t("products.pagingTotal")}</p>
          <p className="text-lg font-semibold text-zinc-900">{totalCount}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-xs text-emerald-700">{t("warehouse.globalInboundShipmentCount")}</p>
          <p className="text-lg font-semibold text-emerald-900">{totalInShipmentCount}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs text-red-700">{t("warehouse.globalOutboundShipmentCount")}</p>
          <p className="text-lg font-semibold text-red-900">{totalOutShipmentCount}</p>
        </div>
      </div>

      {isError ? <p className="text-sm text-red-600">{toErrorMessage(error)}</p> : null}
      {isPending && data.length === 0 ? <p className="text-sm text-zinc-500">{t("common.loading")}</p> : null}

      {!isPending && !isError && items.length === 0 ? (
        <p className="text-sm text-zinc-600">{t("warehouse.globalMovementsEmpty")}</p>
      ) : null}

      {items.length > 0 ? (
        <ResponsiveTableFrame
          mobileVisibilityClassName="sm:flex md:hidden"
          desktopVisibilityClassName="hidden md:block"
          mobileClassName={cn("space-y-2", isFetching && "opacity-75")}
          desktopClassName={cn("rounded-lg border border-zinc-200 bg-white", isFetching && "opacity-75")}
          desktopInsetScroll
          desktopScrollClassName="overflow-x-auto"
          mobile={
            <>
              {items.map((m: WarehouseGlobalMovementRow) => {
                const batchCell = formatWarehouseShipmentDisplay(m.inBatchGroupId, m.id);
                return (
                  <div key={`m-card-${m.warehouseId}-${m.id}`} className="rounded-lg border border-zinc-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-900">{formatLocaleDate(m.movementDate, locale)}</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", m.type === "IN" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900")}>
                        {m.type === "IN" ? t("products.typeIn") : t("products.typeOut")}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="mt-2 text-left text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-700"
                      onClick={() => openMovementDetail(m)}
                    >
                      {m.productName}
                    </button>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-zinc-500">{t("products.colWarehouse")}</p><p className="font-medium text-zinc-800">{m.warehouseName}</p></div>
                      <div><p className="text-zinc-500">{t("warehouse.movementOutBranch")}</p><p className="font-medium text-zinc-800">{m.outDestinationBranchName || "—"}</p></div>
                      <div><p className="text-zinc-500">{t("warehouse.movementBatchGroup")}</p><p className="font-mono text-xs text-zinc-700" title={batchCell.title}>{batchCell.text}</p></div>
                      <div><p className="text-zinc-500">{t("products.colQty")}</p><p className="font-semibold tabular-nums text-zinc-900">{m.quantity}</p></div>
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">{m.description || "—"}</p>
                    {m.type === "IN" && m.hasInvoicePhoto ? (
                      <a
                        href={warehouseMovementInvoicePhotoUrl(m.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex text-xs font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
                      >
                        {t("warehouse.openInvoicePhoto")}
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </>
          }
          desktop={
            <table className="w-full min-w-0 lg:min-w-[980px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-3 py-2.5 font-semibold">{t("products.mColDate")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("products.colWarehouse")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("products.colName")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("products.mColType")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("warehouse.movementBatchGroup")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("warehouse.movementOutBranch")}</th>
                  <th className="px-3 py-2.5 text-right font-semibold">{t("products.colQty")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("products.mColNote")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("warehouse.mColInvoice")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m: WarehouseGlobalMovementRow) => {
                  const batchCell = formatWarehouseShipmentDisplay(m.inBatchGroupId, m.id);
                  return (
                    <tr key={`${m.warehouseId}-${m.id}`} className="border-b border-zinc-100 last:border-0">
                      <td className="px-3 py-2">{formatLocaleDate(m.movementDate, locale)}</td>
                      <td className="px-3 py-2">{m.warehouseName}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-left font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-700"
                          onClick={() => openMovementDetail(m)}
                        >
                          {m.productName}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        {m.type === "IN" ? t("products.typeIn") : t("products.typeOut")}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs" title={batchCell.title}>
                        {batchCell.text}
                      </td>
                      <td className="px-3 py-2">{m.outDestinationBranchName || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{m.quantity}</td>
                      <td className="max-w-[20rem] truncate px-3 py-2 text-zinc-600">{m.description || "—"}</td>
                      <td className="px-3 py-2">
                        {m.type === "IN" && m.hasInvoicePhoto ? (
                          <a
                            href={warehouseMovementInvoicePhotoUrl(m.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
                          >
                            {t("warehouse.openInvoicePhoto")}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          }
        />
      ) : null}

      {!isPending && totalCount > 0 ? (
        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-600">
            {pageStart + 1}
            {"–"}
            {Math.min(pageStart + PAGE_SIZE, totalCount)} · {t("products.pagingTotal")} {totalCount}
          </p>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 min-w-11 px-0"
              aria-label={t("products.pagingPrev")}
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <span aria-hidden className="text-lg leading-none">‹</span>
            </Button>
            <span className="min-w-[3.5rem] text-center text-sm tabular-nums text-zinc-700">
              {safePage} / {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 min-w-11 px-0"
              aria-label={t("products.pagingNext")}
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <span aria-hidden className="text-lg leading-none">›</span>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
