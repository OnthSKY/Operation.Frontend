/**
 * Şube özeti (en üst): kâr-zarar (P&L) kartı, ödeme kaynağına göre gider dağılımı ve
 * "şubenin nakiti nerede" (eline geçen / kalan) kartı.
 */
import type { Locale } from "@/i18n/messages";
import { isRegisterDayCloseIncomeRow } from "@/modules/branch/lib/branch-transaction-options";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import type { Advance, AdvanceListItem } from "@/types/advance";
import type { BranchTransaction } from "@/types/branch-transaction";
import { ccyKey, escapeHtml, moneyNum } from "../format";
import {
  PALETTE,
  SRC_ORDER,
  type SrcBucket,
  isNonExpenseOutRow,
  isPersonnelLinkedTx,
  srcBucketColor,
  srcBucketLabel,
  srcBucketOfAdvance,
  srcBucketOfExpense,
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

  // Hasılatın nakit / kart kırılımı (gün sonu IN satırları).
  const regInCash = new Map<string, number>();
  const regInCard = new Map<string, number>();
  for (const r of packs.registerRaw) {
    if (String(r.type ?? "").toUpperCase() !== "IN") continue;
    const ccy = ccyKey(r.currencyCode);
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
      const ri = packs.regInTotals.get(ccy) ?? 0;
      const outReg = regOutOf("REGISTER", ccy); // kasadan harcanan (çekmeceyi düşüren)
      const outPatron = regOutOf("PATRON", ccy); // patron cebinden (kasa-nötr)
      const outHeld = regOutOf("PERSONNEL_HELD_REGISTER_CASH", ccy); // personel zimmetinden
      const outPocket = regOutOf("PERSONNEL_POCKET", ccy); // personel cebinden
      const totalGider = outReg + outPatron + outHeld + outPocket;
      const kar = ri - totalGider;

      // HASILAT: toplam (altında nakit/kart) → kasadan harcanan → net hasılat
      const inCash = regInCash.get(ccy) ?? 0;
      const inCard = regInCard.get(ccy) ?? 0;
      const cashCardSub =
        (inCash > 1e-9 ? line(t("branch.txCashShort"), inCash, " pnl-line-sub") : "") +
        (inCard > 1e-9 ? line(t("branch.txCardShort"), inCard, " pnl-line-sub") : "");
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
 * Özet — ödeme kaynağına göre gruplar; her kaynağın içinde tür ayrımı:
 * Avanslar · Personel giderleri · Şube giderleri. Ayrıca gün sonu nakitin "kimde"
 * olduğu (patron / şube kasası / personel zimmeti) kartı. Çift sayımı önlemek için
 * şube gideri = kasa OUT satırlarından kişiye bağlı (avans/maaş/personel) olmayanlar.
 */
export function buildBranchSourceBreakdownHtml(
  advances: Advance[] | AdvanceListItem[],
  expenses: BranchTransaction[],
  registerTx: BranchTransaction[],
  bp: BranchSettlementPdfOptions,
  t: (k: string) => string,
  locale: Locale,
  dash: string,
  /** Kanonik personel zimmet net bakiyesi (personnelId → {tutar, ad}); personel satırları bundan sürülür. */
  heldCashByPerson: Map<number, { amount: number; fullName: string }> = new Map()
): string {
  const esc = escapeHtml;
  const addTo = (m: Map<string, number>, ccy: string, v: number) =>
    m.set(ccy, (m.get(ccy) ?? 0) + v);

  type Kinds = {
    adv: Map<string, number>;
    pexp: Map<string, number>;
    bexp: Map<string, number>;
  };
  const byBucket = new Map<SrcBucket, Kinds>();
  const bucket = (b: SrcBucket): Kinds => {
    const g = byBucket.get(b) ?? {
      adv: new Map<string, number>(),
      pexp: new Map<string, number>(),
      bexp: new Map<string, number>(),
    };
    byBucket.set(b, g);
    return g;
  };

  // Avans: tam avans listesi (patron/banka-finanse dahil), kaynağa göre.
  if (bp.includeAdvances) {
    for (const a of advances)
      addTo(bucket(srcBucketOfAdvance(a.sourceType)).adv, ccyKey(a.currencyCode), moneyNum(a.amount));
  }
  // Personel gideri: personele yazılan giderler; kaynağı yoksa kasa (REGISTER) varsayılır.
  if (bp.includePersonnelNonAdvanceExpenses) {
    for (const e of expenses) {
      if (isNonExpenseOutRow(e)) continue;
      const b = srcBucketOfExpense(e.expensePaymentSource) ?? "REGISTER";
      addTo(bucket(b).pexp, ccyKey(e.currencyCode), moneyNum(e.amount));
    }
  }
  // Şube gideri: kasa OUT, personele/avansa bağlı OLMAYAN, kaynağa göre.
  if (bp.includeRegisterLedger) {
    for (const r of registerTx) {
      if (String(r.type ?? "").toUpperCase() === "IN") continue;
      if (isNonExpenseOutRow(r)) continue; // patrona devir / transfer / P&L-dışı = gider değil
      if (isPersonnelLinkedTx(r)) continue; // avans/personel kalemleri yukarıda sayıldı
      const b = srcBucketOfExpense(r.expensePaymentSource);
      if (b) addTo(bucket(b).bexp, ccyKey(r.currencyCode), moneyNum(r.amount));
    }
  }

  const money = (v: number, c: string) => esc(formatMoneyDash(v, dash, locale, c));
  const moneyJoin = (m: Map<string, number>): string => {
    const ccys = [...m.keys()].filter((c) => Math.abs(m.get(c) ?? 0) > 1e-9).sort();
    if (ccys.length === 0) return "";
    return ccys.map((c) => money(m.get(c) ?? 0, c)).join(" · ");
  };
  const sumKinds = (g: Kinds): Map<string, number> => {
    const s = new Map<string, number>();
    for (const m of [g.adv, g.pexp, g.bexp])
      for (const [c, v] of m) s.set(c, (s.get(c) ?? 0) + v);
    return s;
  };

  // Personel gideri + avans tek satırda (ikisi de personel ekseni gideri).
  const kPexp = esc(t("branch.branchPdfSourcePersonnelExpense"));
  const kBexp = esc(t("branch.branchPdfSourceBranchExpense"));
  const kTot = esc(t("branch.branchPdfSummaryColTotal"));

  const cards: string[] = [];
  for (const b of SRC_ORDER) {
    const g = byBucket.get(b);
    if (!g) continue;
    const line = (label: string, m: Map<string, number>, total?: boolean) => {
      const val = moneyJoin(m);
      if (!val) return "";
      return `<div class="src-line${total ? " src-line-total" : ""}"><span class="src-k">${label}</span><span class="src-v num">${val}</span></div>`;
    };
    // Personel gideri + avans → tek satır (ikisi de personel gideri).
    const persExp = new Map<string, number>();
    for (const m of [g.adv, g.pexp])
      for (const [c, v] of m) persExp.set(c, (persExp.get(c) ?? 0) + v);
    const rows = line(kPexp, persExp) + line(kBexp, g.bexp);
    if (!rows) continue;
    const totalVal = moneyJoin(sumKinds(g));
    const accent = srcBucketColor(b);
    cards.push(`<div class="src-card" style="border-top-color:${accent}">
      <div class="src-card-head" style="color:${accent}">${esc(srcBucketLabel(b, t))}</div>
      ${rows}
      <div class="src-line src-line-total"><span class="src-k">${kTot}</span><span class="src-v num">${totalVal}</span></div>
    </div>`);
  }

  // Şubenin nakiti nerede (gün sonu): eline geçen nakit + harcama sonrası kalan.
  // PERSONEL satırları KANONIK ledger'dan (uygulama kasa raporuyla birebir); diğerleri gün-sonundan.
  let cashCard = "";
  if (bp.includeRegisterLedger) {
    // Personel-dışı taraflar (şube kasası / patron / atanmamış): gün-sonu nakdi.
    const branchRec = new Map<string, number>();
    const patronRec = new Map<string, number>();
    const patronSpent = new Map<string, number>();
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
    // Patron'un kendi cebinden ödediği şube gideri → patron "kalan"ından düşülür.
    for (const r of registerTx) {
      if (String(r.type ?? "").toUpperCase() === "IN") continue;
      if (isNonExpenseOutRow(r)) continue;
      if (String(r.expensePaymentSource ?? "").trim().toUpperCase() !== "PATRON") continue;
      const amt = moneyNum(r.amount);
      if (amt > 1e-9) addTo(patronSpent, ccyKey(r.currencyCode), amt);
    }
    const sub = (a: Map<string, number>, b: Map<string, number>): Map<string, number> => {
      const m = new Map(a);
      for (const [c, v] of b) m.set(c, (m.get(c) ?? 0) - v);
      return m;
    };

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

    // Şube kasası: kalan = received (kasa gideri üst özette; burada düşülmez).
    pushRow(t("branch.branchPdfCashHolderBranch"), PALETTE.income, branchRec, branchRec);
    // Patron: kalan = received − patron harcaması.
    pushRow(t("branch.branchPdfCashHolderPatron"), PALETTE.goods, patronRec, sub(patronRec, patronSpent));
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

    if (rowHtml.length > 0) {
      cashCard = `<div class="cash-where-card">
        <div class="cash-where-head">${esc(t("branch.branchPdfBranchCashWhereTitle"))}</div>
        <table class="cash-where-table">
          <thead><tr><th>${esc(t("branch.branchPdfCashWhereWho"))}</th><th class="num">${esc(t("branch.branchPdfCashReceived"))}</th><th class="num">${esc(t("branch.branchPdfCashRemaining"))}</th></tr></thead>
          <tbody>${rowHtml.join("")}
            <tr class="cw-total"><td>${esc(t("branch.branchPdfBranchCashTotal"))}</td><td class="num">${moneyJoin(totR) || esc(dash)}</td><td class="num cw-rem">${moneyJoin(totRem) || esc(dash)}</td></tr>
          </tbody>
        </table>
      </div>`;
    }
  }

  if (cards.length === 0 && !cashCard) return "";
  // Genel toplam — tüm ödeme kaynaklarındaki avans + personel gideri + şube gideri.
  const grand = new Map<string, number>();
  for (const g of byBucket.values())
    for (const [c, v] of sumKinds(g)) grand.set(c, (grand.get(c) ?? 0) + v);
  const grandVal = moneyJoin(grand);
  const totalBar =
    cards.length && grandVal
      ? `<div class="src-total-bar"><span class="src-total-k">${esc(t("branch.branchPdfSourceGrandTotal"))}</span><span class="src-total-v num">${grandVal}</span></div>`
      : "";
  const srcSection = cards.length
    ? `<p class="src-subhead">${esc(t("branch.branchPdfSourceBreakdownTitle"))} <span class="src-subhead-note">${esc(t("branch.branchPdfSourceBreakdownNote"))}</span></p>
    <div class="src-grid">${cards.join("")}</div>
    ${totalBar}`
    : "";
  const cashSection = cashCard ? cashCard : "";
  return `<div class="src-section">${srcSection}${cashSection}</div>`;
}
