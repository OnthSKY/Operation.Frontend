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

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Inclusive local calendar days from `from` through `to` (order-independent).
 * Caps at `maxDays` and sets `truncated` when the span exceeds the cap.
 */
export function enumerateLocalIsoDatesInclusive(
  from: string,
  to: string,
  maxDays: number
): { dates: string[]; truncated: boolean } {
  const f = from.trim().slice(0, 10);
  const t = to.trim().slice(0, 10);
  if (!YMD.test(f) || !YMD.test(t) || !Number.isFinite(maxDays) || maxDays < 1) {
    return { dates: [], truncated: false };
  }
  let a = f;
  let b = t;
  if (a > b) {
    const x = a;
    a = b;
    b = x;
  }
  const dates: string[] = [];
  let cur = a;
  let truncated = false;
  while (cur <= b) {
    if (dates.length >= maxDays) {
      truncated = true;
      break;
    }
    dates.push(cur);
    const next = addDaysToLocalIsoDate(cur, 1);
    if (!next || next <= cur) break;
    cur = next;
  }
  return { dates, truncated };
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
