/**
 * Şube özeti (en üst): kâr-zarar (P&L) kartı, kategori × ödeme kaynağı gider tablosu ve
 * "şubenin nakiti nerede" (eline geçen / kalan) kartı.
 */
import type { Locale } from "@/i18n/messages";
import {
  isRegisterDayCloseIncomeRow,
  txCategoryMainSub,
} from "@/modules/branch/lib/branch-transaction-options";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import type { BranchTransaction } from "@/types/branch-transaction";
import { ccyKey, escapeHtml, moneyNum } from "../format";
import {
  PALETTE,
  SRC_ORDER,
  type SrcBucket,
  isNonExpenseOutRow,
  isPersonnelLinkedTx,
  isRevenueInRow,
  srcBucketOfExpense,
  srcBucketShortLabel,
} from "../buckets";
import type { BranchSettlementPdfOptions } from "../options";

export function buildBranchTotalsCardsHtml(
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
    registerRaw: BranchTransaction[];
  }
): string {
  const esc = escapeHtml;

  // Kasa OUT'unu ödeme kaynağına göre para birimi bazında böl (kasadan / patrondan / zimmet / cep).
  const regOutBySrc = new Map<SrcBucket, Map<string, number>>();
  for (const r of packs.registerRaw) {
    if (String(r.type ?? "").toUpperCase() === "IN") continue;
    if (isNonExpenseOutRow(r)) continue; // patrona devir / transfer / P&L-dışı = gider değil
    if (isPersonnelLinkedTx(r)) continue; // personel/avans kalemleri ŞUBE giderine girmez (alt dağılımda)
    const b = srcBucketOfExpense(r.expensePaymentSource);
    if (!b) continue;
    const ccy = ccyKey(r.currencyCode);
    const m = regOutBySrc.get(b) ?? new Map<string, number>();
    m.set(ccy, (m.get(ccy) ?? 0) + moneyNum(r.amount));
    regOutBySrc.set(b, m);
  }
  const regOutOf = (b: SrcBucket, ccy: string): number =>
    regOutBySrc.get(b)?.get(ccy) ?? 0;

  // Hasılat + nakit / kart kırılımı. Patrondan kasaya nakit ve kasa devri (IN_PATRON_CASH /
  // IN_OTHER_REGISTER) hasılat değil — backend finans raporlarıyla aynı kural.
  const regIn = new Map<string, number>();
  const regInCash = new Map<string, number>();
  const regInCard = new Map<string, number>();
  for (const r of packs.registerRaw) {
    if (!isRevenueInRow(r)) continue;
    const ccy = ccyKey(r.currencyCode);
    regIn.set(ccy, (regIn.get(ccy) ?? 0) + moneyNum(r.amount));
    regInCash.set(ccy, (regInCash.get(ccy) ?? 0) + moneyNum(r.cashAmount));
    regInCard.set(ccy, (regInCard.get(ccy) ?? 0) + moneyNum(r.cardAmount));
  }

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

  for (const ccy of ccys) {
    const money = (v: number) => esc(formatMoneyDash(v, dash, locale, ccy));
    const line = (k: string, v: number, cls = "") =>
      `<div class="pnl-line${cls}"><span class="pnl-k">${esc(k)}</span><span class="pnl-v num">${money(v)}</span></div>`;
    const groups: string[] = [];

    if (bp.includeRegisterLedger) {
      const ri = regIn.get(ccy) ?? 0;
      const outReg = regOutOf("REGISTER", ccy); // kasadan harcanan (çekmeceyi düşüren)
      const outPatron = regOutOf("PATRON", ccy); // patron cebinden (kasa-nötr)
      const outHeld = regOutOf("PERSONNEL_HELD_REGISTER_CASH", ccy); // personel zimmetinden
      const outPocket = regOutOf("PERSONNEL_POCKET", ccy); // personel cebinden
      const totalGider = outReg + outPatron + outHeld + outPocket;
      const kar = ri - totalGider;

      // HASILAT: toplam → kazanılan nakit / ele geçen nakit / kart → net hasılat.
      // Kazanılan nakit = toplam hasılat − kart (kazanılan + kart = toplam hasılat, tam tutar).
      // Ele geçen nakit  = gün sonu çekmecede kalan nakit (kasadan harcama düşülmüş) = regInCash.
      const inCash = regInCash.get(ccy) ?? 0;
      const inCard = regInCard.get(ccy) ?? 0;
      const cashEarned = ri - inCard;
      const cashCardSub =
        (inCard > 1e-9 ? line(t("branch.txCardShort"), inCard, " pnl-line-sub") : "") +
        (cashEarned > 1e-9 ? line(t("branch.branchPdfPnlCashEarned"), cashEarned, " pnl-line-sub") : "") +
        (inCash > 1e-9 ? line(t("branch.branchPdfPnlCashInHand"), inCash, " pnl-line-inhand") : "");
      groups.push(`<div class="pnl-group">
        <div class="pnl-head">${esc(t("branch.branchPdfPnlRevenue"))}</div>
        ${line(t("branch.branchPdfPnlGrossRevenue"), ri)}
        ${cashCardSub}
      </div>`);

      // ŞUBE GİDERİ: kaynağa göre (kasa / patron cebi / zimmet / cep) + toplam. Yalnız şube;
      // personel gideri ve avanslar aşağıdaki dağılımda. (kasa-drawer "kalan" → Nakit nerede kartı.)
      const exLines =
        (Math.abs(outReg) > 1e-9 ? line(t("branch.branchPdfTotalRegisterSpentShort"), outReg) : "") +
        (Math.abs(outPatron) > 1e-9 ? line(t("branch.branchPdfTotalPatronSpent"), outPatron) : "") +
        (Math.abs(outHeld) > 1e-9
          ? line(t("branch.branchPdfTotalPersonnelHeldSpent"), outHeld, " pnl-line-held")
          : "") +
        (Math.abs(outPocket) > 1e-9
          ? line(t("branch.branchPdfTotalPersonnelPocketSpent"), outPocket)
          : "");
      groups.push(`<div class="pnl-group">
        <div class="pnl-head">${esc(t("branch.branchPdfPnlExpenses"))}</div>
        ${exLines || `<div class="pnl-line"><span class="pnl-k">${esc(dash)}</span><span class="pnl-v num">${money(0)}</span></div>`}
        ${line(t("branch.branchPdfPnlTotalExpense"), totalGider, " pnl-line-total")}
      </div>`);

      // KÂR (hasılat − şube gideri) — vurgulu; negatifse kırmızı.
      groups.push(`<div class="pnl-profit${kar < 0 ? " pnl-profit-neg" : ""}">
        <span class="pnl-profit-k">${esc(t("branch.branchPdfPnlProfit"))}</span>
        <span class="pnl-profit-v num">${money(kar)}</span>
      </div>`);
    }

    if (groups.length === 0) continue;
    cards.push(`<div class="settlement-totals-currency">
      <div class="settlement-totals-ccy">${esc(ccy)}</div>
      <div class="pnl">${groups.join("")}</div>
    </div>`);
  }

  if (cards.length === 0) {
    return `<p class="meta settlement-totals-empty">${esc(dash)}</p>`;
  }
  return cards.join("");
}

