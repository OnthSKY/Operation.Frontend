"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addCustomerAccountReceipt,
  type CustomerAccountReceiptKind,
} from "@/modules/order-account-statement/api/customer-accounts-api";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatAmountInputOnBlur, parseLocaleAmount } from "@/shared/lib/locale-amount";
import type { Locale } from "@/i18n/messages";
import { localIsoDate } from "@/shared/lib/local-iso-date";

const KIND_KEYS: { value: CustomerAccountReceiptKind; labelKey: string }[] = [
  { value: "cash", labelKey: "branch.ledgerModalKindCash" },
  { value: "bank_transfer", labelKey: "branch.ledgerModalKindBankTransfer" },
  { value: "check", labelKey: "branch.ledgerModalKindCheck" },
  { value: "promo_discount", labelKey: "branch.ledgerModalKindPromo" },
  { value: "advance_payment", labelKey: "branch.ledgerModalKindAdvance" },
  { value: "other", labelKey: "branch.ledgerModalKindOther" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  counterpartyType: "branch" | "customer";
  counterpartyId: number;
  currency: string;
  locale: Locale;
  t: (key: string) => string;
};

/**
 * Faturaya bağlı olmayan genel cari tahsilatı için modal.
 * NULL linkedOutboundInvoiceId ile customer_account_receipts'e yazar.
 * Faturaya bağlı tahsilat YAPILMAMALI bu modal ile — onun için Faturalar tab içindeki
 * satır bazlı +Tahsilat butonu kullanılır (legacy endpoint + dual-write).
 */
export function BranchGeneralReceiptModal({
  open,
  onClose,
  counterpartyType,
  counterpartyId,
  currency,
  locale,
  t,
}: Props) {
  const qc = useQueryClient();
  const [date, setDate] = useState(localIsoDate());
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<CustomerAccountReceiptKind>("cash");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setDate(localIsoDate());
    setAmount("");
    setKind("cash");
    setNotes("");
  };

  const createMut = useMutation({
    mutationFn: addCustomerAccountReceipt,
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["branchCurrentAccountInvoices", counterpartyId] }),
        qc.invalidateQueries({ queryKey: ["customerAccountBalance", counterpartyType, counterpartyId] }),
      ]);
      notify.success(t("branch.ledgerReceiptCreated"));
      reset();
      onClose();
    },
    onError: (e) => notify.error(toErrorMessage(e)),
  });

  const submit = () => {
    const parsed = parseLocaleAmount(amount, locale);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      notify.error(t("branch.ledgerInvalidAmount"));
      return;
    }
    createMut.mutate({
      counterpartyType,
      counterpartyId,
      receiptDate: date,
      amount: parsed,
      currencyCode: currency,
      receiptKind: kind,
      branchId: counterpartyType === "branch" ? counterpartyId : null,
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!createMut.isPending) onClose();
      }}
      titleId="general-receipt-modal-title"
      title={t("branch.ledgerModalTitle")}
    >
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="text-zinc-700">{t("branch.ledgerModalDate")}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="text-zinc-700">
            {t("branch.ledgerModalAmount")} ({currency})
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={(e) => setAmount(formatAmountInputOnBlur(e.target.value, locale))}
            className="mt-1 h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm tabular-nums"
            placeholder="0,00"
          />
        </label>

        <label className="block text-sm">
          <span className="text-zinc-700">{t("branch.ledgerModalKind")}</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CustomerAccountReceiptKind)}
            className="mt-1 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm"
          >
            {KIND_KEYS.map((k) => (
              <option key={k.value} value={k.value}>
                {t(k.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-zinc-700">{t("branch.ledgerModalNotes")}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px]"
            disabled={createMut.isPending}
            onClick={onClose}
          >
            {t("branch.ledgerModalCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="min-h-[44px]"
            disabled={createMut.isPending}
            onClick={submit}
          >
            {createMut.isPending ? t("common.loading") : t("branch.ledgerModalSave")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
