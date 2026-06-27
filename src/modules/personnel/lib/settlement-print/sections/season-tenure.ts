/** Personel sezon kıdemi bloğu + takvim ay/gün hesapları (yalnız bu bölümde kullanılır). */
import type { Locale } from "@/i18n/messages";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { escapeHtml } from "../format";

const SUGGESTED_SALARY_PARTIAL_MONTH_DAYS = 30;

type Ymd = { y: number; m: number; d: number };

function parseYmd(iso: string): Ymd | null {
  const s = iso.trim().slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dim = new Date(y, mo, 0).getDate();
  if (d > dim) return null;
  return { y, m: mo, d };
}

function ymdCompare(a: Ymd, b: Ymd): number {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if (a.m !== b.m) return a.m < b.m ? -1 : 1;
  if (a.d !== b.d) return a.d < b.d ? -1 : 1;
  return 0;
}

function addOneCalendarMonth(ymd: Ymd): Ymd {
  let { y, m } = ymd;
  const { d } = ymd;
  if (m === 12) {
    y += 1;
    m = 1;
  } else {
    m += 1;
  }
  const max = new Date(y, m, 0).getDate();
  return { y, m, d: Math.min(d, max) };
}

function dayDiffYmd(a: Ymd, b: Ymd): number {
  const t0 = Date.UTC(a.y, a.m - 1, a.d);
  const t1 = Date.UTC(b.y, b.m - 1, b.d);
  return Math.round((t1 - t0) / 86400000);
}

/** Tam ay + kalan gün (aynı gün kuralı; ay sonu taşması kısaltılır). */
function calendarMonthsAndDaysFromTo(
  startIso: string,
  endIso: string
): { months: number; days: number } | null {
  const start = parseYmd(startIso);
  const end = parseYmd(endIso);
  if (!start || !end) return null;
  if (ymdCompare(start, end) > 0) return null;
  let months = 0;
  let cur = start;
  for (;;) {
    const next = addOneCalendarMonth(cur);
    if (ymdCompare(next, end) > 0) break;
    months += 1;
    cur = next;
  }
  const days = dayDiffYmd(cur, end);
  return { months, days };
}

function inclusiveCalendarDaysFromTo(startIso: string, endIso: string): number | null {
  const start = parseYmd(startIso);
  const end = parseYmd(endIso);
  if (!start || !end) return null;
  if (ymdCompare(start, end) > 0) return null;
  return dayDiffYmd(start, end) + 1;
}

export function renderPersonnelSeasonTenureBlock(opts: {
  seasonArrivalIso: string;
  todayIso: string;
  monthlySalary: number | null | undefined;
  currencyCode: string;
  t: (k: string) => string;
  locale: Locale;
  dash: string;
}): string {
  const { t, locale, dash } = opts;
  const tenure = calendarMonthsAndDaysFromTo(
    opts.seasonArrivalIso,
    opts.todayIso
  );
  if (!tenure) return "";
  const totalDays = inclusiveCalendarDaysFromTo(opts.seasonArrivalIso, opts.todayIso);
  if (totalDays == null) return "";
  const arrivalDisp = formatLocaleDate(
    opts.seasonArrivalIso,
    locale,
    dash
  );
  const asOfDisp = formatLocaleDate(opts.todayIso, locale, dash);
  const body = t("personnel.settlementPrintSeasonTenureLine")
    .replace("{arrival}", arrivalDisp)
    .replace("{asOf}", asOfDisp)
    .replace("{months}", String(tenure.months))
    .replace("{days}", String(tenure.days));
  const workedDaysLine = t("personnel.settlementPrintSeasonWorkedDaysLine")
    .replace("{arrival}", arrivalDisp)
    .replace("{days}", String(totalDays));

  const ccy = String(opts.currencyCode ?? "TRY").trim().toUpperCase() || "TRY";
  const sal = opts.monthlySalary;
  const hasSalary = sal != null && Number.isFinite(sal) && sal > 0;
  let salaryBlock = "";
  if (hasSalary) {
    const raw = sal * (tenure.months + tenure.days / SUGGESTED_SALARY_PARTIAL_MONTH_DAYS);
    const rounded = Math.round(raw * 100) / 100;
    const amt = formatMoneyDash(rounded, dash, locale, ccy);
    salaryBlock = `<p class="season-tenure-salary"><span class="mk">${escapeHtml(
      t("personnel.settlementPrintSuggestedAccruedSalaryLabel")
    )}</span> ${escapeHtml(amt)}</p><p class="season-tenure-basis">${escapeHtml(
      t("personnel.settlementPrintSuggestedAccruedSalaryBasis").replace(
        "{n}",
        String(SUGGESTED_SALARY_PARTIAL_MONTH_DAYS)
      )
    )}</p>`;
  }

  const disclaimerBlock = hasSalary
    ? `<p class="season-tenure-disclaimer">${escapeHtml(
        t("personnel.settlementPrintSuggestedAccruedSalaryDisclaimer")
      )}</p>`
    : "";

  return `<section class="season-tenure-callout" role="note">
  <div class="season-tenure-title">${escapeHtml(
    t("personnel.settlementPrintSeasonTenureTitle")
  )}</div>
  <p class="season-tenure-body"><strong>${escapeHtml(workedDaysLine)}</strong></p>
  <p class="season-tenure-body">${escapeHtml(body)}</p>
  ${salaryBlock}
  ${disclaimerBlock}
</section>`;
}
