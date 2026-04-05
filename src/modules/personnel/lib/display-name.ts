import type { Personnel } from "@/types/personnel";

export function personnelDisplayName(p: Personnel): string {
  const n = p.fullName?.trim();
  if (n) return n;
  return String(p.id);
}
