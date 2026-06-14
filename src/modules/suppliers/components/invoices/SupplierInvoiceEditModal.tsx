"use client";

import { useI18n } from "@/i18n/context";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Switch } from "@/shared/ui/Switch";
import { SupplierInvoicePhotoField } from "@/modules/suppliers/components/SupplierInvoicePhotoField";
import type { SupplierInvoiceDetail } from "@/modules/suppliers/api/suppliers-api";

export type EditInvFormErrors = Partial<{ documentDate: string }>;

/**
 * Mevcut tedarikçi faturasını düzenleme modal'ı.
 */
type Props = {
  open: boolean;
  onClose: () => void;
  invoice: SupplierInvoiceDetail | null;

  docNo: string;
  setDocNo: (v: string) => void;
  docDate: string;
  setDocDate: (v: string) => void;
  due: string;
  setDue: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
  paymentMarked: boolean;
  setPaymentMarked: (v: boolean) => void;
  formalIssued: boolean;
  setFormalIssued: (v: boolean) => void;
  changeNote: string;
  setChangeNote: (v: string) => void;

  fieldErrors: EditInvFormErrors;
  setFieldErrors: (e: EditInvFormErrors) => void;

  photoFile: File | null;
  setPhotoFile: (f: File | null) => void;
  photoClear: boolean;
  setPhotoClear: (v: boolean) => void;

  saving: boolean;
  uploadingPhoto: boolean;
  deletingPhoto: boolean;
  onPreviewCurrent: (inv: SupplierInvoiceDetail) => void;
  onSave: () => void;
};

export function SupplierInvoiceEditModal(p: Props) {
  const { t } = useI18n();
  const invoice = p.invoice;
  const busyAny = p.saving || p.uploadingPhoto || p.deletingPhoto;
  return (
    <Modal
      open={p.open}
      onClose={() => {
        p.setFieldErrors({});
        p.onClose();
      }}
      titleId="inv-edit-title"
      title={t("suppliers.invoiceEdit")}
      wide
      wideFixedHeight
      nested
      closeButtonLabel={t("common.close")}
    >
      {invoice ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-0 sm:px-5 sm:pb-4">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
            <div className="flex min-w-0 flex-col gap-3 pr-0.5 pt-1">
              <p className="text-xs leading-snug text-zinc-500">{t("suppliers.invoiceEditHint")}</p>
              {p.fieldErrors.documentDate ? (
                <div
                  className="rounded-xl border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 shadow-sm"
                  role="alert"
                >
                  {t("common.formFillRequiredSummary")}
                </div>
              ) : null}
              <p className="text-sm font-semibold text-zinc-900">{invoice.supplierName}</p>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label={t("suppliers.documentNumber")}
                  value={p.docNo}
                  onChange={(e) => p.setDocNo(e.target.value)}
                />
                <DateField
                  label={t("suppliers.documentDate")}
                  labelRequired
                  value={p.docDate}
                  onChange={(e) => p.setDocDate(e.target.value)}
                  error={p.fieldErrors.documentDate}
                />
                <DateField
                  label={t("suppliers.dueDate")}
                  value={p.due}
                  onChange={(e) => p.setDue(e.target.value)}
                />
                <Input
                  label={t("suppliers.currency")}
                  value={invoice.currencyCode}
                  readOnly
                  className="bg-zinc-50"
                  onChange={() => {}}
                />
              </div>
              <Input
                label={t("suppliers.description")}
                value={p.desc}
                onChange={(e) => p.setDesc(e.target.value)}
              />
              <div className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 sm:grid-cols-2 sm:p-4">
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5">
                  <p className="text-sm font-semibold text-zinc-800">
                    {t("suppliers.invoicePaymentMarked")}
                  </p>
                  <Switch checked={p.paymentMarked} onCheckedChange={p.setPaymentMarked} />
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-zinc-200/80 bg-white px-3 py-2.5">
                  <p className="text-sm font-semibold text-zinc-800">
                    {t("suppliers.invoiceFormalIssued")}
                  </p>
                  <Switch checked={p.formalIssued} onCheckedChange={p.setFormalIssued} />
                </div>
              </div>
              <SupplierInvoicePhotoField
                invoiceId={invoice.id}
                hasInvoicePhoto={Boolean(invoice.hasInvoicePhoto)}
                file={p.photoFile}
                clearRequested={p.photoClear}
                busy={busyAny}
                onFileChange={(f) => {
                  p.setPhotoFile(f);
                  if (f) p.setPhotoClear(false);
                }}
                onClearRequest={() => {
                  p.setPhotoClear(true);
                  p.setPhotoFile(null);
                }}
                onUndoClear={() => p.setPhotoClear(false)}
                onPreviewCurrent={() => p.onPreviewCurrent(invoice)}
                t={t}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700" htmlFor="inv-edit-note">
                  {t("suppliers.invoiceEditNote")}
                </label>
                <textarea
                  id="inv-edit-note"
                  className="min-h-20 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900 focus:border-zinc-900 focus:ring-2"
                  value={p.changeNote}
                  onChange={(e) => p.setChangeNote(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-zinc-500">{t("suppliers.invoiceEditNoteHint")}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2.5">
                <p className="text-xs font-semibold text-zinc-800">
                  {t("suppliers.invoiceEditFlowTitle")}
                </p>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-zinc-600">
                  <li>{t("suppliers.invoiceEditFlowStep1")}</li>
                  <li>{t("suppliers.invoiceEditFlowStep2")}</li>
                  <li>{t("suppliers.invoiceEditFlowStep3")}</li>
                </ol>
              </div>
            </div>
          </div>
          <div className="mt-2 flex shrink-0 flex-col gap-2 border-t border-zinc-100 bg-white pt-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full sm:min-h-9 sm:w-auto"
              onClick={() => {
                p.setFieldErrors({});
                p.onClose();
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full sm:min-h-9 sm:w-auto"
              onClick={p.onSave}
              disabled={p.saving}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
