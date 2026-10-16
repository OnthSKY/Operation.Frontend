/** Personel hesabı — kişi bazlı özet: her personel tek satır (avans · gider · toplam). */
import type { Locale } from "@/i18n/messages";
import {
  expenseAttributionPersonnelId,
  resolveNonAdvanceRow,
} from "@/modules/personnel/components/personnel-non-advance-expense-blocks";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import type { Advance, AdvanceListItem } from "@/types/advance";
import type { BranchTransaction } from "@/types/branch-transaction";
import { isPersonnelLinkedTx } from "../buckets";
import { ccyKey, escapeHtml, moneyNum } from "../format";
import { emptyNote } from "../options";

type PersonRow = { name: string; adv: Map<string, number>; exp: Map<string, number> };

/** Kişi başı avans / gider toplamları (saf). Cepten şube gideri (kişiye bağlı değil) dahil edilmez. */
export function aggregatePersonnelByPerson(
  advances: (Advance | AdvanceListItem)[],
  expenses: BranchTransaction[],
  dash: string
): PersonRow[] {
  const byId = new Map<string, PersonRow>();
  const row = (key: string, name: string): PersonRow => {
    const r = byId.get(key) ?? { name, adv: new Map(), exp: new Map() };
    if (r.name === dash && name !== dash) r.name = name;
    byId.set(key, r);
    return r;
  };
  const add = (m: Map<string, number>, ccy: string, v: number) => m.set(ccy, (m.get(ccy) ?? 0) + v);

  for (const a of advances) {
    const name =
      (a as AdvanceListItem).personnelFullName?.trim() ||
      a.heldRegisterSourcePersonnelFullName?.trim() ||
      dash;
    add(row(`p${a.personnelId}`, name).adv, ccyKey(a.currencyCode), moneyNum(a.amount));
  }
  for (const e of expenses) {
    // Cepten ödenen şube gideri kişiye verilen para değil; şube gider tablosunda sayılır.
    if (!isPersonnelLinkedTx(e)) continue;
    const pid = expenseAttributionPersonnelId(e);
    const name = resolveNonAdvanceRow(e, dash).employeeName;
    add(row(pid != null ? `p${pid}` : `n${name}`, name).exp, ccyKey(e.currencyCode), moneyNum(e.amount));
  }
  const weight = (r: PersonRow) =>
    [...r.adv.values(), ...r.exp.values()].reduce((s, v) => s + v, 0);
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

  const join = (m: Map<string, number>): string => {
    const ks = [...m.keys()].filter((c) => Math.abs(m.get(c) ?? 0) > 1e-9).sort();
    return ks.map((c) => esc(formatMoneyDash(m.get(c) ?? 0, dash, locale, c))).join(" · ") || esc(dash);
  };
  const sum = (...ms: Map<string, number>[]): Map<string, number> => {
    const out = new Map<string, number>();
    for (const m of ms) for (const [c, v] of m) out.set(c, (out.get(c) ?? 0) + v);
    return out;
  };
  const cells = (adv: Map<string, number>, exp: Map<string, number>) =>
    (showAdv ? `<td class="num">${join(adv)}</td>` : "") +
    (showExp ? `<td class="num">${join(exp)}</td>` : "") +
    `<td class="num cat-tot">${join(sum(adv, exp))}</td>`;

  const body = rows
    .map((r) => `<tr><td>${esc(r.name)}</td>${cells(r.adv, r.exp)}</tr>`)
    .join("");
  const totAdv = sum(...rows.map((r) => r.adv));
  const totExp = sum(...rows.map((r) => r.exp));
  return `${title}
  <table class="cat-table">
    <thead><tr>
      <th>${esc(t("personnel.settlementPrintColPersonnel"))}</th>
      ${showAdv ? `<th class="num">${esc(t("branch.branchPdfOutflowSubtotalAdvance"))}</th>` : ""}
      ${showExp ? `<th class="num">${esc(t("branch.branchPdfOutflowSubtotalExpense"))}</th>` : ""}
      <th class="num">${esc(t("branch.branchPdfOutflowSubtotalTotal"))}</th>
    </tr></thead>
    <tbody>${body}<tr class="cat-total"><td>${esc(t("branch.branchPdfOutflowSubtotalTotal"))}</td>${cells(totAdv, totExp)}</tr></tbody>
  </table>`;
}
