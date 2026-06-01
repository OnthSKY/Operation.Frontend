export const branchStockConsumption = {
  subTabsAria: "Şube stok alt sekmeleri",
  subTabInbound: "Gelen mal",
  subTabConsumption: "Kullanım & kalan",
  subTabBalances: "Güncel stok",

  // Güncel stok (anlık bakiye) paneli
  balancesHeading: "Güncel stok durumu",
  balancesHint: "Şu an şubede bulunan miktarlar. Yalnız bakiyesi sıfır olmayan ürünler listelenir.",
  balancesColUnit: "Birim",
  balancesColBalance: "Bakiye",
  balancesEmpty: "Şu an stokta görünen ürün yok.",
  balancesSearchEmpty: "Aramayla eşleşen ürün yok.",

  actionQuickConsume: "+ Hızlı kullanım",
  actionSnapshot: "Kalan sayımı",
  actionAdjust: "Manuel düzeltme",

  filterDateFrom: "Başlangıç",
  filterDateTo: "Bitiş",
  includeDeleted: "Silinmişleri göster",

  // Hızlı giriş modali
  quickEntryTitle: "Stok kullanımı gir",
  adjustEntryTitle: "Manuel stok düzeltme",
  productLabel: "Ürün",
  productHint: "Ürün adıyla ara; yalnızca alt-ürünler (varyantsız) seçilebilir.",
  searchPlaceholder: "Ürün ara…",
  loadingProducts: "Ürünler yükleniyor…",
  noMatches: "Eşleşen ürün yok.",
  directionLabel: "Yön",
  directionOut: "− Azalt",
  directionIn: "+ Artır",
  quantityLabel: "Miktar",
  dateLabel: "Tarih",
  noteLabel: "Not (opsiyonel)",
  notePlaceholder: "Sebep, parti, araç… en fazla 500 karakter",

  errorProductRequired: "Lütfen bir ürün seçin.",
  errorQuantityInvalid: "Pozitif bir miktar girin.",
  errorDateRequired: "Lütfen geçerli bir tarih seçin.",
  errorNoSnapshotRows: "En az bir ürün ekleyip kalan değerini girin.",

  // IN (artır) düzeltme — sevkiyat tavanı: stok yalnız sevkiyatla geleni telafi edecek kadar artırılabilir
  adjustInMaxHint: "Sevkiyat sınırı, en fazla eklenebilir:",
  adjustInNoRoom: "Bu ürün sevkiyatla gelen stok sınırında; artırım yapılamaz (önce çıkış/tüketim olmalı).",
  errorAdjustInExceedsShippedIn: "Bu artırım sevkiyatla gelen stoğu aşıyor. En fazla eklenebilir:",

  // Sayım paneli
  snapshotEntryTitle: "Kalan stoğu say",
  snapshotEntryHeading: "Sayacağınız ürünleri ekleyin",
  snapshotEntryDescription:
    "Ürünleri arayıp ekleyin; her biri için anlık «kalan» miktarı girin. Sistem, mevcut bakiye ile farkı otomatik yazar.",
  snapshotRowsHeading: "Sayılan ürünler",
  snapshotEmptyHint: "Henüz ürün eklenmedi — yukarıdan arayarak başlayın.",
  currentBalanceLabel: "Mevcut",
  remainingPlaceholder: "Kalan",
  balanceShort: "Bak.",
  diffNoChange: "değişiklik yok",
  saveSnapshot: "Sayımı kaydet",
  snapshotPartialFailure: "Bazı satırlar kaydedilemedi.",
  snapshotResultSummary: "{written} satır kaydedildi, {noop} değişiklik yok.",

  // Geçmiş tablosu
  colDate: "Tarih",
  colProduct: "Ürün",
  colType: "Tür",
  colQuantity: "Miktar",
  colSnapshot: "Sayım",
  colCreatedBy: "Kaydeden",
  typeConsumption: "Kullanım",
  typeSnapshot: "Sayım",
  typeAdjustment: "Düzeltme",
  historyEmpty: "Seçili aralıkta kullanım kaydı yok.",
  restore: "Geri al",
  deletedAtBy: "{date} tarihinde {name} tarafından silindi",

  // Sayfalama
  paginationPrevious: "Önceki",
  paginationNext: "Sonraki",
  paginationPageOf: "Sayfa {page} / {total}",
  loadFailed: "Yüklenemedi.",
} as const;
