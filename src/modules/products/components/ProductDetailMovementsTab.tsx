"use client";

import { useProductMovementsPage } from "@/modules/products/hooks/useProductQueries";
import { useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
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

  useEffect(() => {
    setWarehouseId("");
    setType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, [productId]);

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
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const items = data?.items ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
        <Input
          type="date"
          label={t("products.filterDateFrom")}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="min-w-0"
        />
        <Input
          type="date"
          label={t("products.filterDateTo")}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="min-w-0"
        />
        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            className="min-h-12 w-full"
            onClick={() => refetch()}
          >
            {t("products.filterApplyRefresh")}
          </Button>
        </div>
      </div>

      {isError && (
        <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
      )}

      {isPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-600">{t("products.noMovements")}</p>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto rounded-lg border border-zinc-200">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>{t("products.mColDate")}</TableHeader>
                <TableHeader>{t("products.colWarehouse")}</TableHeader>
                <TableHeader>{t("products.mColType")}</TableHeader>
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
              {items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatLocaleDate(m.movementDate, locale)}
                  </TableCell>
                  <TableCell className="text-sm">{m.warehouseName}</TableCell>
                  <TableCell className="text-sm">
                    {m.type === "IN" ? t("products.typeIn") : t("products.typeOut")}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {m.quantity}
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate text-sm text-zinc-600">
                    {m.description ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate text-sm text-zinc-600">
                    {m.checkedByPersonnelName ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate text-sm text-zinc-600">
                    {m.approvedByPersonnelName ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!isPending && totalCount > 0 && (
        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-600">
            {(page - 1) * PAGE_SIZE + 1}
            {"–"}
            {Math.min(page * PAGE_SIZE, totalCount)} · {t("products.pagingTotal")}{" "}
            {totalCount}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("products.pagingPrev")}
            </Button>
            <span className="text-sm tabular-nums text-zinc-700">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11"
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
