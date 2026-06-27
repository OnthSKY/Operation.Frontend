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
