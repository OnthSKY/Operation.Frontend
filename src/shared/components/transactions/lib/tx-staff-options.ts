import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import type { Locale } from "@/i18n/messages";
import type { Personnel } from "@/types/personnel";
import type { Branch } from "@/types/branch";
import type { SelectOption } from "@/shared/ui/Select";

/**
 * Personel ve şube dropdown'ları için saf yardımcılar.
 * İsim formatı: «Ad Soyad · İş başlığı».
 * Sıralama: locale-aware (TR/EN), boş placeholder her zaman başta.
 */

export function buildPersonnelOptions(input: {
  personnel: Personnel[];
  locale: Locale;
  t: (key: string) => string;
  placeholderKey: string;
  /** Sadece bu şubedeki personeli filtrele (null = tümü). */
  branchIdFilter?: number | null;
}): SelectOption[] {
  const { personnel, locale, t, placeholderKey, branchIdFilter } = input;
  const list = personnel.filter(
    (p) =>
      !p.isDeleted &&
      (branchIdFilter == null || p.branchId === branchIdFilter)
  );
  const loc = locale === "tr" ? "tr" : "en";
  return [
    { value: "", label: t(placeholderKey) },
    ...[...list]
      .sort((a, b) => a.fullName.localeCompare(b.fullName, loc))
      .map((p) => ({
        value: String(p.id),
        label: `${personnelDisplayName(p)} · ${t(`personnel.jobTitles.${p.jobTitle}`)}`,
      })),
  ];
}

/** Şube dropdown'ı (personel gider akışı için hedef şube seçici). */
export function buildBranchSelectOptions(input: {
  branches: Branch[];
  locale: Locale;
  t: (key: string) => string;
  placeholderKey: string;
}): SelectOption[] {
  const { branches, locale, t, placeholderKey } = input;
  const loc = locale === "tr" ? "tr" : "en";
  return [
    { value: "", label: t(placeholderKey) },
    ...[...branches]
      .sort((a, b) => a.name.localeCompare(b.name, loc))
      .map((b) => ({ value: String(b.id), label: b.name })),
  ];
}
