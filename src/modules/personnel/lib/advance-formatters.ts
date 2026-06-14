import type { Locale } from "@/i18n/messages";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import type { Advance } from "@/types/advance";
import type { BranchTransaction } from "@/types/branch-transaction";

/** Avans tarihini lokalize edilmiş kısa biçimde döndürür; ISO boşsa `dash`. */
export function formatAdvanceDay(
  iso: string,
  locale: Locale,
  dash: string,
): string {
  return formatLocaleDate(iso, locale, dash);
}

/**
 * Personel'e atfedilmiş bir şube giderinin aslen avans satırı olup olmadığını söyler.
 * - `category === "PER_ADVANCE"` ise true.
 * - `linkedAdvanceId > 0` ise true.
 */
export function attributedExpenseRowIsAdvance(row: BranchTransaction): boolean {
  const cat = String(row.category ?? "").trim().toUpperCase();
  if (cat === "PER_ADVANCE") return true;
  const lid = row.linkedAdvanceId;
  return lid != null && lid > 0;
}

/**
 * Avans listesini tarihe göre azalan, eşitlikte id'ye göre azalan sıralar.
 * Generic — `Advance`'i extend eden tipler (örn. `AdvanceListItem`) için de çalışır.
 */
export function sortAdvancesDesc<T extends Advance>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const da = a.advanceDate.slice(0, 10);
    const db = b.advanceDate.slice(0, 10);
    if (da !== db) return db.localeCompare(da);
    return b.id - a.id;
  });
}

/**
 * Avans `sourceType` için i18n kısaltma etiketi.
 * - PATRON, PATRON_BRANCH, BANK, PERSONNEL_HELD_REGISTER_CASH | PERSONNEL_POCKET, varsayılan KASA.
 */
export function sourceAbbrev(
  t: (k: string) => string,
  st: string,
): string {
  const u = String(st ?? "").toUpperCase();
  if (u === "PATRON") return t("personnel.advanceSourceAbbrPatron");
  if (u === "PATRON_BRANCH")
    return t("personnel.advanceSourceAbbrPatronBranch");
  if (u === "BANK") return t("personnel.advanceSourceAbbrBank");
  if (u === "PERSONNEL_HELD_REGISTER_CASH" || u === "PERSONNEL_POCKET")
    return t("personnel.advanceSourceAbbrHeldRegister");
  return t("personnel.advanceSourceAbbrCash");
}
