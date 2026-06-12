"use client";

import { forwardRef } from "react";
import { useI18n } from "@/i18n/context";
import { LocalImageFileThumb } from "@/shared/components/LocalImageFileThumb";
import { IMAGE_FILE_INPUT_ACCEPT } from "@/shared/lib/image-upload-limits";
import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";
import { notify } from "@/shared/lib/notify";

/**
 * OUT giderlerinde makbuz/fatura fotoğrafı yükleme alanı.
 * Görsel + dosya validasyonu içerir; pick state'ini caller tutar (ref'i de).
 *
 * Tedarikçi fatura settle (PAID) zorunlu, diğerlerinde opsiyonel — label `requiredByInvoice` ile değişir.
 */
export type ReceiptPhotoFieldProps = {
  /** PAID supplier invoice satırı: zorunlu — etiket farklı. */
  requiredByInvoice: boolean;
  /** Önizleme için seçili dosya (caller state). */
  pickedFile: File | null;
  /** Dosya seçildiğinde veya boşaltıldığında çağrılır. */
  onPick: (file: File | null) => void;
};

export const ReceiptPhotoField = forwardRef<HTMLInputElement, ReceiptPhotoFieldProps>(
  function ReceiptPhotoField({ requiredByInvoice, pickedFile, onPick }, ref) {
    const { t } = useI18n();
    return (
      <div className="min-w-0 lg:col-span-2">
        <label
          htmlFor="branch-tx-receipt-photo"
          className="mb-1 block text-sm font-medium text-zinc-700"
        >
          {requiredByInvoice
            ? t("branch.receiptPhotoRequiredWhenInvoice")
            : t("branch.receiptPhotoOptional")}
        </label>
        <input
          id="branch-tx-receipt-photo"
          ref={ref}
          name="branch-tx-receipt-photo"
          type="file"
          accept={IMAGE_FILE_INPUT_ACCEPT}
          className="block w-full min-w-0 text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200"
          onChange={async (e) => {
            const input = e.target;
            const f = input.files?.[0] ?? null;
            if (!f) {
              onPick(null);
              return;
            }
            const v = await validateImageFileForUpload(f);
            if (!v.ok) {
              input.value = "";
              onPick(null);
              notify.error(
                v.reason === "size"
                  ? t("common.imageUploadTooLarge")
                  : t("common.imageUploadNotImage")
              );
              return;
            }
            onPick(f);
          }}
        />
        <LocalImageFileThumb file={pickedFile} />
      </div>
    );
  }
);
