"use client";

import { useProductMovementsPage } from "@/modules/products/hooks/useProductQueries";
import { useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { toErrorMessage } from "@/shared/lib/error-message";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { WarehouseMovementMobileCard } from "@/modules/warehouse/components/WarehouseMovementMobileCard";
import { Button } from "@/shared/ui/Button";
import { TablePagination } from "@/shared/ui/TablePagination";
import { DateField } from "@/shared/ui/DateField";
import { Select, type SelectOption } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { warehouseMovementInvoicePhotoUrl } from "@/modules/warehouse/api/warehouse-movements-api";
import type { ProductMovementsPageParams } from "@/types/product";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import {
  formatWarehouseShipmentDisplay,
  shipmentIdLabelClassName,
} from "@/shared/lib/in-batch-group-label";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 20;

type Props = {
  productId: number;
  enabled: boolean;
};

export function ProductDetailMovementsTab({ productId, enabled }: Props) {
  const { t, locale } = useI18n();
  const { data: warehouses = [] } = useWarehousesList();
  const [warehouseId, setWarehouseId] = useState("");
  const [type, setType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setWarehouseId("");
    setType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setFiltersOpen(false);
  }, [productId]);

  const activeFilterCount =
    (warehouseId !== "" ? 1 : 0) +
    (type !== "" ? 1 : 0) +
    (dateFrom !== "" ? 1 : 0) +
    (dateTo !== "" ? 1 : 0);

  const resetFilters = () => {
    setWarehouseId("");
    setType("");
    setDateFrom("");
    setDateTo("");
  };

  useEffect(() => {
    setPage(1);
  }, [warehouseId, type, dateFrom, dateTo]);

  const params = useMemo((): ProductMovementsPageParams => {
    const tNorm: "IN" | "OUT" | undefined =
      type === "IN" || type === "OUT" ? type : undefined;
    return {
      page,
      pageSize: PAGE_SIZE,
      warehouseId:
        warehouseId !== "" && Number(warehouseId) > 0
          ? Math.trunc(Number(warehouseId))
          : undefined,
      type: tNorm,
      dateFrom: dateFrom.length === 10 ? dateFrom : undefined,
      dateTo: dateTo.length === 10 ? dateTo : undefined,
    };
  }, [page, warehouseId, type, dateFrom, dateTo]);

  const { data, isPending, isError, error, refetch } = useProductMovementsPage(
    productId,
    params,
    enabled
  );

  const whOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("products.movementsAllWarehouses") },
      ...warehouses.map((w) => ({ value: String(w.id), label: w.name })),
    ],
    [warehouses, t]
  );

  const typeOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("products.filterTypeAll") },
      { value: "IN", label: t("products.typeIn") },
      { value: "OUT", label: t("products.typeOut") },
    ],
    [t]
  );

  const totalCount = data?.totalCount ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          className="relative inline-flex h-10 items-center gap-2 px-3"
          onClick={() => setFiltersOpen(true)}
          aria-label={t("products.filterApplyRefresh")}
        >
          <FilterFunnelIcon className="h-4 w-4" />
          <span className="text-sm">Filtreler</span>
          {activeFilterCount > 0 ? (
            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-600 px-1.5 text-[0.65rem] font-semibold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-10 px-3"
          onClick={() => refetch()}
        >
          {t("products.filterApplyRefresh")}
        </Button>
      </div>

      <RightDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtreler"
        closeLabel="Kapat"
        backdropCloseRequiresConfirm={false}
      >
        <div className="space-y-3">
          <Select
            label={t("products.movementsFilterWarehouse")}
            options={whOptions}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            onBlur={() => {}}
            name="mv-wh"
          />
          <Select
            label={t("products.filterType")}
            options={typeOptions}
            value={type}
            onChange={(e) => setType(e.target.value)}
            onBlur={() => {}}
            name="mv-type"
          />
          <DateField
            label={t("products.filterDateFrom")}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="min-w-0"
          />
          <DateField
            label={t("products.filterDateTo")}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="min-w-0"
          />
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={resetFilters}
              disabled={activeFilterCount === 0}
            >
              Filtreleri Temizle
            </Button>
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setFiltersOpen(false);
                refetch();
              }}
            >
              Uygula
            </Button>
          </div>
        </div>
      </RightDrawer>

      {isError && (
        <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
      )}

      {isPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-600">{t("products.noMovements")}</p>
      ) : (
        <>
          {/* Mobil: zengin kart düzeni — sevkiyat kartı gibi */}
          <div className="flex flex-col gap-3 md:hidden">
            {items.map((m) => (
              <WarehouseMovementMobileCard
                key={m.id}
                m={{
                  id: m.id,
                  type: m.type,
                  warehouseName: m.warehouseName,
                  quantity: m.quantity,
                  movementDate: m.movementDate,
                  description: m.description ?? null,
                  checkedByPersonnelName: m.checkedByPersonnelName ?? null,
                  approvedByPersonnelName: m.approvedByPersonnelName ?? null,
                  hasInvoicePhoto: m.hasInvoicePhoto,
                  inBatchGroupId: m.inBatchGroupId ?? null,
                }}
                labels={{
                  in: t("products.typeIn"),
                  out: t("products.typeOut"),
                  quantity: t("products.colQty"),
                  shipment: t("warehouse.movementBatchGroup"),
                  checkedBy: t("products.mColCheckedBy"),
                  approvedBy: t("products.mColApprovedBy"),
                  openInvoicePhoto: t("warehouse.openInvoicePhoto"),
                }}
                locale={locale}
              />
            ))}
          </div>

          {/* Desktop: tablo */}
          <div className="hidden min-h-0 flex-1 overflow-x-auto rounded-lg border border-zinc-200 md:block">
          <Table mobileCards={false}>
            <TableHead>
              <TableRow>
                <TableHeader>{t("products.mColDate")}</TableHeader>
                <TableHeader>{t("products.colWarehouse")}</TableHeader>
                <TableHeader>{t("products.mColType")}</TableHeader>
                <TableHeader className="whitespace-nowrap">
                  {t("warehouse.movementBatchGroup")}
                </TableHeader>
                <TableHeader className="text-right">{t("products.colQty")}</TableHeader>
                <TableHeader className="min-w-[8rem]">
                  {t("products.mColNote")}
                </TableHeader>
                <TableHeader className="min-w-[7rem]">{t("products.mColCheckedBy")}</TableHeader>
                <TableHeader className="min-w-[7rem]">{t("products.mColApprovedBy")}</TableHeader>
                <TableHeader className="w-[1%] whitespace-nowrap">{t("warehouse.mColInvoice")}</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((m) => {
                const batchCell = formatWarehouseShipmentDisplay(m.inBatchGroupId, m.id);
                return (
                <TableRow key={m.id}>
                  <TableCell dataLabel={t("products.mColDate")} className="whitespace-nowrap text-sm">
                    {formatLocaleDate(m.movementDate, locale)}
                  </TableCell>
                  <TableCell dataLabel={t("products.colWarehouse")} className="text-sm">
                    {m.warehouseName}
                  </TableCell>
                  <TableCell dataLabel={t("products.mColType")} className="text-sm">
                    {m.type === "IN" ? t("products.typeIn") : t("products.typeOut")}
                  </TableCell>
                  <TableCell
                    dataLabel={t("warehouse.movementBatchGroup")}
                    className={cn("md:max-w-[min(100%,14rem)]", shipmentIdLabelClassName)}
                  >
                    {batchCell.text}
                  </TableCell>
                  <TableCell dataLabel={t("products.colQty")} className="text-right text-sm tabular-nums md:text-right max-md:!text-left">
                    {m.quantity}
                  </TableCell>
                  <TableCell dataLabel={t("products.mColNote")} className="text-sm text-zinc-600 md:max-w-[14rem] md:truncate max-md:whitespace-pre-line max-md:break-words">
                    {m.description ?? "—"}
                  </TableCell>
                  <TableCell dataLabel={t("products.mColCheckedBy")} className="text-sm text-zinc-600 md:max-w-[10rem] md:truncate">
                    {m.checkedByPersonnelName ?? "—"}
                  </TableCell>
                  <TableCell dataLabel={t("products.mColApprovedBy")} className="text-sm text-zinc-600 md:max-w-[10rem] md:truncate">
                    {m.approvedByPersonnelName ?? "—"}
                  </TableCell>
                  <TableCell dataLabel={t("warehouse.mColInvoice")} className="whitespace-nowrap text-sm">
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
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </>
      )}

      {!isPending && totalCount > 0 && (
        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={totalCount}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
