"use client";

import type { Locale } from "@/i18n/messages";
import {
  formatAmountInputOnBlur,
  formatLocaleAmount,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { useState } from "react";
import {
  updateOutboundInvoiceReceipt,
  type OutboundInvoiceReceiptResponse,
  type UpdateOutboundInvoiceReceiptRequest,
} from "@/modules/order-account-statement/api/outbound-invoices-api";

type ReceiptKind = "cash" | "promo_discount" | "advance_payment" | "other";

type Props = {
  open: boolean;
  onClose: () => void;
  receipt: OutboundInvoiceReceiptResponse | null;
  invoiceDocumentNumber: string;
  invoiceOpenAmount: number;
  currencyCode: string;
  locale: Locale;
  t: (key: string) => string;
  onSaved: () => void;
};

export function EditOutboundInvoiceReceiptModal({
  open,
  onClose,
  receipt,
  invoiceDocumentNumber,
  invoiceOpenAmount,
  currencyCode,
  locale,
  t,
  onSaved,
}: Props) {
  if (!receipt) return null;
  return (
    <EditModalBody
      key={receipt.id}
      open={open}
      onClose={onClose}
      receipt={receipt}
      invoiceDocumentNumber={invoiceDocumentNumber}
      invoiceOpenAmount={invoiceOpenAmount}
      currencyCode={currencyCode}
      locale={locale}
      t={t}
      onSaved={onSaved}
    />
  );
}

function EditModalBody({
  open,
  onClose,
  receipt,
  invoiceDocumentNumber,
  invoiceOpenAmount,
  currencyCode,
  locale,
  t,
  onSaved,
}: Omit<Props, "receipt"> & { receipt: OutboundInvoiceReceiptResponse }) {
  const [receiptDate, setReceiptDate] = useState(receipt.receiptDate);
  const [amount, setAmount] = useState(() =>
    formatAmountInputOnBlur(String(receipt.amount ?? ""), locale as Locale)
  );
  const [kind, setKind] = useState<ReceiptKind>(
    (receipt.receiptKind ?? "cash") as ReceiptKind
  );
  const [notes, setNotes] = useState(receipt.notes ?? "");
  const [saving, setSaving] = useState(false);

  const maxAllowable = invoiceOpenAmount + receipt.amount;

  const kindOpts = [
    { value: "cash", label: t("branch.currentAccountReceiptKindCash") },
    { value: "promo_discount", label: t("branch.currentAccountReceiptKindPromo") },
    { value: "advance_payment", label: t("branch.currentAccountReceiptKindAdvance") },
    { value: "other", label: t("branch.currentAccountReceiptKindOther") },
  ];

  const submit = async () => {
    const parsed = parseLocaleAmount(amount, locale);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error(t("branch.currentAccountInvalidReceiptAmount"));
      return;
    }
    if (receiptDate.length !== 10) {
      notify.error(t("branch.currentAccountReceiptDateInvalid"));
      return;
    }
    if (parsed > maxAllowable + 0.009) {
      notify.error(
        t("branch.currentAccountReceiptOverpay").replace(
          "{amount}",
          formatLocaleAmount(maxAllowable, locale, currencyCode)
        )
      );
      return;
    }
    const payload: UpdateOutboundInvoiceReceiptRequest = {
      receiptDate,
      amount: parsed,
      receiptKind: kind,
      notes: notes.trim() ? notes.trim() : null,
    };
    setSaving(true);
    try {
      await updateOutboundInvoiceReceipt(receipt.outboundInvoiceId, receipt.id, payload);
      notify.success(t("branch.currentAccountReceiptUpdated"));
      onSaved();
      onClose();
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => (saving ? undefined : onClose())}
      titleId="edit-outbound-invoice-receipt-title"
      title={t("branch.currentAccountReceiptUpdateModalTitle")}
      closeButtonLabel={t("common.close")}
      className="max-w-md"
    >
      <div className="space-y-3">
        <p className="text-sm text-zinc-600">
          {invoiceDocumentNumber} ·{" "}
          {t("branch.currentAccountReceiptUpdateMaxAllowable")
            .replace("{amount}", formatLocaleAmount(maxAllowable, locale, currencyCode))}
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            {t("branch.currentAccountReceiptDate")}
          </label>
          <input
            type="date"
            className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            {t("branch.currentAccountReceiptAmount")}
          </label>
          <input
            className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm tabular-nums"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() =>
              setAmount((x) => formatAmountInputOnBlur(x, locale as Locale))
            }
          />
        </div>

        <Select
          label={t("branch.currentAccountReceiptKindLabel")}
          name="edit-receipt-kind"
          options={kindOpts}
          value={kind}
          onChange={(e) => setKind(e.target.value as ReceiptKind)}
          onBlur={() => {}}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            {t("branch.currentAccountReceiptNote")}
          </label>
          <textarea
            className="min-h-20 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="primary" disabled={saving} onClick={() => void submit()}>
            {saving
              ? t("common.loading")
              : t("branch.currentAccountReceiptSaveEdit")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
