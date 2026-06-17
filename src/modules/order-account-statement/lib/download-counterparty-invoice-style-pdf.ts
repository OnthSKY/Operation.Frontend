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
  /** Fatura altında listelenecek tahsilat hareketleri (tarih, tutar, yöntem). */
  receipts?: Array<{ date: string; amount: string; kindLabel: string }>;
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
  // Üst-sağ meta sadeleşti: Üretilme + filtre (toplamlar tablonun alt satırında).
  rightMeta.innerHTML = `
    <div><b>${escapeHtml(meta.issuedAtLabel)}</b></div>
    <div>${escapeHtml(meta.filtersLabel)}</div>
  `;

  top.appendChild(logoWrap);
  top.appendChild(rightMeta);
  header.appendChild(top);

  const titleArea = document.createElement("div");
  titleArea.style.marginTop = "10px";
  titleArea.style.textAlign = "center";
  titleArea.innerHTML = `
    <div style="font-size:24px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;color:#0f172a;">${meta.showCompanyName === false ? "—" : escapeHtml(meta.companyName || "—")}</div>
    <div style="font-size:13px;color:#64748b;margin-top:2px;">${escapeHtml(meta.branchName || "—")}</div>
    <div style="margin-top:8px;border:1px solid #e2e8f0;background:#f8fafc;padding:6px 12px;border-radius:8px;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#334155;">${escapeHtml(meta.title)}</div>
  `;
  header.appendChild(titleArea);
  root.appendChild(header);

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.marginTop = "18px";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "12px";

  // Soft palet — açık zemin + slate metin (kâğıt üstünde nazik).
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr style="background:#f1f5f9;color:#334155;">
      <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;font-weight:600;">Cari</th>
      <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;font-weight:600;">Tip</th>
      <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;font-weight:600;">Fatura No</th>
      <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;font-weight:600;">Sipariş Tarihi</th>
      <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:600;">Fatura Tutarı</th>
      <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:600;">Tahsil Edilen</th>
      <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:600;">Ön Ödeme</th>
      <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:600;">Promosyon<br/><span style="font-weight:400;font-size:10px;color:#64748b;">(Para + Ürün hediye)</span></th>
      <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:600;">Açık</th>
      <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:600;">Ödeme Tarihi</th>
    </tr>
  `;
  table.appendChild(thead);

  const COL_COUNT = 10;
  const tbody = document.createElement("tbody");
  rows.forEach((row, index) => {
    const bg = index % 2 === 1 ? "#f8fafc" : "#ffffff";
    const tr = document.createElement("tr");
    tr.style.background = bg;
    tr.innerHTML = `
      <td style="padding:7px 8px;border:1px solid #e2e8f0;color:#0f172a;">${escapeHtml(row.counterpartyName)}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;color:#475569;">${escapeHtml(row.counterpartyTypeLabel)}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;color:#475569;">${escapeHtml(row.documentNumber)}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;color:#475569;">${escapeHtml(row.issueDate)}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;color:#0f172a;">${escapeHtml(row.invoiceAmount)}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;color:#15803d;">${escapeHtml(row.paidAmount)}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;color:#0284c7;">${escapeHtml(row.advanceAmount ?? "—")}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;color:#7c3aed;">
        ${escapeHtml(row.promoCombinedAmount ?? row.promoAmount ?? "—")}
        ${row.promoAmount || row.giftAmount ? `<div style="margin-top:2px;font-size:9px;font-weight:400;color:#94a3b8;line-height:1.2;">Para: ${escapeHtml(row.promoAmount ?? "—")} · Hediye: ${escapeHtml(row.giftAmount ?? "—")}</div>` : ""}
      </td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;font-weight:600;color:#b45309;">${escapeHtml(row.openAmount)}</td>
      <td style="padding:7px 8px;border:1px solid #e2e8f0;text-align:right;color:#64748b;">${escapeHtml(row.paymentDate)}</td>
    `;
    tbody.appendChild(tr);

    // Tahsilatlar alt satır olarak — colspan ile satır birleştir, kompakt liste.
    if (row.receipts && row.receipts.length > 0) {
      const trReceipts = document.createElement("tr");
      trReceipts.style.background = bg;
      const items = row.receipts
        .map(
          (r) =>
            `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;border-top:1px dotted #e2e8f0;">
              <span style="color:#64748b;min-width:80px;">${escapeHtml(r.date)}</span>
              <span style="color:#166534;font-weight:600;min-width:110px;text-align:right;">${escapeHtml(r.amount)}</span>
              <span style="display:inline-block;font-size:10px;font-weight:500;padding:1px 8px;border-radius:999px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;">${escapeHtml(r.kindLabel)}</span>
            </div>`
        )
        .join("");
      trReceipts.innerHTML = `
        <td colspan="${COL_COUNT}" style="padding:6px 12px 8px 24px;border:1px solid #e2e8f0;border-top:none;font-size:11px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#475569;margin-bottom:2px;">↳ Tahsilatlar</div>
          ${items}
        </td>
      `;
      tbody.appendChild(trReceipts);
    }
  });

  table.appendChild(tbody);
  root.appendChild(table);

  // Sağ alt özet kartı — soft palet, kâğıt üstünde nazik (eski tablo footer satırı kaldırıldı)
  if (meta.footerTotals) {
    const ft = meta.footerTotals;
    const summaryWrap = document.createElement("div");
    summaryWrap.style.marginTop = "16px";
    summaryWrap.style.display = "flex";
    summaryWrap.style.justifyContent = "flex-end";
    const card = document.createElement("div");
    card.style.minWidth = "320px";
    card.style.maxWidth = "420px";
    card.style.border = "1px solid #e2e8f0";
    card.style.borderRadius = "12px";
    card.style.background = "#f8fafc";
    card.style.padding = "12px 14px";
    card.style.fontSize = "12px";
    const row = (label: string, value: string, color: string) =>
      `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:4px 0;">
        <span style="color:#64748b;">${escapeHtml(label)}</span>
        <span style="color:${color};font-weight:600;font-variant-numeric:tabular-nums;">${escapeHtml(value)}</span>
      </div>`;
    card.innerHTML = `
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#475569;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">Özet</div>
      ${row(ft.invoicedLabel, ft.invoicedValue, "#0f172a")}
      ${row(ft.paidLabel, ft.paidValue, "#15803d")}
      ${ft.advanceLabel ? row(ft.advanceLabel, ft.advanceValue ?? "—", "#0284c7") : ""}
      ${
        ft.promoLabel
          ? `<div style="padding:4px 0;">
              <div style="display:flex;justify-content:space-between;align-items:baseline;">
                <span style="color:#64748b;">${escapeHtml(ft.promoLabel)}</span>
                <span style="color:#7c3aed;font-weight:600;font-variant-numeric:tabular-nums;">${escapeHtml(ft.promoCombinedValue ?? ft.promoValue ?? "—")}</span>
              </div>
              ${
                ft.promoValue || ft.giftValue
                  ? `<div style="display:flex;justify-content:flex-end;gap:10px;font-size:10px;color:#94a3b8;margin-top:1px;">
                      <span>Para: <span style="font-variant-numeric:tabular-nums;">${escapeHtml(ft.promoValue ?? "—")}</span></span>
                      <span>Hediye: <span style="font-variant-numeric:tabular-nums;">${escapeHtml(ft.giftValue ?? "—")}</span></span>
                    </div>`
                  : ""
              }
            </div>`
          : ""
      }
      <div style="border-top:1px solid #e2e8f0;margin-top:4px;padding-top:6px;">
        ${row(ft.openLabel, ft.openValue, "#b45309")}
      </div>
    `;
    summaryWrap.appendChild(card);
    root.appendChild(summaryWrap);
  }

  // Alt toplam satırı artık table footer'da (tek satır, koyu zemin). Eski 5-hücreli kart kaldırıldı.

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
