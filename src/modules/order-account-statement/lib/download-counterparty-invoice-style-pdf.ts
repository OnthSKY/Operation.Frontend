"use client";

import { downloadHtmlNodeAsSinglePagePdf } from "@/modules/order-account-statement/lib/download-preview-as-pdf";

export type CounterpartyInvoiceStylePdfRow = {
  counterpartyName: string;
  counterpartyTypeLabel: string;
  documentNumber: string;
  issueDate: string;
  invoiceAmount: string;
  paidAmount: string;
  /** Ön ödeme (advance_payment) — fatura bazlı veya tahsilattan */
  advanceAmount?: string;
  /** Promosyon / para indirim (promo_discount) */
  promoAmount?: string;
  /** Hediye ürün tutarı */
  giftAmount?: string;
  /** Promosyon + Hediye toplamı (kolon başlığında gösterilen) */
  promoCombinedAmount?: string;
  openAmount: string;
  paymentDate: string;
};

export type CounterpartyInvoiceStylePdfMeta = {
  companyName: string;
  branchName: string;
  logoDataUrl?: string;
  title: string;
  issuedAtLabel: string;
  filtersLabel: string;
  totalsLabel: string;
  fileName: string;
  showCompanyName?: boolean;
  showLogo?: boolean;
  paymentInfo?: {
    iban?: string;
    accountHolder?: string;
    bankName?: string;
    note?: string;
  };
  footerTotals?: {
    invoicedLabel: string;
    invoicedValue: string;
    paidLabel: string;
    paidValue: string;
    openLabel: string;
    openValue: string;
    advanceLabel?: string;
    advanceValue?: string;
    promoLabel?: string;
    promoValue?: string;
    giftLabel?: string;
    giftValue?: string;
    /** Promo + Hediye birleşik toplam (gösterimde başlık, alt satırda detay) */
    promoCombinedValue?: string;
  };
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createPaperNode(rows: CounterpartyInvoiceStylePdfRow[], meta: CounterpartyInvoiceStylePdfMeta): HTMLElement {
  const root = document.createElement("div");
  root.style.width = "1120px";
  root.style.padding = "32px";
  root.style.background = "#ffffff";
  root.style.color = "#111827";
  root.style.fontFamily = "Arial, Helvetica, sans-serif";
  root.style.border = "1px solid #94a3b8";
  root.style.borderRadius = "14px";

  const header = document.createElement("div");
  header.style.border = "1px solid #cbd5e1";
  header.style.borderRadius = "12px";
  header.style.padding = "16px";
  header.style.background = "linear-gradient(to bottom, #f8fafc, #ffffff)";

  const top = document.createElement("div");
  top.style.display = "flex";
  top.style.justifyContent = "space-between";
  top.style.alignItems = "flex-start";
  top.style.gap = "16px";

  const logoWrap = document.createElement("div");
  logoWrap.style.minHeight = "88px";
  logoWrap.style.minWidth = "88px";
  if (meta.showLogo !== false && meta.logoDataUrl) {
    const img = document.createElement("img");
    img.src = meta.logoDataUrl;
    img.alt = "";
    img.style.width = "88px";
    img.style.height = "88px";
    img.style.objectFit = "contain";
    img.style.border = "1px solid #e2e8f0";
    img.style.borderRadius = "10px";
    img.style.padding = "4px";
    img.style.background = "#ffffff";
    logoWrap.appendChild(img);
  }

  const rightMeta = document.createElement("div");
  rightMeta.style.display = "flex";
  rightMeta.style.flexDirection = "column";
  rightMeta.style.alignItems = "flex-end";
  rightMeta.style.gap = "4px";
  rightMeta.style.fontSize = "12px";
  rightMeta.innerHTML = `
    <div><b>${escapeHtml(meta.issuedAtLabel)}</b></div>
    <div>${escapeHtml(meta.filtersLabel)}</div>
    <div>${escapeHtml(meta.totalsLabel)}</div>
  `;

  top.appendChild(logoWrap);
  top.appendChild(rightMeta);
  header.appendChild(top);

  const titleArea = document.createElement("div");
  titleArea.style.marginTop = "10px";
  titleArea.style.textAlign = "center";
  titleArea.innerHTML = `
    <div style="font-size:28px;font-weight:800;letter-spacing:0.02em;text-transform:uppercase;">${meta.showCompanyName === false ? "—" : escapeHtml(meta.companyName || "—")}</div>
    <div style="font-size:14px;color:#475569;margin-top:2px;">${escapeHtml(meta.branchName || "—")}</div>
    <div style="margin-top:8px;border:1px solid #94a3b8;background:#f1f5f9;padding:8px 10px;font-size:18px;font-weight:800;text-transform:uppercase;">${escapeHtml(meta.title)}</div>
  `;
  header.appendChild(titleArea);
  root.appendChild(header);

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.marginTop = "18px";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "12px";

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr style="background:#0f172a;color:#f8fafc;">
      <th style="padding:8px;border:1px solid #334155;text-align:left;">Cari</th>
      <th style="padding:8px;border:1px solid #334155;text-align:left;">Tip</th>
      <th style="padding:8px;border:1px solid #334155;text-align:left;">Fatura No</th>
      <th style="padding:8px;border:1px solid #334155;text-align:left;">Sipariş Tarihi</th>
      <th style="padding:8px;border:1px solid #334155;text-align:right;">Fatura Tutarı</th>
      <th style="padding:8px;border:1px solid #334155;text-align:right;">Tahsil Edilen</th>
      <th style="padding:8px;border:1px solid #334155;text-align:right;">Ön Ödeme</th>
      <th style="padding:8px;border:1px solid #334155;text-align:right;">Promosyon<br/><span style="font-weight:400;font-size:10px;opacity:0.75;">(Para + Ürün hediye)</span></th>
      <th style="padding:8px;border:1px solid #334155;text-align:right;">Açık</th>
      <th style="padding:8px;border:1px solid #334155;text-align:right;">Ödeme Tarihi</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((row, index) => {
    const tr = document.createElement("tr");
    if (index % 2 === 1) tr.style.background = "#f8fafc";
    tr.innerHTML = `
      <td style="padding:7px 8px;border:1px solid #e2e8f0;">${escapeHtml(row.counterpartyName)}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;">${escapeHtml(row.counterpartyTypeLabel)}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;">${escapeHtml(row.documentNumber)}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;">${escapeHtml(row.issueDate)}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;">${escapeHtml(row.invoiceAmount)}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;color:#166534;">${escapeHtml(row.paidAmount)}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;color:#0369a1;">${escapeHtml(row.advanceAmount ?? "—")}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;color:#6d28d9;">
        ${escapeHtml(row.promoCombinedAmount ?? row.promoAmount ?? "—")}
        ${row.promoAmount || row.giftAmount ? `<div style="margin-top:2px;font-size:9px;font-weight:400;color:#64748b;line-height:1.2;">Para: ${escapeHtml(row.promoAmount ?? "—")} · Hediye: ${escapeHtml(row.giftAmount ?? "—")}</div>` : ""}
      </td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#92400e;">${escapeHtml(row.openAmount)}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;">${escapeHtml(row.paymentDate)}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  root.appendChild(table);

  if (meta.footerTotals) {
    const totalsWrap = document.createElement("div");
    totalsWrap.style.marginTop = "14px";
    totalsWrap.style.border = "1px solid #cbd5e1";
    totalsWrap.style.borderRadius = "10px";
    totalsWrap.style.padding = "10px 12px";
    totalsWrap.style.background = "#f8fafc";
    const ft = meta.footerTotals;
    const advanceCell = ft.advanceLabel
      ? `<div><div style="color:#64748b;">${escapeHtml(ft.advanceLabel)}</div><div style="font-weight:700;color:#0369a1;">${escapeHtml(ft.advanceValue ?? "—")}</div></div>`
      : "";
    // Promosyon birleşik (para + hediye) — kart başlığında toplam, altında detay.
    const promoCombined = ft.promoCombinedValue ?? ft.promoValue ?? "—";
    const promoBreakdown =
      ft.promoValue || ft.giftValue
        ? `<div style="margin-top:2px;font-size:10px;color:#64748b;line-height:1.3;">Para: ${escapeHtml(ft.promoValue ?? "—")} · Hediye: ${escapeHtml(ft.giftValue ?? "—")}</div>`
        : "";
    const promoCell = ft.promoLabel
      ? `<div><div style="color:#64748b;">${escapeHtml(ft.promoLabel)}</div><div style="font-weight:700;color:#6d28d9;">${escapeHtml(promoCombined)}</div>${promoBreakdown}</div>`
      : "";
    totalsWrap.innerHTML = `
      <div style="font-size:11px;color:#334155;text-transform:uppercase;letter-spacing:0.03em;">Toplamlar</div>
      <div style="margin-top:6px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;font-size:12px;">
        <div>
          <div style="color:#64748b;">${escapeHtml(ft.invoicedLabel)}</div>
          <div style="font-weight:700;color:#0f172a;">${escapeHtml(ft.invoicedValue)}</div>
        </div>
        <div>
          <div style="color:#64748b;">${escapeHtml(ft.paidLabel)}</div>
          <div style="font-weight:700;color:#166534;">${escapeHtml(ft.paidValue)}</div>
        </div>
        ${advanceCell}
        ${promoCell}
        <div>
          <div style="color:#64748b;">${escapeHtml(ft.openLabel)}</div>
          <div style="font-weight:700;color:#92400e;">${escapeHtml(ft.openValue)}</div>
        </div>
      </div>
    `;
    root.appendChild(totalsWrap);
  }

  const iban = meta.paymentInfo?.iban?.trim() ?? "";
  const accountHolder = meta.paymentInfo?.accountHolder?.trim() ?? "";
  const bankName = meta.paymentInfo?.bankName?.trim() ?? "";
  const note = meta.paymentInfo?.note?.trim() ?? "";
  if (iban || accountHolder || bankName || note) {
    const paymentWrap = document.createElement("div");
    paymentWrap.style.marginTop = "10px";
    paymentWrap.style.border = "1px dashed #cbd5e1";
    paymentWrap.style.borderRadius = "10px";
    paymentWrap.style.padding = "10px 12px";
    paymentWrap.style.background = "#ffffff";
    paymentWrap.innerHTML = `
      <div style="font-size:11px;color:#334155;text-transform:uppercase;letter-spacing:0.03em;">Odeme bilgileri</div>
      ${iban ? `<div style="margin-top:6px;font-size:12px;"><b>IBAN:</b> ${escapeHtml(iban)}</div>` : ""}
      ${accountHolder ? `<div style="margin-top:4px;font-size:12px;"><b>Hesap sahibi:</b> ${escapeHtml(accountHolder)}</div>` : ""}
      ${bankName ? `<div style="margin-top:4px;font-size:12px;"><b>Banka:</b> ${escapeHtml(bankName)}</div>` : ""}
      ${note ? `<div style="margin-top:4px;font-size:12px;"><b>Not:</b> ${escapeHtml(note)}</div>` : ""}
    `;
    root.appendChild(paymentWrap);
  }

  return root;
}

export async function downloadCounterpartyInvoiceStylePdf(
  rows: CounterpartyInvoiceStylePdfRow[],
  meta: CounterpartyInvoiceStylePdfMeta
): Promise<void> {
  const paper = createPaperNode(rows, meta);
  const holder = document.createElement("div");
  holder.style.position = "fixed";
  holder.style.left = "-100000px";
  holder.style.top = "0";
  holder.style.zIndex = "-1";
  holder.appendChild(paper);
  document.body.appendChild(holder);
  try {
    await downloadHtmlNodeAsSinglePagePdf(paper, meta.fileName);
  } finally {
    holder.remove();
  }
}

export async function buildCounterpartyInvoiceStylePdfBlob(
  rows: CounterpartyInvoiceStylePdfRow[],
  meta: CounterpartyInvoiceStylePdfMeta
): Promise<Blob> {
  const paper = createPaperNode(rows, meta);
  const holder = document.createElement("div");
  holder.style.position = "fixed";
  holder.style.left = "-100000px";
  holder.style.top = "0";
  holder.style.zIndex = "-1";
  holder.appendChild(paper);
  document.body.appendChild(holder);
  try {
    const { buildHtmlNodeSinglePagePdfBlob } = await import(
      "@/modules/order-account-statement/lib/download-preview-as-pdf"
    );
    return await buildHtmlNodeSinglePagePdfBlob(paper);
  } finally {
    holder.remove();
  }
}
