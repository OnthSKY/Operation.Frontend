"use client";

import { LocalImageFileThumb } from "@/shared/components/LocalImageFileThumb";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  closeButtonLabel: string;
  summaryText: string;
  receiptDateLabel: string;
  receiptDate: string;
  onReceiptDateChange: (value: string) => void;
  receiptAmountLabel: string;
  receiptAmount: string;
  onReceiptAmountChange: (value: string) => void;
  onReceiptAmountBlur?: () => void;
  fillOpenAmountLabel: string;
  onFillOpenAmount?: () => void;
  receiptNoteLabel: string;
  receiptNote: string;
  onReceiptNoteChange: (value: string) => void;
  showImageUpload?: boolean;
  receiptImageLabel: string;
  receiptImageFile: File | null;
  onReceiptImageChange: (file: File | null) => void;
  cancelLabel: string;
  saveLabel: string;
  loadingLabel: string;
  saving?: boolean;
  onSubmit: () => void;
};

export function CurrentAccountReceiptModal(props: Props) {
  const {
    open,
    onClose,
    titleId,
    title,
    closeButtonLabel,
    summaryText,
    receiptDateLabel,
    receiptDate,
    onReceiptDateChange,
    receiptAmountLabel,
    receiptAmount,
    onReceiptAmountChange,
    onReceiptAmountBlur,
    fillOpenAmountLabel,
    onFillOpenAmount,
    receiptNoteLabel,
    receiptNote,
    onReceiptNoteChange,
    showImageUpload = false,
    receiptImageLabel,
    receiptImageFile,
    onReceiptImageChange,
    cancelLabel,
    saveLabel,
    loadingLabel,
    saving = false,
    onSubmit,
  } = props;

  return (
    <Modal
      open={open}
      onClose={() => (saving ? undefined : onClose())}
      titleId={titleId}
      title={title}
      closeButtonLabel={closeButtonLabel}
      className="max-w-md"
    >
      <div className="space-y-3">
        <p className="text-sm text-zinc-600">{summaryText}</p>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">{receiptDateLabel}</label>
          <input
            type="date"
            className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm"
            value={receiptDate}
            onChange={(e) => onReceiptDateChange(e.target.value)}
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-sm font-medium text-zinc-700">{receiptAmountLabel}</label>
            {onFillOpenAmount ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-[44px] min-w-[44px] px-2 py-1 text-xs"
                onClick={onFillOpenAmount}
              >
                {fillOpenAmountLabel}
              </Button>
            ) : null}
          </div>
          <input
            className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm"
            inputMode="decimal"
            value={receiptAmount}
            onChange={(e) => onReceiptAmountChange(e.target.value)}
            onBlur={onReceiptAmountBlur}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">{receiptNoteLabel}</label>
          <textarea
            className="min-h-20 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={receiptNote}
            onChange={(e) => onReceiptNoteChange(e.target.value)}
          />
        </div>
        {showImageUpload ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">{receiptImageLabel}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,.jpg,.jpeg,.png,.webp,.heic,.heif,.avif"
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              onChange={(e) => onReceiptImageChange(e.target.files?.[0] ?? null)}
            />
            <LocalImageFileThumb
              file={receiptImageFile}
              className="h-20 max-h-20 max-w-[8rem] sm:h-24 sm:max-h-24 sm:max-w-[10rem]"
            />
            {receiptImageFile ? <p className="mt-1 text-xs text-zinc-500">{receiptImageFile.name}</p> : null}
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="primary" disabled={saving} onClick={onSubmit}>
            {saving ? loadingLabel : saveLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
