"use client";

import { jsPDF } from "jspdf";
import { toCanvas } from "html-to-image";

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

function loadImageFromSrc(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    // onload tek başına yetmiyor: Chrome, foreignObject akışında henüz decode
    // olmamış <img>'i canvas'a boş çiziyor (logo PDF'te boş çıkıyor). decode()
    // beklenince görsel eksiksiz düşüyor — eski waitForImagesToDecode davranışı.
    img.onload = () => {
      img.decode().then(() => resolve(img)).catch(() => resolve(img));
    };
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });
}

/**
 * html-to-image düğümü bir SVG foreignObject'e klonlayıp raster'a çeviriyor; bazı tarayıcılar
 * (özellikle Chrome) foreignObject içindeki <img> öğelerini — data-URL firma logosu dahil —
 * hiç çizmiyor: kutu/çerçeve geliyor ama görsel boş kalıyor. Bu yüzden yakalanan canvas üzerine
 * görselleri kendimiz, DOM'daki konum/boyutla (object-fit: contain) yeniden çiziyoruz.
 */
async function compositeImagesOntoCanvas(node: HTMLElement, canvas: HTMLCanvasElement): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const nodeRect = node.getBoundingClientRect();
  if (nodeRect.width <= 0 || nodeRect.height <= 0) return;
  const scaleX = canvas.width / nodeRect.width;
  const scaleY = canvas.height / nodeRect.height;

  for (const img of Array.from(node.querySelectorAll("img"))) {
    const src = img.currentSrc || img.src;
    if (!src) continue;

    let loaded: HTMLImageElement;
    try {
      loaded = await loadImageFromSrc(src);
    } catch {
      continue;
    }

    const rect = img.getBoundingClientRect();
    const cs = getComputedStyle(img);
    const insetLeft = (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.paddingLeft) || 0);
    const insetRight = (parseFloat(cs.borderRightWidth) || 0) + (parseFloat(cs.paddingRight) || 0);
    const insetTop = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.paddingTop) || 0);
    const insetBottom = (parseFloat(cs.borderBottomWidth) || 0) + (parseFloat(cs.paddingBottom) || 0);

    // <img> içerik kutusu (CSS px), düğüme göreli.
    const boxLeft = rect.left - nodeRect.left + insetLeft;
    const boxTop = rect.top - nodeRect.top + insetTop;
    const boxW = rect.width - insetLeft - insetRight;
    const boxH = rect.height - insetTop - insetBottom;
    if (boxW <= 0 || boxH <= 0) continue;

    // SVG / boyut bildirmeyen data-URL görseller naturalWidth=0 döndürebilir;
    // böyle durumda görseli atlamak yerine içerik kutusunun oranını kullan.
    const naturalW = loaded.naturalWidth || loaded.width;
    const naturalH = loaded.naturalHeight || loaded.height;
    const ratioW = naturalW > 0 ? naturalW : boxW;
    const ratioH = naturalH > 0 ? naturalH : boxH;

    // object-fit: contain — en-boy oranını koruyarak kutuya sığdır ve ortala.
    const fit = Math.min(boxW / ratioW, boxH / ratioH);
    const drawW = ratioW * fit;
    const drawH = ratioH * fit;
    const drawX = boxLeft + (boxW - drawW) / 2;
    const drawY = boxTop + (boxH - drawH) / 2;

    ctx.drawImage(loaded, drawX * scaleX, drawY * scaleY, drawW * scaleX, drawH * scaleY);
  }
}

export async function downloadHtmlNodeAsSinglePagePdf(node: HTMLElement, fileName: string): Promise<void> {
  const pdf = await buildHtmlNodeSinglePagePdf(node);
  pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}

/** ~A4 genişliği @96dpi; mobilde dar DOM ile yakalama yapılırsa PDF okunaksız kalıyordu. */
const PDF_CAPTURE_MIN_WIDTH_PX = 794;

async function buildHtmlNodeSinglePagePdf(node: HTMLElement): Promise<jsPDF> {
  await document.fonts.ready.catch(() => {});
  await settleLayout();

  const prevWidth = node.style.width;
  const prevMaxWidth = node.style.maxWidth;
  const prevBoxSizing = node.style.boxSizing;

  let dataUrl: string;
  try {
    node.style.boxSizing = "border-box";
    const current = Math.ceil(node.getBoundingClientRect().width);
    if (current > 0 && current < PDF_CAPTURE_MIN_WIDTH_PX) {
      node.style.width = `${PDF_CAPTURE_MIN_WIDTH_PX}px`;
      node.style.maxWidth = "none";
      await settleLayout();
    }

    const canvas = await toCanvas(node, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
      style: { transform: "none" },
    });
    // html-to-image foreignObject içindeki <img>'leri çizemediği için logoyu canvas'a biz basıyoruz.
    await compositeImagesOntoCanvas(node, canvas);
    dataUrl = canvas.toDataURL("image/png");
  } finally {
    node.style.width = prevWidth;
    node.style.maxWidth = prevMaxWidth;
    node.style.boxSizing = prevBoxSizing;
    await settleLayout();
  }

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
