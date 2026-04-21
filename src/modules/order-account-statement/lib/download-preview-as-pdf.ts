"use client";

import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

function sanitizeFileNameBase(raw: string): string {
  const t = raw.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "_").replace(/\s+/g, "_").slice(0, 120);
  return t.length ? t : "hesap_ozeti";
}

export function buildOrderAccountPdfFileName(company: string, branch: string, isoDate: string): string {
  const base = sanitizeFileNameBase(`${company}_${branch}_HesapOzeti_${isoDate}`.trim() || "HesapOzeti");
  return `${base}.pdf`;
}

/**
 * Tek sayfa A4 PDF: içerik yüksekliği sayfayı aşarsa ölçekleyerek sığdırır (UTF-8 / Türkçe için raster).
 */
function settleLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export async function downloadHtmlNodeAsSinglePagePdf(node: HTMLElement, fileName: string): Promise<void> {
  const pdf = await buildHtmlNodeSinglePagePdf(node);
  pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}

async function buildHtmlNodeSinglePagePdf(node: HTMLElement): Promise<jsPDF> {
  await document.fonts.ready.catch(() => {});
  await settleLayout();

  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
    style: { transform: "none" },
  });

  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const maxW = pageW - 2 * margin;
  const maxH = pageH - 2 * margin;

  const props = pdf.getImageProperties(dataUrl);
  const iw = props.width;
  const ih = props.height;
  if (iw <= 0 || ih <= 0) {
    throw new Error("INVALID_IMAGE_DIMS");
  }

  const aspect = iw / ih;
  let dispW = maxW;
  let dispH = dispW / aspect;
  if (dispH > maxH) {
    dispH = maxH;
    dispW = dispH * aspect;
  }

  const x = margin + (maxW - dispW) / 2;
  /** Top-align: vertical centering left short captures sitting low on A4 with a large empty top margin. */
  const y = margin;

  pdf.addImage(dataUrl, "PNG", x, y, dispW, dispH, undefined, "FAST");
  return pdf;
}

export async function buildHtmlNodeSinglePagePdfBlob(node: HTMLElement): Promise<Blob> {
  const pdf = await buildHtmlNodeSinglePagePdf(node);
  return pdf.output("blob");
}
