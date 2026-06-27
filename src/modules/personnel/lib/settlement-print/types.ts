/** Mutabakat/şube PDF'i için ortak hedef ve seçenek tipleri (document + pdf paylaşır). */
import type { Locale } from "@/i18n/messages";
import type { BranchSettlementPdfOptions } from "./options";

export type SettlementPrintTarget =
  | {
      scope: "personnel";
      personnelId: number;
      title: string;
      /** ISO date YYYY-MM-DD; güncel turizm dönemi gelişi */
      seasonArrivalDate?: string | null;
      /**
       * Seçildiğinde: avanslar bu sezon yılı (effective_year); gider/kasa/stok/not satırları ilgili tarih yılı.
       * Verilmezse tüm dönemler.
       */
      seasonYearFilter?: number;
      /** true: belge bir YIL HESAP KAPANIŞI çıktısıdır — başlık/rozet buna göre. */
      isYearClosure?: boolean;
      /** Kapanış özet kartları için rakamlar (yalnızca isYearClosure ile). */
      closureSummary?: {
        arrivalDate?: string | null;
        departureDate?: string | null;
        workedDays?: number | null;
        expectedSalaryAmount?: number | null;
        expectedSalaryCurrency?: string | null;
        paidAtClosureAmount?: number | null;
        salaryBalanceSettled?: boolean;
        salaryPaymentSource?: string | null;
      };
    }
  | {
      scope: "branch";
      branchId: number;
      title: string;
      seasonYearFilter?: number;
    };

export type SettlementPrintOpts = {
  target: SettlementPrintTarget;
  locale: Locale;
  branchNameById: Map<number, string>;
  t: (k: string) => string;
  /** Yalnızca <code>scope: "branch"</code> için; verilmezse tüm bölümler açık. */
  branchPdfOptions?: BranchSettlementPdfOptions;
};

export function resolvedSeasonYearFilter(target: SettlementPrintTarget): number | null {
  const raw = target.seasonYearFilter;
  if (raw == null || !Number.isFinite(raw)) return null;
  const y = Math.trunc(raw);
  if (y < 1990 || y > 2100) return null;
  return y;
}
