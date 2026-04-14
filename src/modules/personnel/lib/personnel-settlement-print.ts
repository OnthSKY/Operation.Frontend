import { fetchBranchNotes } from "@/modules/branch/api/branch-notes-api";
import {
  fetchAllBranchStockReceipts,
  fetchAllBranchTransactionsPaged,
} from "@/modules/branch/api/branches-api";
import { fetchAllNonAdvancePersonnelAttributedExpenses } from "@/modules/branch/api/branch-transactions-api";
import {
  expensePaymentSourceLabel,
  txCategoryLine,
} from "@/modules/branch/lib/branch-transaction-options";
import {
  fetchBranchPersonnelSalaryCostEstimates,
  fetchPersonnel,
  fetchPersonnelSalaryCostEstimate,
  personnelProfilePhotoUrl,
} from "@/modules/personnel/api/personnel-api";
import { apiFetch } from "@/shared/api/client";
import {
  fetchAdvancesByPersonnel,
  fetchAllAdvances,
} from "@/modules/personnel/api/advances-api";
import { fetchPersonnelNotes } from "@/modules/personnel/api/personnel-notes-api";
import {
  filterNonAdvanceExpenseRows,
  linkTypeLabel,
  resolveNonAdvanceRow,
} from "@/modules/personnel/components/personnel-non-advance-expense-blocks";
import { DEFAULT_NON_ADVANCE_EXPENSE_SORT } from "@/modules/personnel/lib/non-advance-expense-sort";
import { isoCalendarYear } from "@/modules/personnel/lib/settlement-print-season";
import type { PersonnelSalaryCostEstimate } from "@/types/personnel-salary-cost-estimate";
import type { Advance, AdvanceListItem } from "@/types/advance";
import type { BranchStockReceiptRow } from "@/types/branch";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Locale } from "@/i18n/messages";
import type { Personnel } from "@/types/personnel";
import { formatLocaleDate, formatLocaleDateTime } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";

const BRANCH_ADVANCES_PRINT_LIMIT = 1000;

