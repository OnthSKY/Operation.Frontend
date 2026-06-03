/** Türkçe karakterleri sadeleştirip URL-dostu slug üretir (ör. "Çikolatalı" → "cikolatali"). */
export function slugify(value: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u" };
  return value
    .replace(/[çğıİöşü]/gi, (c) => map[c.toLowerCase()] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
