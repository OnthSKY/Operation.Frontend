"use client";

import { fetchBranchDocumentBlob } from "@/modules/branch/api/branch-documents-api";
import {
  addOutboundInvoiceReceipt,
  fetchOutboundInvoices,
  type OutboundInvoiceResponse,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import { useBranchDocuments } from "@/modules/branch/hooks/useBranchQueries";
import { useI18n } from "@/i18n/context";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatAmountInputOnBlur, formatLocaleAmount, parseLocaleAmount } from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type Props = {
  branchId: number;
  active: boolean;
};

function parseInvoiceIdFromNote(note: string | null | undefined): number | null {
  const raw = String(note ?? "");
  if (!raw) return null;
  const m = raw.match(/(?:^|[;,\s])invoiceId=(\d+)(?:$|[;,\s])/i);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function BranchDetailCurrentAccountTab({ branchId, active }: Props) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();

  const [receiptInvoice, setReceiptInvoice] = useState<OutboundInvoiceResponse | null>(null);
  const [receiptDate, setReceiptDate] = useState(localIsoDate());
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptNote, setReceiptNote] = useState("");
  const [pdfOpeningId, setPdfOpeningId] = useState<number | null>(null);

  const invoicesQuery = useQuery({
    queryKey: ["branchCurrentAccountInvoices", branchId],
    queryFn: fetchOutboundInvoices,
    enabled: active && branchId > 0,
  });
  const docsQuery = useBranchDocuments(branchId, active);

  const rows = useMemo(
    () =>
      (invoicesQuery.data ?? []).filter(
        (x) => x.counterpartyType === "branch" && x.counterpartyId === branchId
      ),
    [invoicesQuery.data, branchId]
  );

  const pdfDocByInvoiceId = useMemo(() => {
    const map = new Map<number, number>();
    for (const doc of docsQuery.data ?? []) {
      if (doc.contentType !== "application/pdf") continue;
      const invoiceId = parseInvoiceIdFromNote(doc.notes);
      if (invoiceId == null || map.has(invoiceId)) continue;
      map.set(invoiceId, doc.id);
    }
    return map;
  }, [docsQuery.data]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.invoiced += Number(r.linesTotal) || 0;
          acc.paid += Number(r.paidTotal) || 0;
          acc.open += Number(r.openAmount) || 0;
          return acc;
        },
        { invoiced: 0, paid: 0, open: 0 }
      ),
    [rows]
  );

  const receiptMut = useMutation({
    mutationFn: async (input: {
      invoiceId: number;
      receiptDate: string;
      amount: number;
      currencyCode: string;
      notes?: string | null;
    }) =>
      addOutboundInvoiceReceipt(input.invoiceId, {
        receiptDate: input.receiptDate,
        amount: input.amount,
        currencyCode: input.currencyCode,
        notes: input.notes ?? null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["branchCurrentAccountInvoices", branchId] });
      notify.success(t("branch.currentAccountReceiptSaved"));
      setReceiptInvoice(null);
      setReceiptDate(localIsoDate());
      setReceiptAmount("");
      setReceiptNote("");
    },
    onError: (e) => notify.error(toErrorMessage(e)),
  });

  const openPdf = async (invoiceId: number) => {
    const documentId = pdfDocByInvoiceId.get(invoiceId);
    if (!documentId) return;
    setPdfOpeningId(invoiceId);
    try {
      const { blob } = await fetchBranchDocumentBlob(branchId, documentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setPdfOpeningId(null);
    }
  };

  const submitReceipt = async () => {
    if (!receiptInvoice) return;
    const amount = parseLocaleAmount(receiptAmount, locale);
    if (!Number.isFinite(amount) || amount <= 0) {
      notify.error(t("branch.currentAccountInvalidReceiptAmount"));
      return;
    }
    await receiptMut.mutateAsync({
      invoiceId: receiptInvoice.id,
      receiptDate,
      amount,
      currencyCode: receiptInvoice.currencyCode,
      notes: receiptNote.trim() || null,
    });
  };

  const isLoading = invoicesQuery.isPending || docsQuery.isPending;
  const isError = invoicesQuery.isError || docsQuery.isError;
  const errorText = invoicesQuery.isError
    ? toErrorMessage(invoicesQuery.error)
    : docsQuery.isError
      ? toErrorMessage(docsQuery.error)
      : null;

  return (
    <div className="w-full min-w-0 space-y-4">
      <p className="text-sm text-zinc-600">{t("branch.currentAccountHint")}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.currentAccountInvoicedTotal")}</div>
          <div className="mt-1 text-lg font-semibold text-zinc-900">
            {formatLocaleAmount(totals.invoiced, locale, "TRY")}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.currentAccountPaidTotal")}</div>
          <div className="mt-1 text-lg font-semibold text-emerald-700">
            {formatLocaleAmount(totals.paid, locale, "TRY")}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3">
          <div className="text-xs text-zinc-500">{t("branch.currentAccountOpenTotal")}</div>
          <div className="mt-1 text-lg font-semibold text-amber-700">
            {formatLocaleAmount(totals.open, locale, "TRY")}
          </div>
        </div>
      </div>

      {isError && errorText ? <p className="text-sm text-red-600">{errorText}</p> : null}
      {isLoading ? <p className="text-sm text-zinc-500">{t("common.loading")}</p> : null}

      {!isLoading && rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{t("branch.currentAccountEmpty")}</p>
      ) : null}

      {!isLoading && rows.length > 0 ? (
        <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white md:block">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left">{t("branch.currentAccountColDate")}</th>
                <th className="px-3 py-2 text-left">{t("branch.currentAccountColInvoiceNo")}</th>
                <th className="px-3 py-2 text-right">{t("branch.currentAccountColInvoiceTotal")}</th>
                <th className="px-3 py-2 text-right">{t("branch.currentAccountColPaid")}</th>
                <th className="px-3 py-2 text-right">{t("branch.currentAccountColOpen")}</th>
                <th className="px-3 py-2 text-center">{t("branch.currentAccountColPdfStatus")}</th>
                <th className="px-3 py-2 text-center">{t("branch.currentAccountColActions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const hasPdf = pdfDocByInvoiceId.has(r.id);
                return (
                  <tr key={r.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2">{formatLocaleDate(r.issueDate, locale)}</td>
                    <td className="px-3 py-2 font-medium text-zinc-900">{r.documentNumber}</td>
                    <td className="px-3 py-2 text-right">
                      {formatLocaleAmount(r.linesTotal, locale, r.currencyCode)}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-700">
                      {formatLocaleAmount(r.paidTotal, locale, r.currencyCode)}
                    </td>
                    <td className="px-3 py-2 text-right text-amber-700">
                      {formatLocaleAmount(r.openAmount, locale, r.currencyCode)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="mb-1 text-xs text-zinc-500">
                        {hasPdf
                          ? t("branch.currentAccountPdfStatusSaved")
                          : t("branch.currentAccountPdfStatusMissing")}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-9 px-2 py-1 text-xs"
                        disabled={!hasPdf || pdfOpeningId === r.id}
                        onClick={() => void openPdf(r.id)}
                      >
                        {!hasPdf
                          ? t("branch.currentAccountPdfMissing")
                          : pdfOpeningId === r.id
                            ? t("common.loading")
                            : t("branch.currentAccountPdfDownload")}
                      </Button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        type="button"
                        variant="primary"
                        className="min-h-9 px-2 py-1 text-xs"
                        disabled={Number(r.openAmount) <= 0}
                        onClick={() => {
                          setReceiptInvoice(r);
                          setReceiptDate(localIsoDate());
                          setReceiptAmount("");
                          setReceiptNote("");
                        }}
                      >
                        {t("branch.currentAccountAddReceipt")}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {!isLoading && rows.length > 0 ? (
        <div className="space-y-3 md:hidden">
          {rows.map((r) => {
            const hasPdf = pdfDocByInvoiceId.has(r.id);
            return (
              <div key={r.id} className="rounded-xl border border-zinc-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-zinc-500">{formatLocaleDate(r.issueDate, locale)}</div>
                    <div className="text-sm font-semibold text-zinc-900">{r.documentNumber}</div>
                  </div>
                  <div
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      hasPdf ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {hasPdf
                      ? t("branch.currentAccountPdfStatusSaved")
                      : t("branch.currentAccountPdfStatusMissing")}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">{t("branch.currentAccountColInvoiceTotal")}</span>
                    <span className="font-medium text-zinc-900">
                      {formatLocaleAmount(r.linesTotal, locale, r.currencyCode)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">{t("branch.currentAccountColPaid")}</span>
                    <span className="font-medium text-emerald-700">
                      {formatLocaleAmount(r.paidTotal, locale, r.currencyCode)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">{t("branch.currentAccountColOpen")}</span>
                    <span className="font-medium text-amber-700">
                      {formatLocaleAmount(r.openAmount, locale, r.currencyCode)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-10 px-2 py-2 text-xs"
                    disabled={!hasPdf || pdfOpeningId === r.id}
                    onClick={() => void openPdf(r.id)}
                  >
                    {!hasPdf
                      ? t("branch.currentAccountPdfMissing")
                      : pdfOpeningId === r.id
                        ? t("common.loading")
                        : t("branch.currentAccountPdfDownload")}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="min-h-10 px-2 py-2 text-xs"
                    disabled={Number(r.openAmount) <= 0}
                    onClick={() => {
                      setReceiptInvoice(r);
                      setReceiptDate(localIsoDate());
                      setReceiptAmount("");
                      setReceiptNote("");
                    }}
                  >
                    {t("branch.currentAccountAddReceipt")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <Modal
        open={receiptInvoice != null}
        onClose={() => setReceiptInvoice(null)}
        title={t("branch.currentAccountReceiptModalTitle")}
        closeButtonLabel={t("common.close")}
        className="max-w-md"
      >
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">
            {receiptInvoice?.documentNumber} -{" "}
            {receiptInvoice
              ? formatLocaleAmount(receiptInvoice.openAmount, locale, receiptInvoice.currencyCode)
              : ""}
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              {t("branch.currentAccountReceiptDate")}
            </label>
            <input
              type="date"
              className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              {t("branch.currentAccountReceiptAmount")}
            </label>
            <input
              className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm"
              inputMode="decimal"
              value={receiptAmount}
              onChange={(e) => setReceiptAmount(e.target.value)}
              onBlur={() => setReceiptAmount((x) => formatAmountInputOnBlur(x, locale))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              {t("branch.currentAccountReceiptNote")}
            </label>
            <textarea
              className="min-h-20 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={receiptNote}
              onChange={(e) => setReceiptNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setReceiptInvoice(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" variant="primary" disabled={receiptMut.isPending} onClick={() => void submitReceipt()}>
              {receiptMut.isPending ? t("common.loading") : t("branch.currentAccountSaveReceipt")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
