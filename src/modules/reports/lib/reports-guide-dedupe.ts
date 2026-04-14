/** Loose de-duplication for help paragraphs already echoed in the summary area. */

export function normalizeGuideDedupeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s: string): Set<string> {
  const out = new Set<string>();
  for (const w of normalizeGuideDedupeText(s).split(" ")) {
    if (w.length > 2) out.add(w);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

export function isGuideParagraphRedundant(candidate: string, corpus: string[]): boolean {
  const c = normalizeGuideDedupeText(candidate);
  if (c.length < 36) return false;
  const cTokens = tokenSet(candidate);
  if (cTokens.size < 6) return false;

  for (const raw of corpus) {
    const x = normalizeGuideDedupeText(raw);
    if (x.length < 24) continue;
    if (x.includes(c) || c.includes(x)) return true;

    const j = jaccard(cTokens, tokenSet(raw));
    if (j >= 0.52 && Math.min(c.length, x.length) > 55) return true;
  }
  return false;
}
