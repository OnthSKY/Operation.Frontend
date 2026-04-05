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
import { Card } from "@/shared/components/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { useState } from "react";

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
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>{t("products.colName")}</TableHeader>
                <TableHeader>{t("products.colUnit")}</TableHeader>
                <TableHeader className="text-right">{t("products.colTotal")}</TableHeader>
                <TableHeader className="w-44 text-right">{t("common.actions")}</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.unit ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.totalQuantity}</TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      className="mr-3 text-sm font-medium text-zinc-700 hover:underline"
                      onClick={() => openDetail(r.id, r.name)}
                    >
                      {t("products.actionDetail")}
                    </button>
                    <button
                      type="button"
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => void onDelete(r.id, r.name)}
                      disabled={del.isPending}
                    >
                      {t("common.delete")}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
