/**
 * İndirilen PDF'ler için okunabilir, dosya sistemine güvenli adlar üretir.
 * Şube/cari isimleri ve sevkiyat no/tarihi gibi parçaları « - » ile birleştirir;
 * ham id veya «branch/invoice-…» gibi teknik etiketler kullanılmaz.
 */

// Dosya adında kullanılamayan karakterler (Windows/macOS/Linux ortak yasaklılar) + kontrol karakterleri.
// Tire ve boşluk bilinçli olarak listede değil: «SVK-2024-0012» gibi belge numaraları korunur,
// boşluklar ise ayrıca sadeleştirilir.
const ILLEGAL_FILE_NAME_CHARS = /[<>:"/\\|?*\x00-\x1f]+/g;

/** Tek bir ad parçasını temizler: yasaklı karakterleri boşluğa çevirir, boşlukları sadeleştirir. */
export function sanitizeFileNamePart(raw: string | null | undefined): string {
  return String(raw ?? "")
    .replace(ILLEGAL_FILE_NAME_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parçaları birleştirip `.pdf` uzantılı bir dosya adı döndürür.
 * Boş/temizlenince boşa düşen parçalar atlanır; hiçbiri kalmazsa `fallback` kullanılır.
 */
export function buildPdfFileName(
  parts: Array<string | number | null | undefined>,
  opts?: { fallback?: string; maxLength?: number }
): string {
  const maxLength = opts?.maxLength ?? 150;
  const fallback = opts?.fallback ?? "belge";
  const cleaned = parts
    .map((p) => sanitizeFileNamePart(p == null ? "" : String(p)))
    .filter((p) => p.length > 0);
  const base = (cleaned.join(" - ") || fallback).slice(0, maxLength).trim();
  return `${base}.pdf`;
}
