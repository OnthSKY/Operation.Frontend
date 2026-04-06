"use client";

import { AddProductModal } from "@/modules/products/components/AddProductModal";
import { ProductDetailModal } from "@/modules/products/components/ProductDetailModal";
import {
  useProductsCatalog,
  useSoftDeleteProduct,
} from "@/modules/products/hooks/useProductQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { detailOpenIconButtonClass, EyeIcon } from "@/shared/ui/EyeIcon";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { Card } from "@/shared/components/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { Tooltip } from "@/shared/ui/Tooltip";
import type { ProductListItem } from "@/types/product";
import { useState } from "react";

function productKv(label: string, value: string) {
  return (
    <div className="min-w-0">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 break-words text-sm text-zinc-900">{value}</p>
    </div>
  );
}

function ProductWarehouseChips({
  r,
  t,
}: {
  r: ProductListItem;
  t: (key: string) => string;
}) {
  const list = r.byWarehouse ?? [];
  if (list.length === 0) {
    return <span className="text-sm text-zinc-400">{t("products.notInAnyWarehouse")}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((w) => (
        <Tooltip
          key={w.warehouseId}
          content={`${w.warehouseName}: ${w.quantity}`}
          delayMs={240}
        >
          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-900 ring-1 ring-violet-200/80">
            <span className="max-w-[12rem] truncate">{w.warehouseName}</span>
            <span className="shrink-0 tabular-nums text-violet-700">{w.quantity}</span>
          </span>
        </Tooltip>
      ))}
    </div>
  );
}

export function ProductsScreen() {
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailLabel, setDetailLabel] = useState("");

  const { data: rows = [], isPending, isError, error } = useProductsCatalog();
  const del = useSoftDeleteProduct();

  const onDelete = async (id: number, label: string) => {
    if (!window.confirm(`${t("products.confirmDelete")}\n${label}`)) return;
    try {
      await del.mutateAsync(id);
      notify.success(t("toast.productDeleted"));
      if (detailId === id) {
        setDetailId(null);
        setDetailLabel("");
      }
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const openDetail = (id: number, name: string) => {
    setDetailId(id);
    setDetailLabel(name);
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-4 lg:max-w-6xl 2xl:max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{t("products.title")}</h1>
          <p className="text-sm text-zinc-500">{t("products.subtitle")}</p>
        </div>
        <Button type="button" className="sm:w-auto" onClick={() => setAddOpen(true)}>
          {t("products.addProduct")}
        </Button>
      </div>

      {isError ? (
        <p className="mt-4 text-sm text-red-600">{toErrorMessage(error)}</p>
      ) : isPending ? (
        <p className="mt-4 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <Card className="mt-4" title={t("products.title")}>
          <p className="text-sm text-zinc-600">{t("products.emptyCatalog")}</p>
        </Card>
      ) : (
        <Card className="mt-4">
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((r) => (
              <div
                key={r.id}
                className="touch-manipulation rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-900/5"
              >
                <p className="text-base font-semibold leading-snug text-zinc-900">{r.name}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {productKv(t("products.colUnit"), r.unit?.trim() ? r.unit : "—")}
                  <div className="min-w-0 sm:col-span-2">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                      {t("products.colTotal")}
                    </p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-900">
                      {r.totalQuantity}
                    </p>
                  </div>
                </div>
                <div className="mt-3 min-w-0">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                    {t("products.colInWarehouses")}
                  </p>
                  <div className="mt-1.5">
                    <ProductWarehouseChips r={r} t={t} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 pt-3">
                  <Tooltip content={t("common.openDetailsDialog")} delayMs={200}>
                    <Button
                      type="button"
                      variant="secondary"
                      className={`${detailOpenIconButtonClass} min-h-11 min-w-11`}
                      aria-haspopup="dialog"
                      aria-expanded={detailId === r.id}
                      aria-label={t("common.openDetailsDialog")}
                      title={t("common.openDetailsDialog")}
                      onClick={() => openDetail(r.id, r.name)}
                    >
                      <EyeIcon />
                    </Button>
                  </Tooltip>
                  <Tooltip content={t("common.delete")} delayMs={200}>
                    <button
                      type="button"
                      className={`${trashIconActionButtonClass} min-h-11 min-w-11`}
                      aria-label={t("common.delete")}
                      onClick={() => void onDelete(r.id, r.name)}
                      disabled={del.isPending}
                    >
                      <TrashIcon />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>

          <div className="-mx-1 hidden overflow-x-auto md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>{t("products.colName")}</TableHeader>
                  <TableHeader className="hidden md:table-cell">{t("products.colUnit")}</TableHeader>
                  <TableHeader className="min-w-[12rem]">{t("products.colInWarehouses")}</TableHeader>
                  <TableHeader className="text-right">{t("products.colTotal")}</TableHeader>
                  <TableHeader className="w-[1%] min-w-[6.5rem] whitespace-nowrap text-right">
                    {t("common.actions")}
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium text-zinc-900">{r.name}</div>
                      <div className="text-xs text-zinc-500 md:hidden">
                        {r.unit ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-zinc-600 md:table-cell">
                      {r.unit ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-md flex-wrap gap-1.5">
                        <ProductWarehouseChips r={r} t={t} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {r.totalQuantity}
                    </TableCell>
                    <TableCell className="w-[1%] whitespace-nowrap text-right">
                      <div className="inline-flex flex-nowrap items-center justify-end gap-1.5">
                        <Tooltip content={t("common.openDetailsDialog")} delayMs={200}>
                          <Button
                            type="button"
                            variant="secondary"
                            className={detailOpenIconButtonClass}
                            aria-haspopup="dialog"
                            aria-expanded={detailId === r.id}
                            aria-label={t("common.openDetailsDialog")}
                            title={t("common.openDetailsDialog")}
                            onClick={() => openDetail(r.id, r.name)}
                          >
                            <EyeIcon />
                          </Button>
                        </Tooltip>
                        <Tooltip content={t("common.delete")} delayMs={200}>
                          <button
                            type="button"
                            className={trashIconActionButtonClass}
                            aria-label={t("common.delete")}
                            onClick={() => void onDelete(r.id, r.name)}
                            disabled={del.isPending}
                          >
                            <TrashIcon />
                          </button>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <AddProductModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ProductDetailModal
        open={detailId != null}
        productId={detailId}
        productLabel={detailLabel}
        onClose={() => {
          setDetailId(null);
          setDetailLabel("");
        }}
      />
    </div>
  );
}
