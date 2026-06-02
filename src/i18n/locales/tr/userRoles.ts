export const userRoles = {
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
