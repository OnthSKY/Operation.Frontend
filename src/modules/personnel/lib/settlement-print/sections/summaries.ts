/** Para birimi bazlı özet (summary) tabloları: avanslar, personel giderleri, kasa. */
import type { Locale } from "@/i18n/messages";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import type { Advance, AdvanceListItem } from "@/types/advance";
import type { BranchTransaction } from "@/types/branch-transaction";
import { escapeHtml } from "../format";
import { emptyNote } from "../options";

export function buildAdvancesSummarySectionHtml(
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
  if (!body)
    return `<h2 class="sec-adv">${sec} — ${badge}</h2>
  <p class="meta">${sub}</p>${emptyNote(t)}`;
  return `<h2 class="sec-adv">${sec} — ${badge}</h2>
  <p class="meta">${sub}</p>
  <table>
    <thead><tr><th>${colCcy}</th><th class="num">${colTot}</th><th class="num">${colCnt}</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

export function buildPersonnelExpensesSummarySectionHtml(
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
  if (!body)
    return `<h2 class="sec-exp">${sec} — ${badge}</h2>
  <p class="meta">${sub}</p>${emptyNote(t)}`;
  return `<h2 class="sec-exp">${sec} — ${badge}</h2>
  <p class="meta">${sub}</p>
  <table>
    <thead><tr><th>${colCcy}</th><th class="num">${colTot}</th><th class="num">${colCnt}</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

export function buildRegisterSummarySectionHtml(
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
  if (!body)
    return `<h2 class="sec-reg">${sec} — ${badge}</h2>
  <p class="meta">${sub}</p>${emptyNote(t)}`;
  return `<h2 class="sec-reg">${sec} — ${badge}</h2>
  <p class="meta">${sub}</p>
  <table>
    <thead><tr><th>${colCcy}</th><th class="num">${colIn}</th><th class="num">${colOut}</th><th class="num">${colNet}</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}
