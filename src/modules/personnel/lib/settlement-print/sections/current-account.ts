/**
 * Şube cari — sevkiyat/fatura bölümü: fatura başına tutar + tahsilat + kalan + durum.
 * Kalem/sevkiyat detayı YOK (PDF kısa kalsın; detay ayrı cari ekranından alınır).
 * "Tüm sevkiyatlar" gösterilir (tahsil edilenler dahil). Genel toplam + açık bakiye
 * para birimi bazında.
 */
import type { Locale } from "@/i18n/messages";
import type { OutboundInvoiceResponse } from "@/modules/order-account-statement/api/outbound-invoices-api";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { escapeHtml } from "../format";

const EPS = 0.009;

export function buildBranchCurrentAccountSectionHtml(
  invoices: OutboundInvoiceResponse[],
  t: (k: string) => string,
  locale: Locale,
  dash: string
): string {
  const esc = escapeHtml;
  const sec = esc(t("branch.branchPdfCariTitle"));
  if (invoices.length === 0) {
    return `<h2 class="sec-cari">${sec} (0)</h2><p class="empty-note">${esc(t("branch.branchPdfNoRows"))}</p>`;
  }
  const money = (v: unknown, c: string) => esc(formatMoneyDash(Number(v) || 0, dash, locale, c));

  const sorted = [...invoices].sort((a, b) =>
    String(b.issueDate ?? "").localeCompare(String(a.issueDate ?? ""))
  );

  const statusOf = (inv: OutboundInvoiceResponse): { label: string; cls: string } => {
    const open = Number(inv.openAmount) || 0;
    const paid = Number(inv.paidTotal) || 0;
    if (open <= EPS) return { label: t("branch.branchPdfCariStatusPaid"), cls: "ca-paid" };
    if (paid > EPS) return { label: t("branch.branchPdfCariStatusPartial"), cls: "ca-partial" };
    return { label: t("branch.branchPdfCariStatusOpen"), cls: "ca-open" };
  };

  const grand = new Map<string, { total: number; paid: number; open: number }>();
  const addGrand = (c: string, total: number, paid: number, open: number) => {
    const g = grand.get(c) ?? { total: 0, paid: 0, open: 0 };
    g.total += total;
    g.paid += paid;
    g.open += open;
    grand.set(c, g);
  };

  const bodyRows = sorted
    .map((inv) => {
      const c = inv.currencyCode || "TRY";
      const st = statusOf(inv);
      const total = Number(inv.linesTotal) || 0;
      const paid = Number(inv.paidTotal) || 0;
      const open = Number(inv.openAmount) || 0;
      addGrand(c, total, paid, open);
      return `<tr>
        <td>${esc(formatLocaleDate(inv.issueDate, locale, dash))}</td>
        <td class="ca-doc">${esc(inv.documentNumber?.trim() || dash)}</td>
        <td class="num ca-strong">${money(total, c)}</td>
        <td class="num">${money(paid, c)}</td>
        <td class="num">${money(open, c)}</td>
        <td><span class="ca-status ${st.cls}">${esc(st.label)}</span></td>
      </tr>`;
    })
    .join("");

  const totalRows = [...grand.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([c, g]) => `<tr class="ca-total">
        <td></td>
        <td>${esc(t("branch.branchPdfCariGrandTotal"))} · ${esc(c)}</td>
        <td class="num">${money(g.total, c)}</td>
        <td class="num">${money(g.paid, c)}</td>
        <td class="num ca-open-strong">${money(g.open, c)}</td>
        <td></td>
      </tr>`
    )
    .join("");

  return `<h2 class="sec-cari">${sec} (${invoices.length})</h2>
  <table class="ca-table">
    <thead>
      <tr>
        <th>${esc(t("personnel.nonAdvanceExpensesColDate"))}</th>
        <th>${esc(t("branch.branchPdfCariColShipment"))}</th>
        <th class="num">${esc(t("branch.branchPdfCariColTotal"))}</th>
        <th class="num">${esc(t("branch.branchPdfCariColCollected"))}</th>
        <th class="num">${esc(t("branch.branchPdfCariColOpen"))}</th>
        <th>${esc(t("branch.branchPdfCariColStatus"))}</th>
      </tr>
    </thead>
    <tbody>${bodyRows}${totalRows}</tbody>
  </table>`;
}
