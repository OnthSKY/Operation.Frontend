"use client";

import {
  deleteOutboundInvoiceReceipt,
  fetchOutboundInvoiceReceipts,
  type OutboundInvoiceReceiptResponse,
  type OutboundInvoiceResponse,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import { EditOutboundInvoiceReceiptModal } from "@/modules/order-account-statement/components/EditOutboundInvoiceReceiptModal";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  invoices: OutboundInvoiceResponse[];
  branchId: number;
  locale: Locale;
  t: (key: string) => string;
  canEdit: boolean;
  active: boolean;
};

type ReceiptKindLabelKey =
  | "branch.currentAccountReceiptKindCash"
  | "branch.currentAccountReceiptKindPromo"
  | "branch.currentAccountReceiptKindAdvance"
  | "branch.currentAccountReceiptKindOther";

function kindLabelKey(kind: string | null | undefined): ReceiptKindLabelKey {
  switch ((kind ?? "cash").toLowerCase()) {
    case "promo_discount":
      return "branch.currentAccountReceiptKindPromo";
    case "advance_payment":
      return "branch.currentAccountReceiptKindAdvance";
    case "other":
      return "branch.currentAccountReceiptKindOther";
    case "cash":
    default:
      return "branch.currentAccountReceiptKindCash";
  }
}

