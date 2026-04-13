/** YYYY-MM-DD in local calendar (avoids UTC midnight shifting the day). */
export function localIsoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** `iso` must be `YYYY-MM-DD` (local calendar day). Returns same format after adding `days`. */
export function addDaysToLocalIsoDate(iso: string, days: number): string {
  const d = iso.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(y, m - 1, day);
  dt.setDate(dt.getDate() + days);
  return localIsoDate(dt);
}

/** `YYYY-MM-DDTHH:mm` for `<input type="datetime-local" />` (local clock, not UTC). */
export function localIsoDateTime(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

/**
 * Default value for forms: full local now, or if parent passes only a calendar day (YYYY-MM-DD),
 * that day at the current local time.
 */
export function defaultDateTimeFromInput(s: string | undefined | null, now = new Date()): string {
  const t = localIsoDateTime(now);
  if (s == null || !String(s).trim()) return t;
  const v = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return v.slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T${t.slice(11)}`;
  return t;
}