/**
 * Güvenlik: `document.write` ile üretilen HTML’e API/DB’den gelen metinleri **yalnızca**
 * `escapeHtml` (veya eşdeğeri) ile ekleyin; ham string birleştirme DOM XSS açar.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeDownloadFilename(title: string): string {
  const d = new Date().toISOString().slice(0, 10);
  const base =
    title
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 72) || "settlement";
  return `${base}-${d}.html`;
}

function sortAdvancesDesc<T extends Advance>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const da = a.advanceDate.slice(0, 10);
    const db = b.advanceDate.slice(0, 10);
    if (da !== db) return db.localeCompare(da);
    return b.id - a.id;
  });
}

function sortExpensesDesc(rows: BranchTransaction[]): BranchTransaction[] {
  return [...rows].sort((a, b) => {
    const d = b.transactionDate.localeCompare(a.transactionDate);
    if (d !== 0) return d;
    return b.id - a.id;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("read"));
    r.readAsDataURL(blob);
  });
}

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
  let { y, m, d } = ymd;
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

async function loadPersonnelSettlementPersonRow(
  personnelId: number
): Promise<{ personnel: Personnel | null; profilePhotoDataUrl: string | null }> {
  try {
    const personnel = await fetchPersonnel(personnelId);
    let profilePhotoDataUrl: string | null = null;
    if (personnel.hasProfilePhoto1 === true) {
      const res = await apiFetch(
        personnelProfilePhotoUrl(personnelId, 1, {
          profilePhoto1Url: personnel.profilePhoto1Url,
          profilePhoto2Url: personnel.profilePhoto2Url,
        })
      );
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0) profilePhotoDataUrl = await blobToDataUrl(blob);
      }
    }
    return { personnel, profilePhotoDataUrl };
  } catch {
    return { personnel: null, profilePhotoDataUrl: null };
  }
}

function renderPersonnelSeasonTenureBlock(opts: {
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
  <p class="season-tenure-body">${escapeHtml(body)}</p>
  ${salaryBlock}
  ${disclaimerBlock}
</section>`;
}

function salaryTypeLabel(t: (k: string) => string, salaryType: string): string {
  const u = String(salaryType ?? "").toUpperCase();
  if (u === "NET") return t("personnel.settlementSalaryCostSalaryTypeNet");
  return t("personnel.settlementSalaryCostSalaryTypeGross");
}

function renderSalaryDisclaimerBlock(
  t: (k: string) => string,
  escape: (s: string) => string
): string {
  return `<div class="salary-cost-disclaimer" role="note">
  <div class="salary-cost-disclaimer-title">${escape(t("personnel.settlementSalaryCostDisclaimerTitle"))}</div>
  <p class="salary-cost-disclaimer-body">${escape(t("personnel.settlementSalaryCostDisclaimerBody"))}</p>
</div>`;
}

function renderPersonnelSalaryCostSection(
  est: PersonnelSalaryCostEstimate,
  t: (k: string) => string,
  locale: Locale,
  dash: string,
  escape: (s: string) => string
): string {
  const secTitle = escape(t("personnel.settlementPrintSectionSalaryCost"));
  const disclaimer = renderSalaryDisclaimerBlock(t, escape);
  const ccy = String(est.currencyCode ?? "TRY").trim().toUpperCase() || "TRY";

  if (!est.hasEstimate) {
    let msg = t("personnel.settlementSalaryCostNoSalary");
    if (est.messageCode === "no_parameter_set")
      msg = t("personnel.settlementSalaryCostNoParameterSet");
    return `<section class="salary-cost-section">
  <h2>${secTitle}</h2>
  ${disclaimer}
  <p class="meta salary-cost-meta">${escape(msg)}</p>
</section>`;
  }

  const row = (label: string, amount: number | null | undefined) =>
    amount == null || !Number.isFinite(amount)
      ? ""
      : `<tr><td>${escape(label)}</td><td class="num">${escape(formatMoneyDash(amount, dash, locale, ccy))}</td></tr>`;

  const asOfIso = String(est.asOfDate ?? "").slice(0, 10);
  const asOfDisp =
    asOfIso && /^\d{4}-\d{2}-\d{2}$/.test(asOfIso)
      ? formatLocaleDate(asOfIso, locale, dash)
      : dash;
  const paramLine =
    est.parameterSetCode?.trim() != null && est.parameterSetCode.trim() !== ""
      ? `<p class="meta salary-cost-meta"><span class="mk">${escape(t("personnel.settlementSalaryCostParamSet"))}</span> ${escape(est.parameterSetCode.trim())} · <span class="mk">${escape(t("personnel.settlementSalaryCostAsOf"))}</span> ${escape(asOfDisp)}</p>`
      : `<p class="meta salary-cost-meta"><span class="mk">${escape(t("personnel.settlementSalaryCostAsOf"))}</span> ${escape(asOfDisp)}</p>`;

  const basis = `${salaryTypeLabel(t, est.salaryType)} — ${t("personnel.settlementSalaryCostEnteredBasis")}`;
  const entered = est.enteredSalaryAmount;

  const manualRows =
    est.usesManualEmployerCostOverride === true &&
    est.manualTotalEmployerCost != null
      ? `<tr class="salary-cost-highlight-row"><td>${escape(t("personnel.settlementSalaryCostManualOverride"))}</td><td class="num">${escape(formatMoneyDash(est.manualTotalEmployerCost, dash, locale, ccy))}</td></tr>`
      : "";

  const indicative = est.indicativeTotalEmployerCost;
  const indicativeRow =
    indicative != null && Number.isFinite(indicative)
      ? `<tr class="salary-cost-total-row"><td>${escape(t("personnel.settlementSalaryCostIndicativeTotal"))}</td><td class="num">${escape(formatMoneyDash(indicative, dash, locale, ccy))}</td></tr>`
      : "";

  return `<section class="salary-cost-section">
  <h2>${secTitle}</h2>
  ${disclaimer}
  ${paramLine}
  <table class="salary-cost-table">
    <thead><tr><th>${escape(t("personnel.settlementSalaryCostColConcept"))}</th><th class="num">${escape(t("personnel.settlementSalaryCostColAmount"))} (${escape(ccy)})</th></tr></thead>
    <tbody>
      <tr><td>${escape(basis)}</td><td class="num">${entered != null && Number.isFinite(entered) ? escape(formatMoneyDash(entered, dash, locale, ccy)) : escape(dash)}</td></tr>
      ${row(t("personnel.settlementSalaryCostGross"), est.grossSalary)}
      ${row(t("personnel.settlementSalaryCostNet"), est.netSalary)}
      ${row(t("personnel.settlementSalaryCostEmployeeSgk"), est.employeeSgkDeduction)}
      ${row(t("personnel.settlementSalaryCostEmployeeUnemp"), est.employeeUnemploymentDeduction)}
      ${row(t("personnel.settlementSalaryCostIncomeTax"), est.incomeTax)}
      ${row(t("personnel.settlementSalaryCostStamp"), est.stampTax)}
      ${row(t("personnel.settlementSalaryCostEmployerSgk"), est.employerSgkCost)}
      ${row(t("personnel.settlementSalaryCostEmployerUnemp"), est.employerUnemploymentCost)}
      <tr><td>${escape(t("personnel.settlementSalaryCostCalculatedEmployerTotal"))}</td><td class="num">${est.calculatedTotalEmployerCost != null && Number.isFinite(est.calculatedTotalEmployerCost) ? escape(formatMoneyDash(est.calculatedTotalEmployerCost, dash, locale, ccy)) : escape(dash)}</td></tr>
      ${manualRows}
      ${indicativeRow}
    </tbody>
  </table>
</section>`;
}

function renderBranchSalaryCostSection(
  items: PersonnelSalaryCostEstimate[],
  t: (k: string) => string,
  locale: Locale,
  dash: string,
  escape: (s: string) => string
): string {
  const secTitle = escape(t("personnel.settlementPrintSectionSalaryCost"));
  const disclaimer = renderSalaryDisclaimerBlock(t, escape);
  const hint = escape(t("personnel.settlementSalaryCostBranchTableHint"));
  const colName = escape(t("personnel.settlementPrintColPersonnel"));
  const colType = escape(t("personnel.settlementSalaryCostColSalaryType"));
  const colEntered = escape(t("personnel.nonAdvanceExpensesColAmount"));
  const colIndicative = escape(t("personnel.settlementSalaryCostIndicativeTotal"));
  const colCcy = escape(t("personnel.nonAdvanceExpensesColCurrency"));

  const body = items
    .map((est) => {
      const name = escape(est.personnelFullName?.trim() || dash);
      const ccy =
        String(est.currencyCode ?? "TRY").trim().toUpperCase() || "TRY";
      const type = escape(salaryTypeLabel(t, est.salaryType));
      const ent =
        est.enteredSalaryAmount != null && Number.isFinite(est.enteredSalaryAmount)
          ? escape(formatMoneyDash(est.enteredSalaryAmount, dash, locale, ccy))
          : escape(dash);
      const ind =
        est.hasEstimate === true &&
        est.indicativeTotalEmployerCost != null &&
        Number.isFinite(est.indicativeTotalEmployerCost)
          ? escape(
              formatMoneyDash(est.indicativeTotalEmployerCost, dash, locale, ccy)
            )
          : escape(dash);
      return `<tr><td>${name}</td><td>${type}</td><td class="num">${ent}</td><td class="num">${ind}</td><td>${escape(ccy)}</td></tr>`;
    })
    .join("");

  return `<section class="salary-cost-section">
  <h2>${secTitle}</h2>
  ${disclaimer}
  <p class="meta salary-cost-meta">${hint}</p>
  <table class="salary-cost-table">
    <thead><tr><th>${colName}</th><th>${colType}</th><th class="num">${colEntered}</th><th class="num">${colIndicative}</th><th>${colCcy}</th></tr></thead>
    <tbody>${body || `<tr><td colspan="5">${escape(dash)}</td></tr>`}</tbody>
  </table>
</section>`;
}

function renderSalaryCostLoadFailedSection(
  t: (k: string) => string,
  escape: (s: string) => string
): string {
  return `<section class="salary-cost-section">
  <h2>${escape(t("personnel.settlementPrintSectionSalaryCost"))}</h2>
  ${renderSalaryDisclaimerBlock(t, escape)}
  <p class="meta salary-cost-meta">${escape(t("personnel.settlementSalaryCostLoadFailed"))}</p>
</section>`;
}

function sourceAbbrev(t: (k: string) => string, st: string): string {
  const u = st.toUpperCase();
  if (u === "PATRON") return t("personnel.advanceSourceAbbrPatron");
  if (u === "PATRON_BRANCH")
    return t("personnel.advanceSourceAbbrPatronBranch");
  if (u === "BANK") return t("personnel.advanceSourceAbbrBank");
  if (u === "PERSONNEL_POCKET")
    return t("personnel.advanceSourceAbbrPersonnelPocket");
  return t("personnel.advanceSourceAbbrCash");
}

function sumByCurrency(
  rows: { amount: number; currencyCode?: string | null }[]
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const c = String(r.currencyCode ?? "TRY").trim().toUpperCase() || "TRY";
    m.set(c, (m.get(c) ?? 0) + Number(r.amount));
  }
  return m;
}

function sumRegisterByType(
  rows: BranchTransaction[],
  typeNorm: "IN" | "OUT"
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (String(r.type ?? "").toUpperCase() !== typeNorm) continue;
    const c = String(r.currencyCode ?? "TRY").trim().toUpperCase() || "TRY";
    m.set(c, (m.get(c) ?? 0) + Number(r.amount));
  }
  return m;
}

function sumStockValuationByCurrency(rows: BranchStockReceiptRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const est = r.valuationLineEstimate;
    if (est == null || !Number.isFinite(est)) continue;
    const c = String(r.valuationCurrencyCode ?? "TRY").trim().toUpperCase() || "TRY";
    m.set(c, (m.get(c) ?? 0) + est);
  }
  return m;
}

function buildBranchStockSectionHtml(
  rows: BranchStockReceiptRow[],
  bp: BranchSettlementPdfOptions,
  t: (k: string) => string,
  locale: Locale,
  dash: string
): string {
  if (!bp.includeStockInbound) return "";
  const esc = escapeHtml;
  const sec = esc(t("branch.branchPdfSectionStock"));
  const colDate = esc(t("personnel.nonAdvanceExpensesColDate"));
  const colProd = esc(t("branch.stockColProduct"));
  const colWh = esc(t("branch.branchPdfColWarehouse"));
  const colQty = esc(t("branch.branchPdfColQty"));
  const colUnit = esc(t("branch.branchPdfColUnit"));
  const colUnitPrice = esc(t("branch.branchPdfColUnitPrice"));
  const colLineEst = esc(t("branch.branchPdfColLineValueEst"));
  const colCcy = esc(t("personnel.nonAdvanceExpensesColCurrency"));
  const priceHead = bp.stockShowPricing
    ? `<th class="num">${colUnitPrice}</th><th class="num">${colLineEst}</th><th>${colCcy}</th>`
    : "";
  const colspan = bp.stockShowPricing ? 8 : 5;
  const body = rows
    .map((r) => {
      const wh =
        r.warehouseName?.trim() ||
        (r.warehouseId != null && r.warehouseId > 0 ? `#${r.warehouseId}` : dash);
      const unit = r.unit?.trim() ? esc(r.unit.trim()) : dash;
      const qty = esc(formatMoneyDash(r.quantity, dash, locale, undefined));
      const priceCells = bp.stockShowPricing
        ? `<td class="num">${r.supplierUnitPrice != null && Number.isFinite(r.supplierUnitPrice) ? esc(formatMoneyDash(r.supplierUnitPrice, dash, locale, r.valuationCurrencyCode ?? undefined)) : esc(dash)}</td><td class="num">${r.valuationLineEstimate != null && Number.isFinite(r.valuationLineEstimate) ? esc(formatMoneyDash(r.valuationLineEstimate, dash, locale, r.valuationCurrencyCode ?? undefined)) : esc(dash)}</td><td>${r.valuationCurrencyCode ? esc(r.valuationCurrencyCode) : esc(dash)}</td>`
        : "";
      return `<tr>
        <td>${esc(formatLocaleDate(r.movementDate, locale, dash))}</td>
        <td>${esc(r.productName?.trim() || dash)}</td>
        <td>${esc(wh)}</td>
        <td class="num">${qty}</td>
        <td>${unit}</td>
        ${priceCells}
      </tr>`;
    })
    .join("");
  const foot = bp.stockShowPricing
    ? `<p class="meta">${esc(t("branch.branchPdfStockValuationFootnote"))}</p>`
    : "";
  return `<h2>${sec} (${rows.length})</h2>
  <table>
    <thead><tr>
      <th>${colDate}</th><th>${colProd}</th><th>${colWh}</th><th class="num">${colQty}</th><th>${colUnit}</th>${priceHead}
    </tr></thead>
    <tbody>${body || `<tr><td colspan="${colspan}">${esc(dash)}</td></tr>`}</tbody>
  </table>${foot}`;
}

function buildBranchRegisterSectionHtml(
  rows: BranchTransaction[],
  bp: BranchSettlementPdfOptions,
  t: (k: string) => string,
  locale: Locale,
  dash: string
): string {
  if (!bp.includeRegisterLedger) return "";
  const esc = escapeHtml;
  const sec = esc(t("branch.branchPdfSectionRegister"));
  const colDate = esc(t("personnel.nonAdvanceExpensesColDate"));
  const colType = esc(t("branch.branchPdfRegisterColType"));
  const colCat = esc(t("personnel.nonAdvanceExpensesColCategory"));
  const colAmt = esc(t("personnel.nonAdvanceExpensesColAmount"));
  const colCcy = esc(t("personnel.nonAdvanceExpensesColCurrency"));
  const colNote = esc(t("personnel.note"));
  const body = rows
    .map((row) => {
      const ty = String(row.type ?? "").toUpperCase();
      const typeLabel =
        ty === "IN"
          ? t("branch.branchPdfRegisterTypeIn")
          : ty === "OUT"
            ? t("branch.branchPdfRegisterTypeOut")
            : ty || dash;
      const cat = txCategoryLine(row.mainCategory, row.category, t)?.trim() || dash;
      const note = row.description?.trim() ? esc(row.description.trim()) : esc(dash);
      return `<tr>
        <td>${esc(formatLocaleDate(row.transactionDate, locale, dash))}</td>
        <td>${esc(typeLabel)}</td>
        <td>${esc(cat)}</td>
        <td class="num">${esc(formatMoneyDash(row.amount, dash, locale, row.currencyCode))}</td>
        <td>${esc(row.currencyCode)}</td>
        <td>${note}</td>
      </tr>`;
    })
    .join("");
  return `<h2>${sec} (${rows.length})</h2>
  <table>
    <thead><tr>
      <th>${colDate}</th><th>${colType}</th><th>${colCat}</th><th class="num">${colAmt}</th><th>${colCcy}</th><th>${colNote}</th>
    </tr></thead>
    <tbody>${body || `<tr><td colspan="6">${esc(dash)}</td></tr>`}</tbody>
  </table>`;
}

function buildAdvancesSummarySectionHtml(
  advances: Advance[] | AdvanceListItem[],
  advTotals: Map<string, number>,
  t: (k: string) => string,
  locale: Locale,
  dash: string
): string {
  const esc = escapeHtml;
  const sec = esc(t("personnel.settlementPrintSectionAdvances"));
  const badge = esc(t("branch.branchPdfModeSummary"));
  const colCcy = esc(t("branch.branchPdfSummaryColCurrency"));
  const colTot = esc(t("branch.branchPdfSummaryColTotal"));
  const colCnt = esc(t("branch.branchPdfSummaryColCount"));
  const sub = esc(
    t("branch.branchPdfSummarySublineAdvances").replace("{n}", String(advances.length))
  );
  const ccys = [...advTotals.keys()].sort();
  const body = ccys
    .map((ccy) => {
      const tot = advTotals.get(ccy) ?? 0;
      const cnt = advances.filter(
        (a) =>
          (String(a.currencyCode ?? "TRY").trim().toUpperCase() || "TRY") === ccy
      ).length;
      return `<tr><td>${esc(ccy)}</td><td class="num">${esc(formatMoneyDash(tot, dash, locale, ccy))}</td><td class="num">${cnt}</td></tr>`;
    })
    .join("");
  return `<h2>${sec} — ${badge}</h2>
  <p class="meta">${sub}</p>
  <table>
    <thead><tr><th>${colCcy}</th><th class="num">${colTot}</th><th class="num">${colCnt}</th></tr></thead>
    <tbody>${body || `<tr><td colspan="3">${esc(dash)}</td></tr>`}</tbody>
  </table>`;
}

function buildPersonnelExpensesSummarySectionHtml(
  expenses: BranchTransaction[],
  expTotals: Map<string, number>,
  t: (k: string) => string,
  locale: Locale,
  dash: string
): string {
  const esc = escapeHtml;
  const sec = esc(t("personnel.settlementPrintSectionExpenses"));
  const badge = esc(t("branch.branchPdfModeSummary"));
  const colCcy = esc(t("branch.branchPdfSummaryColCurrency"));
  const colTot = esc(t("branch.branchPdfSummaryColTotal"));
  const colCnt = esc(t("branch.branchPdfSummaryColCount"));
  const sub = esc(
    t("branch.branchPdfSummarySublineExpenses").replace("{n}", String(expenses.length))
  );
  const ccys = [...expTotals.keys()].sort();
  const body = ccys
    .map((ccy) => {
      const tot = expTotals.get(ccy) ?? 0;
      const cnt = expenses.filter(
        (r) => (String(r.currencyCode ?? "TRY").trim().toUpperCase() || "TRY") === ccy
      ).length;
      return `<tr><td>${esc(ccy)}</td><td class="num">${esc(formatMoneyDash(tot, dash, locale, ccy))}</td><td class="num">${cnt}</td></tr>`;
    })
    .join("");
  return `<h2>${sec} — ${badge}</h2>
  <p class="meta">${sub}</p>
  <table>
    <thead><tr><th>${colCcy}</th><th class="num">${colTot}</th><th class="num">${colCnt}</th></tr></thead>
    <tbody>${body || `<tr><td colspan="3">${esc(dash)}</td></tr>`}</tbody>
  </table>`;
}

function buildRegisterSummarySectionHtml(
  rows: BranchTransaction[],
  regInTotals: Map<string, number>,
  regOutTotals: Map<string, number>,
  t: (k: string) => string,
  locale: Locale,
  dash: string
): string {
  const esc = escapeHtml;
  const sec = esc(t("branch.branchPdfSectionRegister"));
  const badge = esc(t("branch.branchPdfModeSummary"));
  const colCcy = esc(t("branch.branchPdfSummaryColCurrency"));
  const colIn = esc(t("branch.branchPdfTotalRegisterIn"));
  const colOut = esc(t("branch.branchPdfTotalRegisterOut"));
  const colNet = esc(t("branch.branchPdfTotalRegisterNet"));
  const nIn = rows.filter((r) => String(r.type ?? "").toUpperCase() === "IN").length;
  const nOut = rows.filter((r) => String(r.type ?? "").toUpperCase() === "OUT").length;
  const sub = esc(
    t("branch.branchPdfRegisterSummaryCounts")
      .replace("{in}", String(nIn))
      .replace("{out}", String(nOut))
  );
  const ccys = [
    ...new Set([...regInTotals.keys(), ...regOutTotals.keys()]),
  ].sort();
  const body = ccys
    .map((ccy) => {
      const ri = regInTotals.get(ccy) ?? 0;
      const ro = regOutTotals.get(ccy) ?? 0;
      return `<tr><td>${esc(ccy)}</td><td class="num">${esc(formatMoneyDash(ri, dash, locale, ccy))}</td><td class="num">${esc(formatMoneyDash(ro, dash, locale, ccy))}</td><td class="num">${esc(formatMoneyDash(ri - ro, dash, locale, ccy))}</td></tr>`;
    })
    .join("");
  return `<h2>${sec} — ${badge}</h2>
  <p class="meta">${sub}</p>
  <table>
    <thead><tr><th>${colCcy}</th><th class="num">${colIn}</th><th class="num">${colOut}</th><th class="num">${colNet}</th></tr></thead>
    <tbody>${body || `<tr><td colspan="4">${esc(dash)}</td></tr>`}</tbody>
  </table>`;
}

function buildBranchTotalsCardsHtml(
  t: (k: string) => string,
  locale: Locale,
  dash: string,
  bp: BranchSettlementPdfOptions,
  packs: {
    advTotals: Map<string, number>;
    expTotals: Map<string, number>;
    regInTotals: Map<string, number>;
    regOutTotals: Map<string, number>;
    stockValTotals: Map<string, number>;
    stockQtySum: number;
  }
): string {
  const esc = escapeHtml;
  const ccys = [
    ...new Set([
      ...packs.stockValTotals.keys(),
      ...packs.advTotals.keys(),
      ...packs.expTotals.keys(),
      ...packs.regInTotals.keys(),
      ...packs.regOutTotals.keys(),
    ]),
  ].sort();

  const cards: string[] = [];

  if (bp.includeStockInbound && !bp.stockShowPricing && packs.stockQtySum > 0) {
    cards.push(`<div class="settlement-totals-currency">
      <div class="settlement-totals-ccy">${esc(t("branch.branchPdfStockQtySummary"))}</div>
      <div class="settlement-totals-lines">
        <div class="settlement-totals-line">
          <span class="settlement-totals-k">${esc(t("branch.branchPdfTotalInboundQty"))}</span>
          <span class="settlement-totals-v num">${esc(formatMoneyDash(packs.stockQtySum, dash, locale, undefined))}</span>
        </div>
      </div>
    </div>`);
  }

  for (const ccy of ccys) {
    const parts: string[] = [];
    if (bp.includeStockInbound && bp.stockShowPricing) {
      const sv = packs.stockValTotals.get(ccy);
      if (sv != null && Math.abs(Number(sv)) > 1e-9) {
        parts.push(`<div class="settlement-totals-line">
          <span class="settlement-totals-k">${esc(t("branch.branchPdfTotalStockValuationEst"))}</span>
          <span class="settlement-totals-v num">${esc(formatMoneyDash(sv, dash, locale, ccy))}</span>
        </div>`);
      }
    }
    if (bp.includeAdvances) {
      const a = packs.advTotals.get(ccy) ?? 0;
      parts.push(`<div class="settlement-totals-line">
        <span class="settlement-totals-k">${esc(t("personnel.settlementPrintSectionAdvances"))}</span>
        <span class="settlement-totals-v num">${esc(formatMoneyDash(a, dash, locale, ccy))}</span>
      </div>`);
    }
    if (bp.includePersonnelNonAdvanceExpenses) {
      const e = packs.expTotals.get(ccy) ?? 0;
      parts.push(`<div class="settlement-totals-line">
        <span class="settlement-totals-k">${esc(t("personnel.settlementPrintSectionExpenses"))}</span>
        <span class="settlement-totals-v num">${esc(formatMoneyDash(e, dash, locale, ccy))}</span>
      </div>`);
    }
    if (bp.includeRegisterLedger) {
      const ri = packs.regInTotals.get(ccy) ?? 0;
      const ro = packs.regOutTotals.get(ccy) ?? 0;
      parts.push(`<div class="settlement-totals-line">
        <span class="settlement-totals-k">${esc(t("branch.branchPdfTotalRegisterIn"))}</span>
        <span class="settlement-totals-v num">${esc(formatMoneyDash(ri, dash, locale, ccy))}</span>
      </div>`);
      parts.push(`<div class="settlement-totals-line">
        <span class="settlement-totals-k">${esc(t("branch.branchPdfTotalRegisterOut"))}</span>
        <span class="settlement-totals-v num">${esc(formatMoneyDash(ro, dash, locale, ccy))}</span>
      </div>`);
      parts.push(`<div class="settlement-totals-line">
        <span class="settlement-totals-k">${esc(t("branch.branchPdfTotalRegisterNet"))}</span>
        <span class="settlement-totals-v num">${esc(formatMoneyDash(ri - ro, dash, locale, ccy))}</span>
      </div>`);
    }
    if (parts.length === 0) continue;
    cards.push(`<div class="settlement-totals-currency">
      <div class="settlement-totals-ccy">${esc(ccy)}</div>
      <div class="settlement-totals-lines">${parts.join("")}</div>
    </div>`);
  }

  if (cards.length === 0) {
    return `<p class="meta settlement-totals-empty">${esc(dash)}</p>`;
  }
  return cards.join("");
}

export type SettlementPrintTarget =
  | {
      scope: "personnel";
      personnelId: number;
      title: string;
      /** ISO date YYYY-MM-DD; güncel turizm dönemi gelişi */
      seasonArrivalDate?: string | null;
      /**
       * Seçildiğinde: avanslar bu sezon yılı (effective_year); gider/kasa/stok/not satırları ilgili tarih yılı.
       * Verilmezse tüm dönemler.
       */
      seasonYearFilter?: number;
    }
  | {
      scope: "branch";
      branchId: number;
      title: string;
      seasonYearFilter?: number;
    };

