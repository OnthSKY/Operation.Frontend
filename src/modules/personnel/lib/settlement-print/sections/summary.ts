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
  isCapexOutRow,
  srcBucketOfExpenseRow,
  srcBucketShortLabel,
} from "../buckets";
import type { BranchSettlementPdfOptions } from "../options";
import { aggregateBranchRegister } from "../profitability";

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

  // Tek hesap katmanı: hasılat, işletme gideri (kaynağa göre), CAPEX ayrı — bkz. profitability.ts.
  const agg = aggregateBranchRegister(packs.registerRaw);

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
      `<div class="pnl-line${cls}"><span class="pnl-k">${esc(k)}</span><span class="pnl-v num${v < -1e-9 ? " neg" : ""}">${money(v)}</span></div>`;
    const groups: string[] = [];

    if (bp.includeRegisterLedger) {
      const a = agg.get(ccy);
      const ri = a?.revenue ?? 0;
      const opex = a?.opex ?? 0;
      const capex = a?.capex ?? 0;
      const interim = ri - opex;
      const chip = (k: string, s: "incomplete" | "unavailable") =>
        `<span class="pf-st pf-st-${s}">${esc(t(k))}</span>`;
      // Tutarlı satır + durum rozeti + kısa açıklama (sonuca dahil mi değil mi).
      const statusLine = (k: string, v: number | null, chipHtml: string, note: string) =>
        `<div class="pnl-line pnl-line-status"><span class="pnl-k">${esc(k)} ${chipHtml}<span class="pnl-note">${esc(note)}</span></span><span class="pnl-v num">${v == null ? esc(dash) : money(v)}</span></div>`;

      // 1. HASILAT: toplam → kart satışları / nakit satışlar → ele geçen nakit.
      // Nakit satışlar = toplam hasılat − kart (kart + nakit = toplam hasılat, tam tutar).
      // Ele geçen nakit = gün sonu çekmecede kalan nakit (kasadan harcama düşülmüş).
      const inCash = a?.cashIn ?? 0;
      const inCard = a?.cardIn ?? 0;
      const cashEarned = ri - inCard;
      const cashCardSub =
        (inCard > 1e-9 ? line(t("branch.branchPdfPnlCardSales"), inCard, " pnl-line-sub") : "") +
        (cashEarned > 1e-9 ? line(t("branch.branchPdfPnlCashEarned"), cashEarned, " pnl-line-sub") : "") +
        (inCash > 1e-9 ? line(t("branch.branchPdfPnlCashInHand"), inCash, " pnl-line-inhand") : "");
      groups.push(`<div class="pnl-group">
        <div class="pnl-head">${esc(t("branch.branchPdfPnlRevenue"))}</div>
        ${line(t("branch.branchPdfPnlGrossRevenue"), ri)}
        ${cashCardSub}
      </div>`);

      // 2. GİDERLER — TÜRLERİNE GÖRE. Ödeme kaynağı burada yok (gider tablosunda).
      // İşletme gideri: en büyük 4 sınıf + «Diğer» (toplam = opex, değişmez).
      const codes = [...(a?.opexByCode ?? new Map<string, number>())].sort((x, y) => y[1] - x[1]);
      const TOP = 4;
      const shown = codes.length > TOP + 1 ? codes.slice(0, TOP) : codes;
      const rest = codes.slice(shown.length).reduce((s2, [, v]) => s2 + v, 0);
      const catLabel = (code: string) => {
        // Okunaklı sınıflandırma adı (ledgerClass) varsa onu kullan; yoksa mevcut kategori etiketi.
        const lc = t(`ledgerClass.${code}`);
        if (lc && lc !== `ledgerClass.${code}`) return lc;
        const { main, sub } = txCategoryMainSub(code, t);
        return sub || main || t("branch.txCategoryUnknown");
      };
      const catLines =
        shown.map(([code, v]) => line(catLabel(code), v, " pnl-line-sub")).join("") +
        (Math.abs(rest) > 1e-9 ? line(t("branch.branchPdfPnlOpexOther"), rest, " pnl-line-sub") : "");
      // Tedarikçi / ürün: işletme giderinin İÇİNDE (ek gider değil); SMM yok.
      const supplier = (a?.centralSupplier ?? 0) + (a?.directSupplierInvoice ?? 0) + (a?.goodsPurchase ?? 0);
      groups.push(`<div class="pnl-group">
        <div class="pnl-head">${esc(t("branch.branchPdfPnlExpensesByType"))}</div>
        ${line(t("branch.branchPdfPnlOpex"), opex, " pnl-line-strong-top")}
        ${catLines}
        ${statusLine(
          t("branch.branchPdfPfPersonnel"),
          a?.personnelRecorded ?? 0,
          chip("branch.branchPdfStatus_incomplete", "incomplete"),
          t("branch.branchPdfPnlPersonnelNote")
        )}
        ${statusLine(
          t("branch.branchPdfPnlSupplierCost"),
          Math.abs(supplier) > 1e-9 ? supplier : null,
          chip("branch.branchPdfPnlCogsUnavailable", "unavailable"),
          t("branch.branchPdfPnlSupplierNote")
        )}
      </div>`);

      // 3. FİNANSAL SONUÇ (hasılat − işletme gideri) — net kâr DEĞİL; negatifse kırmızı.
      groups.push(`<div class="pnl-profit${interim < 0 ? " pnl-profit-neg" : ""}">
        <span class="pnl-profit-k">${esc(t("branch.branchPdfPnlProfit"))}</span>
        <span class="pnl-profit-v num">${money(interim)}</span>
      </div>
      <p class="pnl-profit-note">${esc(t("branch.branchPdfPnlProfitNote"))}</p>`);

      // YATIRIM / DEMİRBAŞ — ayrı; sonuca dahil değil. Yatırım sonrası tutar bilgi amaçlı.
      if (Math.abs(capex) > 1e-9) {
        groups.push(`<div class="pnl-group pnl-capex">
          <div class="pnl-head">${esc(t("branch.branchPdfPnlCapex"))}</div>
          ${line(t("branch.branchPdfPnlCapexTotal"), capex)}
          ${line(t("branch.branchPdfPnlAfterCapex"), interim - capex, " pnl-line-sub")}
        </div>`);
      }
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
 * Şube giderleri — gider türü (ana / alt) × ödeme kaynağı tablosu.
 * Yalnız şube gideri: avans ve kişiye bağlı personel kalemleri burada YOK (kişi bazlı tabloda);
 * böylece her kalem belgede tek yerde sayılır. İşletme toplamı = üstteki «Toplam işletme gideri»;
 * yatırım / demirbaş ayrı alt bölümde ve kendi toplamıyla.
 */
export function buildBranchExpenseTableHtml(
  registerTx: BranchTransaction[],
  bp: BranchSettlementPdfOptions,
  t: (k: string) => string,
  locale: Locale,
  dash: string
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
  type Groups = Map<string, Agg & { subs: Map<string, Agg> }>;
  const opex = { groups: new Map() as Groups, grand: newAgg() };
  const capex = { groups: new Map() as Groups, grand: newAgg() };
  for (const r of registerTx) {
    if (String(r.type ?? "").toUpperCase() === "IN") continue;
    if (isNonExpenseOutRow(r)) continue; // patrona devir / transfer / P&L-dışı = gider değil
    if (isPersonnelLinkedTx(r)) continue; // avans/personel kalemleri kişi bazlı tabloda
    const b = srcBucketOfExpenseRow(r);
    if (!b) continue; // ödenmemiş fatura vb. — özet kartıyla aynı kapsam
    const target = isCapexOutRow(r) ? capex : opex;
    const { main, sub } = txCategoryMainSub(r.mainCategory, t);
    const mainKey = main || unknown;
    const g = target.groups.get(mainKey) ?? { ...newAgg(), subs: new Map<string, Agg>() };
    target.groups.set(mainKey, g);
    const ccy = ccyKey(r.currencyCode);
    const v = moneyNum(r.amount);
    addAgg(g, b, ccy, v);
    const sg = g.subs.get(sub ?? mainKey) ?? newAgg();
    g.subs.set(sub ?? mainKey, sg);
    addAgg(sg, b, ccy, v);
    addAgg(target.grand, b, ccy, v);
  }
  if (opex.groups.size === 0 && capex.groups.size === 0) return "";

  const cols = SRC_ORDER.filter((b) => opex.grand.bySrc.has(b) || capex.grand.bySrc.has(b));
  const cells = (a: Agg) =>
    cols.map((b) => `<td class="num">${moneyJoin(a.bySrc.get(b)) || esc(dash)}</td>`).join("") +
    `<td class="num cat-tot">${moneyJoin(a.total) || esc(dash)}</td>`;
  const groupRows = (groups: Groups): string[] => {
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
    return rows;
  };

  const rows = groupRows(opex.groups);
  rows.push(
    `<tr class="cat-total"><td>${esc(t("branch.branchPdfOpexTableTotal"))}</td>${cells(opex.grand)}</tr>`
  );
  if (capex.groups.size > 0) {
    rows.push(
      `<tr class="cat-section"><td colspan="${cols.length + 2}">${esc(t("branch.branchPdfCapexTableHead"))}</td></tr>`
    );
    rows.push(...groupRows(capex.groups));
    rows.push(
      `<tr class="cat-total"><td>${esc(t("branch.branchPdfCapexTableTotal"))}</td>${cells(capex.grand)}</tr>`
    );
  }

  return `<div class="src-block">
      <p class="src-subhead">${esc(t("branch.branchPdfSourceBreakdownTitle"))}<span class="src-subhead-note">${esc(t("branch.branchPdfSourceBreakdownNote"))}</span></p>
      <table class="cat-table">
        <thead>
          <tr><th rowspan="2">${esc(t("branch.branchPdfColExpenseType"))}</th><th class="src-group" colspan="${cols.length}">${esc(t("branch.branchPdfColPaymentSource"))}</th><th class="num" rowspan="2">${esc(t("branch.branchPdfSummaryColTotal"))}</th></tr>
          <tr>${cols.map((b) => `<th class="num src-col">${esc(srcBucketShortLabel(b, t))}</th>`).join("")}</tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>`;
}

/**
 * Şubenin nakiti nerede (gün sonu): eline geçen nakit + kalan. Finansal sonuç değil, nakit
 * konumudur — belgede «Nakit ve bakiyeler» altında ayrı gösterilir.
 */
export function buildBranchCashWhereHtml(
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
    // Backend zimmet bakiyesini yalnız TRY ledger'dan verir (BranchRegisterSummaryService) → TRY.
    // TRY dışı gün-sonu zimmeti varsa belge üstünde ayrıca uyarılır.
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

  return cashCard;
}
