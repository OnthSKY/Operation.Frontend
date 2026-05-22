"use client";

import { CatalogProductWarehouseStockCombobox } from "@/modules/products/components/CatalogProductWarehouseStockCombobox";
import { warehouseMovementInvoicePhotoUrl } from "@/modules/warehouse/api/warehouse-movements-api";
import {
  useSoftDeleteWarehouseInboundMovement,
  useUpdateWarehouseInboundMovement,
  useWarehouseInboundMovementForEdit,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { useEffect, useState } from "react";

const TITLE_ID = "warehouse-edit-inbound-full-title";

type Props = {
  open: boolean;
  warehouseId: number;
  movementId: number | null;
  onClose: () => void;
  /** Hareket detayı satır düzenleme: yalnızca ürün + miktar. */
  lineOnly?: boolean;
};

function toIsoDateOnly(s: string): string {
  const t = s.trim();
  if (t.length >= 10) return t.slice(0, 10);
  return t;
}

export function EditWarehouseInboundMovementFullModal({
  open,
  warehouseId,
  movementId,
  onClose,
  lineOnly = false,
}: Props) {
  const { t, locale } = useI18n();
  const enabled = open && movementId != null && movementId > 0;
  const q = useWarehouseInboundMovementForEdit(warehouseId, movementId, enabled);
  const updateM = useUpdateWarehouseInboundMovement();
  const deleteM = useSoftDeleteWarehouseInboundMovement();

  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [businessDate, setBusinessDate] = useState("");
  const [legacyDate, setLegacyDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) {
      setProductId("");
      setQty("");
      setBusinessDate("");
      setLegacyDate("");
      setDescription("");
      return;
    }
    const d = q.data;
    if (!d) return;
    setProductId(String(d.productId));
    setQty(String(d.quantity));
    setBusinessDate(toIsoDateOnly(d.businessDate));
    setLegacyDate(d.legacyDate ? toIsoDateOnly(d.legacyDate) : toIsoDateOnly(d.businessDate));
    setDescription(d.description?.trim() ?? "");
  }, [open, q.data]);

  const locked = q.data?.supplierInvoiceLinked === true;

  const onSubmit = async () => {
    const mid = movementId;
    if (mid == null || mid <= 0) return;
    const pid = Number(productId);
    const n = Number(qty.replace(",", "."));
    if (!Number.isFinite(pid) || pid <= 0) {
      notify.error(t("warehouse.listQuickPickProductError"));
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      notify.error(t("warehouse.invalidQuantity"));
      return;
    }
    if (businessDate.length !== 10) {
      notify.error(t("warehouse.editInboundDateInvalid"));
      return;
    }
    const ck = Number(q.data?.checkedByPersonnelId ?? 0);
    const ap = Number(q.data?.approvedByPersonnelId ?? 0);
    if (!Number.isFinite(ck) || ck <= 0 || !Number.isFinite(ap) || ap <= 0) {
      notify.error(t("warehouse.personnelVerifierRequired"));
      return;
    }
    try {
      await updateM.mutateAsync({
        warehouseId,
        movementId: mid,
        body: {
          productId: pid,
          quantity: n,
          businessDate,
          date: legacyDate.length === 10 ? legacyDate : businessDate,
          description: description.trim() ? description.trim() : null,
          checkedByPersonnelId: ck,
          approvedByPersonnelId: ap,
          clearInvoicePhoto: false,
        },
      });
      notify.success(t("warehouse.editInboundFullSaved"));
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onDelete = () => {
    const mid = movementId;
    if (mid == null || mid <= 0) return;
    notifyConfirmToast({
      toastId: `wh-inbound-del-${warehouseId}-${mid}`,
      title: t("warehouse.editInboundFullDeleteTitle"),
      message: <p>{t("warehouse.editInboundFullDeleteBody")}</p>,
      cancelLabel: t("common.cancel"),
      confirmLabel: t("common.delete"),
      onConfirm: async () => {
        try {
          await deleteM.mutateAsync({ warehouseId, movementId: mid });
          notify.success(t("warehouse.editInboundFullDeleted"));
          onClose();
        } catch (e) {
          notify.error(toErrorMessage(e));
        }
      },
    });
  };

  return (
    <Modal
      open={open && enabled}
      onClose={onClose}
      titleId={TITLE_ID}
      title={t("warehouse.editInboundLineTitle")}
      closeButtonLabel={t("common.close")}
      description={undefined}
      className="w-full max-w-lg"
    >
      {q.isPending ? (
        <p className="mt-4 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : q.isError ? (
        <p className="mt-4 text-sm text-red-600">{toErrorMessage(q.error)}</p>
      ) : q.data ? (
        <div className="mt-3 flex max-h-[min(78dvh,32rem)] flex-col gap-3 overflow-y-auto sm:max-h-none sm:overflow-visible">
          {locked ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              {t("warehouse.editInboundFullSupplierLock")}
            </p>
          ) : null}
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-800">
              {t("warehouse.movementProduct")} <span className="text-red-600">*</span>
            </p>
            <CatalogProductWarehouseStockCombobox
              warehouseId={warehouseId}
              value={productId}
              onChange={setProductId}
              pickMode="catalog"
              enabled={enabled}
              locale={locale}
              t={t}
              disabled={updateM.isPending || locked}
            />
          </div>
          <Input
            label={t("warehouse.editInboundLineQtyLabel")}
            labelRequired
            required
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            disabled={updateM.isPending || locked}
          />
          {!lineOnly ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DateField
                  label={t("warehouse.editInboundBusinessDate")}
                  labelRequired
                  required
                  value={businessDate}
                  onChange={(e) => setBusinessDate(e.target.value)}
                  disabled={updateM.isPending || locked}
                />
                <DateField
                  label={t("warehouse.editInboundLegacyDate")}
                  value={legacyDate}
                  onChange={(e) => setLegacyDate(e.target.value)}
                  disabled={updateM.isPending || locked}
                />
              </div>
              <Input
                label={t("warehouse.movementNote")}
                type="text"
                autoComplete="off"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={updateM.isPending}
              />
              {q.data.hasInvoicePhoto && movementId != null && movementId > 0 ? (
                <p className="text-xs text-zinc-500">
                  {t("warehouse.openInvoicePhoto")}:{" "}
                  <a
                    href={warehouseMovementInvoicePhotoUrl(movementId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
                  >
                    {t("warehouse.details")}
                  </a>
                </p>
              ) : null}
            </>
          ) : null}
          <div
            className={
              lineOnly
                ? "flex flex-col gap-2 sm:flex-row sm:justify-end"
                : "flex flex-col gap-2 border-t border-zinc-200 pt-3 sm:flex-row sm:flex-wrap sm:justify-between"
            }
          >
            {!lineOnly ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full border-red-200 text-red-800 hover:bg-red-50 sm:w-auto"
                disabled={deleteM.isPending || updateM.isPending}
                onClick={onDelete}
              >
                {t("warehouse.editInboundFullDeleteAction")}
              </Button>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                className="min-h-11 w-full sm:w-auto"
                disabled={updateM.isPending || deleteM.isPending}
                onClick={() => void onSubmit()}
              >
                {t("warehouse.editInboundFullSave")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
