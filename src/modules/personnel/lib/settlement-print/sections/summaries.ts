/** Personel hesabı — kişi bazlı özet: her personel tek tutar (avans + gider), altında ödeme kaynağı. */
import type { Locale } from "@/i18n/messages";
import {
  expenseAttributionPersonnelId,
  resolveNonAdvanceRow,
} from "@/modules/personnel/components/personnel-non-advance-expense-blocks";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import type { Advance, AdvanceListItem } from "@/types/advance";
import type { BranchTransaction } from "@/types/branch-transaction";
import {
  SRC_ORDER,
  type SrcBucket,
  isPersonnelLinkedTx,
  srcBucketLabel,
  srcBucketOfAdvance,
  srcBucketOfExpense,
} from "../buckets";
import { ccyKey, escapeHtml, moneyNum } from "../format";
import { emptyNote } from "../options";

type Money = Map<string, number>;
type PersonRow = { name: string; total: Money; bySrc: Map<SrcBucket, Money> };

const addTo = (m: Money, ccy: string, v: number) => m.set(ccy, (m.get(ccy) ?? 0) + v);

/** Kişi başı toplam + ödeme kaynağı kırılımı (saf). Cepten şube gideri (kişiye bağlı değil) dahil edilmez. */
export function aggregatePersonnelByPerson(
  advances: (Advance | AdvanceListItem)[],
  expenses: BranchTransaction[],
  dash: string
): PersonRow[] {
  const byId = new Map<string, PersonRow>();
  const add = (key: string, name: string, src: SrcBucket, ccy: string, v: number) => {
    const r = byId.get(key) ?? { name, total: new Map(), bySrc: new Map() };
    if (r.name === dash && name !== dash) r.name = name;
    byId.set(key, r);
    addTo(r.total, ccy, v);
    const m = r.bySrc.get(src) ?? new Map<string, number>();
    addTo(m, ccy, v);
    r.bySrc.set(src, m);
  };

  for (const a of advances) {
    const name =
      (a as AdvanceListItem).personnelFullName?.trim() ||
      a.heldRegisterSourcePersonnelFullName?.trim() ||
      dash;
    add(`p${a.personnelId}`, name, srcBucketOfAdvance(a.sourceType), ccyKey(a.currencyCode), moneyNum(a.amount));
  }
  for (const e of expenses) {
    // Cepten ödenen şube gideri kişiye verilen para değil; şube gider tablosunda sayılır.
    if (!isPersonnelLinkedTx(e)) continue;
    const pid = expenseAttributionPersonnelId(e);
    const name = resolveNonAdvanceRow(e, dash).employeeName;
    const src = srcBucketOfExpense(e.expensePaymentSource) ?? "REGISTER";
    add(pid != null ? `p${pid}` : `n${name}`, name, src, ccyKey(e.currencyCode), moneyNum(e.amount));
  }
  const weight = (r: PersonRow) => [...r.total.values()].reduce((s, v) => s + v, 0);
  return [...byId.values()].sort((x, y) => weight(y) - weight(x));
}

export function buildPersonnelPerPersonSectionHtml(
  advances: (Advance | AdvanceListItem)[],
  expenses: BranchTransaction[],
  showAdv: boolean,
  showExp: boolean,
  t: (k: string) => string,
  locale: Locale,
  dash: string
): string {
  if (!showAdv && !showExp) return "";
  const esc = escapeHtml;
  const title = `<h2 class="sec-exp">${esc(t("branch.branchPdfOutflowTitle"))}</h2>`;
  const rows = aggregatePersonnelByPerson(showAdv ? advances : [], showExp ? expenses : [], dash);
  if (rows.length === 0) return `${title}${emptyNote(t)}`;

  const join = (m: Money | undefined): string => {
    if (!m) return esc(dash);
    const ks = [...m.keys()].filter((c) => Math.abs(m.get(c) ?? 0) > 1e-9).sort();
    return ks.map((c) => esc(formatMoneyDash(m.get(c) ?? 0, dash, locale, c))).join(" · ") || esc(dash);
  };
  // Tek kaynak: tutar tekrar etmesin — kaynak adı ismin altında. Birden fazla: kaynak başına alt satır.
  const render = (label: string, r: Omit<PersonRow, "name">, cls: string): string => {
    const srcs = SRC_ORDER.filter((b) => r.bySrc.has(b));
    const only = srcs.length === 1 ? `<span class="cat-src">${esc(srcBucketLabel(srcs[0], t))}</span>` : "";
    const main = `<tr class="${cls}"><td>${esc(label)}${only}</td><td class="num cat-tot">${join(r.total)}</td></tr>`;
    if (srcs.length < 2) return main;
    return (
      main +
      srcs
        .map((b) => `<tr class="cat-sub"><td>${esc(srcBucketLabel(b, t))}</td><td class="num">${join(r.bySrc.get(b))}</td></tr>`)
        .join("")
    );
  };

  const grand: Omit<PersonRow, "name"> = { total: new Map(), bySrc: new Map() };
  for (const r of rows) {
    for (const [c, v] of r.total) addTo(grand.total, c, v);
    for (const [b, m] of r.bySrc) {
      const g = grand.bySrc.get(b) ?? new Map<string, number>();
      for (const [c, v] of m) addTo(g, c, v);
      grand.bySrc.set(b, g);
    }
  }
  return `${title}
  <table class="cat-table">
    <thead><tr>
      <th>${esc(t("personnel.settlementPrintColPersonnel"))}</th>
      <th class="num">${esc(t("branch.branchPdfOutflowSubtotalTotal"))}</th>
    </tr></thead>
    <tbody>${rows.map((r) => render(r.name, r, "cat-main")).join("")}${render(
      t("branch.branchPdfOutflowSubtotalTotal"),
      grand,
      "cat-total"
    )}</tbody>
  </table>`;
}
