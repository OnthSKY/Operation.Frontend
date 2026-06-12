import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";

/**
 * Submit zamanı makbuz/fatura fotoğrafı validasyonu.
 *
 * - OUT işlemlerde dosya seçildiyse: boyut/tip validasyonu (image upload limits).
 * - PAID supplier invoice satırı: dosya zorunlu.
 *
 * Saf — `notify` yok. Hata `errorKey` ile döner.
 */
export type SubmitReceiptInput = {
  txType: string;
  /** OUT_OPS_INVOICE veya OUT_OPS + OPS_INVOICE satırı mı? */
  isInvoiceRow: boolean;
  /** Invoice payment status (UNPAID | PAID). */
  invoiceStatusUpper: string;
  /** Form'dan seçilen dosya (input[type=file].files[0]). */
  file: File | null;
};

export type SubmitReceiptResult =
  | { ok: true; file: File | null }
  | { ok: false; errorKey: string };

export async function resolveSubmitReceipt(
  input: SubmitReceiptInput
): Promise<SubmitReceiptResult> {
  const { txType, isInvoiceRow, invoiceStatusUpper, file } = input;

  const receiptFile = txType.toUpperCase() === "OUT" ? file : null;

  if (receiptFile) {
    const v = await validateImageFileForUpload(receiptFile);
    if (!v.ok) {
      return {
        ok: false,
        errorKey:
          v.reason === "size"
            ? "common.imageUploadTooLarge"
            : "common.imageUploadNotImage",
      };
    }
  }

  if (
    isInvoiceRow &&
    invoiceStatusUpper === "PAID" &&
    (!receiptFile || receiptFile.size <= 0)
  ) {
    return { ok: false, errorKey: "branch.invoiceReceiptPhotoRequired" };
  }

  return { ok: true, file: receiptFile };
}
