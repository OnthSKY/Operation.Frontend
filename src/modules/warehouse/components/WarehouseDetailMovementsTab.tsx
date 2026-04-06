"use client";

import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { useWarehouseMovementsPage } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
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
import type { WarehouseMovementsPageParams } from "@/types/warehouse";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { useEffect, useMemo, useState, type ReactNode } from "react";

function movementKv(label: string, value: ReactNode) {
  return (
    <div className="min-w-0">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-0.5 break-words text-sm text-zinc-900">{value}</div>
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
  const { data: products = [] } = useProductsCatalog();
  const [productId, setProductId] = useState("");
  const [type, setType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setProductId("");
    setType("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, [warehouseId]);

  useEffect(() => {
    setPage(1);
  }, [productId, type, dateFrom, dateTo]);

  const params = useMemo((): WarehouseMovementsPageParams => {
    const tNorm: "IN" | "OUT" | "" =
      type === "IN" || type === "OUT" ? type : "";
    return {
      page,
      pageSize: PAGE_SIZE,
      productId:
        productId !== "" && Number(productId) > 0 ? Math.trunc(Number(productId)) : undefined,
      type: tNorm,
      dateFrom: dateFrom.length === 10 ? dateFrom : undefined,
      dateTo: dateTo.length === 10 ? dateTo : undefined,
    };
  }, [page, productId, type, dateFrom, dateTo]);

  const { data, isPending, isError, error, refetch } = useWarehouseMovementsPage(
    warehouseId,
    params,
    enabled
  );

  const productOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("warehouse.filterAllProducts") },
      ...products.map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [products, t]
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

  const fmtDate = (iso: string) => formatLocaleDate(iso, locale);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Select
          label={t("warehouse.filterProduct")}
          options={productOptions}
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          onBlur={() => {}}
          name="wh-mv-product"
        />
        <Select
          label={t("products.filterType")}
          options={typeOptions}
          value={type}
          onChange={(e) => setType(e.target.value)}
          onBlur={() => {}}
          name="wh-mv-type"
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

      {isError && <p className="text-sm text-red-600">{toErrorMessage(error)}</p>}

      {isPending ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-600">{t("warehouse.movementsEmpty")}</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {items.map((m) => {
              const typeIn = m.type === "IN";
              const typeLabel = typeIn ? t("products.typeIn") : t("products.typeOut");
              return (
                <div
                  key={m.id}
                  className="touch-manipulation rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-800">{fmtDate(m.movementDate)}</p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                        typeIn
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-red-100 text-red-900"
                      )}
                    >
                      {typeLabel}
                    </span>
                  </div>
                  <p className="mt-3 text-base font-semibold leading-snug text-zinc-900">
                    {m.productName}
                    {m.unit ? (
                      <span className="ml-1.5 text-sm font-normal text-zinc-500">({m.unit})</span>
                    ) : null}
                  </p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0">
                    <span className="text-2xl font-bold tabular-nums text-zinc-900">{m.quantity}</span>
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {t("products.colQty")}
                    </span>
                  </div>
                  <div className="mt-4 space-y-3 border-t border-zinc-100 pt-3">
                    {movementKv(t("warehouse.movementNote"), m.description?.trim() ? m.description : "—")}
                    {movementKv(
                      t("warehouse.movementCheckedBy"),
                      m.checkedByPersonnelName ?? "—"
                    )}
                    {movementKv(
                      t("warehouse.movementApprovedBy"),
                      m.approvedByPersonnelName ?? "—"
                    )}
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
            })}
          </div>

          <div className="hidden min-h-0 flex-1 overflow-x-auto rounded-lg border border-zinc-200 md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("warehouse.movementDate")}</TableHeader>
                  <TableHeader>{t("warehouse.movementTypeCol")}</TableHeader>
                  <TableHeader>{t("warehouse.productName")}</TableHeader>
                  <TableHeader className="text-right">{t("products.colQty")}</TableHeader>
                  <TableHeader className="min-w-[8rem]">{t("warehouse.movementNote")}</TableHeader>
                  <TableHeader className="min-w-[7rem]">{t("warehouse.movementCheckedBy")}</TableHeader>
                  <TableHeader className="min-w-[7rem]">{t("warehouse.movementApprovedBy")}</TableHeader>
                  <TableHeader className="w-[1%] whitespace-nowrap">{t("warehouse.mColInvoice")}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-sm">{fmtDate(m.movementDate)}</TableCell>
                    <TableCell className="text-sm">
                      {m.type === "IN" ? t("products.typeIn") : t("products.typeOut")}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{m.productName}</div>
                      {m.unit ? <div className="text-xs text-zinc-500">{m.unit}</div> : null}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{m.quantity}</TableCell>
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
        </>
      )}

      {!isPending && totalCount > 0 && (
        <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-zinc-600">
            {(page - 1) * PAGE_SIZE + 1}
            {"–"}
            {Math.min(page * PAGE_SIZE, totalCount)} · {t("products.pagingTotal")} {totalCount}
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
