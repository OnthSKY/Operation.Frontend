import type {
  CustomerAccountBalanceResponse,
  CustomerAccountReceiptResponse,
} from "@/modules/order-account-statement/api/customer-accounts-api";
import type { OutboundInvoiceResponse } from "@/modules/order-account-statement/api/outbound-invoices-api";

/**
 * Cari (current account) mutabakatı — ANLIK doğrulama, FAZ 1 (frontend-only).
 *
 * İlke: aynı formülü tekrar çalıştırmaz (totoloji olurdu); BAĞIMSIZ türetmeleri karşılaştırır:
 *   • invoicesQuery.openAmount  ↔  balance.receipts'ten yeniden hesap  (iki ayrı backend sorgusu)
 *   • balance.cashTotal/totalPaid  ↔  balance.receipts[] toplamı        (agrega ↔ ham kayıt)
 * Ayrıca yapısal veri-kalitesi bayrakları: promo/avans çift-giriş, clamp'lenen fazla ödeme.
 *
 * Kanonik kimlik (backend CustomerAccountReceiptsRepository.GetBalanceAsync):
 *   OpenBalance = TotalCharged − headerAdvance − headerPromo − TotalPaid
 *              ≡ TotalCharged − AdvanceTotal − PromoTotal − CashTotal
 *   openAmount(fatura) = GREATEST(0, linesTotal − paidTotal − promoCol − advCol)  ← negatif 0'a kırpılır.
 *
 * İleride bu mantık backend `.../validate` endpoint'ine taşınacak (tek kanonik kaynak).
 */

/** 1 kuruş tolerans — float/round gürültüsünü ele; kod tabanı 0.009 eşiği kullanıyor. */
const TOLERANCE = 0.01;

export type ReconSeverity = "error" | "warning";

export type ReconIssue = {
  /** i18n anahtarı: branch.currentAccountRecon<Code>. */
  code:
    | "AccountOpen"
    | "AccountOverpaid"
    | "CashSum"
    | "PaidSum"
    | "InvoiceOpen"
    | "InvoiceOverpaid"
    | "InvoiceDoublePromo"
    | "InvoiceDoubleAdvance";
  severity: ReconSeverity;
  /** Mesaj şablonundaki {placeholder} değerleri; sayısallar ham (formatlanmadan) verilir. */
  params: Record<string, string | number>;
};

export type ReconResult = {
  ok: boolean;
  errorCount: number;
  warningCount: number;
  issues: ReconIssue[];
};

function num(x: unknown): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function isCashKind(kind: CustomerAccountReceiptResponse["receiptKind"]): boolean {
  return kind !== "promo_discount" && kind !== "advance_payment";
}

export function reconcileBranchCurrentAccount(
  invoices: readonly OutboundInvoiceResponse[],
  balance: CustomerAccountBalanceResponse | undefined
): ReconResult {
  const issues: ReconIssue[] = [];
  if (!balance) return { ok: true, errorCount: 0, warningCount: 0, issues };

  const ccy = balance.currencyCode;
  // Cari tek para birimlidir (şube TRY); yine de karışık kur olasılığına karşı bakiye kurunu süz.
  const receipts = (balance.receipts ?? []).filter(
    (r) => num(r.amount) > 0 && (!r.currencyCode || r.currencyCode === ccy)
  );

  // ── Hesap-seviyesi kimlik: openBalance == totalCharged − advanceTotal − promoTotal − cashTotal ──
  const expectedOpen =
    num(balance.totalCharged) -
    num(balance.advanceTotal) -
    num(balance.promoTotal) -
    num(balance.cashTotal);
  if (Math.abs(expectedOpen - num(balance.openBalance)) > TOLERANCE) {
    issues.push({
      code: "AccountOpen",
      severity: "error",
      params: { stored: num(balance.openBalance), computed: expectedOpen },
    });
  }
  // openBalance clamp'lenmez; negatifse fazla ödeme/alacak vardır.
  if (num(balance.openBalance) < -TOLERANCE) {
    issues.push({
      code: "AccountOverpaid",
      severity: "warning",
      params: { amount: -num(balance.openBalance) },
    });
  }

  // ── Ham kayıt ↔ agrega (bağımsız kaynaklar) ──
  const cashSum = receipts.filter((r) => isCashKind(r.receiptKind)).reduce((s, r) => s + num(r.amount), 0);
  const paidSum = receipts.reduce((s, r) => s + num(r.amount), 0);
  if (Math.abs(cashSum - num(balance.cashTotal)) > TOLERANCE) {
    issues.push({
      code: "CashSum",
      severity: "warning",
      params: { stored: num(balance.cashTotal), computed: cashSum },
    });
  }
  if (Math.abs(paidSum - num(balance.totalPaid)) > TOLERANCE) {
    issues.push({
      code: "PaidSum",
      severity: "warning",
      params: { stored: num(balance.totalPaid), computed: paidSum },
    });
  }

  // ── Per-invoice: linked receipt'lere göre grupla ──
  const perInvoice = new Map<number, { paid: number; promo: number; advance: number }>();
  for (const r of receipts) {
    const id = r.linkedOutboundInvoiceId ?? null;
    if (id == null) continue;
    const cur = perInvoice.get(id) ?? { paid: 0, promo: 0, advance: 0 };
    const amount = num(r.amount);
    cur.paid += amount;
    if (r.receiptKind === "promo_discount") cur.promo += amount;
    else if (r.receiptKind === "advance_payment") cur.advance += amount;
    perInvoice.set(id, cur);
  }

  for (const inv of invoices) {
    if (inv.currencyCode !== ccy) continue;
    const agg = perInvoice.get(inv.id) ?? { paid: 0, promo: 0, advance: 0 };
    const promoCol = num(inv.promoAmount);
    const advCol = num(inv.advanceAmount);
    const rawOpen = num(inv.linesTotal) - agg.paid - promoCol - advCol;
    const expected = Math.max(0, rawOpen);

    if (Math.abs(expected - num(inv.openAmount)) > TOLERANCE) {
      issues.push({
        code: "InvoiceOpen",
        severity: "error",
        params: { doc: inv.documentNumber, stored: num(inv.openAmount), computed: expected },
      });
    }
    if (rawOpen < -TOLERANCE) {
      issues.push({
        code: "InvoiceOverpaid",
        severity: "warning",
        params: { doc: inv.documentNumber, amount: -rawOpen },
      });
    }
    // Çift-giriş: aynı krediyi hem fatura header'ında hem receipt'te girmek openAmount'u çift düşürür.
    if (promoCol > TOLERANCE && agg.promo > TOLERANCE) {
      issues.push({ code: "InvoiceDoublePromo", severity: "error", params: { doc: inv.documentNumber } });
    }
    if (advCol > TOLERANCE && agg.advance > TOLERANCE) {
      issues.push({ code: "InvoiceDoubleAdvance", severity: "error", params: { doc: inv.documentNumber } });
    }
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.length - errorCount;
  return { ok: issues.length === 0, errorCount, warningCount, issues };
}
