import {
  txCodeLabel,
  txCodeLabelKey,
  umbrellaTxMainForSubOptions,
} from "@/modules/branch/lib/branch-transaction-options";
/**
 * Mutabakat/şube PDF'i için saf biçimlendirme yardımcıları (mantık yok, yan etki yok).
 * Tüm builder'lar buradan kullanır.
 */

/**
 * Güvenlik: `document.write` ile üretilen HTML'e API/DB'den gelen metinleri **yalnızca**
 * `escapeHtml` (veya eşdeğeri) ile ekleyin; ham string birleştirme DOM XSS açar.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function safeDownloadFilename(title: string): string {
  const d = new Date().toISOString().slice(0, 10);
  const base =
    title
      .replace(/[\\/:*?"<>|\x00-\x1f]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 72) || "settlement";
  return `${base}-${d}.html`;
}

/** Güvenli sayıya çevir (NaN/Infinity → 0). */
export const moneyNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Para birimi anahtarını normalize et (boş → TRY, upper-case). */
export const ccyKey = (c?: string | null): string =>
  String(c ?? "TRY").trim().toUpperCase() || "TRY";

/**
 * PDF kategori etiketi: kayıtlı çeviri anahtarı → `ledgerClass.<kod>` çevirisi → mevcut etiket.
 * Yalnız gösterim; kod, gruplama ve tutarlar değişmez (ham "Ops invoice" sızıntısını kapatır).
 */
export function pdfCodeLabel(code: string, t: (k: string) => string): string {
  const key = txCodeLabelKey(code);
  if (key) return t(key);
  const lc = `ledgerClass.${code}`;
  const v = t(lc);
  return v && v !== lc ? v : txCodeLabel(code, t);
}

/** `txCategoryMainSub` ile aynı şemsiye/alt ayrımı, PDF etiketleriyle. */
export function pdfCategoryMainSub(
  code: string | null | undefined,
  t: (k: string) => string
): { main: string; sub: string | null } {
  const c = String(code ?? "").trim();
  if (!c) return { main: "", sub: null };
  const umbrella = umbrellaTxMainForSubOptions(c);
  return {
    main: pdfCodeLabel(umbrella, t),
    sub: c !== umbrella ? pdfCodeLabel(c, t) : null,
  };
}

/** `txCategoryLine` karşılığı (ana · alt), PDF etiketleriyle. */
export function pdfTxCategoryLine(
  main: string | null | undefined,
  cat: string | null | undefined,
  t: (k: string) => string
): string {
  const m = main ? pdfCodeLabel(main, t) : "";
  const c = cat ? pdfCodeLabel(cat, t) : "";
  if (m && c) return `${m} · ${c}`;
  return m || c || "";
}
