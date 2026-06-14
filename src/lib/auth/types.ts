export type NotificationPreferences = {
  operationalDailyToast: boolean;
};

export type AuthUser = {
  id: number;
  username: string;
  fullName: string;
  /** Primary role (sort_order'da ilk) — geriye dönük uyum için. Yeni kod `roles` kullanır. */
  role: string;
  /** Kullanıcının atanmış TÜM rolleri (multi-role destekli). */
  roles?: string[] | null;
  /** DB role_permissions; matris ile yönetilir. Çoklu rolün union'ı + user_permissions override. */
  permissionCodes?: string[] | null;
  personnelId: number | null;
  /** personnel.branch_id — PERSONNEL kapsamı için */
  personnelBranchId?: number | null;
  /** Şoför: admin açıksa kendi avans/gider ekranı */
  allowPersonnelSelfFinancials?: boolean;
  totpEnabled?: boolean;
  /** Hesap → Sistem ayarları; API yoksa günlük toast varsayılan açık kabul edilir. */
  notificationPreferences?: NotificationPreferences | null;
  /**
   * Aktif istek bir "yönetici yerine geç" oturumundansa, yerine geçen
   * admin'in minimum bilgisi. Aksi halde null/undefined.
   * Token (httpOnly cookie) içinde `admin_user_id` claim'inden gelir.
   */
  impersonatedBy?: ImpersonatedBy | null;
};

export type ImpersonatedBy = {
  id: number;
  username: string;
  fullName?: string | null;
};

export type LoginResultPayload = {
  requiresTotp: boolean;
  totpChallengeToken?: string | null;
  user?: AuthUser | null;
};

export type TotpStatusPayload = {
  enabled: boolean;
  pendingSetup: boolean;
  setupOtpAuthUri?: string | null;
  setupSecretBase32?: string | null;
};

export type MyAuditLogItem = {
  id: number;
  tableName: string;
  recordId: number;
  action: string;
  oldData?: string | null;
  newData?: string | null;
  createdAt: string;
};
