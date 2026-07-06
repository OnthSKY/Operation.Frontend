/**
 * Şube PDF'i için kullanıcı seçenekleri (modal + builder'lar paylaşır).
 * Public API: `personnel-settlement-print` bunları re-export eder.
 */
import { escapeHtml } from "./format";

/** Şube PDF satır listesi: tam tablo veya para birimi bazlı özet. */
export type BranchPdfDetailMode = "detail" | "summary";

/** Şube PDF'inde hangi bölümlerin yükleneceği ve stokta maliyet sütunları. */
export type BranchSettlementPdfOptions = {
  includeStockInbound: boolean;
  /** false: yalnızca miktar; true: birim fiyat ve satır tahmini (fatura varsa). */
  stockShowPricing: boolean;
  /** true: depo girişlerini satır satır yerine ana ürün (parent) bazında grupla. */
  stockGroupByParent: boolean;
  includeAdvances: boolean;
  /** Avans: satır satır tablo veya yalnızca döviz bazlı toplam + adet. */
  advancesDetailMode: BranchPdfDetailMode;
  includePersonnelNonAdvanceExpenses: boolean;
  /** Personele yazılan giderler: tam liste veya özet. */
  personnelExpensesDetailMode: BranchPdfDetailMode;
  /** Şubedeki personel için maaş / SGK tahmini tablosu. */
  includePersonnelSalaryCost: boolean;
  includeRegisterLedger: boolean;
  /** Kasa gelir/gider: tüm satırlar veya döviz bazlı gelir/gider/net özeti. */
  registerLedgerDetailMode: BranchPdfDetailMode;
  includeNotes: boolean;
};

export function defaultBranchSettlementPdfOptions(): BranchSettlementPdfOptions {
  return {
    includeStockInbound: true,
    stockShowPricing: false,
    stockGroupByParent: true,
    includeAdvances: true,
    advancesDetailMode: "summary",
    includePersonnelNonAdvanceExpenses: true,
    personnelExpensesDetailMode: "summary",
    includePersonnelSalaryCost: false,
    includeRegisterLedger: true,
    registerLedgerDetailMode: "detail",
    includeNotes: true,
  };
}

/** Boş bölüm için kompakt, yer kaplamayan "kayıt yok" rozeti (büyük boş tablo yerine). */
export function emptyNote(t: (k: string) => string): string {
  return `<p class="empty-note">${escapeHtml(t("branch.branchPdfNoRows"))}</p>`;
}
