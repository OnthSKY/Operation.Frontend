"use client";

import { useSupplierInvoicePhotoBlob } from "@/modules/suppliers/components/useSupplierInvoicePhoto";
import { IMAGE_FILE_INPUT_ACCEPT } from "@/shared/lib/image-upload-limits";
import { LocalImageFileThumb } from "@/shared/components/LocalImageFileThumb";
import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { useId } from "react";

type Props = {
  /** Existing invoice id whose photo can be fetched/cleared. Null in "create" mode. */
  invoiceId: number | null;
  /** Server says this invoice currently has a stored photo. */
  hasInvoicePhoto: boolean;
  /** Local pending file (newly picked, not yet uploaded). */
  file: File | null;
  /** User chose to clear the existing photo at next save. */
  clearRequested: boolean;
  /** Photo upload / delete is in flight. */
  busy?: boolean;
  onFileChange: (file: File | null) => void;
  onClearRequest: () => void;
  onUndoClear?: () => void;
  /** Optional click handler used to open a larger preview. */
  onPreviewCurrent?: () => void;
  t: (key: string) => string;
};

export function SupplierInvoicePhotoField({
  invoiceId,
  hasInvoicePhoto,
  file,
  clearRequested,
  busy,
  onFileChange,
  onClearRequest,
  onUndoClear,
  onPreviewCurrent,
  t,
}: Props) {
  const inputId = useId();
  const showCurrent = invoiceId != null && invoiceId > 0 && hasInvoicePhoto && !clearRequested && !file;
  const { objectUrl, loading } = useSupplierInvoicePhotoBlob(invoiceId, showCurrent);

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 sm:p-4">
      <p className="text-sm font-semibold text-zinc-800">{t("suppliers.invoicePhotoSectionTitle")}</p>
      <p className="mt-1 text-xs text-zinc-500">{t("suppliers.invoicePhotoSectionHint")}</p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {file ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                {t("suppliers.invoicePhotoNew")}
              </p>
              <LocalImageFileThumb file={file} />
            </div>
          ) : showCurrent ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                {t("suppliers.invoicePhotoCurrent")}
              </p>
              <div className="mt-2 inline-block overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 shadow-sm">
                {loading ? (
                  <div className="flex h-28 w-44 items-center justify-center text-xs text-zinc-500">
                    {t("common.loading")}
                  </div>
                ) : objectUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- blob URL from authenticated fetch
                  <img
                    src={objectUrl}
                    alt=""
                    className="h-28 w-44 cursor-pointer object-cover object-center"
                    onClick={() => onPreviewCurrent?.()}
                  />
                ) : (
                  <div className="flex h-28 w-44 items-center justify-center text-xs text-zinc-500">
                    {t("suppliers.invoicePhotoNoneTitle")}
                  </div>
                )}
              </div>
            </div>
          ) : clearRequested ? (
            <p className="text-xs italic text-red-700">{t("suppliers.invoicePhotoRemove")}</p>
          ) : (
            <p className="text-xs text-zinc-500">{t("suppliers.invoicePhotoNoneTitle")}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[12rem] sm:items-stretch">
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-zinc-700"
          >
            {file || showCurrent ? t("suppliers.invoicePhotoReplace") : t("suppliers.invoicePhotoSelect")}
          </label>
          <input
            id={inputId}
            type="file"
            accept={IMAGE_FILE_INPUT_ACCEPT}
            disabled={busy}
            className="block w-full max-w-full min-w-0 text-sm text-zinc-600 file:mr-3 file:max-w-full file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
            onChange={async (e) => {
              const input = e.target;
              const f = input.files?.[0] ?? null;
              if (!f) {
                onFileChange(null);
                return;
              }
              const v = await validateImageFileForUpload(f);
              if (!v.ok) {
                input.value = "";
                onFileChange(null);
                notify.error(
                  v.reason === "size"
                    ? t("common.imageUploadTooLarge")
                    : t("common.imageUploadNotImage")
                );
                return;
              }
              onFileChange(f);
            }}
          />
          {file ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-9 w-full"
              disabled={busy}
              onClick={() => onFileChange(null)}
            >
              {t("common.cancel")}
            </Button>
          ) : null}
          {showCurrent ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-9 w-full text-red-700"
              disabled={busy}
              onClick={onClearRequest}
            >
              {t("suppliers.invoicePhotoRemove")}
            </Button>
          ) : null}
          {clearRequested && onUndoClear ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-9 w-full"
              disabled={busy}
              onClick={onUndoClear}
            >
              {t("common.cancel")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