function resolvedSeasonYearFilter(target: SettlementPrintTarget): number | null {
  const raw = target.seasonYearFilter;
  if (raw == null || !Number.isFinite(raw)) return null;
  const y = Math.trunc(raw);
  if (y < 1990 || y > 2100) return null;
  return y;
}

/** Şube PDF satır listesi: tam tablo veya para birimi bazlı özet. */
export type BranchPdfDetailMode = "detail" | "summary";

/** Şube PDF’inde hangi bölümlerin yükleneceği ve stokta maliyet sütunları. */
export type BranchSettlementPdfOptions = {
  includeStockInbound: boolean;
  /** false: yalnızca miktar; true: birim fiyat ve satır tahmini (fatura varsa). */
  stockShowPricing: boolean;
  includeAdvances: boolean;
  /** Avans: satır satır tablo veya yalnızca döviz bazlı toplam + adet. */
  advancesDetailMode: BranchPdfDetailMode;
  includePersonnelNonAdvanceExpenses: boolean;
  /** Personele yazılan giderler: tam liste veya özet. */
  personnelExpensesDetailMode: BranchPdfDetailMode;
  /** Şubedeki personel için maaş / SGK tahmini tablosu. */
  includePersonnelSalaryCost: boolean;
  includeRegisterLedger: boolean;
  /** Kasa gelir/gider: tüm satırlar veya döviz bazlı gelir/gider/net özeti. */
  registerLedgerDetailMode: BranchPdfDetailMode;
  includeNotes: boolean;
};

