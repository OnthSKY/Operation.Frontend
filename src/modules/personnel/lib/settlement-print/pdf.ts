/** PDF üretimi (html2canvas + jsPDF) ve yeni-sekme akışı (yazdır / PDF indir / paylaş). */
import { escapeHtml } from "./format";
import type { SettlementPrintOpts } from "./types";
import { buildPersonnelSettlementDocument } from "./document";

/**
 * Mutabakat belgesini yeni bir sekmede açar (yazdır / indir butonlarıyla).
 * Popup aynı tıklama zincirinde açılmalı; veri çekme sonra gelir.
 */
export async function openPersonnelSettlementPrintWindow(
  opts: SettlementPrintOpts,
): Promise<void> {
  const { locale, t } = opts;
  const lang = locale === "tr" ? "tr" : "en";

  const w = window.open("about:blank", "_blank");
  if (!w) {
    throw new Error(t("personnel.settlementPrintPopupBlocked"));
  }
  const loadingMsg = escapeHtml(t("common.loading"));
  const loadingTitle = escapeHtml(t("personnel.settlementPrintModalTitle"));
  w.document.open();
  w.document.write(
    `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${loadingTitle}</title><style>body{font-family:system-ui,sans-serif;margin:0;padding:2rem;text-align:center;color:#71717a;font-size:14px}</style></head><body><p>${loadingMsg}</p></body></html>`,
  );
  w.document.close();

  let doc: { html: string; downloadFileName: string };
  try {
    doc = await buildPersonnelSettlementDocument(opts);
  } catch (e) {
    try {
      w.close();
    } catch {
      /* ignore */
    }
    throw e;
  }

  w.document.open();
  w.document.write(doc.html);
  w.document.close();

  // Sekmedeki "PDF indir / Paylaş" butonları parent'taki jsPDF motorunu çağırır
  // (sekmenin kendi realm'ında bundle yok). Parent gerçek PDF blob URL'i döndürür.
  const pdfBaseName = doc.downloadFileName.replace(/\.html?$/i, "");
  let pdfUrlPromise: Promise<string> | null = null;
  const makePdf = (): Promise<string> => {
    if (!pdfUrlPromise) {
      pdfUrlPromise = htmlToPdfBlob(doc.html)
        .then((blob) => URL.createObjectURL(blob))
        .catch((e) => {
          pdfUrlPromise = null; // başarısızsa sonraki tıklamada tekrar denensin
          throw e;
        });
    }
    return pdfUrlPromise;
  };
  try {
    (w as unknown as { __settlementMakePdf?: () => Promise<string> }).__settlementMakePdf = makePdf;
    (w as unknown as { __settlementPdfName?: string }).__settlementPdfName = `${pdfBaseName}.pdf`;
    // Eager ısıtma: PDF'i hemen üretmeye başla; kullanıcı "İndir/Paylaş"a bastığında
    // hazır olsun (özellikle iOS'ta navigator.share jest içinde hızlı çağrılmalı).
    makePdf().catch(() => {
      /* ısıtma hatası yutulur; butona basınca tekrar denenir veya HTML fallback */
    });
  } catch {
    /* cross-window atama başarısızsa sekme HTML fallback'ine düşer */
  }

  w.focus();
}

/**
 * Mutabakat belgesini görünmez bir iframe'de render edip jsPDF ile PDF blob'a çevirir.
 * Otomatik kaydetme (kapanış) akışı için; ekranda bir şey açmaz.
 */
export async function generatePersonnelSettlementPdfBlob(
  opts: SettlementPrintOpts,
): Promise<{ blob: Blob; fileBaseName: string }> {
  const { html, downloadFileName } = await buildPersonnelSettlementDocument(opts);
  // ".html" uzantısını at; PDF adını çağıran belirler.
  const fileBaseName = downloadFileName.replace(/\.html?$/i, "");
  const blob = await htmlToPdfBlob(html);
  return { blob, fileBaseName };
}

/**
 * Hazır belge HTML'ini görünmez bir iframe'de render edip jsPDF ile A4 PDF blob'a
 * çevirir. Türkçe glifler için metin GÖRÜNTÜ olarak alınır (html2canvas).
 */
async function htmlToPdfBlob(html: string): Promise<Blob> {
  // Sayfa tasarım genişliği (CSS px). Belge bu genişlikte yerleşir, sonra
  // html2canvas ile görüntüye çevrilip A4 sayfalara bölünür.
  const RENDER_WIDTH = 820;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = `${RENDER_WIDTH}px`;
  iframe.style.height = "1200px";
  iframe.style.border = "0";
  iframe.style.background = "#ffffff";
  document.body.appendChild(iframe);

  try {
    const idoc = iframe.contentDocument;
    if (!idoc) throw new Error("PDF iframe document unavailable.");
    idoc.open();
    idoc.write(html);
    idoc.close();

    // Yazdır/indir araç çubuğu (.no-print) PDF'e girmemeli.
    idoc
      .querySelectorAll(".no-print, .settlement-toolbar, script")
      .forEach((el) => el.remove());

    // Yazı tipleri + görsellerin yerleşmesi için kısa bekleme.
    await new Promise((resolve) => setTimeout(resolve, 400));
    try {
      const fonts = (idoc as unknown as { fonts?: { ready?: Promise<unknown> } })
        .fonts;
      if (fonts?.ready) await fonts.ready;
    } catch {
      /* ignore */
    }

    // Tarayıcı Türkçe karakterleri doğru çizdiği için metni GÖRÜNTÜ olarak
    // alıyoruz (jsPDF'in kendi fontu Türkçe glifleri bozuyordu).
    const html2canvas = (await import("html2canvas")).default;
    const target = idoc.body;
    const fullCanvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: RENDER_WIDTH,
      width: RENDER_WIDTH,
      height: target.scrollHeight,
    });

    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageWidthPt = pdf.internal.pageSize.getWidth();
    const pageHeightPt = pdf.internal.pageSize.getHeight();
    const marginPt = 24;
    const imgWidthPt = pageWidthPt - marginPt * 2;
    const contentHeightPt = pageHeightPt - marginPt * 2;
    const ptPerPx = imgWidthPt / fullCanvas.width;
    const pageSlicePx = Math.max(1, Math.floor(contentHeightPt / ptPerPx));

    let renderedPx = 0;
    let firstPage = true;
    while (renderedPx < fullCanvas.height) {
      const sliceHeightPx = Math.min(pageSlicePx, fullCanvas.height - renderedPx);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = fullCanvas.width;
      pageCanvas.height = sliceHeightPx;
      const ctx = pageCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        fullCanvas,
        0,
        renderedPx,
        fullCanvas.width,
        sliceHeightPx,
        0,
        0,
        fullCanvas.width,
        sliceHeightPx,
      );

      const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
      if (!firstPage) pdf.addPage();
      pdf.addImage(
        imgData,
        "JPEG",
        marginPt,
        marginPt,
        imgWidthPt,
        sliceHeightPx * ptPerPx,
      );
      firstPage = false;
      renderedPx += sliceHeightPx;
    }

    return pdf.output("blob");
  } finally {
    iframe.remove();
  }
}
