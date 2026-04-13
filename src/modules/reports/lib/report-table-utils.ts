export type SortDir = "asc" | "desc";

export function normalizeSearch(q: string): string {
  return q.trim().toLowerCase();
}

export function rowMatchesQuery(haystack: string, q: string): boolean {
  const n = normalizeSearch(q);
  if (!n) return true;
  return haystack.toLowerCase().includes(n);
}

export function compareValues(
  a: string | number,
  b: string | number,
  dir: SortDir
): number {
  if (typeof a === "number" && typeof b === "number") {
    const d = a - b;
    return dir === "asc" ? d : -d;
  }
  const c = String(a)
    .toLowerCase()
    .localeCompare(String(b).toLowerCase(), undefined, { sensitivity: "base" });
  return dir === "asc" ? c : -c;
}
