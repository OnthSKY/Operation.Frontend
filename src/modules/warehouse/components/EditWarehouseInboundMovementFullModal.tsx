"use client";

import { warehouseMovementInvoicePhotoUrl } from "@/modules/warehouse/api/warehouse-movements-api";
import {
  useSoftDeleteWarehouseInboundMovement,
  useUpdateWarehouseInboundMovement,
  useUploadWarehouseInboundMovementInvoicePhoto,
  useWarehouseInboundMovementForEdit,
  useWarehousePeopleOptions,
  useWarehouseStock,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { useI18n } from "@/i18n/context";
import { LocalImageFileThumb } from "@/shared/components/LocalImageFileThumb";
import { IMAGE_FILE_INPUT_ACCEPT, MAX_IMAGE_UPLOAD_BYTES } from "@/shared/lib/image-upload-limits";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import { useEffect, useMemo, useState } from "react";

const TITLE_ID = "warehouse-edit-inbound-full-title";

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

export function EditWarehouseInboundMovementFullModal({ open, warehouseId, movementId, onClose }: Props) {
  const { t } = useI18n();
  const enabled = open && movementId != null && movementId > 0;
  const q = useWarehouseInboundMovementForEdit(warehouseId, movementId, enabled);
  const { data: stockRows = [] } = useWarehouseStock(enabled ? warehouseId : null, {});
  const { data: peopleRaw = [] } = useWarehousePeopleOptions(enabled);
  const updateM = useUpdateWarehouseInboundMovement();
  const uploadInvoiceM = useUploadWarehouseInboundMovementInvoicePhoto();
  const deleteM = useSoftDeleteWarehouseInboundMovement();

  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [businessDate, setBusinessDate] = useState("");
  const [legacyDate, setLegacyDate] = useState("");
  const [description, setDescription] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [clearInvoice, setClearInvoice] = useState(false);
  const [replacementInvoiceFile, setReplacementInvoiceFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) {
      setProductId("");
      setQty("");
      setBusinessDate("");
      setLegacyDate("");
      setDescription("");
      setCheckedBy("");
      setApprovedBy("");
      setClearInvoice(false);
      setReplacementInvoiceFile(null);
      return;
    }
    const d = q.data;
    if (!d) return;
    setProductId(String(d.productId));
    setQty(String(d.quantity));
    setBusinessDate(toIsoDateOnly(d.businessDate));
    setLegacyDate(d.legacyDate ? toIsoDateOnly(d.legacyDate) : toIsoDateOnly(d.businessDate));
    setDescription(d.description?.trim() ?? "");
    setCheckedBy(d.checkedByPersonnelId != null && d.checkedByPersonnelId > 0 ? String(d.checkedByPersonnelId) : "");
    setApprovedBy(
      d.approvedByPersonnelId != null && d.approvedByPersonnelId > 0 ? String(d.approvedByPersonnelId) : ""
    );
    setClearInvoice(false);
    setReplacementInvoiceFile(null);
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
    const ck = Number(checkedBy);
    const ap = Number(approvedBy);
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
          clearInvoicePhoto: clearInvoice,
        },
      });
      if (!locked && replacementInvoiceFile) {
        if (replacementInvoiceFile.size > MAX_IMAGE_UPLOAD_BYTES) {
          notify.error(t("common.imageUploadTooLarge"));
          return;
        }
        const v = await validateImageFileForUpload(replacementInvoiceFile);
        if (!v.ok) {
          notify.error(v.reason === "size" ? t("common.imageUploadTooLarge") : t("common.imageUploadNotImage"));
          return;
        }
        await uploadInvoiceM.mutateAsync({
          warehouseId,
          movementId: mid,
          file: replacementInvoiceFile,
        });
      }
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
      title={t("warehouse.editInboundFullTitle")}
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
          {locked ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              {t("warehouse.editInboundFullSupplierLock")}
            </p>
          ) : null}
          <Select
            label={t("warehouse.movementProduct")}
            labelRequired
            name="wh-inbound-edit-product"
            options={productOptions}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            onBlur={() => {}}
            disabled={updateM.isPending || uploadInvoiceM.isPending || locked}
          />
          <Input
            label={t("warehouse.qtyLabelDepoIn")}
            labelRequired
            required
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            disabled={updateM.isPending || uploadInvoiceM.isPending || locked}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DateField
              label={t("warehouse.editInboundBusinessDate")}
              labelRequired
              required
              value={businessDate}
              onChange={(e) => setBusinessDate(e.target.value)}
              disabled={updateM.isPending || uploadInvoiceM.isPending || locked}
            />
            <DateField
              label={t("warehouse.editInboundLegacyDate")}
              value={legacyDate}
              onChange={(e) => setLegacyDate(e.target.value)}
              disabled={updateM.isPending || uploadInvoiceM.isPending || locked}
            />
          </div>
          <Input
            label={t("warehouse.movementNote")}
            type="text"
            autoComplete="off"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={updateM.isPending || uploadInvoiceM.isPending}
          />
          {!locked ? (
            <div>
              <label
                htmlFor="wh-inbound-edit-invoice-replace"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                {t("warehouse.editInboundInvoiceUploadLabel")}
              </label>
              <p className="mb-2 text-xs leading-snug text-zinc-500">{t("warehouse.editInboundInvoiceUploadHint")}</p>
              {q.data.hasInvoicePhoto && movementId != null && movementId > 0 ? (
                <p className="mb-2">
                  <a
                    href={warehouseMovementInvoicePhotoUrl(movementId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
                  >
                    {t("warehouse.openInvoicePhoto")}
                  </a>
                </p>
              ) : null}
              <input
                id="wh-inbound-edit-invoice-replace"
                name="wh-inbound-edit-invoice-replace"
                type="file"
                accept={IMAGE_FILE_INPUT_ACCEPT}
                className="block w-full max-w-full min-w-0 text-sm text-zinc-600 file:mr-3 file:max-w-full file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
                disabled={updateM.isPending || uploadInvoiceM.isPending}
                onChange={async (e) => {
                  const input = e.target;
                  const f = input.files?.[0] ?? null;
                  if (!f) {
                    setReplacementInvoiceFile(null);
                    return;
                  }
                  const v = await validateImageFileForUpload(f);
                  if (!v.ok) {
                    input.value = "";
                    setReplacementInvoiceFile(null);
                    notify.error(
                      v.reason === "size"
                        ? t("common.imageUploadTooLarge")
                        : t("common.imageUploadNotImage")
                    );
                    return;
                  }
                  setReplacementInvoiceFile(f);
                }}
              />
              <LocalImageFileThumb file={replacementInvoiceFile} />
            </div>
          ) : null}
          <Select
            label={t("warehouse.checkedByPersonnel")}
            labelRequired
            name="wh-inbound-edit-ck"
            options={personnelSelectOptions}
            value={checkedBy}
            onChange={(e) => setCheckedBy(e.target.value)}
            onBlur={() => {}}
            disabled={updateM.isPending || uploadInvoiceM.isPending}
          />
          <Select
            label={t("warehouse.approvedByPersonnel")}
            labelRequired
            name="wh-inbound-edit-ap"
            options={personnelSelectOptions}
            value={approvedBy}
            onChange={(e) => setApprovedBy(e.target.value)}
            onBlur={() => {}}
            disabled={updateM.isPending || uploadInvoiceM.isPending}
          />
          {q.data.hasInvoicePhoto ? (
            <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300 text-zinc-900"
                checked={clearInvoice}
                disabled={updateM.isPending || uploadInvoiceM.isPending}
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
              disabled={deleteM.isPending || updateM.isPending || uploadInvoiceM.isPending}
              onClick={onDelete}
            >
              {t("warehouse.editInboundFullDeleteAction")}
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                className="min-h-11 w-full sm:w-auto"
                disabled={updateM.isPending || deleteM.isPending || uploadInvoiceM.isPending}
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