/**
 * Şube giderleri — kategori (ana / alt) × ödeme kaynağı tablosu + "şubenin nakiti nerede" kartı.
 * Yalnız şube gideri: avans ve kişiye bağlı personel kalemleri burada YOK (kişi bazlı tabloda);
 * böylece her kalem belgede tek yerde sayılır. Toplam satırı = üstteki P&L "Toplam gider".
 */
export function buildBranchSourceBreakdownHtml(
  registerTx: BranchTransaction[],
  bp: BranchSettlementPdfOptions,
  t: (k: string) => string,
  locale: Locale,
  dash: string,
  /** Kanonik personel zimmet net bakiyesi (personnelId → {tutar, ad}); personel satırları bundan sürülür. */
  heldCashByPerson: Map<number, { amount: number; fullName: string }> = new Map()
): string {
  if (!bp.includeRegisterLedger) return "";
  const esc = escapeHtml;
  const addTo = (m: Map<string, number>, ccy: string, v: number) =>
    m.set(ccy, (m.get(ccy) ?? 0) + v);
  const money = (v: number, c: string) => esc(formatMoneyDash(v, dash, locale, c));
  const moneyJoin = (m: Map<string, number> | undefined): string => {
    if (!m) return "";
    const ccys = [...m.keys()].filter((c) => Math.abs(m.get(c) ?? 0) > 1e-9).sort();
    return ccys.map((c) => money(m.get(c) ?? 0, c)).join(" · ");
  };
  // Sıralama için tek sayı (para birimleri toplanır; pratikte hep TRY).
  const weight = (m: Map<string, number>) => [...m.values()].reduce((s, v) => s + v, 0);

  type Agg = { total: Map<string, number>; bySrc: Map<SrcBucket, Map<string, number>> };
  const newAgg = (): Agg => ({ total: new Map(), bySrc: new Map() });
  const addAgg = (a: Agg, b: SrcBucket, ccy: string, v: number) => {
    addTo(a.total, ccy, v);
    const m = a.bySrc.get(b) ?? new Map<string, number>();
    addTo(m, ccy, v);
    a.bySrc.set(b, m);
  };

  const unknown = t("branch.txCategoryUnknown");
  const groups = new Map<string, Agg & { subs: Map<string, Agg> }>();
  const grand = newAgg();
  for (const r of registerTx) {
    if (String(r.type ?? "").toUpperCase() === "IN") continue;
    if (isNonExpenseOutRow(r)) continue; // patrona devir / transfer / P&L-dışı = gider değil
    if (isPersonnelLinkedTx(r)) continue; // avans/personel kalemleri kişi bazlı tabloda
    const b = srcBucketOfExpense(r.expensePaymentSource);
    if (!b) continue; // ödenmemiş fatura vb. — P&L kartıyla aynı kapsam
    const { main, sub } = txCategoryMainSub(r.mainCategory, t);
    const mainKey = main || unknown;
    const g = groups.get(mainKey) ?? { ...newAgg(), subs: new Map<string, Agg>() };
    groups.set(mainKey, g);
    const ccy = ccyKey(r.currencyCode);
    const v = moneyNum(r.amount);
    addAgg(g, b, ccy, v);
    const sg = g.subs.get(sub ?? mainKey) ?? newAgg();
    g.subs.set(sub ?? mainKey, sg);
    addAgg(sg, b, ccy, v);
    addAgg(grand, b, ccy, v);
  }

  let catBlock = "";
  if (groups.size > 0) {
    const cols = SRC_ORDER.filter((b) => grand.bySrc.has(b));
    const cells = (a: Agg) =>
      cols.map((b) => `<td class="num">${moneyJoin(a.bySrc.get(b)) || esc(dash)}</td>`).join("") +
      `<td class="num cat-tot">${moneyJoin(a.total) || esc(dash)}</td>`;
    const rows: string[] = [];
    for (const [mainKey, g] of [...groups].sort((x, y) => weight(y[1].total) - weight(x[1].total))) {
      const subs = [...g.subs].sort((x, y) => weight(y[1].total) - weight(x[1].total));
      // Tek alt kategori: ayrı satır açma (aynı rakam iki kez görünmesin) — "Ana · Alt" tek satır.
      const label =
        subs.length === 1 && subs[0][0] !== mainKey ? `${mainKey} · ${subs[0][0]}` : mainKey;
      rows.push(`<tr class="cat-main"><td>${esc(label)}</td>${cells(g)}</tr>`);
      if (subs.length > 1)
        for (const [subKey, sg] of subs)
          rows.push(`<tr class="cat-sub"><td>${esc(subKey)}</td>${cells(sg)}</tr>`);
    }
    rows.push(
      `<tr class="cat-total"><td>${esc(t("branch.branchPdfSummaryColTotal"))}</td>${cells(grand)}</tr>`
    );
    catBlock = `<div class="src-block">
      <p class="src-subhead">${esc(t("branch.branchPdfSourceBreakdownTitle"))}<span class="src-subhead-note">${esc(t("branch.branchPdfSourceBreakdownNote"))}</span></p>
      <table class="cat-table">
        <thead><tr><th>${esc(t("personnel.nonAdvanceExpensesColCategory"))}</th>${cols
          .map((b) => `<th class="num">${esc(srcBucketShortLabel(b, t))}</th>`)
          .join("")}<th class="num">${esc(t("branch.branchPdfSummaryColTotal"))}</th></tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>`;
  }

  // Şubenin nakiti nerede (gün sonu): eline geçen nakit + kalan.
  // PERSONEL satırları KANONIK ledger'dan (uygulama kasa raporuyla birebir); diğerleri gün-sonundan.
  // Personel-dışı taraflar (şube kasası / patron / atanmamış): gün-sonu nakdi.
  const branchRec = new Map<string, number>();
  const patronRec = new Map<string, number>();
  const naRec = new Map<string, number>();
  // Personelin gün-sonu eline geçeni ("Eline geçen" sütunu) + gün-sonu adı (yedek).
  const persReceived = new Map<number, Map<string, number>>();
  const persName = new Map<number, string>();

  for (const r of registerTx) {
    if (!isRegisterDayCloseIncomeRow(r.type, r.mainCategory, r.category)) continue;
    const cash = moneyNum(r.cashAmount);
    if (cash <= 1e-9) continue;
    const ccy = ccyKey(r.currencyCode);
    const party = String(r.cashSettlementParty ?? "").trim().toUpperCase();
    if (party === "PATRON") addTo(patronRec, ccy, cash);
    else if (party === "REMAINS_AT_BRANCH") addTo(branchRec, ccy, cash);
    else if (party === "BRANCH_MANAGER" && r.cashSettlementPersonnelId != null) {
      const pid = r.cashSettlementPersonnelId;
      const m = persReceived.get(pid) ?? new Map<string, number>();
      addTo(m, ccy, cash);
      persReceived.set(pid, m);
      const nm = r.cashSettlementPersonnelFullName?.trim();
      if (nm) persName.set(pid, nm);
    } else addTo(naRec, ccy, cash);
  }

  const totR = new Map<string, number>();
  const totRem = new Map<string, number>();
  const rowHtml: string[] = [];
  const pushRow = (label: string, accent: string, received: Map<string, number>, rem: Map<string, number>) => {
    const recV = moneyJoin(received);
    const remV = moneyJoin(rem);
    if (!recV && !remV) return;
    for (const [c, v] of received) totR.set(c, (totR.get(c) ?? 0) + v);
    for (const [c, v] of rem) totRem.set(c, (totRem.get(c) ?? 0) + v);
    rowHtml.push(`<tr>
          <td class="cw-label" style="border-left-color:${accent};color:${accent}">${esc(label)}</td>
          <td class="num">${recV || esc(dash)}</td>
          <td class="num cw-rem">${remV || esc(dash)}</td>
        </tr>`);
  };

  // Şube kasası: kalan = received (kasa gideri gün sonunda zaten düşülmüş).
  pushRow(t("branch.branchPdfCashHolderBranch"), PALETTE.income, branchRec, branchRec);
  // Patron: kalan = received. Patronun kendi cebinden yaptığı şube harcaması şube nakdi
  // değildir → buradan düşülmez (gider tablosunda "Patron cebi" sütununda).
  pushRow(t("branch.branchPdfCashHolderPatron"), PALETTE.goods, patronRec, patronRec);
  // Atanmamış / diğer.
  pushRow(t("branch.branchPdfCashHolderUnassigned"), PALETTE.neutral, naRec, naRec);
  // Personel zimmeti — KANONIK ledger listesinden sür (kalan = kanonik net bakiye).
  const base = t("branch.branchPdfCashHolderPersonnel");
  const persEntries = [...heldCashByPerson.entries()].sort((a, b) => b[1].amount - a[1].amount);
  for (const [pid, info] of persEntries) {
    const name = info.fullName?.trim() || persName.get(pid) || "";
    const label = name ? `${base}: ${name}` : base;
    const received = persReceived.get(pid) ?? new Map<string, number>();
    const rem = new Map<string, number>([["TRY", info.amount]]);
    pushRow(label, PALETTE.personnel, received, rem);
  }

  const cashCard =
    rowHtml.length > 0
      ? `<div class="cash-where-card">
      <div class="cash-where-head">${esc(t("branch.branchPdfBranchCashWhereTitle"))}</div>
      <table class="cash-where-table">
        <thead><tr><th>${esc(t("branch.branchPdfCashWhereWho"))}</th><th class="num">${esc(t("branch.branchPdfCashReceived"))}</th><th class="num">${esc(t("branch.branchPdfCashRemaining"))}</th></tr></thead>
        <tbody>${rowHtml.join("")}
          <tr class="cw-total"><td>${esc(t("branch.branchPdfBranchCashTotal"))}</td><td class="num">${moneyJoin(totR) || esc(dash)}</td><td class="num cw-rem">${moneyJoin(totRem) || esc(dash)}</td></tr>
        </tbody>
      </table>
    </div>`
      : "";

  if (!catBlock && !cashCard) return "";
  return `<div class="src-section">${catBlock}${cashCard}</div>`;
}