export function defaultBranchSettlementPdfOptions(): BranchSettlementPdfOptions {
  return {
    includeStockInbound: true,
    stockShowPricing: true,
    includeAdvances: true,
    advancesDetailMode: "detail",
    includePersonnelNonAdvanceExpenses: true,
    personnelExpensesDetailMode: "detail",
    includePersonnelSalaryCost: true,
    includeRegisterLedger: true,
    registerLedgerDetailMode: "detail",
    includeNotes: true,
  };
}

export async function openPersonnelSettlementPrintWindow(opts: {
  target: SettlementPrintTarget;
  locale: Locale;
  branchNameById: Map<number, string>;
  t: (k: string) => string;
  /** Yalnızca <code>scope: "branch"</code> için; verilmezse tüm bölümler açık. */
  branchPdfOptions?: BranchSettlementPdfOptions;
}): Promise<void> {
  const { target, locale, branchNameById, t, branchPdfOptions } = opts;
  const yf = resolvedSeasonYearFilter(target);
  const dash = t("personnel.dash");
  const orgBranch = t("personnel.nonAdvanceExpenseBranchOrg");
  const byBranch = target.scope === "branch";
  const bp = byBranch ? (branchPdfOptions ?? defaultBranchSettlementPdfOptions()) : null;
  const lang = locale === "tr" ? "tr" : "en";

  /** Aynı tıklama zincirinde olmalı; await sonrası açılırsa sekme boş kalır / engellenir. */
  const w = window.open("about:blank", "_blank");
  if (!w) {
    throw new Error(t("personnel.settlementPrintPopupBlocked"));
  }
  const loadingMsg = escapeHtml(t("common.loading"));
  const loadingTitle = escapeHtml(t("personnel.settlementPrintModalTitle"));
  w.document.open();
  w.document.write(
    `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${loadingTitle}</title><style>body{font-family:system-ui,sans-serif;margin:0;padding:2rem;text-align:center;color:#71717a;font-size:14px}</style></head><body><p>${loadingMsg}</p></body></html>`
  );
  w.document.close();

  let advances: Advance[] | AdvanceListItem[] = [];
  let expenses: BranchTransaction[] = [];
  let generalNotes: { body: string; createdAt: string }[] = [];
  let stockRows: BranchStockReceiptRow[] = [];
  let registerTx: BranchTransaction[] = [];

  try {
    if (target.scope === "personnel") {
      const expensePool = await fetchAllNonAdvancePersonnelAttributedExpenses(
        DEFAULT_NON_ADVANCE_EXPENSE_SORT
      );
      const adv = await fetchAdvancesByPersonnel(
        target.personnelId,
        yf ?? undefined
      );
      advances = sortAdvancesDesc(adv);
      expenses = sortExpensesDesc(
        filterNonAdvanceExpenseRows(expensePool, {
          personnelId: target.personnelId,
        })
      );
      try {
        generalNotes = await fetchPersonnelNotes(target.personnelId);
      } catch {
        generalNotes = [];
      }
    } else {
      const bid = target.branchId;
      const bpdf = bp!;

      const expensePoolPromise = bpdf.includePersonnelNonAdvanceExpenses
        ? fetchAllNonAdvancePersonnelAttributedExpenses(DEFAULT_NON_ADVANCE_EXPENSE_SORT)
        : Promise.resolve([] as BranchTransaction[]);

      const advPromise = bpdf.includeAdvances
        ? fetchAllAdvances({
            branchId: bid,
            limit: BRANCH_ADVANCES_PRINT_LIMIT,
            effectiveYear: yf ?? undefined,
          })
        : Promise.resolve([] as AdvanceListItem[]);

      const stockPromise = bpdf.includeStockInbound
        ? fetchAllBranchStockReceipts(bid)
        : Promise.resolve([] as BranchStockReceiptRow[]);

      const regPromise = bpdf.includeRegisterLedger
        ? fetchAllBranchTransactionsPaged(bid)
        : Promise.resolve([] as BranchTransaction[]);

      const notesPromise = bpdf.includeNotes
        ? fetchBranchNotes(bid).catch(() => [] as { body: string; createdAt: string }[])
        : Promise.resolve([] as { body: string; createdAt: string }[]);

      const [expensePool, advRaw, stockRowsRaw, registerTxRaw, notesRaw] =
        await Promise.all([
          expensePoolPromise,
          advPromise,
          stockPromise,
          regPromise,
          notesPromise,
        ]);

      advances = bpdf.includeAdvances ? sortAdvancesDesc(advRaw) : [];
      expenses = bpdf.includePersonnelNonAdvanceExpenses
        ? sortExpensesDesc(
            filterNonAdvanceExpenseRows(expensePool, { branchId: bid })
          )
        : [];
      stockRows = stockRowsRaw;
      registerTx = sortExpensesDesc(registerTxRaw);
      generalNotes = notesRaw;
    }

    if (yf != null) {
      expenses = expenses.filter(
        (e) => isoCalendarYear(e.transactionDate) === yf
      );
      registerTx = registerTx.filter(
        (e) => isoCalendarYear(e.transactionDate) === yf
      );
      stockRows = stockRows.filter(
        (r) => isoCalendarYear(r.movementDate) === yf
      );
      generalNotes = generalNotes.filter(
        (n) => isoCalendarYear(n.createdAt) === yf
      );
    }
  } catch (e) {
    try {
      w.close();
    } catch {
      /* ignore */
    }
    throw e;
  }

  let personnelProfilePhotoDataUrl: string | null = null;
  let personnelRowForPrint: Personnel | null = null;
  if (target.scope === "personnel") {
    const pack = await loadPersonnelSettlementPersonRow(target.personnelId);
    personnelProfilePhotoDataUrl = pack.profilePhotoDataUrl;
    personnelRowForPrint = pack.personnel;
  }

  generalNotes = [...generalNotes].sort((a, b) =>
    String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
  );

  let salaryCostSectionHtml = "";
  try {
    if (yf == null) {
      if (target.scope === "personnel") {
        const est = await fetchPersonnelSalaryCostEstimate(target.personnelId);
        salaryCostSectionHtml = renderPersonnelSalaryCostSection(
          est,
          t,
          locale,
          dash,
          escapeHtml
        );
      } else if (bp!.includePersonnelSalaryCost) {
        const pack = await fetchBranchPersonnelSalaryCostEstimates(
          target.branchId
        );
        salaryCostSectionHtml = renderBranchSalaryCostSection(
          pack.items,
          t,
          locale,
          dash,
          escapeHtml
        );
      }
    }
  } catch {
    salaryCostSectionHtml =
      yf == null &&
      (target.scope === "personnel" ||
        (byBranch && bp!.includePersonnelSalaryCost))
        ? renderSalaryCostLoadFailedSection(t, escapeHtml)
        : "";
  }

  const advTotals = sumByCurrency(advances);
  const expTotals = sumByCurrency(expenses);
  const ccyKeys = [
    ...new Set([...advTotals.keys(), ...expTotals.keys()]),
  ].sort();
  const regInTotals = sumRegisterByType(registerTx, "IN");
  const regOutTotals = sumRegisterByType(registerTx, "OUT");
  const stockValTotals = sumStockValuationByCurrency(stockRows);
  const stockQtySum = stockRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  const colPersonnel = escapeHtml(t("personnel.settlementPrintColPersonnel"));

  const advRowsHtml = advances
    .map((a) => {
      const br =
        a.branchId != null && a.branchId > 0
          ? branchNameById.get(a.branchId)?.trim() || `#${a.branchId}`
          : dash;
      const note = a.description?.trim() ? escapeHtml(a.description.trim()) : dash;
      const personCell = byBranch
        ? escapeHtml(
            (a as AdvanceListItem).personnelFullName?.trim() || dash
          )
        : "";
      const personCols = byBranch ? `<td>${personCell}</td>` : "";
      return `<tr>
        <td>${escapeHtml(formatLocaleDate(a.advanceDate, locale, dash))}</td>
        ${personCols}
        <td>${escapeHtml(br)}</td>
        <td class="num">${escapeHtml(formatMoneyDash(a.amount, dash, locale, a.currencyCode))}</td>
        <td>${escapeHtml(a.currencyCode)}</td>
        <td>${escapeHtml(sourceAbbrev(t, a.sourceType))}</td>
        <td class="num">${a.effectiveYear}</td>
        <td>${note}</td>
      </tr>`;
    })
    .join("");

  const advColspan = byBranch ? 8 : 7;

  const expRowsHtml = expenses
    .map((row) => {
      const { linkTypeKey, employeeName } = resolveNonAdvanceRow(row, dash);
      const bid = row.branchId;
      const branchCell =
        bid != null && bid > 0
          ? branchNameById.get(bid)?.trim() || `#${bid}`
          : orgBranch;
      const cat =
        txCategoryLine(row.mainCategory, row.category, t)?.trim() || dash;
      const pay =
        expensePaymentSourceLabel(row.expensePaymentSource, t)?.trim() || dash;
      const note = row.description?.trim()
        ? escapeHtml(row.description.trim())
        : dash;
      const personCell = byBranch ? escapeHtml(employeeName) : "";
      const personCols = byBranch ? `<td>${personCell}</td>` : "";
      return `<tr>
        <td>${escapeHtml(formatLocaleDate(row.transactionDate, locale, dash))}</td>
        ${personCols}
        <td>${escapeHtml(linkTypeLabel(linkTypeKey, t))}</td>
        <td>${escapeHtml(branchCell)}</td>
        <td>${escapeHtml(cat)}</td>
        <td>${escapeHtml(pay)}</td>
        <td class="num">${escapeHtml(formatMoneyDash(row.amount, dash, locale, row.currencyCode))}</td>
        <td>${escapeHtml(row.currencyCode)}</td>
        <td>${note}</td>
      </tr>`;
    })
    .join("");

  const expColspan = byBranch ? 9 : 8;

  const advHeadPerson = byBranch ? `<th>${colPersonnel}</th>` : "";
  const expHeadPerson = byBranch ? `<th>${colPersonnel}</th>` : "";

  const titleSafe = escapeHtml(target.title);
  const docTitle = escapeHtml(
    byBranch
      ? t("personnel.settlementPrintDocTitleBranch")
      : t("personnel.settlementPrintDocTitle")
  );
  const scopeLine = escapeHtml(
    byBranch
      ? t("personnel.settlementPrintScopeLineBranch")
      : t("personnel.settlementPrintScopeLinePersonnel")
  );
  const seasonArrivalIso =
    !byBranch && target.scope === "personnel"
      ? String(
          personnelRowForPrint?.seasonArrivalDate ??
            target.seasonArrivalDate ??
            ""
        ).trim().slice(0, 10)
      : "";
  const seasonArrivalFormatted =
    seasonArrivalIso && /^\d{4}-\d{2}-\d{2}$/.test(seasonArrivalIso)
      ? formatLocaleDate(seasonArrivalIso, locale, dash)
      : "";
  const seasonArrivalMetaLi =
    !byBranch && seasonArrivalFormatted
      ? `<li><span class="mk">${escapeHtml(t("personnel.seasonArrivalDate"))}</span> ${escapeHtml(seasonArrivalFormatted)}</li>`
      : "";

  const todayIso = localIsoDate();
  const seasonTenureSectionHtml =
    !byBranch &&
    target.scope === "personnel" &&
    seasonArrivalIso &&
    /^\d{4}-\d{2}-\d{2}$/.test(seasonArrivalIso)
      ? renderPersonnelSeasonTenureBlock({
          seasonArrivalIso,
          todayIso,
          monthlySalary: personnelRowForPrint?.salary ?? null,
          currencyCode: personnelRowForPrint?.currencyCode ?? "TRY",
          t,
          locale,
          dash,
        })
      : "";
  const genLabel = escapeHtml(t("personnel.settlementPrintGenerated"));
  const genValue = escapeHtml(
    new Date().toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
    })
  );

  const secAdv = escapeHtml(t("personnel.settlementPrintSectionAdvances"));
  const secExp = escapeHtml(t("personnel.settlementPrintSectionExpenses"));
  const secTot = escapeHtml(t("personnel.settlementPrintSectionTotals"));
  const secNotes = escapeHtml(t("personnel.settlementPrintSectionNotes"));
  const colComb = escapeHtml(t("personnel.settlementPrintColCombined"));

  const seasonScopeNoteHtml =
    yf != null
      ? `<p class="meta">${escapeHtml(t("personnel.settlementPrintSeasonSalaryOmitted"))}</p>`
      : "";

  const overlapHintHtml =
    byBranch && bp && bp.includePersonnelNonAdvanceExpenses && bp.includeRegisterLedger
      ? `<p class="meta">${escapeHtml(t("branch.branchPdfOverlapHint"))}</p>`
      : "";

  const seasonScopeMetaLi = `<li><span class="mk">${escapeHtml(t("personnel.settlementPrintMetaSeasonScope"))}</span> ${
    yf != null
      ? escapeHtml(String(yf))
      : escapeHtml(t("personnel.settlementPrintMetaAllPeriods"))
  }</li>`;

  const stockSectionHtml =
    byBranch && bp ? buildBranchStockSectionHtml(stockRows, bp, t, locale, dash) : "";

  const registerSectionHtml =
    byBranch && bp && bp.includeRegisterLedger
      ? bp.registerLedgerDetailMode === "summary"
        ? buildRegisterSummarySectionHtml(
            registerTx,
            regInTotals,
            regOutTotals,
            t,
            locale,
            dash
          )
        : buildBranchRegisterSectionHtml(registerTx, bp, t, locale, dash)
      : "";

  const showAdvSection = !byBranch || bp!.includeAdvances;
  const showExpSection = !byBranch || bp!.includePersonnelNonAdvanceExpenses;

  const advTableHtml = showAdvSection
    ? byBranch && bp!.advancesDetailMode === "summary"
      ? buildAdvancesSummarySectionHtml(advances, advTotals, t, locale, dash)
      : `<h2>${secAdv} (${advances.length})</h2>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(t("personnel.nonAdvanceExpensesColDate"))}</th>
        ${advHeadPerson}
        <th>${escapeHtml(t("personnel.tableBranch"))}</th>
        <th class="num">${escapeHtml(t("personnel.nonAdvanceExpensesColAmount"))}</th>
        <th>${escapeHtml(t("personnel.nonAdvanceExpensesColCurrency"))}</th>
        <th>${escapeHtml(t("personnel.sourceType"))}</th>
        <th class="num">${escapeHtml(t("personnel.effectiveYear"))}</th>
        <th>${escapeHtml(t("personnel.note"))}</th>
      </tr>
    </thead>
    <tbody>${advRowsHtml || `<tr><td colspan="${advColspan}">${escapeHtml(dash)}</td></tr>`}</tbody>
  </table>`
    : "";

  const expTableHtml = showExpSection
    ? byBranch && bp!.personnelExpensesDetailMode === "summary"
      ? buildPersonnelExpensesSummarySectionHtml(expenses, expTotals, t, locale, dash)
      : `<h2>${secExp} (${expenses.length})</h2>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(t("personnel.nonAdvanceExpensesColDate"))}</th>
        ${expHeadPerson}
        <th>${escapeHtml(t("personnel.nonAdvanceExpenseLinkType"))}</th>
        <th>${escapeHtml(t("personnel.tableBranch"))}</th>
        <th>${escapeHtml(t("personnel.nonAdvanceExpensesColCategory"))}</th>
        <th>${escapeHtml(t("branch.txColExpensePayment"))}</th>
        <th class="num">${escapeHtml(t("personnel.nonAdvanceExpensesColAmount"))}</th>
        <th>${escapeHtml(t("personnel.nonAdvanceExpensesColCurrency"))}</th>
        <th>${escapeHtml(t("personnel.note"))}</th>
      </tr>
    </thead>
    <tbody>${expRowsHtml || `<tr><td colspan="${expColspan}">${escapeHtml(dash)}</td></tr>`}</tbody>
  </table>`
    : "";

  const totalsCardsHtml =
    byBranch && bp
      ? buildBranchTotalsCardsHtml(t, locale, dash, bp, {
          advTotals,
          expTotals,
          regInTotals,
          regOutTotals,
          stockValTotals,
          stockQtySum,
        })
      : ccyKeys.length === 0
        ? `<p class="meta settlement-totals-empty">${escapeHtml(dash)}</p>`
        : ccyKeys
            .map((ccy) => {
              const a = advTotals.get(ccy) ?? 0;
              const e = expTotals.get(ccy) ?? 0;
              const sum = a + e;
              return `<div class="settlement-totals-currency">
        <div class="settlement-totals-ccy">${escapeHtml(ccy)}</div>
        <div class="settlement-totals-lines">
          <div class="settlement-totals-line">
            <span class="settlement-totals-k">${secAdv}</span>
            <span class="settlement-totals-v num">${escapeHtml(formatMoneyDash(a, dash, locale, ccy))}</span>
          </div>
          <div class="settlement-totals-line">
            <span class="settlement-totals-k">${secExp}</span>
            <span class="settlement-totals-v num">${escapeHtml(formatMoneyDash(e, dash, locale, ccy))}</span>
          </div>
        </div>
        <div class="settlement-totals-grand" role="group" aria-label="${colComb}">
          <span class="settlement-totals-grand-k">${colComb}</span>
          <span class="settlement-totals-grand-v num">${escapeHtml(formatMoneyDash(sum, dash, locale, ccy))}</span>
        </div>
      </div>`;
            })
            .join("");

  const notesBlocksHtml =
    generalNotes.length === 0 || (byBranch && bp && !bp.includeNotes)
      ? ""
      : `<h2>${secNotes} (${generalNotes.length})</h2>
  <div class="settlement-notes-wrap">
    ${generalNotes
      .map(
        (n) => `<div class="settlement-note-card">
      <div class="settlement-note-meta">${escapeHtml(formatLocaleDateTime(n.createdAt, locale))}</div>
      <div class="settlement-note-body">${escapeHtml(n.body)}</div>
    </div>`
      )
      .join("")}
  </div>`;

  const capNote =
    byBranch && bp && bp.includeAdvances
      ? `<p class="meta">${escapeHtml(
          t("personnel.settlementPrintBranchAdvancesCapNote").replace(
            "{n}",
            String(BRANCH_ADVANCES_PRINT_LIMIT)
          )
        )}</p>`
      : "";

  const downloadFileName = safeDownloadFilename(
    yf != null ? `${target.title}-${yf}` : target.title
  );
  const heroBadge = escapeHtml(
    byBranch
      ? t("personnel.settlementPrintModeBranch")
      : t("personnel.settlementPrintModePersonnel")
  );
  const escToolbarAria = escapeHtml(t("personnel.settlementPrintToolbarAria"));
  const escPrintBtn = escapeHtml(t("personnel.settlementPrintActionPrint"));
  const escDownloadBtn = escapeHtml(t("personnel.settlementPrintActionDownload"));
  const escToolbarHint = escapeHtml(t("personnel.settlementPrintToolbarHint"));
  const escProfilePhotoAlt = escapeHtml(t("personnel.profilePhotoAvatarAria"));
  const personnelPhotoBlock =
    target.scope === "personnel" && personnelProfilePhotoDataUrl
      ? `<div class="report-header-photo-wrap"><img class="report-header-photo" src="${personnelProfilePhotoDataUrl.replace(/"/g, "&quot;")}" width="96" height="96" alt="${escProfilePhotoAlt}"/></div>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${titleSafe} — ${docTitle}</title>
  <style>
    * { box-sizing: border-box; }
    :root {
      --doc-ink: #0f172a;
      --doc-muted: #475569;
      --doc-border: #94a3b8;
      --doc-rule: #cbd5e1;
      --doc-paper: #ffffff;
      --doc-screen-bg: #f1f5f9;
    }
    @page {
      size: A4;
      margin: 12mm 14mm 14mm 14mm;
    }
    html { -webkit-text-size-adjust: 100%; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 12px max(14px, env(safe-area-inset-right)) 28px max(14px, env(safe-area-inset-left));
      color: var(--doc-ink);
      font-size: 11px;
      line-height: 1.45;
      background: var(--doc-screen-bg);
      -webkit-font-smoothing: antialiased;
    }
    .settlement-doc {
      max-width: 210mm;
      margin: 0 auto;
      background: var(--doc-paper);
      padding: max(16px, env(safe-area-inset-left)) max(18px, env(safe-area-inset-right)) 20px max(18px, env(safe-area-inset-left));
      border: 1px solid var(--doc-rule);
      border-radius: 2px;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    @media screen and (min-width: 900px) {
      .settlement-doc { padding: 22px 26px 26px; }
    }
    .settlement-toolbar {
      position: sticky;
      top: 0;
      z-index: 50;
      margin: -12px calc(-1 * max(14px, env(safe-area-inset-left))) 16px calc(-1 * max(14px, env(safe-area-inset-left)));
      padding: 12px max(14px, env(safe-area-inset-left)) 12px max(14px, env(safe-area-inset-left));
      padding-top: max(12px, env(safe-area-inset-top));
      background: rgba(255,255,255,0.96);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--doc-rule);
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.06);
    }
    .settlement-toolbar-inner { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .settlement-btn {
      min-height: 44px;
      min-width: 44px;
      padding: 0 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    .settlement-btn-primary { background: var(--doc-ink); color: #fff; }
    .settlement-btn-primary:hover { background: #1e293b; }
    .settlement-btn-secondary { background: #fff; color: var(--doc-ink); border: 1px solid var(--doc-border); }
    .settlement-btn-secondary:hover { background: #f8fafc; }
    .settlement-toolbar-hint { margin: 10px 0 0; font-size: 11px; line-height: 1.45; color: var(--doc-muted); max-width: 42rem; }
    .report-header {
      position: relative;
      margin: 0 0 18px;
      padding: 16px 18px 14px;
      border: 1px solid var(--doc-border);
      border-top: 3px solid var(--doc-ink);
      background: var(--doc-paper);
      overflow: hidden;
      break-inside: avoid;
    }
    .report-header-inner {
      position: relative;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 16px;
      justify-content: space-between;
    }
    .report-header-main { position: relative; flex: 1; min-width: min(100%, 11rem); }
    .report-header-photo-wrap { flex-shrink: 0; }
    .report-header-photo {
      display: block;
      width: 96px;
      height: 96px;
      object-fit: cover;
      border-radius: 2px;
      border: 1px solid var(--doc-border);
      background: #f8fafc;
    }
    .report-hero-badge {
      display: inline-flex;
      align-items: center;
      margin-bottom: 10px;
      padding: 4px 10px;
      border-radius: 2px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--doc-muted);
      background: #f1f5f9;
      border: 1px solid var(--doc-rule);
    }
    .report-title {
      font-family: Georgia, "Times New Roman", Times, serif;
      font-size: clamp(1.2rem, 4.5vw, 1.55rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--doc-ink);
      margin: 0 0 6px;
      line-height: 1.2;
    }
    .report-tagline {
      font-size: 12px;
      line-height: 1.5;
      color: var(--doc-muted);
      margin: 0 0 12px;
      max-width: 42rem;
    }
    .report-meta {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 11px;
      color: var(--doc-muted);
    }
    @media (min-width: 520px) {
      .report-meta { flex-direction: row; flex-wrap: wrap; gap: 8px 12px; }
    }
    .report-meta li {
      display: flex;
      gap: 6px;
      align-items: baseline;
      flex-wrap: wrap;
      padding: 6px 8px;
      background: #f8fafc;
      border-radius: 2px;
      border: 1px solid var(--doc-rule);
    }
    .report-meta .mk { font-weight: 700; color: var(--doc-ink); white-space: nowrap; }
    h2 {
      font-family: Georgia, "Times New Roman", Times, serif;
      font-size: 13px;
      font-weight: 700;
      margin: 20px 0 8px;
      border-bottom: 2px solid var(--doc-ink);
      padding-bottom: 5px;
      color: var(--doc-ink);
    }
    .meta { color: var(--doc-muted); margin-bottom: 12px; font-size: 11px; line-height: 1.45; }
    table {
      width: 100%;
      min-width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      background: var(--doc-paper);
      border: 1px solid var(--doc-border);
      font-size: 10px;
    }
    th, td { border: 1px solid var(--doc-border); padding: 6px 6px; vertical-align: top; word-wrap: break-word; }
    th { background: #e2e8f0; text-align: left; font-weight: 700; color: var(--doc-ink); }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    tr { break-inside: avoid; }
    thead { display: table-header-group; }
    @media screen and (max-width: 640px) {
      table { font-size: 9px; }
      th, td { padding: 5px 4px; }
    }
    .settlement-notes-wrap { display: flex; flex-direction: column; gap: 10px; margin-bottom: 8px; }
    .settlement-note-card {
      background: var(--doc-paper);
      border: 1px solid var(--doc-border);
      border-radius: 2px;
      padding: 10px 12px;
      break-inside: avoid;
    }
    .settlement-note-meta { font-size: 10px; color: var(--doc-muted); margin-bottom: 6px; }
    .settlement-note-body { font-size: 11px; color: var(--doc-ink); white-space: pre-wrap; line-height: 1.45; }
    .footer-note {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid var(--doc-border);
      color: var(--doc-muted);
      font-size: 10px;
      line-height: 1.5;
    }
    .salary-cost-section { margin-bottom: 8px; break-inside: avoid; }
    .salary-cost-disclaimer {
      border: 1px solid #ca8a04;
      background: #fffbeb;
      border-radius: 2px;
      padding: 10px 12px;
      margin: 0 0 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .salary-cost-disclaimer-title { font-weight: 800; font-size: 11px; color: #854d0e; margin-bottom: 6px; }
    .salary-cost-disclaimer-body { margin: 0; font-size: 10px; line-height: 1.45; color: #713f12; }
    .season-tenure-callout {
      border: 1px solid var(--doc-border);
      background: #f8fafc;
      border-left: 3px solid var(--doc-ink);
      border-radius: 2px;
      padding: 12px 14px;
      margin: 0 0 16px;
      break-inside: avoid;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .season-tenure-title { font-weight: 800; font-size: 11px; color: var(--doc-ink); margin-bottom: 8px; }
    .season-tenure-body { margin: 0 0 8px; font-size: 11px; line-height: 1.45; color: var(--doc-ink); }
    .season-tenure-salary { margin: 0 0 4px; font-size: 11px; line-height: 1.45; color: var(--doc-ink); }
    .season-tenure-salary .mk { font-weight: 700; color: var(--doc-ink); margin-right: 6px; }
    .season-tenure-basis { margin: 0 0 8px; font-size: 10px; line-height: 1.4; color: var(--doc-muted); }
    .season-tenure-disclaimer { margin: 0; font-size: 10px; line-height: 1.45; color: var(--doc-muted); }
    .salary-cost-meta { margin-top: 0; }
    .salary-cost-table { margin-top: 8px; }
    .salary-cost-total-row td { font-weight: 800; background: #f1f5f9; }
    .salary-cost-highlight-row td { font-weight: 600; background: #fef9c3; }
    .settlement-totals-wrap { display: block; margin-bottom: 8px; max-width: 100%; }
    .settlement-totals-empty { margin-top: 0; }
    .settlement-totals-currency {
      background: var(--doc-paper);
      border: 1px solid var(--doc-border);
      border-radius: 2px;
      overflow: hidden;
      break-inside: avoid;
      margin-bottom: 12px;
    }
    .settlement-totals-currency:last-child { margin-bottom: 0; }
    .settlement-totals-ccy {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--doc-ink);
      padding: 8px 12px 7px;
      background: #e2e8f0;
      border-bottom: 1px solid var(--doc-border);
    }
    .settlement-totals-lines { padding: 2px 0; }
    .settlement-totals-line {
      display: table;
      width: 100%;
      table-layout: fixed;
      padding: 7px 12px;
      border-bottom: 1px solid var(--doc-rule);
      font-size: 11px;
    }
    .settlement-totals-k {
      display: table-cell;
      width: 62%;
      vertical-align: baseline;
      color: var(--doc-muted);
      font-weight: 600;
      padding-right: 10px;
      line-height: 1.35;
    }
    .settlement-totals-v {
      display: table-cell;
      vertical-align: baseline;
      text-align: right;
      white-space: nowrap;
      color: var(--doc-ink);
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .settlement-totals-grand {
      display: table;
      width: 100%;
      table-layout: fixed;
      padding: 10px 12px 11px;
      background: #e2e8f0;
      border-top: 2px solid var(--doc-ink);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .settlement-totals-grand-k {
      display: table-cell;
      vertical-align: middle;
      width: 38%;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--doc-ink);
      padding-right: 10px;
    }
    .settlement-totals-grand-v {
      display: table-cell;
      vertical-align: middle;
      text-align: right;
      font-size: clamp(15px, 4.5vw, 18px);
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--doc-ink);
      line-height: 1.15;
      font-variant-numeric: tabular-nums;
    }
    @media screen and (max-width: 540px) {
      .report-header-inner { flex-direction: column; align-items: stretch; }
      .report-header-photo-wrap { order: -1; align-self: center; margin-bottom: 4px; }
      .report-header-photo { width: 104px; height: 104px; }
      .report-title { text-align: center; }
      .report-tagline { text-align: center; margin-left: auto; margin-right: auto; }
      .report-hero-badge { align-self: center; }
      .report-meta { align-items: stretch; }
      .report-meta li { width: 100%; }
    }
    @media screen and (max-width: 420px) {
      .settlement-totals-grand { display: block; padding: 10px 12px 12px; }
      .settlement-totals-grand-k { display: block; width: 100%; margin-bottom: 6px; }
      .settlement-totals-grand-v { display: block; width: 100%; text-align: right; }
    }
    @media print {
      body { margin: 0; padding: 0; background: #fff; }
      .no-print { display: none !important; }
      .settlement-toolbar { display: none !important; }
      .settlement-doc {
        max-width: none;
        margin: 0;
        padding: 0;
        border: none;
        border-radius: 0;
        box-shadow: none;
        overflow: visible;
      }
      .report-header {
        border: 1px solid #000;
        border-top: 3px solid #000;
        box-shadow: none;
        background: #fff;
      }
      .report-meta li { background: #fff; border-color: #94a3b8; }
      .report-hero-badge { background: #f1f5f9; border-color: #94a3b8; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .season-tenure-callout { background: #f8fafc; border-color: #64748b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      table { box-shadow: none; }
      .settlement-totals-currency { box-shadow: none; }
      th { background: #e2e8f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h2 { break-after: avoid; }
      .report-header-photo { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <nav class="no-print settlement-toolbar" role="toolbar" aria-label="${escToolbarAria}">
    <div class="settlement-toolbar-inner">
      <button type="button" class="settlement-btn settlement-btn-primary" onclick="settlementDoPrint()">${escPrintBtn}</button>
      <button type="button" class="settlement-btn settlement-btn-secondary" onclick="settlementDoDownload()">${escDownloadBtn}</button>
    </div>
    <p class="settlement-toolbar-hint">${escToolbarHint}</p>
  </nav>
  <main class="settlement-doc">
  <header class="report-header">
    <div class="report-header-inner">
      <div class="report-header-main">
        <div class="report-hero-badge">${heroBadge}</div>
        <h1 class="report-title">${titleSafe}</h1>
        <p class="report-tagline">${docTitle}</p>
        <ul class="report-meta">
          <li><span class="mk">${genLabel}</span> ${genValue}</li>
          <li>${scopeLine}</li>
          ${seasonScopeMetaLi}
          ${seasonArrivalMetaLi}
        </ul>
      </div>
      ${personnelPhotoBlock}
    </div>
  </header>
  ${seasonTenureSectionHtml}
  ${overlapHintHtml}
  ${capNote}
  ${seasonScopeNoteHtml}
  ${salaryCostSectionHtml}
  ${stockSectionHtml}
  ${advTableHtml}
  ${expTableHtml}
  ${registerSectionHtml}

  <h2>${secTot}</h2>
  <div class="settlement-totals-wrap">${totalsCardsHtml}</div>
  ${notesBlocksHtml}
  <p class="footer-note">${escapeHtml(t("personnel.settlementPrintFooterHint"))}</p>
  </main>
<script>
window.__sfn=${JSON.stringify(downloadFileName)};
function settlementDoPrint(){window.print();}
function settlementDoDownload(){
var h='<!DOCTYPE html>\\n'+document.documentElement.outerHTML;
var b=new Blob([h],{type:'text/html;charset=utf-8'});
var u=URL.createObjectURL(b);
var a=document.createElement('a');
a.href=u;a.download=window.__sfn;
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(function(){URL.revokeObjectURL(u);},1500);
}
</script>
</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
}
