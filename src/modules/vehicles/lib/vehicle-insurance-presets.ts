/** Sigorta türü / şirket combobox sabitleri; API’ye yerelleştirilmiş etiket gider. */

export const VEHICLE_INSURANCE_OTHER_SLUG = "other" as const;

export const VEHICLE_INSURANCE_TYPE_SLUGS = [
  "compulsory_traffic",
  "comprehensive",
  "imm",
  "green_card",
  "personal_accident",
  "glass",
  "mini_repair",
  "legal_protection",
] as const;

export type VehicleInsuranceTypeSlug = (typeof VEHICLE_INSURANCE_TYPE_SLUGS)[number];

export const VEHICLE_INSURANCE_COMPANY_SLUGS = [
  "anadolu",
  "ak",
  "allianz",
  "axa",
  "mapfre",
  "hdi",
  "sompo",
  "ray",
  "zurich",
  "generali",
  "groupama",
  "turk_nippon",
  "neova",
  "quick",
  "koru",
  "hepiyi",
  "bereket",
  "ethica",
  "ziraat",
  "halk",
  "turkiye_katilim",
] as const;

export type VehicleInsuranceCompanySlug = (typeof VEHICLE_INSURANCE_COMPANY_SLUGS)[number];

/** Eski serbest metin / kısaltmalar. */
export const VEHICLE_INSURANCE_TYPE_ALIASES: Partial<
  Record<VehicleInsuranceTypeSlug, readonly string[]>
> = {
  compulsory_traffic: ["trafik", "zorunlu trafik", "traffic"],
  comprehensive: ["kasko"],
  imm: ["ihtiyari mali", "ihtiyari mali mesuliyet", "imm"],
  green_card: ["yeşil kart", "yesil kart", "green card"],
  personal_accident: ["ferdi kaza"],
  glass: ["cam sigortası", "cam sigortasi"],
  mini_repair: ["mini onarım", "mini onarim"],
  legal_protection: ["hukuki koruma", "lkm"],
};

export const VEHICLE_INSURANCE_COMPANY_ALIASES: Partial<
  Record<VehicleInsuranceCompanySlug, readonly string[]>
> = {
  anadolu: ["anadolu sigorta"],
  ak: ["ak sigorta", "aksigorta"],
  allianz: ["allianz sigorta"],
  axa: ["axa sigorta"],
  mapfre: ["mapfre sigorta", "mapfre genel"],
  hdi: ["hdi sigorta"],
  sompo: ["sompo sigorta", "sompo japan"],
  ray: ["ray sigorta"],
  zurich: ["zurich sigorta"],
  generali: ["generali sigorta"],
  groupama: ["groupama sigorta"],
  turk_nippon: ["türk nippon", "turk nippon", "nippon"],
  neova: ["neova sigorta"],
  quick: ["quick sigorta"],
  koru: ["koru sigorta"],
  hepiyi: ["hepiyi sigorta"],
  bereket: ["bereket katılım", "bereket sigorta"],
  ethica: ["ethica sigorta"],
  ziraat: ["ziraat sigorta"],
  halk: ["halk sigorta"],
  turkiye_katilim: ["türkiye katılım", "turkiye katilim"],
};

function norm(s: string) {
  return s.toLocaleLowerCase("tr-TR").normalize("NFD").trim();
}

/** Eski serbest metin / yerelleştirilmiş etiket eşlemesi. */
export function matchInsurancePresetSlug(
  stored: string,
  slugs: readonly string[],
  otherSlug: string,
  t: (key: string) => string,
  i18nKeyPrefix: string,
  extraAliases?: Partial<Record<string, readonly string[]>>
): { slug: string; custom: string } {
  const trimmed = stored.trim();
  if (!trimmed) return { slug: "", custom: "" };

  for (const slug of slugs) {
    const label = t(`${i18nKeyPrefix}.${slug}`);
    if (trimmed === label || trimmed === slug) return { slug, custom: "" };
    if (norm(trimmed) === norm(label)) return { slug, custom: "" };
    const aliases = extraAliases?.[slug];
    if (aliases?.some((a) => norm(trimmed) === norm(a))) {
      return { slug, custom: "" };
    }
  }

  return { slug: otherSlug, custom: trimmed };
}
