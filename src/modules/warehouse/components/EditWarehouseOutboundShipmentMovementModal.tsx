"use client";

import { CatalogProductWarehouseStockCombobox } from "@/modules/products/components/CatalogProductWarehouseStockCombobox";
import {
  useUpdateWarehouseOutboundShipmentMovement,
  useWarehouseOutboundShipmentMovementForEdit,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { useEffect, useState } from "react";

const TITLE_ID = "warehouse-edit-outbound-shipment-title";
const MANUAL_RECEIVER_PREFIX = "Manual receiver:";

type Props = {
  open: boolean;
  warehouseId: number;
  movementId: number | null;
  onClose: () => void;
};

function toIsoDateOnly(s: string): string {
  const t = s.trim();
  if (t.length >= 10) return t.slice(0, 10);
  return t;
}

function stripManualReceiverFromDescription(input: string | null | undefined): {
  clean: string;
  manualReceiver: string;
} {
  const text = (input ?? "").trim();
  if (!text) return { clean: "", manualReceiver: "" };
  const rows = text
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  let manual = "";
  const kept: string[] = [];
  for (const row of rows) {
    if (row.toLowerCase().startsWith(MANUAL_RECEIVER_PREFIX.toLowerCase())) {
      manual = row.slice(MANUAL_RECEIVER_PREFIX.length).trim();
      continue;
    }
    kept.push(row);
  }
  return { clean: kept.join("\n"), manualReceiver: manual };
}

function mergeDescriptionWithManualReceiver(base: string, manualReceiver: string): string | null {
  const cleanBase = base
    .split("\n")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .join("\n");
  const manual = manualReceiver.trim();
  if (!cleanBase && !manual) return null;
  if (!manual) return cleanBase || null;
  return cleanBase ? `${cleanBase}\n${MANUAL_RECEIVER_PREFIX} ${manual}` : `${MANUAL_RECEIVER_PREFIX} ${manual}`;
}

export function EditWarehouseOutboundShipmentMovementModal({
  open,
  warehouseId,
  movementId,
  onClose,
}: Props) {
  const { t, locale } = useI18n();
  const enabled = open && movementId != null && movementId > 0;
  const q = useWarehouseOutboundShipmentMovementForEdit(warehouseId, movementId, enabled);
  const updateM = useUpdateWarehouseOutboundShipmentMovement();

  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [snapshot, setSnapshot] = useState<{
    branchId: number;
    businessDate: string;
    legacyDate: string | null;
    description: string | null;
    checkedByPersonnelId: number;
    approvedByPersonnelId: number;
    receivedByManualMode: boolean;
    receivedByManualName: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setProductId("");
      setQty("");
      setSnapshot(null);
      return;
    }
    const d = q.data;
    if (!d) return;
    setProductId(String(d.productId));
    setQty(String(d.quantity));
    const parsedDescription = stripManualReceiverFromDescription(d.description);
    const manualMode = parsedDescription.manualReceiver.length > 0;
    setSnapshot({
      branchId: d.branchId,
      businessDate: toIsoDateOnly(d.businessDate),
      legacyDate: d.legacyDate ? toIsoDateOnly(d.legacyDate) : null,
      description: parsedDescription.clean || null,
      checkedByPersonnelId: d.checkedByPersonnelId ?? 0,
      approvedByPersonnelId: d.approvedByPersonnelId ?? 0,
      receivedByManualMode: manualMode,
      receivedByManualName: parsedDescription.manualReceiver,
    });
  }, [open, q.data]);

  const onSubmit = async () => {
    const mid = movementId;
    const snap = snapshot;
    if (mid == null || mid <= 0 || snap == null) return;
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
    const s = snap.checkedByPersonnelId;
    const r = snap.approvedByPersonnelId;
    if (!Number.isFinite(s) || s <= 0) {
      notify.error(t("warehouse.transferPersonnelRolesRequired"));
      return;
    }
    if (!snap.receivedByManualMode && (!Number.isFinite(r) || r <= 0)) {
      notify.error(t("warehouse.transferPersonnelRolesRequired"));
      return;
    }
    try {
      await updateM.mutateAsync({
        warehouseId,
        movementId: mid,
        body: {
          branchId: snap.branchId,
          productId: pid,
          quantity: n,
          businessDate: snap.businessDate,
          date: snap.legacyDate?.length === 10 ? snap.legacyDate : null,
          description: mergeDescriptionWithManualReceiver(
            snap.description ?? "",
            snap.receivedByManualMode ? snap.receivedByManualName : ""
          ),
          checkedByPersonnelId: s,
          approvedByPersonnelId: snap.receivedByManualMode ? s : r,
          clearInvoicePhoto: false,
        },
      });
      notify.success(t("warehouse.editOutboundShipmentSaved"));
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  return (
    <Modal
      open={open && enabled}
      onClose={onClose}
      titleId={TITLE_ID}
      title={t("warehouse.editOutboundShipmentTitle")}
      closeButtonLabel={t("common.close")}
      className="w-full max-w-lg"
    >
      {q.isPending ? (
        <p className="mt-4 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : q.isError ? (
        <p className="mt-4 text-sm text-red-600">{toErrorMessage(q.error)}</p>
      ) : q.data && snapshot ? (
        <div className="mt-3 flex flex-col gap-3">
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
              disabled={updateM.isPending}
            />
          </div>
          <Input
            label={t("warehouse.transferQty")}
            labelRequired
            required
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            disabled={updateM.isPending}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={updateM.isPending}
              onClick={() => void onSubmit()}
            >
              {t("warehouse.editOutboundShipmentSave")}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
