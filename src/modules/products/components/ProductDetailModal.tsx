"use client";

import {
  useProductInventory,
  useProductMovements,
} from "@/modules/products/hooks/useProductQueries";
import { useWarehousesList } from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { useController, useForm } from "react-hook-form";
import { useEffect, useMemo } from "react";

type Props = {
  open: boolean;
  productId: number | null;
  productLabel: string;
  onClose: () => void;
};

type FilterForm = { warehouseId: string };

export function ProductDetailModal({ open, productId, productLabel, onClose }: Props) {
  const { t } = useI18n();
  const { data: inv, isPending: invLoading, isError: invErr, error: invError } =
    useProductInventory(open && productId != null ? productId : null);
  const { data: warehouses = [] } = useWarehousesList();

  const { control, watch, reset } = useForm<FilterForm>({
    defaultValues: { warehouseId: "" },
  });
  const whField = useController({ control, name: "warehouseId" });
  const whFilter = watch("warehouseId");

  useEffect(() => {
    if (open) reset({ warehouseId: "" });
  }, [open, productId, reset]);
  const whFilterNum = whFilter ? Number(whFilter) : undefined;

  const { data: movements = [], isPending: movLoading } = useProductMovements(
    open && productId != null ? productId : null,
    whFilterNum && whFilterNum > 0 ? whFilterNum : null
  );

  const whOptions = useMemo(
    () => [
      { value: "", label: t("products.movementsAllWarehouses") },
      ...warehouses.map((w) => ({ value: String(w.id), label: w.name })),
    ],
    [warehouses, t]
  );

  const titleId = "product-detail-title";

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={productLabel}
      description={t("products.detailDescription")}
    >
      <div className="mt-4 flex flex-col gap-6">
        <section>
          <h3 className="text-sm font-semibold text-zinc-900">{t("products.sectionInventory")}</h3>
          {invErr ? (
            <p className="mt-2 text-sm text-red-600">{toErrorMessage(invError)}</p>
          ) : invLoading ? (
            <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
          ) : inv ? (
            <>
              <p className="mt-1 text-sm text-zinc-600">
                {t("products.totalQty")}:{" "}
                <span className="font-semibold text-zinc-900">{inv.totalQuantity}</span>
              </p>
              <Table className="mt-2">
                <TableHead>
                  <TableRow>
                    <TableHeader>{t("products.colWarehouse")}</TableHeader>
                    <TableHeader className="text-right">{t("products.colQty")}</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inv.byWarehouse.map((row) => (
                    <TableRow key={row.warehouseId}>
                      <TableCell>{row.warehouseName}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : null}
        </section>

        <section>
          <h3 className="text-sm font-semibold text-zinc-900">{t("products.sectionMovements")}</h3>
          <div className="mt-2">
            <Select
              label={t("products.movementsFilterWarehouse")}
              options={whOptions}
              name={whField.field.name}
              value={whField.field.value}
              onChange={(e) => whField.field.onChange(e.target.value)}
              onBlur={whField.field.onBlur}
              ref={whField.field.ref}
            />
          </div>
          {movLoading ? (
            <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
          ) : movements.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">{t("products.noMovements")}</p>
          ) : (
            <Table className="mt-3">
              <TableHead>
                <TableRow>
                  <TableHeader>{t("products.mColDate")}</TableHeader>
                  <TableHeader>{t("products.colWarehouse")}</TableHeader>
                  <TableHeader>{t("products.mColType")}</TableHeader>
                  <TableHeader className="text-right">{t("products.colQty")}</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {m.movementDate.slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-sm">{m.warehouseName}</TableCell>
                    <TableCell className="text-sm">
                      {m.type === "IN" ? t("products.typeIn") : t("products.typeOut")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{m.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </Modal>
  );
}
