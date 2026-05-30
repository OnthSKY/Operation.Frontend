export const userRoles = {
  pageTitle: "Kullanıcı rolleri",
  pageDescription:
    "Bu kullanıcının atanmış tüm rollerini düzenleyin. Birden çok rol seçildiğinde izin kümesi rolün izinlerinin BİRLEŞİMİ olur.",
  backToUsers: "Kullanıcılara dön",
  currentSelectedLabel: "Seçilen roller",
  noneSelectedTitle: "Hiç rol seçili değil",
  noneSelectedHint:
    "Kaydederseniz kullanıcının yalnızca sistem genelinde tanımlı izinleri (örn. süper admin) kalır. İşlem gerçekleşmeden önizleme uyarısı görürsünüz.",
  searchPlaceholder: "Rol ara…",
  searchNoMatch: "Aramayla eşleşen rol bulunamadı.",
  sectionSystem: "Sistem rolleri",
  sectionCustom: "Özel roller",
  systemBadge: "Sistem",
  removeRoleAria: "{role} rolünü kaldır",
  loadError: "Roller yüklenirken bir hata oluştu.",
  saveWithCount: "Kaydet ({count} rol)",
  noChanges: "Değişiklik yok",
  saved: "Kullanıcı rolleri güncellendi. Aktif oturumlar iptal edildi.",
  confirmEmpty:
    "Hiçbir rol seçili değil. Bu kullanıcı normal yetkilerini kaybedecek. Devam edilsin mi?",

  // UsersScreen entry button
  manageButton: "Çoklu rol yönet",

  // AuthorizationMatrixScreen extensions
  createRoleTitle: "Yeni özel rol",
  createRoleDescription:
    "Mevcut sistem rolleri yanında kendi rollerinizi oluşturabilirsiniz. Oluşturduktan sonra matriksten izinleri atayın.",
  createRoleButton: "+ Yeni rol",
  createRoleCodeLabel: "Rol kodu",
  createRoleCodePlaceholder: "ÖR. BÖLGE_SORUMLUSU",
  createRoleCodeHint:
    "Büyük harfli, boşluksuz, eşsiz bir kod. Otomatik büyük harfe çevrilir.",
  createRoleDisplayLabel: "Görünür ad",
  createRoleDisplayPlaceholder: "Örn. Bölge Sorumlusu",
  createRoleSubmit: "Rolü oluştur",
  createRoleCodeRequired: "Rol kodu zorunlu.",
  createRoleSuccess: "{role} rolü oluşturuldu.",
  deleteRoleConfirmTitle: "{role} rolünü sil?",
  deleteRoleConfirmText:
    "Bu rol kullanıcılardan ve tüm izin atamalarından çıkarılır. Sistem rolleri silinemez.",
  deleteRoleSubmit: "Rolü sil",
  deleteRoleSuccess: "{role} rolü silindi.",
  customBadge: "Özel",
} as const;
