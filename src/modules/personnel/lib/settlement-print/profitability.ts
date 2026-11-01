/**
 * Şube kârlılık hesap katmanı (saf, yan etkisiz) — özet kartı, kârlılık durumu ve detay
 * kırılımı aynı sayıları buradan okur (tek kaynak).
 *
 * Kurallar (mevcut sınıflandırma, değiştirilmedi):
 *  - Hasılat: `isRevenueInRow` (patrondan nakit / kasa devri / P&L-dışı hariç).
 *  - İşletme gideri: OUT, transfer/P&L-dışı değil, kişiye bağlı değil, ödeme kaynağı belli, CAPEX değil.
 *  - Yatırım / demirbaş (CAPEX): aynı kapsam, ayrı toplam.
 *  - Personel kalemleri: kişiye bağlı OUT satırları (işletme giderinin tam tümleyeni → çift sayım yok).
 *    Maaş ödemesi ve avans NAKİT hareketidir; maliyet toplamına eklenmez.
 *  - Tedarikçi ödemeleri `branch_transactions` yazmaz → gider tarafında yoktur; yalnız nakit bilgisi.
 *  - SMM ve maaş tahakkuku / SGK kaydı yok → brüt kâr ve faaliyet kârı «hesaplanamaz».
 */
import type { BranchTransaction } from "@/types/branch-transaction";
import { ccyKey, moneyNum } from "./format";
import {
  type SrcBucket,
  isCapexOutRow,
  isNonExpenseOutRow,
  isPersonnelLinkedTx,
  isRevenueInRow,
  srcBucketOfExpenseRow,
} from "./buckets";

export type Money = Map<string, number>;

/** Bir metrik: kayıtlı (tam), eksik (kısmi tutar var ama tam değil), hesaplanamaz. */
export type MetricStatus = "available" | "incomplete" | "unavailable";

export type CurrencyRegisterAgg = {
  revenue: number;
  cashIn: number;
  cardIn: number;
  /** P&L-dışı işaretli IN satırları (backend finans raporu bunları hasılata sayar → mutabakat için). */
  excludedRevenueIn: number;
  opexBySrc: Map<SrcBucket, number>;
  /** İşletme gideri sınıflandırma koduna göre (ör. OUT_OPS_RENT) — toplamı = opex. */
  opexByCode: Map<string, number>;
  opex: number;
  capex: number;
  /** Kişiye bağlı, maaş/avans OLMAYAN personel giderleri (prim, yemek, yol, SGK satırı …). */
  personnelRecorded: number;
  /** Kasa satırlı maaş ödemeleri (nakit; tahakkuk değil). */
  salaryPaidRegister: number;
  /** İşletme gideri İÇİNDEKİ tedarikçi / merkez kırılımı (ek gider değil). */
  centralSupplier: number;
  centralOverhead: number;
  directSupplierInvoice: number;
  goodsPurchase: number;
};

const newAgg = (): CurrencyRegisterAgg => ({
  revenue: 0,
  cashIn: 0,
  cardIn: 0,
  excludedRevenueIn: 0,
  opexBySrc: new Map(),
  opexByCode: new Map(),
  opex: 0,
  capex: 0,
  personnelRecorded: 0,
  salaryPaidRegister: 0,
  centralSupplier: 0,
  centralOverhead: 0,
  directSupplierInvoice: 0,
  goodsPurchase: 0,
});

const isSalaryRow = (r: BranchTransaction) =>
  (r.linkedSalaryPaymentId ?? 0) > 0 ||
  String(r.mainCategory ?? "").trim().toUpperCase() === "OUT_PER_SALARY";

const isAdvanceRow = (r: BranchTransaction) =>
  (r.linkedAdvanceId ?? 0) > 0 ||
  String(r.mainCategory ?? "").trim().toUpperCase() === "OUT_PER_ADVANCE";

