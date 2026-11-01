/**
 * Şube PDF finans kuralları — regresyon kontrolü (framework yok; saf fonksiyonlar).
 * Çalıştır: `bun src/modules/personnel/lib/settlement-print/settlement-print.check.ts` → "ok".
 */
import assert from "node:assert/strict";
import type { BranchTransaction } from "@/types/branch-transaction";
import { isCapexOutRow, srcBucketOfExpenseRow } from "./buckets";
import { branchPdfPresetOptions, defaultBranchSettlementPdfOptions } from "./options";
import { aggregateBranchRegister, computeBranchProfitability } from "./profitability";
import { buildBranchExpenseTableHtml, buildBranchTotalsCardsHtml } from "./sections/summary";

const t = (k: string) => k;
let id = 0;
const tx = (o: Partial<BranchTransaction>): BranchTransaction =>
  ({ id: ++id, transactionDate: "2026-06-01", currencyCode: "TRY", ...o }) as BranchTransaction;

const rows: BranchTransaction[] = [
  // Hasılat
  tx({ type: "IN", mainCategory: "IN_DAY_CLOSE", amount: 1000, cashAmount: 600, cardAmount: 400 }),
  tx({ type: "IN", mainCategory: "IN_DAY_CLOSE", amount: 50, currencyCode: "EUR", cashAmount: 50 }),
  // İç transferler — hasılat değil
  tx({ type: "IN", mainCategory: "IN_PATRON_CASH", amount: 500 }),
  tx({ type: "IN", mainCategory: "IN_OTHER_REGISTER", amount: 70 }),
  tx({ type: "IN", mainCategory: "IN_OTHER_MISC", amount: 30, excludedFromProfitAndLoss: true }),
  // İşletme giderleri
  tx({ type: "OUT", mainCategory: "OUT_OPS_RENT", amount: 200, expensePaymentSource: "REGISTER" }),
  tx({ type: "OUT", mainCategory: "OUT_OPS_INVOICE", amount: 100, expensePaymentSource: "PATRON", linkedSupplierInvoiceLineId: 9 }),
  tx({ type: "OUT", mainCategory: "OUT_OPS_UTIL", amount: 40, expensePaymentSource: "PATRON", generalOverheadPoolId: 3 }),
  tx({ type: "OUT", mainCategory: "OUT_GOODS_PURCHASE", amount: 25, expensePaymentSource: "REGISTER" }),
  // Yatırım — ayrı
  tx({ type: "OUT", mainCategory: "OUT_CAPEX_EQUIPMENT", amount: 300, expensePaymentSource: "PATRON" }),
  // Personel: avans (nakit), maaş ödemesi (nakit), kayıtlı personel gideri (maliyet)
  tx({ type: "OUT", mainCategory: "OUT_PER_ADVANCE", amount: 80, expensePaymentSource: "REGISTER", linkedAdvanceId: 1 }),
  tx({ type: "OUT", mainCategory: "OUT_PER_SALARY", amount: 150, expensePaymentSource: "REGISTER", linkedSalaryPaymentId: 4 }),
  tx({ type: "OUT", mainCategory: "OUT_PER_MEAL_ALLOWANCE", amount: 20, expensePaymentSource: "REGISTER", linkedPersonnelId: 7 }),
  // Transfer çıkışı — gider değil
  tx({ type: "OUT", mainCategory: "OUT_PATRON_DEBT_REPAY", amount: 999, expensePaymentSource: "REGISTER" }),
  // Ödeme kaynağı yok (ödenmemiş fatura) — kapsam dışı
  tx({ type: "OUT", mainCategory: "OUT_OPS_OTHER", amount: 11 }),
];

// Kova / CAPEX sınıflandırması
assert.equal(srcBucketOfExpenseRow(rows[6]), "CENTRAL"); // merkez tedarikçi payı ≠ patron
assert.equal(srcBucketOfExpenseRow(rows[7]), "PATRON"); // genel gider: seçilen kaynak korunur
assert.equal(srcBucketOfExpenseRow({ expensePaymentSource: "REGISTER", linkedSupplierInvoiceLineId: 9 }), "REGISTER");
assert.ok(isCapexOutRow(rows[9]) && !isCapexOutRow(rows[5]));

