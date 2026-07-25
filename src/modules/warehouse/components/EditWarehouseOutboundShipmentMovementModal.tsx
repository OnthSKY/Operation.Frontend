"use client";

import { CatalogProductWarehouseStockCombobox } from "@/modules/products/components/CatalogProductWarehouseStockCombobox";
import {
  useUpdateWarehouseOutboundShipmentMovement,
  useUploadWarehouseOutboundShipmentMovementInvoicePhoto,
  useWarehouseOutboundShipmentMovementForEdit,
} from "@/modules/warehouse/hooks/useWarehouseQueries";
import { warehouseMovementInvoicePhotoUrl } from "@/modules/warehouse/api/warehouse-movements-api";
import { useI18n } from "@/i18n/context";
import { toErrorMessage } from "@/shared/lib/error-message";
import { resolveLocalizedApiError } from "@/shared/lib/resolve-localized-api-error";
import { useRouter } from "next/navigation";
import { notify } from "@/shared/lib/notify";
import { LocalImageFileThumb } from "@/shared/components/LocalImageFileThumb";
import { IMAGE_FILE_INPUT_ACCEPT } from "@/shared/lib/image-upload-limits";
import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";
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
  const router = useRouter();
  const enabled = open && movementId != null && movementId > 0;
  const q = useWarehouseOutboundShipmentMovementForEdit(warehouseId, movementId, enabled);
  const updateM = useUpdateWarehouseOutboundShipmentMovement();
  const uploadM = useUploadWarehouseOutboundShipmentMovementInvoicePhoto();

  // Onaylı sevkiyat talebinden gelen veya faturası oluşmuş hareket düzenlenemez (backend de reddeder).
  const lockedFromRequest = q.data?.shipmentRequestId != null;
  const lockedInvoiced = q.data?.invoicedOutboundInvoiceId != null;
  const locked = lockedFromRequest || lockedInvoiced;

  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
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
      setPhotoFile(null);
      setRemovePhoto(false);
      return;
    }
    const d = q.data;
    if (!d) return;
    setProductId(String(d.productId));
    setQty(String(d.quantity));
    setPhotoFile(null);
    setRemovePhoto(false);
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
    if (locked) return;
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
          // Yeni görsel seçildiyse mevcut görseli silmeye gerek yok; yükleme onu değiştirir.
          clearInvoicePhoto: removePhoto && photoFile == null,
        },
      });
      if (photoFile) {
        await uploadM.mutateAsync({ warehouseId, movementId: mid, file: photoFile });
      }
      notify.success(t("warehouse.editOutboundShipmentSaved"));
      onClose();
    } catch (e) {
      notify.error(resolveLocalizedApiError(e, t));
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
          {lockedFromRequest ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              {t("warehouse.editOutboundBlockedFromRequest")}
            </div>
          ) : lockedInvoiced ? (
            <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0">
                {t("warehouse.editOutboundBlockedInvoiced").replace(
                  "{no}",
                  q.data.invoicedOutboundInvoiceNo ?? "—"
                )}
              </span>
              <Button
                type="button"
                variant="secondary"
                className="min-h-10 shrink-0 whitespace-nowrap px-3 text-sm"
                onClick={() => {
                  onClose();
                  router.push("/reports/financial/current-accounts");
                }}
              >
                {t("warehouse.editOutboundGoToInvoice")}
              </Button>
            </div>
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
          <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
            <p className="text-xs font-semibold text-zinc-700">{t("warehouse.shipmentPhotoOptional")}</p>
            {q.data.hasInvoicePhoto && !removePhoto && photoFile == null && movementId != null && movementId > 0 ? (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600">
                <a
                  href={warehouseMovementInvoicePhotoUrl(movementId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
                >
                  {t("warehouse.openInvoicePhoto")}
                </a>
                <button
                  type="button"
                  className="font-medium text-red-700 underline decoration-red-300 underline-offset-2 hover:decoration-red-600"
                  disabled={updateM.isPending || uploadM.isPending}
                  onClick={() => setRemovePhoto(true)}
                >
                  {t("warehouse.shipmentPhotoRemove")}
                </button>
              </p>
            ) : null}
            {removePhoto && photoFile == null ? (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-red-700">
                {t("warehouse.shipmentPhotoWillBeRemoved")}
                <button
                  type="button"
                  className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600"
                  disabled={updateM.isPending || uploadM.isPending}
                  onClick={() => setRemovePhoto(false)}
                >
                  {t("common.cancel")}
                </button>
              </p>
            ) : null}
            <input
              id="wh-edit-outbound-photo"
              name="wh-edit-outbound-photo"
              type="file"
              accept={IMAGE_FILE_INPUT_ACCEPT}
              className="mt-2 block w-full max-w-full min-w-0 text-sm text-zinc-600 file:mr-3 file:max-w-full file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
              disabled={updateM.isPending || uploadM.isPending}
              onChange={async (e) => {
                const input = e.target;
                const f = input.files?.[0] ?? null;
                if (!f) {
                  setPhotoFile(null);
                  return;
                }
                const v = await validateImageFileForUpload(f);
                if (!v.ok) {
                  input.value = "";
                  setPhotoFile(null);
                  notify.error(
                    v.reason === "size"
                      ? t("common.imageUploadTooLarge")
                      : t("common.imageUploadNotImage")
                  );
                  return;
                }
                setPhotoFile(f);
                setRemovePhoto(false);
              }}
            />
            <LocalImageFileThumb file={photoFile} />
            <p className="mt-1 text-[0.65rem] leading-snug text-zinc-500">
              {q.data.hasInvoicePhoto
                ? t("warehouse.shipmentPhotoReplaceHint")
                : t("warehouse.shipmentPhotoAddHint")}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="min-h-11 w-full sm:w-auto" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={updateM.isPending || uploadM.isPending || locked}
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
