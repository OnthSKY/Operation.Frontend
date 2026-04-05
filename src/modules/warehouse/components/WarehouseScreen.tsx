"use client";

import { AddProductModal } from "@/modules/products/components/AddProductModal";
import { useProductsCatalog } from "@/modules/products/hooks/useProductQueries";
import { AddWarehouseModal } from "@/modules/warehouse/components/AddWarehouseModal";
import {
  useRegisterWarehouseMovement,
  useSoftDeleteWarehouse,
  useWarehouseStock,
  useWarehousesList,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/components/Card";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { useEffect, useMemo, useState } from "react";
import { useController, useForm } from "react-hook-form";

type MovementForm = {
  productId: string;
  quantity: string;
  movementDate: string;
};

export function WarehouseScreen() {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [whModal, setWhModal] = useState(false);
  const [prodModal, setProdModal] = useState(false);

  const { data: warehouses = [], isPending: whLoading, isError: whError, error: whErr } =
    useWarehousesList();
  const { data: stockRows = [], isPending: stockLoading } = useWarehouseStock(selectedId);
  const { data: catalog = [], isPending: catLoading } = useProductsCatalog();

  useEffect(() => {
    if (warehouses.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((cur) => {
      if (cur != null && warehouses.some((w) => w.id === cur)) return cur;
      return warehouses[0]!.id;
    });
  }, [warehouses]);

  const productOptions = useMemo(
    () =>
      catalog.map((p) => ({
        value: String(p.id),
        label: p.unit ? `${p.name} (${p.unit})` : p.name,
      })),
    [catalog]
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<MovementForm>({
    defaultValues: {
      productId: "",
      quantity: "",
      movementDate: localIsoDate(),
    },
  });

  const productField = useController({
    control,
    name: "productId",
    rules: { required: t("common.required") },
  });

  useEffect(() => {
    reset({
      productId: "",
      quantity: "",
      movementDate: localIsoDate(),
    });
  }, [selectedId, reset]);

  const delWh = useSoftDeleteWarehouse();
  const movement = useRegisterWarehouseMovement();

  const onDeleteWarehouse = async (id: number) => {
    if (!window.confirm(t("warehouse.confirmDeleteWarehouse"))) return;
    try {
      await delWh.mutateAsync(id);
      notify.success(t("toast.warehouseDeleted"));
      if (selectedId === id) setSelectedId(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const submitMovement = (direction: "in" | "out") =>
    handleSubmit(async (values) => {
      if (!selectedId) return;
      const qty = Number(values.quantity.replace(",", "."));
      if (!Number.isFinite(qty) || qty <= 0) {
        notify.error(t("warehouse.invalidQuantity"));
        return;
      }
      const pid = Number(values.productId);
      try {
        await movement.mutateAsync({
          warehouseId: selectedId,
          productId: pid,
          quantity: qty,
          movementDate: values.movementDate,
          direction,
        });
        notify.success(
          direction === "in" ? t("toast.warehouseInOk") : t("toast.warehouseOutOk")
        );
        reset({
          productId: values.productId,
          quantity: "",
          movementDate: localIsoDate(),
        });
      } catch (e) {
        notify.error(toErrorMessage(e));
      }
    })();

  const selectedWarehouse = warehouses.find((w) => w.id === selectedId);
  const catalogReady = !catLoading && catalog.length > 0;

  return (
    <div className="mx-auto w-full max-w-4xl p-4 lg:max-w-6xl 2xl:max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{t("warehouse.title")}</h1>
          <p className="text-sm text-zinc-500">{t("warehouse.subtitle")}</p>
        </div>
        <Button type="button" className="sm:w-auto" onClick={() => setWhModal(true)}>
          {t("warehouse.addWarehouse")}
        </Button>
      </div>

      {whError ? (
        <p className="mt-4 text-sm text-red-600">{toErrorMessage(whErr)}</p>
      ) : whLoading ? (
        <p className="mt-4 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : warehouses.length === 0 ? (
        <Card className="mt-4" title={t("warehouse.noWarehouses")}>
          <p className="text-sm text-zinc-600">{t("warehouse.noWarehousesHint")}</p>
        </Card>
      ) : (
        <>
          <Card className="mt-4" title={t("warehouse.selectWarehouse")}>
            <ul className="flex flex-wrap gap-2">
              {warehouses.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(w.id)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      selectedId === w.id
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                    }`}
                  >
                    {w.name}
                  </button>
                </li>
              ))}
            </ul>
            {selectedWarehouse ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="sm:w-auto"
                  onClick={() => onDeleteWarehouse(selectedWarehouse.id)}
                  disabled={delWh.isPending}
                >
                  {t("warehouse.deleteWarehouse")}
                </Button>
              </div>
            ) : null}
          </Card>

          {selectedId ? (
            <>
              <Card className="mt-4">
                <div className="mb-3 min-w-0">
                  <h2 className="text-base font-semibold text-zinc-900">
                    {t("warehouse.stockTitle")}
                  </h2>
                  <p className="text-sm text-zinc-500">{t("warehouse.stockHint")}</p>
                </div>
                {stockLoading ? (
                  <p className="text-sm text-zinc-500">{t("common.loading")}</p>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>{t("warehouse.productName")}</TableHeader>
                        <TableHeader>{t("warehouse.productUnit")}</TableHeader>
                        <TableHeader className="text-right">{t("products.colQty")}</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stockRows.map((r) => (
                        <TableRow key={r.productId}>
                          <TableCell>{r.productName}</TableCell>
                          <TableCell>{r.unit ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-3 py-3 ring-1 ring-zinc-200/40 sm:px-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-700">
                        {t("warehouse.addProductSlotLabel")}
                      </p>
                      <p className="text-xs text-zinc-500">{t("warehouse.addProductHint")}</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full shrink-0 sm:w-auto"
                      onClick={() => setProdModal(true)}
                    >
                      {t("warehouse.addProduct")}
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="mt-4" title={t("warehouse.movementTitle")}>
                <p className="mb-3 text-sm text-zinc-600">{t("warehouse.movementHintGlobal")}</p>
                <div className="flex flex-col gap-3">
                  <Select
                    label={t("warehouse.movementProduct")}
                    options={productOptions}
                    name={productField.field.name}
                    value={productField.field.value}
                    onChange={(e) => productField.field.onChange(e.target.value)}
                    onBlur={productField.field.onBlur}
                    ref={productField.field.ref}
                    error={errors.productId?.message}
                    disabled={!catalogReady}
                  />
                  <Input
                    label={t("warehouse.movementQuantity")}
                    inputMode="decimal"
                    autoComplete="off"
                    {...register("quantity", { required: t("common.required") })}
                    error={errors.quantity?.message}
                  />
                  <Input
                    type="date"
                    label={t("warehouse.movementDate")}
                    {...register("movementDate", { required: t("common.required") })}
                    error={errors.movementDate?.message}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      className="sm:min-w-[120px]"
                      disabled={movement.isPending || !catalogReady}
                      onClick={() => void submitMovement("out")}
                    >
                      {t("warehouse.movementOut")}
                    </Button>
                    <Button
                      type="button"
                      className="sm:min-w-[120px]"
                      disabled={movement.isPending || !catalogReady}
                      onClick={() => void submitMovement("in")}
                    >
                      {t("warehouse.movementIn")}
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          ) : null}
        </>
      )}

      <AddWarehouseModal open={whModal} onClose={() => setWhModal(false)} />
      <AddProductModal
        open={prodModal}
        onClose={() => setProdModal(false)}
        descriptionKey="warehouse.addProductHint"
      />
    </div>
  );
}
