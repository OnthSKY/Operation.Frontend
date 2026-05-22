/** Sipariş-hesap dökümü PDF notları (`company=… · branch=…`). */
export function parseOrderAccountDocumentMetadata(
  notes: string | null | undefined
): Record<string, string> {
  const text = String(notes ?? "");
  const parts = text.split("·").map((x) => x.trim()).filter(Boolean);
  const map: Record<string, string> = {};
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const value = part.slice(eqIdx + 1).trim();
    if (!key || !value) continue;
    map[key] = value;
  }
  return map;
}

export function isOrderAccountStatementPdfNote(notes: string | null | undefined): boolean {
  const text = String(notes ?? "");
  return text.includes("Sipariş-hesap dökümü PDF");
}
