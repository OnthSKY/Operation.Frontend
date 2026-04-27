"use client";

import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  useSoftDeleteWarehouseOutboundShipmentMovement,
  useUpdateWarehouseOutboundShipmentMovement,
  useWarehouseOutboundShipmentMovementForEdit,
  useWarehousePeopleOptions,
  useWarehouseStock,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { useEffect, useMemo, useState } from "react";

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

function stripManualReceiverFromDescription(input: string | null | undefined): { clean: string; manualReceiver: string } {
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
  const { t } = useI18n();
  const enabled = open && movementId != null && movementId > 0;
  const q = useWarehouseOutboundShipmentMovementForEdit(warehouseId, movementId, enabled);
  const { data: stockRows = [] } = useWarehouseStock(enabled ? warehouseId : null, {});
  const { data: peopleRaw = [] } = useWarehousePeopleOptions(enabled);
  const { data: branches = [] } = useBranchesList();
  const updateM = useUpdateWarehouseOutboundShipmentMovement();
  const deleteM = useSoftDeleteWarehouseOutboundShipmentMovement();

  const [branchId, setBranchId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [businessDate, setBusinessDate] = useState("");
  const [legacyDate, setLegacyDate] = useState("");
  const [description, setDescription] = useState("");
  const [sentBy, setSentBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [receivedByManualMode, setReceivedByManualMode] = useState(false);
  const [receivedByManualName, setReceivedByManualName] = useState("");
  const [clearInvoice, setClearInvoice] = useState(false);

  useEffect(() => {
    if (!open) {
      setBranchId("");
      setProductId("");
      setQty("");
      setBusinessDate("");
      setLegacyDate("");
      setDescription("");
      setSentBy("");
      setReceivedBy("");
      setReceivedByManualMode(false);
      setReceivedByManualName("");
      setClearInvoice(false);
      return;
    }
    const d = q.data;
    if (!d) return;
    setBranchId(String(d.branchId));
    setProductId(String(d.productId));
    setQty(String(d.quantity));
    setBusinessDate(toIsoDateOnly(d.businessDate));
    setLegacyDate(d.legacyDate ? toIsoDateOnly(d.legacyDate) : toIsoDateOnly(d.businessDate));
    const parsedDescription = stripManualReceiverFromDescription(d.description);
    setDescription(parsedDescription.clean);
    setSentBy(d.checkedByPersonnelId != null && d.checkedByPersonnelId > 0 ? String(d.checkedByPersonnelId) : "");
    setReceivedBy(
      d.approvedByPersonnelId != null && d.approvedByPersonnelId > 0 ? String(d.approvedByPersonnelId) : ""
    );
    setReceivedByManualMode(parsedDescription.manualReceiver.length > 0);
    setReceivedByManualName(parsedDescription.manualReceiver);
    setClearInvoice(false);
  }, [open, q.data]);

  const personnelOptions: SelectOption[] = useMemo(
    () =>
      peopleRaw
        .filter((o) => o.personnelId != null && o.personnelId > 0)
        .map((o) => ({ value: String(o.personnelId), label: o.displayName })),
    [peopleRaw]
  );
  const personnelSelectOptions = useMemo(
    () => [{ value: "", label: t("warehouse.personnelPickPlaceholder") }, ...personnelOptions],
    [personnelOptions, t]
  );

  const productOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("warehouse.listQuickPickProduct") },
      ...stockRows.map((r) => {
        const u = r.unit?.trim() ? ` (${r.unit.trim()})` : "";
        const p = r.parentProductName?.trim();
        const label = p && p !== r.productName.trim() ? `${p} › ${r.productName}${u}` : `${r.productName}${u}`;
        return { value: String(r.productId), label };
      }),
    ],
    [stockRows, t]
  );

  const branchOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: t("warehouse.transferPickBranch") },
      ...branches
        .filter((b) => b.id > 0)
        .map((b) => ({ value: String(b.id), label: b.name?.trim() || `#${b.id}` })),
    ],
    [branches, t]
  );

  const onSubmit = async () => {
    const mid = movementId;
    if (mid == null || mid <= 0) return;
    const bid = Number(branchId);
    const pid = Number(productId);
    const n = Number(qty.replace(",", "."));
    if (!Number.isFinite(bid) || bid <= 0) {
      notify.error(t("warehouse.transferPickBranch"));
      return;
    }
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
    const s = Number(sentBy);
    const r = Number(receivedBy);
    if (!Number.isFinite(s) || s <= 0) {
      notify.error(t("warehouse.transferPersonnelRolesRequired"));
      return;
    }
    if (receivedByManualMode) {
      if (!receivedByManualName.trim()) {
        notify.error(t("warehouse.transferManualReceiverRequired"));
        return;
      }
    } else if (!Number.isFinite(r) || r <= 0) {
      notify.error(t("warehouse.transferPersonnelRolesRequired"));
      return;
    }
    try {
      await updateM.mutateAsync({
        warehouseId,
        movementId: mid,
        body: {
          branchId: bid,
          productId: pid,
          quantity: n,
          businessDate,
          date: legacyDate.length === 10 ? legacyDate : null,
          description: mergeDescriptionWithManualReceiver(
            description,
            receivedByManualMode ? receivedByManualName : ""
          ),
          checkedByPersonnelId: s,
          approvedByPersonnelId: receivedByManualMode ? s : r,
          clearInvoicePhoto: clearInvoice,
        },
      });
      notify.success(t("warehouse.editOutboundShipmentSaved"));
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const onDelete = () => {
    const mid = movementId;
    if (mid == null || mid <= 0) return;
    notifyConfirmToast({
      toastId: `wh-outbound-shipment-del-modal-${warehouseId}-${mid}`,
      title: t("warehouse.editOutboundShipmentDeleteTitle"),
      message: <p>{t("warehouse.editOutboundShipmentDeleteBody")}</p>,
      cancelLabel: t("common.cancel"),
      confirmLabel: t("common.delete"),
      onConfirm: async () => {
        try {
          await deleteM.mutateAsync({ warehouseId, movementId: mid });
          notify.success(t("warehouse.editOutboundShipmentDeleted"));
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
      title={t("warehouse.editOutboundShipmentTitle")}
      closeButtonLabel={t("common.close")}
      description={undefined}
      className="w-full max-w-lg"
    >
      {q.isPending ? (
        <p className="mt-4 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : q.isError ? (
        <p className="mt-4 text-sm text-red-600">{toErrorMessage(q.error)}</p>
      ) : q.data ? (
        <div className="mt-3 flex max-h-[min(78dvh,32rem)] flex-col gap-3 overflow-y-auto [-webkit-overflow-scrolling:touch] sm:max-h-none sm:overflow-visible">
          <p className="rounded-lg border border-zinc-200/90 bg-zinc-50/90 px-3 py-2 text-xs text-zinc-700">
            {t("warehouse.editOutboundShipmentAuditHint")}
          </p>
          <Select
            label={t("warehouse.transferBranch")}
            labelRequired
            name="wh-outbound-edit-branch"
            options={branchOptions}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            onBlur={() => {}}
            disabled={updateM.isPending || deleteM.isPending}
          />
          <Select
            label={t("warehouse.movementProduct")}
            labelRequired
            name="wh-outbound-edit-product"
            options={productOptions}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            onBlur={() => {}}
            disabled={updateM.isPending || deleteM.isPending}
          />
          <Input
            label={t("warehouse.transferQty")}
            labelRequired
            required
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            disabled={updateM.isPending || deleteM.isPending}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateField
              label={t("warehouse.editInboundBusinessDate")}
              labelRequired
              required
              value={businessDate}
              onChange={(e) => setBusinessDate(e.target.value)}
              disabled={updateM.isPending || deleteM.isPending}
            />
            <DateField
              label={t("warehouse.editInboundLegacyDate")}
              value={legacyDate}
              onChange={(e) => setLegacyDate(e.target.value)}
              disabled={updateM.isPending || deleteM.isPending}
            />
          </div>
          <Input
            label={t("warehouse.movementNote")}
            type="text"
            autoComplete="off"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={updateM.isPending || deleteM.isPending}
          />
          <Select
            label={t("warehouse.sentByPersonnel")}
            labelRequired
            name="wh-outbound-edit-sent"
            options={personnelSelectOptions}
            value={sentBy}
            onChange={(e) => setSentBy(e.target.value)}
            onBlur={() => {}}
            disabled={updateM.isPending || deleteM.isPending}
          />
          <Select
            label={t("warehouse.receivedByPersonnel")}
            labelRequired
            name="wh-outbound-edit-received"
            options={personnelSelectOptions}
            value={receivedBy}
            onChange={(e) => setReceivedBy(e.target.value)}
            onBlur={() => {}}
            disabled={updateM.isPending || deleteM.isPending || receivedByManualMode}
          />
          <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-zinc-900"
              checked={receivedByManualMode}
              disabled={updateM.isPending || deleteM.isPending}
              onChange={(e) => setReceivedByManualMode(e.target.checked)}
            />
            <span>{t("warehouse.transferManualReceiverToggle")}</span>
          </label>
          {receivedByManualMode ? (
            <Input
              label={t("warehouse.transferManualReceiverName")}
              labelRequired
              required
              type="text"
              autoComplete="off"
              value={receivedByManualName}
              onChange={(e) => setReceivedByManualName(e.target.value)}
              disabled={updateM.isPending || deleteM.isPending}
            />
          ) : null}
          {q.data.hasInvoicePhoto ? (
            <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-zinc-900"
                checked={clearInvoice}
                disabled={updateM.isPending || deleteM.isPending}
                onChange={(e) => setClearInvoice(e.target.checked)}
              />
              <span>{t("warehouse.editInboundFullClearInvoice")}</span>
            </label>
          ) : null}
          <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 sm:flex-row sm:flex-wrap sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full border-red-200 text-red-800 hover:bg-red-50 sm:w-auto"
              disabled={deleteM.isPending || updateM.isPending}
              onClick={onDelete}
            >
              {t("warehouse.editOutboundShipmentDeleteAction")}
            </Button>
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
                {t("warehouse.editOutboundShipmentSave")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
