"use client";

import type { Locale } from "@/i18n/messages";
import type { OutboundInvoiceResponse } from "@/modules/order-account-statement/api/outbound-invoices-api";
import { StatementPaper } from "@/modules/order-account-statement/components/OrderAccountStatementPaper";
import { computeOrderAccountTotals } from "@/modules/order-account-statement/lib/compute-order-account-totals";
import { buildHtmlNodeSinglePagePdfBlob } from "@/modules/order-account-statement/lib/download-preview-as-pdf";
import { mapInvoiceToOrderAccountPdfModel } from "@/modules/order-account-statement/lib/map-invoice-to-order-account-pdf-model";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { createRoot } from "react-dom/client";

export type RegenerateOrderAccountPdfLabels = {
  headerCompany: string;
  headerBranch: string;
  documentTagline: string;
  issuedPrefix: string;
  productCol: string;
  qtyCol: string;
  unitCol: string;
  unitPriceCol: string;
  amountCol: string;
  gross: string;
  giftTotal: string;
  advance: string;
  subtotal: string;
  previousBalance: string;
  net: string;
  giftSuffix: string;
  paidSection: string;
  promoLineFallback: string;
  emptyHint: string;
  paymentSection: string;
  paymentIban: string;
  paymentAccountHolder: string;
  paymentBankName: string;
  paymentNote: string;
};

export async function regenerateSavedOrderAccountPdfBlob(input: {
  locale: Locale;
  companyName: string;
  branchName: string;
  documentTitle: string;
  emblemDataUrl?: string;
  orderDocumentKey: string;
  systemDocumentId?: number | null;
  invoice: OutboundInvoiceResponse;
  priorOpenBalance: number;
  labels: RegenerateOrderAccountPdfLabels;
}): Promise<Blob | null> {
  const lines = input.invoice.lines ?? [];
  if (lines.length === 0) return null;

  const mapped = mapInvoiceToOrderAccountPdfModel({
    locale: input.locale,
    lines,
    giftAmount: input.invoice.giftAmount ?? 0,
    promoAmount: input.invoice.promoAmount ?? 0,
    advanceAmount: input.invoice.advanceAmount ?? 0,
    promoFallbackLabel: input.labels.promoLineFallback,
    giftLineLabel: input.labels.giftTotal,
  });

  const previousBalance = Math.max(0, input.priorOpenBalance);
  const totals = computeOrderAccountTotals(
    mapped.productLines,
    mapped.promoLines,
    mapped.advanceDeduction,
    mapped.paidOnBehalf,
    previousBalance
  );

  const payment = input.invoice.paymentInfo;
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "794px";
  host.style.pointerEvents = "none";
  host.style.visibility = "hidden";
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    root.render(
      <StatementPaper
        layoutVariant="corporate"
        locale={input.locale}
        companyName={input.companyName}
        branchName={input.branchName}
        emblemDataUrl={input.emblemDataUrl}
        documentTitle={input.documentTitle}
        showDocumentTagline
        issuedDate={formatLocaleDate(input.invoice.issueDate, input.locale)}
        lines={mapped.productLines}
        showQuantityColumn={mapped.showQuantityColumn}
        promoLines={mapped.promoLines}
        totals={totals}
        advanceDeduction={mapped.advanceDeduction}
        previousBalance={previousBalance}
        paidOnBehalf={mapped.paidOnBehalf}
        labels={input.labels}
        paymentInfo={
          payment
            ? {
                iban: payment.iban,
                accountHolder: payment.accountHolder,
                bankName: payment.bankName,
                paymentNote: payment.paymentNote,
                showOnPdf: payment.showOnPdf,
              }
            : undefined
        }
        paymentLabels={{
          section: input.labels.paymentSection,
          iban: input.labels.paymentIban,
          accountHolder: input.labels.paymentAccountHolder,
          bankName: input.labels.paymentBankName,
          paymentNote: input.labels.paymentNote,
        }}
        documentMeta={{
          referenceId: input.orderDocumentKey,
          systemDocumentId: input.systemDocumentId ?? null,
          generationLabel: "PDF",
        }}
        emptyHint={input.labels.emptyHint}
      />
    );
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    const paper = host.firstElementChild;
    if (!(paper instanceof HTMLElement)) return null;
    return await buildHtmlNodeSinglePagePdfBlob(paper);
  } finally {
    root.unmount();
    host.remove();
  }
}
