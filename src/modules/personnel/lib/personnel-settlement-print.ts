/**
 * Şube / personel mutabakat PDF'i — public API barrel.
 *
 * Gerçek kod `settlement-print/` altında modüllere bölünmüştür:
 *  - format / buckets / aggregate / styles / options / types / data
 *  - sections/ (stock, salary, register, summary, summaries, season-tenure)
 *  - document (orkestratör) · pdf (html2canvas+jsPDF, pencere/paylaşım)
 *
 * Dış importlar yalnızca bu dosyadan yapılır; iç yapı değişse de yüzey sabit kalır.
 */
export type {
  SettlementPrintTarget,
  SettlementPrintOpts,
} from "./settlement-print/types";
export type {
  BranchPdfDetailMode,
  BranchSettlementPdfOptions,
} from "./settlement-print/options";
export { defaultBranchSettlementPdfOptions } from "./settlement-print/options";
export {
  generatePersonnelSettlementPdfBlob,
  openPersonnelSettlementPrintWindow,
} from "./settlement-print/pdf";
