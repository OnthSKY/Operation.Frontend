import type { Locale } from "@/i18n/messages";

export function fillDashboardTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => vars[key] ?? "—"
  );
}

export const PERSONNEL_JOB_TITLE_KEYS = new Set([
  "GENERAL_MANAGER",
  "BRANCH_SUPERVISOR",
  "DRIVER",
  "CRAFTSMAN",
  "WAITER",
  "COMMIS",
  "CASHIER",
  "BRANCH_INTERNAL_HELP",
  "MANAGER",
  "BACK_HOUSE_HELPER",
]);

export function personnelJobTitleLabel(
  t: (key: string) => string,
  code: string,
  fallback: string
): string {
  const u = code?.trim().toUpperCase() ?? "";
  if (PERSONNEL_JOB_TITLE_KEYS.has(u)) return t(`personnel.jobTitles.${u}`);
  return code?.trim() || fallback;
}

export function formatTenure(
  years: number,
  months: number,
  locale: Locale
): string {
  if (locale === "tr") {
    if (years > 0 && months > 0) return `${years} yıl ${months} ay`;
    if (years > 0) return `${years} yıl`;
    return `${months} ay`;
  }
  if (years > 0 && months > 0) return `${years} yr ${months} mo`;
  if (years > 0) return `${years} yr`;
  return `${months} mo`;
}
