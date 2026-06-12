import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type { Locale } from "@/i18n/messages";
import type { Personnel } from "@/types/personnel";
import type { IncomeCashBranchManagerPersonRow } from "@/types/branch";
import type { SelectOption } from "@/shared/ui/Select";

/**
 * Personel zimmetindeki kasa nakdi satırlarından dropdown seçenekleri üretir.
 *
 * Etiket formatı: «Ad Soyad · İş başlığı — Zimmetteki tutar: 1.234,56 TL»
 *
 * - Personel bulunmazsa fullName veya `#id` fallback
 * - amount > 0.005 olan satırlar süzülür
 * - locale-aware sıralama
 */
export type BuildHeldRegisterPersonOptionsInput = {
  rows: IncomeCashBranchManagerPersonRow[];
  allPersonnel: Personnel[];
  locale: Locale;
  t: (key: string) => string;
  /** İlk satır (placeholder) için label. */
  pickPlaceholderKey: string;
  /** Tutar etiketinin başına gelen ifade için i18n key. */
  amountLabelKey: string;
};

export function buildHeldRegisterPersonOptions(
  input: BuildHeldRegisterPersonOptionsInput
): SelectOption[] {
  const { rows, allPersonnel, locale, t, pickPlaceholderKey, amountLabelKey } = input;
  const empty = { value: "", label: t(pickPlaceholderKey) };
  const loc = locale === "tr" ? "tr" : "en";
  const opts = [...rows]
    .filter((r) => r.personnelId != null && r.personnelId > 0 && r.amount > 0.005)
    .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || "", loc))
    .map((r) => {
      const pid = r.personnelId as number;
      const p = allPersonnel.find((x) => x.id === pid);
      const namePart = p
        ? `${personnelDisplayName(p)} · ${t(`personnel.jobTitles.${p.jobTitle}`)}`
        : r.fullName || `#${pid}`;
      const amt = formatLocaleAmount(r.amount, locale);
      return {
        value: String(pid),
        label: `${namePart} — ${t(amountLabelKey)}: ${amt}`,
      };
    });
  return [empty, ...opts];
}
