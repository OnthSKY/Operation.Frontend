"use client";

import { fetchBranchDocumentBlob } from "@/modules/branch/api/branch-documents-api";
import {
  addOutboundInvoiceReceipt,
  fetchOutboundInvoices,
  fetchOutboundInvoiceReceipts,
  type OutboundInvoiceResponse,
} from "@/modules/order-account-statement/api/outbound-invoices-api";
import {
  companyBrandingLogoUrl,
  fetchSystemBranding,
} from "@/modules/admin/api/system-branding-api";
import { downloadCounterpartyInvoiceStylePdf } from "@/modules/order-account-statement/lib/download-counterparty-invoice-style-pdf";
import { useBranchDocuments, useUploadBranchDocument } from "@/modules/branch/hooks/useBranchQueries";
import { useI18n } from "@/i18n/context";
import { apiFetch } from "@/shared/api/client";
import { LocalImageFileThumb } from "@/shared/components/LocalImageFileThumb";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatAmountInputOnBlur, formatLocaleAmount, parseLocaleAmount } from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import { validateImageFileForUpload } from "@/shared/lib/validate-image-upload";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleOff, Download, Eye } from "lucide-react";
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
  const [receiptTransferImage, setReceiptTransferImage] = useState<File | null>(null);
  const [pdfOpeningId, setPdfOpeningId] = useState<number | null>(null);
  const [transferOpeningId, setTransferOpeningId] = useState<number | null>(null);
  const [receiptSaving, setReceiptSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const uploadBranchDocumentMut = useUploadBranchDocument(branchId);

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

  const transferDocByInvoiceId = useMemo(() => {
    const map = new Map<number, number>();
    const docs = docsQuery.data ?? [];
    const sorted = [...docs].sort((a, b) => {
      const aTs = Date.parse(a.createdAt ?? "") || 0;
      const bTs = Date.parse(b.createdAt ?? "") || 0;
      return bTs - aTs;
    });
    for (const doc of sorted) {
      if (!doc.contentType.startsWith("image/")) continue;
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

  const openPdf = async (invoiceId: number, mode: "view" | "download") => {
    const documentId = pdfDocByInvoiceId.get(invoiceId);
    if (!documentId) return;
    setPdfOpeningId(invoiceId);
    try {
      const { blob } = await fetchBranchDocumentBlob(branchId, documentId);
      const url = URL.createObjectURL(blob);
      if (mode === "view") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${invoiceId}.pdf`;
        a.rel = "noopener";
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 1_500);
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
    if (receiptTransferImage) {
      const v = await validateImageFileForUpload(receiptTransferImage);
      if (!v.ok) {
        notify.error(
          v.reason === "size"
            ? t("common.imageUploadTooLarge")
            : t("common.imageUploadNotImage")
        );
        return;
      }
    }
    const currencyCode = receiptInvoice.currencyCode;
    const openRows = rows
      .filter(
        (r) =>
          r.currencyCode === currencyCode &&
          Number.isFinite(Number(r.openAmount)) &&
          Number(r.openAmount) > 0.009
      )
      .sort((a, b) => {
        const d = a.issueDate.localeCompare(b.issueDate);
        return d !== 0 ? d : a.id - b.id;
      });
    if (openRows.length === 0) {
      notify.error(t("branch.currentAccountNoOpenInvoicesForAllocation"));
      return;
    }
    const prioritized = [
      ...openRows.filter((r) => r.id === receiptInvoice.id),
      ...openRows.filter((r) => r.id !== receiptInvoice.id),
    ];
    let remaining = amount;
    let appliedTotal = 0;
    let appliedCount = 0;
    setReceiptSaving(true);
    try {
      for (const r of prioritized) {
        if (remaining <= 0.009) break;
        const open = Number(r.openAmount) || 0;
        if (open <= 0.009) continue;
        const apply = Math.min(remaining, open);
        await addOutboundInvoiceReceipt(r.id, {
          receiptDate,
          amount: apply,
          currencyCode,
          notes: receiptNote.trim() || null,
        });
        if (receiptTransferImage) {
          await uploadBranchDocumentMut.mutateAsync({
            file: receiptTransferImage,
            kind: "OTHER",
            notes: `title=banka_dekontu · source=current_account_receipt · invoiceId=${r.id} · receiptDate=${receiptDate}`,
          });
        }
        appliedTotal += apply;
        appliedCount += 1;
        remaining -= apply;
      }
      await qc.invalidateQueries({ queryKey: ["branchCurrentAccountInvoices", branchId] });
      notify.success(
        t("branch.currentAccountReceiptDistributedSaved")
          .replace("{n}", String(appliedCount))
          .replace("{amount}", formatLocaleAmount(appliedTotal, locale, currencyCode))
      );
      if (remaining > 0.009) {
        notify.info(
          t("branch.currentAccountReceiptUnappliedRemainder").replace(
            "{amount}",
            formatLocaleAmount(remaining, locale, currencyCode)
          )
        );
      }
      setReceiptInvoice(null);
      setReceiptDate(localIsoDate());
      setReceiptAmount("");
      setReceiptNote("");
      setReceiptTransferImage(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setReceiptSaving(false);
    }
  };

  const exportCurrentAccountPdf = async () => {
    if (rows.length === 0) return;
    setExportingPdf(true);
    try {
      const branding = await fetchSystemBranding().catch(() => null);
      const companyName = branding?.companyName?.trim() || "—";
      let logoDataUrl = "";
      if (branding?.hasLogo) {
        try {
          const res = await apiFetch(companyBrandingLogoUrl(branding.updatedAtUtc));
          if (res.ok) {
            const blob = await res.blob();
            logoDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
              reader.onerror = () => reject(reader.error ?? new Error("logo-read-failed"));
              reader.readAsDataURL(blob);
            });
          }
        } catch {
          logoDataUrl = "";
        }
      }

      const pdfRows = await Promise.all(
        rows.map(async (invoice) => {
          const receipts = await fetchOutboundInvoiceReceipts(invoice.id);
          const paymentDate = receipts.length > 0 ? receipts[0]?.receiptDate ?? null : null;
          return {
            counterpartyName: invoice.counterpartyName,
            counterpartyTypeLabel: t("reports.counterpartySummaryTypeBranch"),
            documentNumber: invoice.documentNumber,
            issueDate: formatLocaleDate(invoice.issueDate, locale),
            invoiceAmount: formatLocaleAmount(invoice.linesTotal, locale, invoice.currencyCode),
            paidAmount: formatLocaleAmount(invoice.paidTotal, locale, invoice.currencyCode),
            openAmount: formatLocaleAmount(invoice.openAmount, locale, invoice.currencyCode),
            paymentDate: paymentDate ? formatLocaleDate(paymentDate, locale) : "—",
          };
        })
      );

      await downloadCounterpartyInvoiceStylePdf(pdfRows, {
        companyName,
        branchName: rows[0]?.counterpartyName?.trim() || `#${branchId}`,
        logoDataUrl,
        title: t("branch.currentAccountPdfDocumentTitle"),
        issuedAtLabel: `${t("branch.currentAccountPdfGeneratedAt")}: ${new Date().toLocaleDateString(locale)}`,
        filtersLabel: `${t("branch.currentAccountPdfScope")}: ${t("branch.currentAccountPdfScopeBranchOnly")}`,
        totalsLabel: `${t("branch.currentAccountPdfTotals")}: ${formatLocaleAmount(totals.invoiced, locale, "TRY")} / ${formatLocaleAmount(totals.paid, locale, "TRY")} / ${formatLocaleAmount(totals.open, locale, "TRY")}`,
        fileName: `sube_cari_hesap_${branchId}_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setExportingPdf(false);
    }
  };

  const openTransferImage = async (invoiceId: number, mode: "view" | "download") => {
    const documentId = transferDocByInvoiceId.get(invoiceId);
    if (!documentId) return;
    setTransferOpeningId(invoiceId);
    try {
      const { blob, contentType } = await fetchBranchDocumentBlob(branchId, documentId);
      const url = URL.createObjectURL(blob);
      if (mode === "view") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = url;
        const ext =
          contentType.includes("png")
            ? "png"
            : contentType.includes("webp")
              ? "webp"
              : "jpg";
        a.download = `receipt-transfer-${invoiceId}.${ext}`;
        a.rel = "noopener";
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 1_500);
    } catch (e) {
      notify.error(toErrorMessage(e));
    } finally {
      setTransferOpeningId(null);
    }
  };

  const isLoading = invoicesQuery.isPending || docsQuery.isPending;
  const isError = invoicesQuery.isError || docsQuery.isError;
  const errorText = invoicesQuery.isError
    ? toErrorMessage(invoicesQuery.error)
    : docsQuery.isError
      ? toErrorMessage(docsQuery.error)
      : null;

  const renderPdfIconButton = (opts: {
    hasPdf: boolean;
    action: "view" | "download";
    invoiceId: number;
    compact?: boolean;
  }) => {
    const { hasPdf, action, invoiceId, compact } = opts;
    const loading = pdfOpeningId === invoiceId;
    const baseClass = compact
      ? "min-h-[44px] h-11 w-11 min-w-0 p-0"
      : "min-h-[44px] h-11 w-11 min-w-0 p-0";
    const labelKey =
      action === "view" ? "branch.currentAccountPdfView" : "branch.currentAccountPdfDownload";
    const Icon = !hasPdf ? CircleOff : action === "view" ? Eye : Download;
    return (
      <Button
        type="button"
        variant="secondary"
        className={baseClass}
        title={!hasPdf ? t("branch.currentAccountPdfMissing") : t(labelKey)}
        aria-label={!hasPdf ? t("branch.currentAccountPdfMissing") : t(labelKey)}
        disabled={!hasPdf || loading}
        onClick={() => {
          if (!hasPdf) return;
          void openPdf(invoiceId, action);
        }}
      >
        {loading ? (
          <span className="text-[10px] font-medium">{t("common.loading")}</span>
        ) : (
          <Icon className="h-4 w-4" aria-hidden />
        )}
      </Button>
    );
  };

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
      <div className="flex justify-end">
        <Button
          type="button"
          variant="secondary"
          className="min-h-[44px]"
          onClick={() => void exportCurrentAccountPdf()}
          disabled={isLoading || rows.length === 0 || exportingPdf}
        >
          {exportingPdf ? t("common.loading") : t("branch.currentAccountExportPdf")}
        </Button>
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
                <th className="px-3 py-2 text-center">{t("branch.currentAccountColReceiptImageStatus")}</th>
                <th className="px-3 py-2 text-center">{t("branch.currentAccountColActions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const hasPdf = pdfDocByInvoiceId.has(r.id);
                const hasTransfer = transferDocByInvoiceId.has(r.id);
                const isCollected =
                  Number.isFinite(Number(r.paidTotal)) &&
                  Number.isFinite(Number(r.openAmount)) &&
                  Number(r.paidTotal) > 0.009 &&
                  Number(r.openAmount) <= 0.009;
                return (
                  <tr key={r.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2">{formatLocaleDate(r.issueDate, locale)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-900">{r.documentNumber}</div>
                      {isCollected ? (
                        <span className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {t("branch.currentAccountCollectedBadge")}
                        </span>
                      ) : null}
                    </td>
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
                      {hasPdf ? (
                        <div className="flex items-center justify-center gap-1">
                          {renderPdfIconButton({ hasPdf, action: "view", invoiceId: r.id, compact: true })}
                          {renderPdfIconButton({
                            hasPdf,
                            action: "download",
                            invoiceId: r.id,
                            compact: true,
                          })}
                        </div>
                      ) : (
                        <span className="inline-block text-xs text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="mb-1 text-xs text-zinc-500">
                        {hasTransfer
                          ? t("branch.currentAccountReceiptImageStatusSaved")
                          : t("branch.currentAccountReceiptImageStatusMissing")}
                      </div>
                      {hasTransfer ? (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-[44px] h-11 w-11 min-w-0 p-0"
                            title={t("branch.currentAccountReceiptImageView")}
                            aria-label={t("branch.currentAccountReceiptImageView")}
                            disabled={transferOpeningId === r.id}
                            onClick={() => void openTransferImage(r.id, "view")}
                          >
                            {transferOpeningId === r.id ? (
                              <span className="text-[10px] font-medium">{t("common.loading")}</span>
                            ) : (
                              <Eye className="h-4 w-4" aria-hidden />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-[44px] h-11 w-11 min-w-0 p-0"
                            title={t("branch.currentAccountReceiptImageDownload")}
                            aria-label={t("branch.currentAccountReceiptImageDownload")}
                            disabled={transferOpeningId === r.id}
                            onClick={() => void openTransferImage(r.id, "download")}
                          >
                            {transferOpeningId === r.id ? (
                              <span className="text-[10px] font-medium">{t("common.loading")}</span>
                            ) : (
                              <Download className="h-4 w-4" aria-hidden />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="inline-block text-xs text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        type="button"
                        variant="primary"
                        className="min-h-[44px] min-w-[44px] px-2 py-1 text-xs"
                        disabled={Number(r.openAmount) <= 0}
                        onClick={() => {
                          setReceiptInvoice(r);
                          setReceiptDate(localIsoDate());
                          setReceiptAmount("");
                          setReceiptNote("");
                          setReceiptTransferImage(null);
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
            const hasTransfer = transferDocByInvoiceId.has(r.id);
            const isCollected =
              Number.isFinite(Number(r.paidTotal)) &&
              Number.isFinite(Number(r.openAmount)) &&
              Number(r.paidTotal) > 0.009 &&
              Number(r.openAmount) <= 0.009;
            return (
              <div key={r.id} className="rounded-xl border border-zinc-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-zinc-500">{formatLocaleDate(r.issueDate, locale)}</div>
                    <div className="text-sm font-semibold text-zinc-900">{r.documentNumber}</div>
                    {isCollected ? (
                      <span className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        {t("branch.currentAccountCollectedBadge")}
                      </span>
                    ) : null}
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
                  {hasPdf ? (
                    <div className="flex items-center gap-2">
                      {renderPdfIconButton({ hasPdf, action: "view", invoiceId: r.id })}
                      {renderPdfIconButton({ hasPdf, action: "download", invoiceId: r.id })}
                    </div>
                  ) : (
                    <div className="flex items-center text-xs text-zinc-400">—</div>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    className="min-h-[44px] min-w-[44px] px-2 py-2 text-xs"
                    disabled={Number(r.openAmount) <= 0}
                    onClick={() => {
                      setReceiptInvoice(r);
                      setReceiptDate(localIsoDate());
                      setReceiptAmount("");
                      setReceiptNote("");
                      setReceiptTransferImage(null);
                    }}
                  >
                    {t("branch.currentAccountAddReceipt")}
                  </Button>
                </div>
                <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
                  {hasTransfer
                    ? t("branch.currentAccountReceiptImageStatusSaved")
                    : t("branch.currentAccountReceiptImageStatusMissing")}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <Modal
        open={receiptInvoice != null}
        onClose={() => setReceiptInvoice(null)}
        titleId="branch-current-account-receipt-modal-title"
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
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-zinc-700">
                {t("branch.currentAccountReceiptAmount")}
              </label>
              {receiptInvoice ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[44px] min-w-[44px] px-2 py-1 text-xs"
                  onClick={() =>
                    setReceiptAmount(
                      formatAmountInputOnBlur(String(receiptInvoice.openAmount ?? ""), locale)
                    )
                  }
                >
                  {t("branch.currentAccountReceiptFillOpenAmount")}
                </Button>
              ) : null}
            </div>
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
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              {t("branch.currentAccountReceiptImage")}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,.jpg,.jpeg,.png,.webp,.heic,.heif,.avif"
              className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              onChange={(e) => setReceiptTransferImage(e.target.files?.[0] ?? null)}
            />
            <LocalImageFileThumb
              file={receiptTransferImage}
              className="h-20 max-h-20 max-w-[8rem] sm:h-24 sm:max-h-24 sm:max-w-[10rem]"
            />
            {receiptTransferImage ? (
              <p className="mt-1 text-xs text-zinc-500">{receiptTransferImage.name}</p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setReceiptInvoice(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" variant="primary" disabled={receiptSaving} onClick={() => void submitReceipt()}>
              {receiptSaving ? t("common.loading") : t("branch.currentAccountSaveReceipt")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
