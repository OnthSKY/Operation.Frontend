"use client";

import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { VEHICLE_DOCUMENT_KIND_OPTIONS } from "@/modules/vehicles/lib/vehicle-document-kinds";
import type { VehicleDocumentFormState } from "@/modules/vehicles/hooks/useVehicleDocumentForm";
import type { VehicleDocumentKind } from "@/types/vehicle-document";
import type { FocusEventHandler } from "react";

const NOOP_BLUR: FocusEventHandler<HTMLInputElement> = () => {};

/**
 * Araç dokümanı yükleme sheet'i:
 *  - Tür seçimi + dosya picker + önizleme (image/pdf/other) + notlar.
 *  - State + mutation `useVehicleDocumentForm`'dan.
 *  - Kapatınca dosya + hata mesajı temizlenir.
 */
export function VehicleDocumentUploadSheet({
  state,
  t,
}: {
  state: VehicleDocumentFormState;
  t: (k: string) => string;
}) {
  return (
    <Modal
      open={state.formOpen}
      onClose={() => {
        state.setFormOpen(false);
        state.setFile(null);
        state.setFormError(null);
      }}
      titleId="vehicle-doc-upload-title"
      title={t("vehicles.vehicleDocumentsUploadTitle")}
      closeButtonLabel={t("common.close")}
      nested
      className="max-w-lg"
    >
      <div className="space-y-3 p-1">
        <Select
          name="vehicleDocumentKind"
          label={t("vehicles.vehicleDocumentsKindLabel")}
          value={state.kind}
          onChange={(e) => state.setKind(e.target.value as VehicleDocumentKind)}
          onBlur={NOOP_BLUR}
          options={VEHICLE_DOCUMENT_KIND_OPTIONS.map((o) => ({
            value: o.value,
            label: t(o.labelKey),
          }))}
          menuZIndex={320}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            {t("vehicles.vehicleDocumentsFileLabel")}
          </label>
          <label
            htmlFor="vehicle-doc-file-input"
            className="flex min-h-24 cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-center text-sm text-zinc-600 transition-colors hover:border-zinc-500 hover:bg-zinc-100"
          >
            {state.file
              ? state.file.name
              : t("vehicles.vehicleDocumentsFileLabel")}
          </label>
          <input
            id="vehicle-doc-file-input"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
            className="sr-only"
            onChange={(e) => state.setFile(e.target.files?.[0] ?? null)}
          />
          {state.file ? (
            <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-2">
              {state.previewMode === "image" && state.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob URL from file input
                <img
                  src={state.previewUrl}
                  alt={state.file.name}
                  className="h-40 w-full rounded-lg object-cover"
                />
              ) : state.previewMode === "pdf" && state.previewUrl ? (
                <iframe
                  src={state.previewUrl}
                  title={state.file.name}
                  className="h-48 w-full rounded-lg border border-zinc-200"
                />
              ) : (
                <div className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
                  {state.file.name}
                </div>
              )}
              <div className="mt-2 text-xs text-zinc-500">
                {(state.file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            {t("vehicles.vehicleDocumentsNotesLabel")}
          </label>
          <textarea
            className="min-h-[72px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            value={state.notes}
            onChange={(e) => state.setNotes(e.target.value)}
            maxLength={500}
            placeholder={t("vehicles.vehicleDocumentsNotesPlaceholder")}
          />
        </div>
        {state.formError ? (
          <p className="text-sm text-red-600">{state.formError}</p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => state.setFormOpen(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={state.uploadBusy}
            onClick={() => void state.submitUpload()}
          >
            {state.uploadBusy
              ? t("common.loading")
              : t("vehicles.vehicleDocumentsUploadSubmit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Doküman silme onay modal'ı. Tek bir state hook'una bağlı.
 */
export function VehicleDocumentDeleteModal({
  state,
  t,
}: {
  state: VehicleDocumentFormState;
  t: (k: string) => string;
}) {
  return (
    <Modal
      open={state.deleteId != null}
      onClose={() => state.setDeleteId(null)}
      titleId="vehicle-doc-delete-title"
      title={t("vehicles.vehicleDocumentsDeleteTitle")}
      closeButtonLabel={t("common.close")}
      nested
      className="max-w-md"
    >
      <p className="text-sm text-zinc-600">
        {t("vehicles.vehicleDocumentsDeleteConfirm")}
      </p>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => state.setDeleteId(null)}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          className="bg-red-600 hover:bg-red-700"
          disabled={state.deleteBusy}
          onClick={() => void state.confirmDelete()}
        >
          {state.deleteBusy ? t("common.loading") : t("common.delete")}
        </Button>
      </div>
    </Modal>
  );
}
