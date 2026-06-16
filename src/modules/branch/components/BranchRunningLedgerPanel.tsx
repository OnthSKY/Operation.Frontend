"use client";

import {
  addCustomerAccountReceipt,
  deleteCustomerAccountReceipt,
  fetchCustomerAccountBalance,
  type CustomerAccountReceiptKind,
  type CustomerAccountReceiptResponse,
} from "@/modules/order-account-statement/api/customer-accounts-api";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { formatAmountInputOnBlur, formatLocaleAmount, parseLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";

type Props = {
  counterpartyType: "branch" | "customer";
  counterpartyId: number;
  locale: Locale;
  t: (key: string) => string;
  active: boolean;
  canEdit: boolean;
};

const KIND_KEYS: { value: CustomerAccountReceiptKind; labelKey: string }[] = [
  { value: "cash", labelKey: "branch.ledgerModalKindCash" },
  { value: "bank_transfer", labelKey: "branch.ledgerModalKindBankTransfer" },
  { value: "check", labelKey: "branch.ledgerModalKindCheck" },
  { value: "promo_discount", labelKey: "branch.ledgerModalKindPromo" },
  { value: "advance_payment", labelKey: "branch.ledgerModalKindAdvance" },
  { value: "other", labelKey: "branch.ledgerModalKindOther" },
];

function kindBadgeClass(kind: CustomerAccountReceiptKind): string {
  switch (kind) {
    case "promo_discount":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "advance_payment":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "bank_transfer":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "check":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "other":
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
    case "cash":
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

export function BranchRunningLedgerPanel({
  counterpartyType,
  counterpartyId,
  locale,
  t,
  active,
  canEdit,
}: Props) {
  const qc = useQueryClient();
  const queryKey = ["customerAccountBalance", counterpartyType, counterpartyId];

  const balanceQuery = useQuery({
    queryKey,
    queryFn: () => fetchCustomerAccountBalance(counterpartyType, counterpartyId),
    enabled: active && counterpartyId > 0,
    staleTime: 30_000,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [date, setDate] = useState(localIsoDate());
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<CustomerAccountReceiptKind>("cash");
  const [notes, setNotes] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const balance = balanceQuery.data;
  const currency = balance?.currencyCode ?? "TRY";

  const resetForm = () => {
    setDate(localIsoDate());
    setAmount("");
    setKind("cash");
    setNotes("");
  };

  const createMut = useMutation({
    mutationFn: addCustomerAccountReceipt,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey });
      notify.success(t("branch.ledgerReceiptCreated"));
      setModalOpen(false);
      resetForm();
    },
    onError: (e) => notify.error(toErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCustomerAccountReceipt,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey });
      notify.success(t("branch.ledgerReceiptDeleted"));
      setPendingDeleteId(null);
    },
    onError: (e) => notify.error(toErrorMessage(e)),
  });

  const submitReceipt = () => {
    const parsedAmount = parseLocaleAmount(amount, locale);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      notify.error(t("branch.ledgerInvalidAmount"));
      return;
    }
    createMut.mutate({
      counterpartyType,
      counterpartyId,
      receiptDate: date,
      amount: parsedAmount,
      currencyCode: currency,
      receiptKind: kind,
      branchId: counterpartyType === "branch" ? counterpartyId : null,
      notes: notes.trim() || null,
    });
  };

  if (balanceQuery.isPending) {
    return <p className="text-sm text-zinc-500">{t("common.loading")}</p>;
  }
  if (balanceQuery.isError) {
    return <p className="text-sm text-red-600">{toErrorMessage(balanceQuery.error)}</p>;
  }
  if (!balance) return null;

  const receipts = balance.receipts ?? [];
  const sortedReceipts = [...receipts].sort((a, b) => {
    const d = b.receiptDate.localeCompare(a.receiptDate);
    return d !== 0 ? d : b.id - a.id;
  });

  return (
    <div className="w-full min-w-0 space-y-4">
      <p className="text-sm text-zinc-600">{t("branch.ledgerHint")}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.ledgerTotalCharged")}</div>
          <div className="mt-1 text-lg font-semibold text-zinc-900 tabular-nums">
            {formatLocaleAmount(balance.totalCharged, locale, currency)}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.ledgerTotalPaid")}</div>
          <div className="mt-1 text-lg font-semibold text-emerald-700 tabular-nums">
            {formatLocaleAmount(balance.totalPaid, locale, currency)}
          </div>
        </div>
        <div
          className={cn(
            "rounded-xl border p-3",
            balance.openBalance > 0.009
              ? "border-amber-200 bg-amber-50"
              : "border-emerald-200 bg-emerald-50"
          )}
        >
          <div className="text-xs text-zinc-600">{t("branch.ledgerOpenBalance")}</div>
          <div
            className={cn(
              "mt-1 text-lg font-semibold tabular-nums",
              balance.openBalance > 0.009 ? "text-amber-700" : "text-emerald-700"
            )}
          >
            {formatLocaleAmount(balance.openBalance, locale, currency)}
          </div>
        </div>
      </div>

      {canEdit ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            className="min-h-[44px]"
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
          >
            {t("branch.ledgerAddGeneralReceipt")}
          </Button>
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 p-3 text-sm font-semibold text-zinc-900">
          {t("branch.ledgerHistoryTitle")}
        </div>
        {sortedReceipts.length === 0 ? (
          <p className="p-3 text-sm text-zinc-500">{t("branch.ledgerHistoryEmpty")}</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {sortedReceipts.map((r) => (
              <ReceiptRow
                key={r.id}
                receipt={r}
                locale={locale}
                t={t}
                canEdit={canEdit}
                isPendingDelete={pendingDeleteId === r.id}
                isDeleting={deleteMut.isPending && deleteMut.variables === r.id}
                onAskDelete={() => setPendingDeleteId(r.id)}
                onCancelDelete={() => setPendingDeleteId(null)}
                onConfirmDelete={() => deleteMut.mutate(r.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        titleId="ledger-receipt-modal-title"
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
              onClick={() => setModalOpen(false)}
            >
              {t("branch.ledgerModalCancel")}
            </Button>
            <Button
              type="button"
              variant="primary"
              className="min-h-[44px]"
              disabled={createMut.isPending}
              onClick={submitReceipt}
            >
              {createMut.isPending ? t("common.loading") : t("branch.ledgerModalSave")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

type ReceiptRowProps = {
  receipt: CustomerAccountReceiptResponse;
  locale: Locale;
  t: (key: string) => string;
  canEdit: boolean;
  isPendingDelete: boolean;
  isDeleting: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};

function ReceiptRow({
  receipt,
  locale,
  t,
  canEdit,
  isPendingDelete,
  isDeleting,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: ReceiptRowProps) {
  const linkedLabel = receipt.linkedOutboundInvoiceId
    ? t("branch.ledgerReceiptLinkedToInvoice").replace(
        "{id}",
        String(receipt.linkedOutboundInvoiceId)
      )
    : t("branch.ledgerReceiptGeneral");
  const kindLabelKey =
    KIND_KEYS.find((k) => k.value === receipt.receiptKind)?.labelKey ??
    "branch.ledgerModalKindCash";

  return (
    <li className="p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-emerald-700 tabular-nums">
              {formatLocaleAmount(receipt.amount, locale, receipt.currencyCode)}
            </span>
            <span className="text-xs text-zinc-500 tabular-nums">
              {formatLocaleDate(receipt.receiptDate, locale)}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                kindBadgeClass(receipt.receiptKind)
              )}
            >
              {t(kindLabelKey)}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px]",
                receipt.linkedOutboundInvoiceId
                  ? "border-zinc-200 bg-white text-zinc-600"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              )}
            >
              {linkedLabel}
            </span>
          </div>
          {receipt.notes ? (
            <p className="mt-1 break-words text-xs text-zinc-600">{receipt.notes}</p>
          ) : null}
        </div>

        {canEdit ? (
          <div className="flex shrink-0 items-center gap-2">
            {isPendingDelete ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[44px] text-xs"
                  disabled={isDeleting}
                  onClick={onCancelDelete}
                >
                  {t("branch.currentAccountReceiptDeleteCancel")}
                </Button>
                <Button
                  type="button"
                  className="min-h-[44px] bg-red-600 text-xs text-white hover:bg-red-700"
                  disabled={isDeleting}
                  onClick={onConfirmDelete}
                >
                  {isDeleting
                    ? t("common.loading")
                    : t("branch.currentAccountReceiptDeleteConfirm")}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="min-h-[44px] min-w-[44px] p-0 text-red-700 hover:bg-red-50"
                aria-label={t("branch.ledgerReceiptDelete")}
                title={t("branch.ledgerReceiptDelete")}
                onClick={onAskDelete}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}
