"use client";

import { LocalImageFileThumb } from "@/shared/components/LocalImageFileThumb";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Modal } from "@/shared/ui/Modal";
import type { CustomerAccountReceiptKind } from "@/modules/order-account-statement/api/customer-accounts-api";
import { ReceiptKindSelect } from "@/modules/order-account-statement/components/ReceiptKindSelect";

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
  /** Tahsilat türü seçici (opsiyonel — verilmezse modal hiç göstermez, caller hardcoded değer kullanır) */
  receiptKind?: CustomerAccountReceiptKind;
  onReceiptKindChange?: (kind: CustomerAccountReceiptKind) => void;
  receiptKindLabel?: string;
  /** Bu modal fatura-bağlı tahsilat için — promo_discount fatura indirimine taşındığı için
   *  default olarak promo gizlenir; sadece para hareketleri (cash/bank/check/advance/other) seçilebilir. */
  receiptKindAllowed?: CustomerAccountReceiptKind[];
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
    receiptKind,
    onReceiptKindChange,
    receiptKindLabel,
    receiptKindAllowed,
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

  const fieldClass =
    "w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-sm text-zinc-900 outline-none transition-[box-shadow,border-color] placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/80 disabled:bg-zinc-50 disabled:text-zinc-400 sm:text-base";
  const inputHeightClass = "h-11 min-h-[44px] sm:h-12";

  return (
    <Modal
      open={open}
      onClose={() => (saving ? undefined : onClose())}
      titleId={titleId}
      title={title}
      closeButtonLabel={closeButtonLabel}
      className="max-w-md"
    >
      <div className="space-y-4">
        <p className="rounded-xl bg-zinc-50 px-3.5 py-2.5 text-sm font-medium text-zinc-600 ring-1 ring-inset ring-zinc-100">
          {summaryText}
        </p>

        <DateField
          mode="date"
          label={receiptDateLabel}
          value={receiptDate}
          onChange={(e) => onReceiptDateChange(e.target.value)}
        />

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <label htmlFor={`${titleId}-amount`} className="text-sm font-medium text-zinc-700">
              {receiptAmountLabel}
            </label>
            {onFillOpenAmount ? (
              <button
                type="button"
                className="inline-flex min-h-[32px] items-center rounded-lg px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-500"
                onClick={onFillOpenAmount}
              >
                {fillOpenAmountLabel}
              </button>
            ) : null}
          </div>
          <input
            id={`${titleId}-amount`}
            className={`${fieldClass} ${inputHeightClass} text-right font-semibold tabular-nums`}
            inputMode="decimal"
            value={receiptAmount}
            onChange={(e) => onReceiptAmountChange(e.target.value)}
            onBlur={onReceiptAmountBlur}
          />
        </div>

        {receiptKind != null && onReceiptKindChange ? (
          <ReceiptKindSelect
            value={receiptKind}
            onChange={onReceiptKindChange}
            label={receiptKindLabel}
            allowedKinds={receiptKindAllowed}
          />
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor={`${titleId}-note`} className="block text-sm font-medium text-zinc-700">
            {receiptNoteLabel}
          </label>
          <textarea
            id={`${titleId}-note`}
            rows={3}
            className={`${fieldClass} min-h-[5rem] resize-y py-2.5`}
            value={receiptNote}
            onChange={(e) => onReceiptNoteChange(e.target.value)}
          />
        </div>

        {showImageUpload ? (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-700">{receiptImageLabel}</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,.jpg,.jpeg,.png,.webp,.heic,.heif,.avif"
              className="block w-full cursor-pointer rounded-xl border border-zinc-300 bg-white text-sm text-zinc-500 outline-none transition file:mr-3 file:cursor-pointer file:border-0 file:bg-zinc-900 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/80"
              onChange={(e) => onReceiptImageChange(e.target.files?.[0] ?? null)}
            />
            <LocalImageFileThumb
              file={receiptImageFile}
              className="h-20 max-h-20 max-w-[8rem] sm:h-24 sm:max-h-24 sm:max-w-[10rem]"
            />
            {receiptImageFile ? (
              <p className="mt-1 truncate text-xs text-zinc-500">{receiptImageFile.name}</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={saving}
            onClick={onSubmit}
            className="w-full sm:w-auto"
          >
            {saving ? loadingLabel : saveLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
