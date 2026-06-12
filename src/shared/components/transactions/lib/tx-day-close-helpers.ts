import { localIsoDate } from "@/shared/lib/local-iso-date";

/**
 * Gün sonu ve bundled gider satırları için saf yardımcı fonksiyonlar.
 * Hiçbiri React veya form state'i kullanmaz.
 */

/** Devir tutarı (örn. handover) prefill formatı: pozitif → 2 ondalık string; aksi halde "". */
export function formatHandoverAmountPrefill(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  return (Math.round(n * 100) / 100).toFixed(2);
}

/**
 * Gün sonu için tarih: girdi tarihinin (yoksa bugünün) saatini 23:59'a sabitler.
 * Kullanıcı sonradan değiştirebilir.
 */
export function dayCloseDateTimeFromInput(
  s: string | undefined | null,
  now = new Date()
): string {
  const raw = String(s ?? "").trim();
  let datePart = localIsoDate(now);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) datePart = raw.slice(0, 10);
  else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) datePart = raw;
  return `${datePart}T23:59`;
}

/** Bundled gider satırı için benzersiz id (crypto varsa UUIDv4, yoksa fallback). */
export function newBundledExpenseLineId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
