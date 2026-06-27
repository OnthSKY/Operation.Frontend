/** Şubeye gelen stok bölümü (satır satır veya ana ürün bazlı gruplu). */
import type { Locale } from "@/i18n/messages";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import type { BranchStockReceiptRow } from "@/types/branch";
import { ccyKey, escapeHtml, moneyNum } from "../format";
import { emptyNote, type BranchSettlementPdfOptions } from "../options";

/** Depo girişlerini ana ürün (parent) bazında grupla — kompakt özet tablo. */
function buildBranchStockGroupedSectionHtml(
  rows: BranchStockReceiptRow[],
  bp: BranchSettlementPdfOptions,
  t: (k: string) => string,
  locale: Locale,
  dash: string
): string {
  const esc = escapeHtml;
  const sec = esc(t("branch.branchPdfSectionStock"));
  const colParent = esc(t("branch.branchPdfStockColParentProduct"));
  const colVariety = esc(t("branch.branchPdfStockColVariety"));
  const colQty = esc(t("branch.branchPdfColQty"));
  const colUnit = esc(t("branch.branchPdfColUnit"));
  const colVal = esc(t("branch.branchPdfStockColGroupValueEst"));
  const badge = esc(t("branch.branchPdfModeSummary"));

  type Group = {
    label: string;
    qty: number;
    units: Set<string>;
    variants: Set<number>;
    lines: number;
    val: Map<string, number>;
  };
  const groups = new Map<string | number, Group>();
  for (const r of rows) {
    const key = r.parentProductId != null && r.parentProductId > 0 ? `p${r.parentProductId}` : `s${r.productId}`;
    const label =
      r.parentProductName?.trim() || r.productName?.trim() || dash;
    const g =
      groups.get(key) ??
      { label, qty: 0, units: new Set<string>(), variants: new Set<number>(), lines: 0, val: new Map<string, number>() };
    g.qty += moneyNum(r.quantity);
    if (r.unit?.trim()) g.units.add(r.unit.trim());
    if (r.productId != null) g.variants.add(r.productId);
    g.lines += 1;
    if (bp.stockShowPricing && r.valuationLineEstimate != null && Number.isFinite(r.valuationLineEstimate)) {
      const c = ccyKey(r.valuationCurrencyCode);
      g.val.set(c, (g.val.get(c) ?? 0) + Number(r.valuationLineEstimate));
    }
    groups.set(key, g);
  }
  const ordered = [...groups.values()].sort((a, b) =>
    a.label.localeCompare(b.label, locale === "tr" ? "tr" : "en")
  );
  const valHead = bp.stockShowPricing ? `<th class="num">${colVal}</th>` : "";
  const body = ordered
    .map((g) => {
      const unit = g.units.size === 1 ? esc([...g.units][0]) : esc(dash);
      const valCell = bp.stockShowPricing
        ? `<td class="num">${
            g.val.size === 0
              ? esc(dash)
              : [...g.val.entries()]
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([c, v]) => esc(formatMoneyDash(v, dash, locale, c)))
                  .join(" · ")
          }</td>`
        : "";
      return `<tr>
        <td>${esc(g.label)}</td>
        <td class="num">${g.variants.size}</td>
        <td class="num reg-strong">${esc(formatMoneyDash(g.qty, dash, locale, undefined))}</td>
        <td>${unit}</td>
        ${valCell}
      </tr>`;
    })
    .join("");
  const foot = bp.stockShowPricing
    ? `<p class="meta">${esc(t("branch.branchPdfStockValuationFootnote"))}</p>`
    : "";
  if (!body) return `<h2 class="sec-stock">${sec} — ${badge} (${ordered.length})</h2>${emptyNote(t)}`;
  return `<h2 class="sec-stock">${sec} — ${badge} (${ordered.length})</h2>
  <table>
    <thead><tr>
      <th>${colParent}</th><th class="num">${colVariety}</th><th class="num">${colQty}</th><th>${colUnit}</th>${valHead}
    </tr></thead>
    <tbody>${body}</tbody>
  </table>${foot}`;
}

export function buildBranchStockSectionHtml(
  rows: BranchStockReceiptRow[],
  bp: BranchSettlementPdfOptions,
  t: (k: string) => string,
  locale: Locale,
  dash: string
): string {
  if (!bp.includeStockInbound) return "";
  if (bp.stockGroupByParent)
    return buildBranchStockGroupedSectionHtml(rows, bp, t, locale, dash);
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
  if (!body) return `<h2 class="sec-stock">${sec} (${rows.length})</h2>${emptyNote(t)}`;
  return `<h2 class="sec-stock">${sec} (${rows.length})</h2>
  <table>
    <thead><tr>
      <th>${colDate}</th><th>${colProd}</th><th>${colWh}</th><th class="num">${colQty}</th><th>${colUnit}</th>${priceHead}
    </tr></thead>
    <tbody>${body}</tbody>
  </table>${foot}`;
}