/** Şube kasa satırlarını para birimi bazında tek geçişte toplar. */
export function aggregateBranchRegister(rows: BranchTransaction[]): Map<string, CurrencyRegisterAgg> {
  const out = new Map<string, CurrencyRegisterAgg>();
  const of = (ccy: string) => {
    const a = out.get(ccy) ?? newAgg();
    out.set(ccy, a);
    return a;
  };
  for (const r of rows) {
    const ccy = ccyKey(r.currencyCode);
    const v = moneyNum(r.amount);
    if (String(r.type ?? "").toUpperCase() === "IN") {
      if (isRevenueInRow(r)) {
        const a = of(ccy);
        a.revenue += v;
        a.cashIn += moneyNum(r.cashAmount);
        a.cardIn += moneyNum(r.cardAmount);
      } else if (r.excludedFromProfitAndLoss === true) {
        const mc = String(r.mainCategory ?? "").trim().toUpperCase();
        if (mc !== "IN_PATRON_CASH" && mc !== "IN_OTHER_REGISTER") of(ccy).excludedRevenueIn += v;
      }
      continue;
    }
    if (isNonExpenseOutRow(r)) continue; // transfer / P&L-dışı
    if (isPersonnelLinkedTx(r)) {
      if (isAdvanceRow(r)) continue; // avans: nakit, maliyet değil (personel bölümünde)
      const a = of(ccy);
      if (isSalaryRow(r)) a.salaryPaidRegister += v;
      else a.personnelRecorded += v;
      continue;
    }
    const b = srcBucketOfExpenseRow(r);
    if (!b) continue; // ödenmemiş fatura vb. — özet kartıyla aynı kapsam
    const a = of(ccy);
    if (isCapexOutRow(r)) {
      a.capex += v;
      continue;
    }
    a.opex += v;
    a.opexBySrc.set(b, (a.opexBySrc.get(b) ?? 0) + v);
    const mc = String(r.mainCategory ?? "").trim().toUpperCase();
    a.opexByCode.set(mc, (a.opexByCode.get(mc) ?? 0) + v);
    if ((r.linkedSupplierInvoiceLineId ?? 0) > 0) a.centralSupplier += v;
    else if ((r.generalOverheadPoolId ?? 0) > 0) a.centralOverhead += v;
    else if (mc === "OUT_OPS_INVOICE") a.directSupplierInvoice += v;
    else if (mc.startsWith("OUT_GOODS")) a.goodsPurchase += v;
  }
  return out;
}

/** Sunucu finans özeti (yıl seçiliyse): kanonik nakit hareketleri + hasılat mutabakatı. */
export type ServerYearSummary = {
  income: Money;
  salaryPaid: Money;
  advanceGiven: Money;
  supplierPayments: Money;
};

export type BranchProfitability = {
  byCurrency: Map<string, CurrencyRegisterAgg>;
  personnelCost: MetricStatus;
  cogs: MetricStatus;
  grossProfit: MetricStatus;
  operatingProfit: MetricStatus;
  netProfit: MetricStatus;
  /** Hasılat sunucu finans raporuyla uyuşmuyorsa fark (ccy → fark). Boş = uyumlu veya kontrol yok. */
  revenueMismatch: Money;
};

/**
 * Kârlılık modeli. Personel maliyeti her zaman «eksik»: maaş tahakkuku (hak ediş) ve SGK işveren
 * payı için dönemsel kayıt yok (bordro snapshot'ı üretilmiyor; tahmin tablosu güncel ay içindir).
 * SMM «hesaplanamaz»: tüketim/sayım parasal değerlenmiyor, stok tutarı yalnız tahmin.
 * Bu iki girdi eksik olduğu sürece brüt / faaliyet / net kâr hesaplanmaz.
 */
export function computeBranchProfitability(
  rows: BranchTransaction[],
  server: ServerYearSummary | null
): BranchProfitability {
  const byCurrency = aggregateBranchRegister(rows);
  const revenueMismatch: Money = new Map();
  if (server) {
    const ccys = new Set([...server.income.keys(), ...byCurrency.keys()]);
    for (const c of ccys) {
      const a = byCurrency.get(c);
      const ours = (a?.revenue ?? 0) + (a?.excludedRevenueIn ?? 0);
      const diff = (server.income.get(c) ?? 0) - ours;
      if (Math.abs(diff) > 0.5) revenueMismatch.set(c, diff);
    }
  }
  // ponytail: girdiler sabit eksik; bordro tahakkuku / SMM değerlemesi eklenince durumlar buradan açılır.
  return {
    byCurrency,
    personnelCost: "incomplete",
    cogs: "unavailable",
    grossProfit: "unavailable",
    operatingProfit: "unavailable",
    netProfit: "unavailable",
    revenueMismatch,
  };
}
