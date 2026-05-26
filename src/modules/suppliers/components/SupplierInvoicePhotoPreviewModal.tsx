"use client";

import {
  downloadSupplierInvoicePhoto,
  supplierInvoicePhotoUrl,
} from "@/modules/suppliers/api/suppliers-api";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { useState } from "react";

type Props = {
  open: boolean;
  invoiceId: number | null;
  title: string;
  subtitle?: string;
  t: (key: string) => string;
  onClose: () => void;
};

export function SupplierInvoicePhotoPreviewModal({
  open,
  invoiceId,
  title,
  subtitle,
  t,
  onClose,
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const hasTarget = invoiceId != null && invoiceId > 0;
  const photoUrl = hasTarget ? supplierInvoicePhotoUrl(invoiceId) : "";

  const onDownload = async () => {
    if (!hasTarget) return;
    setDownloading(true);
    try {
      await downloadSupplierInvoicePhoto(invoiceId, `supplier-invoice-${invoiceId}.jpg`);
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={open && hasTarget}
      onClose={onClose}
      titleId="supplier-invoice-photo-preview-title"
      title={title}
      description={subtitle}
      closeButtonLabel={t("common.close")}
      className="w-full max-w-3xl"
      nested
    >
      <div className="mt-4 flex flex-col gap-3">
        <p className="text-xs text-zinc-500 sm:text-sm">{t("suppliers.invoicePhotoPreviewHint")}</p>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- authenticated image fetched from API */}
          <img
            src={photoUrl}
            alt={title}
            className="max-h-[65dvh] w-full rounded-lg object-contain"
            loading="lazy"
          />
        </div>
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => {
              if (!hasTarget) return;
              window.open(photoUrl, "_blank", "noopener,noreferrer");
            }}
          >
            {t("suppliers.invoicePhotoPreviewOpenNewTab")}
          </Button>
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            disabled={downloading}
            onClick={() => void onDownload()}
          >
            {downloading ? t("common.loading") : t("suppliers.invoicePhotoPreviewDownload")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
