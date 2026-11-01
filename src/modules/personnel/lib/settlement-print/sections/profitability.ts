/**
 * Kârlılık bilgisi (özet) ve maliyet / nakit / bakiye kırılımı (detay). Sayılar yalnız
 * `profitability.ts` modelinden; burada hesap yok, yalnız gösterim.
 */
import type { Locale } from "@/i18n/messages";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { escapeHtml } from "../format";
import type {
  BranchProfitability,
  CurrencyRegisterAgg,
  Money,
  ServerYearSummary,
} from "../profitability";

type Ctx = { t: (k: string) => string; locale: Locale; dash: string };

const joinMoney = (m: Money, { locale, dash }: Ctx): string => {
  const ks = [...m.keys()].filter((c) => Math.abs(m.get(c) ?? 0) > 1e-9).sort();
  return ks.map((c) => escapeHtml(formatMoneyDash(m.get(c) ?? 0, dash, locale, c))).join(" · ");
};

const pick = (model: BranchProfitability, f: (a: CurrencyRegisterAgg) => number): Money =>
  new Map([...model.byCurrency].map(([c, a]) => [c, f(a)] as [string, number]));

/**
 * Özet: «Kârlılık bilgisi» — net kârın neden hesaplanamadığını kısa anlatır. Tutar göstermez
 * (kısmi personel tutarı gerçek personel maliyeti sanılıyordu). Veri uyarıları üstte kalır.
 */
export function buildProfitabilityStatusHtml(warnings: string[], ctx: Ctx): string {
  const { t } = ctx;
  const esc = escapeHtml;
  const warn = warnings.length
    ? `<div class="pdf-warn" role="alert">${warnings.map((w) => `<p>${esc(w)}</p>`).join("")}</div>`
    : "";
  const items = [
    "branch.branchPdfProfitInfoMissingPayroll",
    "branch.branchPdfProfitInfoMissingCogs",
    "branch.branchPdfProfitInfoMissingDiscounts",
  ];
  return `${warn}<div class="pnl-missing">
    <p class="pnl-missing-head">${esc(t("branch.branchPdfProfitInfoTitle"))}</p>
    <p class="pnl-missing-body">${esc(t("branch.branchPdfProfitInfoBody"))}</p>
    <ul>${items.map((k) => `<li>${esc(t(k))}</li>`).join("")}</ul>
  </div>`;
}

export type CostDetailInputs = {
  server: ServerYearSummary | null;
  advTotals: Money;
  /** null: stok fiyatı yüklenmedi. */
  stockValueEst: Money | null;
  /** null: cari bölümü seçili değil. */
  cariOpen: Money | null;
  heldCashTotal: Money;
  /** Yıl seçili ama sunucu özeti alınamadı (ör. rapor yetkisi yok) — «yıl seçin» demek yanıltıcı olur. */
  yearSelected: boolean;
};

/** Detay: personel, tedarikçi/merkez, stok, açık bakiyeler — her satır türü (maliyet / nakit / bakiye) etiketli. */
export function buildCostDetailHtml(
  model: BranchProfitability,
  inp: CostDetailInputs,
  ctx: Ctx
): string {
  const { t, dash } = ctx;
  const esc = escapeHtml;
  const m = (x: Money) => joinMoney(x, ctx);
  const na = (k: string) => `<span class="pf-why">${esc(t(k))}</span>`;
  const row = (labelKey: string, amount: string, kindKey: string, noteKey?: string) =>
    `<tr class="cat-sub"><td>${esc(t(labelKey))}</td><td class="num">${amount || esc(dash)}</td><td><span class="pf-kind">${esc(t(kindKey))}</span>${noteKey ? ` ${na(noteKey)}` : ""}</td></tr>`;
  const head = (k: string) => `<tr class="cat-section"><td colspan="3">${esc(t(k))}</td></tr>`;
  const nonZero = (x: Money) => [...x.values()].some((v) => Math.abs(v) > 1e-9);

  const supplierRows = (
    [
      ["branch.branchPdfDtCentralSupplier", pick(model, (a) => a.centralSupplier)],
      ["branch.branchPdfDtCentralOverhead", pick(model, (a) => a.centralOverhead)],
      ["branch.branchPdfDtDirectSupplier", pick(model, (a) => a.directSupplierInvoice)],
      ["branch.branchPdfDtGoods", pick(model, (a) => a.goodsPurchase)],
    ] as [string, Money][]
  )
    .filter(([, v]) => nonZero(v))
    .map(([k, v]) =>
      row(k, m(v), "branch.branchPdfKindCostInOpex", k === "branch.branchPdfDtGoods" ? "branch.branchPdfDtGoodsNote" : undefined)
    )
    .join("");

  const needServer = inp.yearSelected ? "branch.branchPdfDtServerUnavailable" : "branch.branchPdfDtNeedYear";
  const salary = inp.server
    ? row("branch.branchPdfDtSalaryPaid", m(inp.server.salaryPaid), "branch.branchPdfKindCash", "branch.branchPdfDtSalaryPaidNote")
    : row("branch.branchPdfDtSalaryPaidRegister", m(pick(model, (a) => a.salaryPaidRegister)), "branch.branchPdfKindCash", needServer);
  const supplierPay = inp.server
    ? row("branch.branchPdfDtSupplierPaid", m(inp.server.supplierPayments), "branch.branchPdfKindCash", "branch.branchPdfDtSupplierPaidNote")
    : row("branch.branchPdfDtSupplierPaid", "", "branch.branchPdfKindCash", needServer);

  const rows = [
    head("branch.branchPdfDtGroupPersonnel"),
    salary,
    row("branch.branchPdfDtAdvances", m(inp.advTotals), "branch.branchPdfKindCash", "branch.branchPdfDtAdvancesNote"),
    head("branch.branchPdfDtGroupSupplier"),
    supplierRows,
    supplierPay,
    row("branch.branchPdfDtSupplierDebt", "", "branch.branchPdfKindBalance", "branch.branchPdfDtSupplierDebtNote"),
    head("branch.branchPdfDtGroupStock"),
    row(
      "branch.branchPdfDtStockValue",
      inp.stockValueEst ? m(inp.stockValueEst) : "",
      "branch.branchPdfKindEstimate",
      inp.stockValueEst ? "branch.branchPdfDtStockValueNote" : "branch.branchPdfDtStockValueOff"
    ),
    row("branch.branchPdfPfCogs", "", "branch.branchPdfKindUnavailable", "branch.branchPdfPfCogsWhy"),
    head("branch.branchPdfDtGroupBalances"),
    row(
      "branch.branchPdfDtCariOpen",
      inp.cariOpen ? m(inp.cariOpen) : "",
      "branch.branchPdfKindBalance",
      inp.cariOpen ? undefined : "branch.branchPdfDtCariOff"
    ),
    row("branch.branchPdfDtHeldCash", m(inp.heldCashTotal), "branch.branchPdfKindBalance", "branch.branchPdfDtHeldCashNote"),
  ].join("");

  return `<div class="src-block">
    <p class="src-subhead">${esc(t("branch.branchPdfCostDetailTitle"))}<span class="src-subhead-note">${esc(t("branch.branchPdfCostDetailNote"))}</span></p>
    <table class="cat-table pf-detail">
      <thead><tr><th>${esc(t("branch.branchPdfDtColItem"))}</th><th class="num">${esc(t("branch.branchPdfSummaryColTotal"))}</th><th>${esc(t("branch.branchPdfDtColKind"))}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}
