/**
 * Ledger sınıflandırma kodları (branch_transactions.classification_code) için okunaklı etiketler.
 * OUT_PER_UNIFORM gibi ham kodların arayüze sızdığı her yerde kullanılır.
 */
export const ledgerClass = {
  // Gelir
  IN_REGISTER_SALE: "Kasa satışı",
  IN_DAY_CLOSE: "Gün sonu",
  IN_SALES_RETAIL: "Perakende satış",
  IN_SALES_WHOLESALE: "Toptan satış",
  IN_SALES_OTHER: "Diğer satış",
  IN_SERVICE_CONSULT: "Danışmanlık geliri",
  IN_SERVICE_REPAIR: "Tamir/servis geliri",
  IN_SERVICE_OTHER: "Diğer hizmet geliri",
  IN_OTHER_MISC: "Diğer gelir",
  IN_OTHER_REGISTER: "Kasa — diğer gelir",
  IN_PATRON_CASH: "Patron nakit girişi",

  // Personel giderleri
  OUT_PER_SALARY: "Maaş",
  OUT_PER_BONUS: "Prim / ikramiye",
  OUT_PER_ADVANCE: "Avans",
  OUT_PER_OVERTIME: "Fazla mesai",
  OUT_PER_COMMISSION: "Komisyon",
  OUT_PER_MEAL_ALLOWANCE: "Yemek yardımı",
  OUT_PER_TRANSPORT: "Yol / ulaşım",
  OUT_PER_UNIFORM: "Kıyafet / üniforma",
  OUT_PER_HEALTH: "Sağlık",
  OUT_PER_SOCIAL_SECURITY: "SGK / sosyal güvenlik",
  OUT_PER_TRAINING: "Eğitim",
  OUT_PER_SEVERANCE: "Kıdem / ihbar tazminatı",
  OUT_PER_OTHER: "Diğer personel gideri",

  // Eski kasa
  OUT_REGISTER_EXPENSE: "Kasa gideri",
  OUT_REGISTER_ADVANCE: "Kasa avansı (eski)",
  OUT_REGISTER_SALARY: "Kasa maaşı (eski)",

  // Mal / stok
  OUT_GOODS_PURCHASE: "Mal alımı",
  OUT_GOODS_MATERIAL: "Malzeme",
  OUT_GOODS_OTHER: "Diğer mal gideri",

  // İşletme
  OUT_OPS_RENT: "Kira",
  OUT_OPS_UTIL: "Fatura (elektrik/su/gaz)",
  OUT_OPS_MARKET: "Pazarlama",
  OUT_OPS_MEAL: "Yemek (işletme)",
  OUT_OPS_TOBACCO: "Tütün / sigara",
  OUT_OPS_FUEL: "Yakıt",
  OUT_OPS_CARGO: "Kargo",
  OUT_OPS_INVOICE: "Faturalı tedarikçi gideri",
  OUT_OPS_POS_BANK_FEE: "POS / banka komisyonu",
  OUT_OPS_FRANCHISE_ROYALTY: "Franchise royalty",
  OUT_OPS_FRANCHISE_MARKETING: "Franchise pazarlama",
  OUT_OPS_OTHER: "Diğer işletme gideri",

  // Vergi
  OUT_TAX_WITHHOLDING: "Stopaj",
  OUT_TAX_POS_EOD: "POS gün sonu vergisi",
  OUT_TAX_VAT: "KDV",
  OUT_TAX_STAMP: "Damga vergisi",
  OUT_TAX_MUNICIPAL: "Belediye vergisi",
  OUT_TAX_EXCISE: "ÖTV",
  OUT_TAX_SSI: "SGK primi (vergi)",
  OUT_TAX_OTHER: "Diğer vergi",

  // Diğer / nakit akışı
  OUT_OTHER_EXPENSE: "Diğer gider",
  OUT_CONTRACTOR_PAYMENT: "Dış çalışan ödemesi",
  OUT_POCKET_REPAY: "Personel cebi geri ödeme",
  OUT_PATRON_DEBT_REPAY: "Patron borcu ödeme",
  OUT_POCKET_CLAIM_TRANSFER: "Cep alacağı devri",
  OUT_POCKET_CLAIM_TO_PATRON: "Cep alacağı → patron",
  MEMO_NON_PNL: "Bilgi kaydı (P&L dışı)",
  OVERHEAD_POOL_HEADER: "Genel gider havuzu",
} as const;