const agg = aggregateBranchRegister(rows);
const tr = agg.get("TRY")!;
assert.equal(tr.revenue, 1000); // patron nakdi, kasa devri, P&L-dışı hariç
assert.equal(tr.excludedRevenueIn, 30);
assert.equal(tr.cardIn, 400);
assert.equal(tr.opex, 365); // 200 + 100 + 40 + 25
assert.equal(tr.opexBySrc.get("CENTRAL"), 100);
assert.equal(tr.capex, 300);
assert.equal(tr.personnelRecorded, 20); // avans ve maaş maliyete girmez
assert.equal(tr.salaryPaidRegister, 150);
assert.equal(tr.centralSupplier, 100);
assert.equal(tr.centralOverhead, 40);
assert.equal(tr.goodsPurchase, 25);
assert.equal(agg.get("EUR")!.revenue, 50); // karışık para birimi ayrı tutulur

// Kârlılık: eksik girdi → hesaplanamaz; mutabakat farkı yakalanır
const p = computeBranchProfitability(rows, {
  income: new Map([["TRY", 1030], ["EUR", 50]]),
  salaryPaid: new Map(),
  advanceGiven: new Map(),
  supplierPayments: new Map(),
});
assert.equal(p.revenueMismatch.size, 0); // backend P&L-dışı IN'i de sayar → 1000 + 30
assert.deepEqual([p.personnelCost, p.cogs, p.grossProfit, p.operatingProfit, p.netProfit], [
  "incomplete", "unavailable", "unavailable", "unavailable", "unavailable",
]);
const bad = computeBranchProfitability(rows, {
  income: new Map([["TRY", 1100]]), salaryPaid: new Map(), advanceGiven: new Map(), supplierPayments: new Map(),
});
assert.equal(Math.round(bad.revenueMismatch.get("TRY")!), 70);

