import type { Personnel } from "@/types/personnel";

/** Pozitif tam sayı user id'sini güvenli şekilde normalleştirir; aksi halde `null`. */
export function normalizePositiveUserId(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Personel kaydının sistemde bir kullanıcı hesabıyla eşleşip eşleşmediği. */
export function hasLinkedSystemUser(p: Personnel): boolean {
  return normalizePositiveUserId(p.userId) != null;
}
