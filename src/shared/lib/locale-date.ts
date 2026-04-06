import type { Locale } from "@/i18n/messages";

const bcp47: Record<Locale, string> = { tr: "tr-TR", en: "en-US" };

const dateOpts: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

/**
 * Calendar date for display. YYYY-MM-DD prefix uses noon local to avoid TZ drift.
 * tr-TR → dd.MM.yyyy; en-US → MM/dd/yyyy.
 */
export function formatLocaleDate(
  iso: string | null | undefined,
  locale: Locale,
  fallback = "—"
): string {
  const raw = typeof iso === "string" ? iso.trim() : "";
  if (!raw) return fallback;
  const ymd = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const dt = new Date(`${ymd}T12:00:00`);
    if (Number.isNaN(dt.getTime())) return raw;
    return dt.toLocaleDateString(bcp47[locale], dateOpts);
  }
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString(bcp47[locale], dateOpts);
}

/** Sabit örnek ISO; gösterilen biçimin kullanıcıya örnekle anlatılması için. */
const DISPLAY_DEMO_ISO = "2000-06-15";

export function localeDateDisplayExample(locale: Locale): string {
  return formatLocaleDate(DISPLAY_DEMO_ISO, locale, "—");
}

export function formatLocaleDateTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dateStr = d.toLocaleDateString(bcp47[locale], dateOpts);
  const timeStr = d.toLocaleTimeString(bcp47[locale], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} ${timeStr}`;
}