// Özet kartı ve gider tablosu aynı katmandan → toplamlar tutarlı
const bp = branchPdfPresetOptions("summary", false);
const card = buildBranchTotalsCardsHtml(t, "tr", "—", bp, {
  advTotals: new Map(), expTotals: new Map(), regInTotals: new Map([["TRY", 1]]), regOutTotals: new Map(),
  stockValTotals: new Map(), stockQtySum: 0, registerRaw: rows,
});
const after = (html: string, key: string) => {
  const i = html.indexOf(key);
  assert.ok(i >= 0, key);
  return html.slice(i).match(/num[^>]*>([^<]+)</)![1].replace(/[^\d,-]/g, "");
};
assert.equal(after(card, "branch.branchPdfPnlGrossRevenue"), "1000");
assert.equal(after(card, "branch.branchPdfPnlOpex"), "365");
// Finansal görünümde ödeme kaynağı yok (kaynak kırılımı yalnız gider tablosunda)
assert.ok(!card.includes("branch.branchPdfTotalPatronSpent") && !card.includes("branch.branchPdfTotalRegisterSpentShort"));
// Kategori kırılımı: satırlar toplamı = işletme gideri; tedarikçi satırı ek gider değil (sonuç değişmez)
assert.equal([...tr.opexByCode.values()].reduce((s, v) => s + v, 0), tr.opex);
assert.ok(card.includes("branch.branchPdfPnlSupplierCost") && card.includes("branch.branchPdfPnlProfitNote"));
assert.equal(after(card, "branch.branchPdfPnlProfit"), "635");
assert.equal(after(card, "branch.branchPdfPnlAfterCapex"), "335");
assert.ok(!/net kâr/i.test(card));
const table = buildBranchExpenseTableHtml(rows, bp, t, "tr", "—");
assert.ok(table.includes("branch.branchPdfCapexTableTotal"));
const opexRow = table.slice(table.indexOf("branch.branchPdfOpexTableTotal"));
assert.ok(/cat-tot">[^<]*365/.test(opexRow), "tablo işletme toplamı = kart");

// Personel matrisi: kişi başı tek satır, kaynak sütunları, satır/sütun toplamları tutarlı
{
  const { aggregatePersonnelByPerson, buildPersonnelPerPersonSectionHtml } = await import("./sections/summaries");
  const adv = [
    { personnelId: 1, personnelFullName: "A", amount: 100, currencyCode: "TRY", sourceType: "REGISTER" },
    { personnelId: 1, personnelFullName: "A", amount: 50, currencyCode: "TRY", sourceType: "PATRON" },
    { personnelId: 2, personnelFullName: "B", amount: 30, currencyCode: "TRY", sourceType: "PERSONNEL_HELD_REGISTER_CASH" },
  ] as never[];
  const exp = [rows[12]]; // 20 TL yemek, kasa, personel 7
  const people = aggregatePersonnelByPerson(adv, exp, "—");
  const sum = (m: Map<string, number>) => [...m.values()].reduce((s, v) => s + v, 0);
  assert.equal(people.reduce((s, p) => s + sum(p.total), 0), 200);
  for (const p of people) assert.equal(sum(p.total), [...p.bySrc.values()].reduce((s, m) => s + sum(m), 0));
  const html = buildPersonnelPerPersonSectionHtml(adv, exp, true, true, t, "tr", "—");
  assert.equal((html.match(/<tr class="cat-main">/g) ?? []).length, 3); // A, B, personel 7
  assert.ok(html.includes("person-matrix") && /cat-total[\s\S]*200/.test(html));
}

// Kategori etiketleri: ham kod sızıntısı yok (yalnız gösterim; gruplama/tutar aynı)
{
  const tl = (k: string) =>
    (({
      "ledgerClass.OUT_OPS_INVOICE": "Faturalı tedarikçi gideri",
      "ledgerClass.OUT_OPS_POS_BANK_FEE": "POS / banka komisyonu",
      "branch.txMainOutOps": "İşletme gideri",
      "branch.txMainOutGoods": "Ürün / stok",
    }) as Record<string, string>)[k] ?? k;
  const extra = [
    tx({ type: "OUT", mainCategory: "OUT_OPS_POS_BANK_FEE", amount: 7, expensePaymentSource: "REGISTER" }),
  ];
  const html = buildBranchExpenseTableHtml([...rows, ...extra], bp, tl, "tr", "—");
  assert.ok(!/Ops invoice|Ops pos bank fee|>Goods/.test(html), "ham etiket kalmamalı");
  assert.ok(html.includes("Faturalı tedarikçi gideri") && html.includes("POS / banka komisyonu"));
  assert.ok(html.includes("Ürün / stok"));
  const card2 = buildBranchTotalsCardsHtml(tl, "tr", "—", bp, {
    advTotals: new Map(), expTotals: new Map(), regInTotals: new Map([["TRY", 1]]), regOutTotals: new Map(),
    stockValTotals: new Map(), stockQtySum: 0, registerRaw: rows,
  });
  assert.ok(!/Ops invoice/.test(card2) && card2.includes("Faturalı tedarikçi gideri"));
}

// Hazır ayarlar: alan seti tam, cari bayrağı korunur
const keys = Object.keys(defaultBranchSettlementPdfOptions()).sort();
for (const pr of ["summary", "detailed"] as const) {
  assert.deepEqual(Object.keys(branchPdfPresetOptions(pr, true)).sort(), keys);
  assert.equal(branchPdfPresetOptions(pr, true).includeBranchCurrentAccount, true);
}
assert.equal(branchPdfPresetOptions("summary", false).registerLedgerDetailMode, "summary");
assert.equal(branchPdfPresetOptions("detailed", false).registerLedgerDetailMode, "detail");

console.log("ok");
