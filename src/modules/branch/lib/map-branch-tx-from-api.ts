/** Maps API ledger fields to UI `type` and `mainCategory`. */

export function branchTxDirectionAndClassificationFromApi(
  raw: Record<string, unknown>
): { type: string; mainCategory: string | null } {
  const ld = String(raw.ledgerDirection ?? raw.LedgerDirection ?? "").trim().toUpperCase();
  const cc = String(raw.classificationCode ?? raw.ClassificationCode ?? "").trim();
  const legacyType = String(raw.type ?? raw.Type ?? "").trim().toUpperCase();
  const lm = raw.mainCategory ?? raw.MainCategory;
  const legacyMain = lm != null && String(lm).trim() ? String(lm).trim() : "";
  return {
    type: ld || legacyType,
    mainCategory: cc || legacyMain || null,
  };
}
