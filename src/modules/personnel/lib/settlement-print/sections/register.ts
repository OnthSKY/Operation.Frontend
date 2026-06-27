/** Şube kasası bölümü: gelirler (nakit/kart/kimde) ve giderler/çıkışlar (gerçek giderler). */
import type { Locale } from "@/i18n/messages";
import {
  expensePaymentSourceLabel,
  expensePaymentSourceLabelShort,
  txCategoryLine,
} from "@/modules/branch/lib/branch-transaction-options";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import type { BranchTransaction } from "@/types/branch-transaction";
import { escapeHtml, moneyNum } from "../format";
import { isNonExpenseOutRow } from "../buckets";
import { emptyNote, type BranchSettlementPdfOptions } from "../options";

export function buildBranchRegisterSectionHtml(
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
  const colCat = esc(t("personnel.nonAdvanceExpensesColCategory"));
  const colCash = esc(t("branch.txCashShort"));
  const colCard = esc(t("branch.txCardShort"));
  const colTot = esc(t("branch.branchPdfSummaryColTotal"));
  const colPay = esc(t("branch.txColExpensePayment"));
  const colAmt = esc(t("personnel.nonAdvanceExpensesColAmount"));
  const colNote = esc(t("personnel.note"));
  const colWho = esc(t("branch.branchPdfDistCapCashHolder"));

  const incomeRows = rows.filter((r) => String(r.type ?? "").toUpperCase() === "IN");
  // Giderler/çıkışlar: gerçek giderler. Patrona devir / cep-zimmet uzlaşması / P&L-dışı
  // transfer satırları kasa içi para hareketidir, gider değil — listede gösterilmez.
  const outflowRows = rows.filter(
    (r) => String(r.type ?? "").toUpperCase() !== "IN" && !isNonExpenseOutRow(r)
  );

  const money = (v: unknown, c?: string | null) =>
    esc(formatMoneyDash(Number(v), dash, locale, c ?? undefined));

  // Nakit kimde (gün sonu nakdinin devir tarafı) — satır bazlı.
  const cashWhoCell = (row: BranchTransaction): string => {
    if (moneyNum(row.cashAmount) <= 1e-9) return esc(dash);
    const party = String(row.cashSettlementParty ?? "").trim().toUpperCase();
    if (party === "PATRON") return esc(t("branch.branchPdfCashHolderPatron"));
    if (party === "REMAINS_AT_BRANCH") return esc(t("branch.branchPdfCashHolderBranch"));
    if (party === "BRANCH_MANAGER") {
      const name = row.cashSettlementPersonnelFullName?.trim();
      const base = t("branch.branchPdfCashHolderPersonnel");
      return esc(name ? `${base}: ${name}` : base);
    }
    return esc(t("branch.branchPdfCashHolderUnassigned"));
  };

  const incomeBody = incomeRows
    .map((row) => {
      const cat = txCategoryLine(row.mainCategory, row.category, t)?.trim() || dash;
      const cashV = moneyNum(row.cashAmount);
      const cardV = moneyNum(row.cardAmount);
      return `<tr>
        <td>${esc(formatLocaleDate(row.transactionDate, locale, dash))}</td>
        <td>${esc(cat)}</td>
        <td class="num">${cashV > 1e-9 ? money(cashV, row.currencyCode) : esc(dash)}</td>
        <td class="num">${cardV > 1e-9 ? money(cardV, row.currencyCode) : esc(dash)}</td>
        <td class="num reg-strong">${money(row.amount, row.currencyCode)}</td>
        <td>${cashWhoCell(row)}</td>
      </tr>`;
    })
    .join("");

  // Karşı taraf adı (taşeron / personel / araç) — asla ID değil.
  const counterpartyName = (row: BranchTransaction): string => {
    const n =
      row.linkedContractorName?.trim() ||
      row.linkedPersonnelFullName?.trim() ||
      row.linkedAdvancePersonnelFullName?.trim() ||
      row.linkedSalaryPersonnelFullName?.trim() ||
      row.expensePocketPersonnelFullName?.trim() ||
      row.linkedVehiclePlateNumber?.trim() ||
      "";
    return n;
  };
  const outflowBody = outflowRows
    .map((row) => {
      const cat = txCategoryLine(row.mainCategory, row.category, t)?.trim() || dash;
      const cp = counterpartyName(row);
      const catCell = cp
        ? `${esc(cat)} <span class="reg-cp">· ${esc(cp)}</span>`
        : esc(cat);
      const pay =
        expensePaymentSourceLabelShort(row.expensePaymentSource, t)?.trim() ||
        expensePaymentSourceLabel(row.expensePaymentSource, t)?.trim() ||
        dash;
      const note = row.description?.trim() ? esc(row.description.trim()) : esc(dash);
      return `<tr>
        <td>${esc(formatLocaleDate(row.transactionDate, locale, dash))}</td>
        <td>${catCell}</td>
        <td>${esc(pay)}</td>
        <td class="num">${money(row.amount, row.currencyCode)}</td>
        <td>${note}</td>
      </tr>`;
    })
    .join("");

  const incomeSection =
    incomeRows.length > 0
      ? `<h3 class="reg-sub in">${esc(t("branch.branchPdfRegisterTypeIn"))} (${incomeRows.length})</h3>
  <table class="reg-table">
    <thead><tr>
      <th>${colDate}</th><th>${colCat}</th><th class="num">${colCash}</th><th class="num">${colCard}</th><th class="num">${colTot}</th><th>${colWho}</th>
    </tr></thead>
    <tbody>${incomeBody}</tbody>
  </table>`
      : "";

  const outflowSection =
    outflowRows.length > 0
      ? `<h3 class="reg-sub out">${esc(t("branch.branchPdfRegisterTypeOut"))} (${outflowRows.length})</h3>
  <table class="reg-table">
    <thead><tr>
      <th>${colDate}</th><th>${colCat}</th><th>${colPay}</th><th class="num">${colAmt}</th><th>${colNote}</th>
    </tr></thead>
    <tbody>${outflowBody}</tbody>
  </table>`
      : "";

  const shownCount = incomeRows.length + outflowRows.length;
  const empty = shownCount === 0 ? emptyNote(t) : "";

  return `<h2 class="sec-reg">${sec} (${shownCount})</h2>
  ${incomeSection}${outflowSection}${empty}`;
}