function kindBadgeClass(kind: string | null | undefined): string {
  switch ((kind ?? "cash").toLowerCase()) {
    case "promo_discount":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "advance_payment":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "other":
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
    case "cash":
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

export function BranchCurrentAccountReceiptsPanel({
  invoices,
  branchId,
  locale,
  t,
  canEdit,
  active,
}: Props) {
  const qc = useQueryClient();
  const [onlyWithReceipts, setOnlyWithReceipts] = useState(true);
  const [search, setSearch] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<{
    receipt: OutboundInvoiceReceiptResponse;
    invoice: OutboundInvoiceResponse;
  } | null>(null);

  const receiptQueries = useQueries({
    queries: invoices.map((inv) => ({
      queryKey: ["outboundInvoiceReceipts", inv.id],
      queryFn: () => fetchOutboundInvoiceReceipts(inv.id),
      enabled: active && invoices.length > 0,
      staleTime: 30_000,
    })),
  });

  const loading = receiptQueries.some((q) => q.isPending);
  const error = receiptQueries.find((q) => q.isError);

  const refetchAll = async () => {
    await qc.invalidateQueries({ queryKey: ["branchCurrentAccountInvoices", branchId] });
    await Promise.all(
      invoices.map((inv) =>
        qc.invalidateQueries({ queryKey: ["outboundInvoiceReceipts", inv.id] })
      )
    );
  };

  const grouped = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return invoices
      .map((inv, idx) => {
        const q = receiptQueries[idx];
        const receipts = (q?.data ?? []) as OutboundInvoiceReceiptResponse[];
        return { invoice: inv, receipts };
      })
      .filter(({ invoice, receipts }) => {
        if (lower) {
          const match = invoice.documentNumber.toLowerCase().includes(lower);
          if (!match) return false;
        }
        if (onlyWithReceipts && receipts.length === 0) return false;
        return true;
      })
      .sort((a, b) => {
        const d = b.invoice.issueDate.localeCompare(a.invoice.issueDate);
        return d !== 0 ? d : b.invoice.id - a.invoice.id;
      });
  }, [invoices, receiptQueries, onlyWithReceipts, search]);

  const totals = useMemo(() => {
    let count = 0;
    let amount = 0;
    let currency: string | undefined;
    let mixedCurrency = false;
    for (const { receipts } of grouped) {
      for (const r of receipts) {
        count += 1;
        amount += Number(r.amount) || 0;
        if (!currency) currency = r.currencyCode;
        else if (currency !== r.currencyCode) mixedCurrency = true;
      }
    }
    return { count, amount, currency: mixedCurrency ? undefined : currency };
  }, [grouped]);

  const confirmDelete = async (
    receipt: OutboundInvoiceReceiptResponse,
    invoice: OutboundInvoiceResponse
  ) => {
    setDeletingId(receipt.id);
    try {
      await deleteOutboundInvoiceReceipt(invoice.id, receipt.id);
      notify.success(t("branch.currentAccountReceiptDeleted"));
      setPendingDeleteId(null);
      await refetchAll();
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      <p className="text-sm text-zinc-600">{t("branch.currentAccountReceiptsHint")}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">
            {t("branch.currentAccountReceiptsTotalCount")}
          </div>
          <div className="mt-1 text-lg font-semibold text-zinc-900 tabular-nums">
            {totals.count}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">
            {t("branch.currentAccountReceiptsTotalAmount")}
          </div>
          <div className="mt-1 text-lg font-semibold text-emerald-700 tabular-nums">
            {totals.currency
              ? formatLocaleAmount(totals.amount, locale, totals.currency)
              : `${formatLocaleAmount(totals.amount, locale, "TRY")} ·`}
            {!totals.currency && totals.count > 0 ? (
              <span className="ml-1 text-xs font-normal text-zinc-500">
                {t("branch.currentAccountReceiptsMixedCurrency")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          inputMode="search"
          placeholder={t("branch.currentAccountReceiptsSearchPlaceholder")}
          className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-sm sm:flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-zinc-900"
            checked={onlyWithReceipts}
            onChange={(e) => setOnlyWithReceipts(e.target.checked)}
          />
          <span className="text-zinc-700">
            {t("branch.currentAccountReceiptsFilterOnlyWithReceipts")}
          </span>
        </label>
      </div>

      {error && !loading ? (
        <p className="text-sm text-red-600">{toErrorMessage(error.error)}</p>
      ) : null}

      {loading && grouped.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : null}

      {!loading && grouped.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {t("branch.currentAccountReceiptsEmpty")}
        </p>
      ) : null}

      <div className="space-y-3">
        {grouped.map(({ invoice, receipts }) => (
          <div
            key={invoice.id}
            className="rounded-xl border border-zinc-200 bg-white"
          >
            <div className="flex flex-col gap-2 border-b border-zinc-100 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-xs text-zinc-500">
                  {formatLocaleDate(invoice.issueDate, locale)}
                </div>
                <div className="text-sm font-semibold text-zinc-900 break-all">
                  {invoice.documentNumber}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 tabular-nums">
                  {t("branch.currentAccountReceiptsInvoiceReceiptCount").replace(
                    "{n}",
                    String(receipts.length)
                  )}
                </span>
                <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600 tabular-nums">
                  {t("branch.currentAccountColInvoiceTotal")}:{" "}
                  {formatLocaleAmount(invoice.linesTotal, locale, invoice.currencyCode)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                    Number(invoice.openAmount) > 0.009
                      ? "border border-amber-200 bg-amber-50 text-amber-700"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  )}
                >
                  {t("branch.currentAccountColOpen")}:{" "}
                  {formatLocaleAmount(invoice.openAmount, locale, invoice.currencyCode)}
                </span>
              </div>
            </div>

            {receipts.length === 0 ? (
              <p className="px-3 py-3 text-sm text-zinc-500">
                {t("branch.currentAccountReceiptsInvoiceEmpty")}
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {receipts
                  .slice()
                  .sort((a, b) => b.receiptDate.localeCompare(a.receiptDate))
                  .map((receipt) => {
                    const isPending = pendingDeleteId === receipt.id;
                    const isDeleting = deletingId === receipt.id;
                    return (
                      <li key={receipt.id} className="p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-zinc-900 tabular-nums">
                                {formatLocaleAmount(
                                  receipt.amount,
                                  locale,
                                  receipt.currencyCode
                                )}
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
                                {t(kindLabelKey(receipt.receiptKind))}
                              </span>
                            </div>
                            {receipt.notes ? (
                              <p className="mt-1 break-words text-xs text-zinc-600">
                                {receipt.notes}
                              </p>
                            ) : null}
                          </div>

                          {canEdit ? (
                            <div className="flex shrink-0 items-center gap-2">
                              {isPending ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-zinc-600">
                                    {t("branch.currentAccountReceiptDeleteAsk")}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="min-h-[44px] min-w-[44px] text-xs"
                                    disabled={isDeleting}
                                    onClick={() => setPendingDeleteId(null)}
                                  >
                                    {t("branch.currentAccountReceiptDeleteCancel")}
                                  </Button>
                                  <Button
                                    type="button"
                                    className="min-h-[44px] min-w-[44px] bg-red-600 text-xs text-white hover:bg-red-700"
                                    disabled={isDeleting}
                                    onClick={() => void confirmDelete(receipt, invoice)}
                                  >
                                    {isDeleting
                                      ? t("common.loading")
                                      : t("branch.currentAccountReceiptDeleteConfirm")}
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="min-h-[44px] min-w-[44px] p-0"
                                    aria-label={t("branch.currentAccountReceiptEdit")}
                                    title={t("branch.currentAccountReceiptEdit")}
                                    onClick={() =>
                                      setEditTarget({ receipt, invoice })
                                    }
                                  >
                                    <Pencil className="h-4 w-4" aria-hidden />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    className="min-h-[44px] min-w-[44px] p-0 text-red-700 hover:bg-red-50"
                                    aria-label={t("branch.currentAccountReceiptDelete")}
                                    title={t("branch.currentAccountReceiptDelete")}
                                    onClick={() => setPendingDeleteId(receipt.id)}
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden />
                                  </Button>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        ))}
      </div>

      <EditOutboundInvoiceReceiptModal
        open={editTarget != null}
        onClose={() => setEditTarget(null)}
        receipt={editTarget?.receipt ?? null}
        invoiceDocumentNumber={editTarget?.invoice.documentNumber ?? ""}
        invoiceOpenAmount={Number(editTarget?.invoice.openAmount ?? 0)}
        currencyCode={editTarget?.invoice.currencyCode ?? "TRY"}
        locale={locale}
        t={t}
        onSaved={() => {
          void refetchAll();
        }}
      />
    </div>
  );
}
