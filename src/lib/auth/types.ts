export type NotificationPreferences = {
  operationalDailyToast: boolean;
};

export type AuthUser = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  /** DB role_permissions; matris ile yönetilir. */
  permissionCodes?: string[] | null;
  personnelId: number | null;
  /** personnel.branch_id — PERSONNEL kapsamı için */
  personnelBranchId?: number | null;
  /** Şoför: admin açıksa kendi avans/gider ekranı */
  allowPersonnelSelfFinancials?: boolean;
  totpEnabled?: boolean;
  /** Hesap → Sistem ayarları; API yoksa günlük toast varsayılan açık kabul edilir. */
  notificationPreferences?: NotificationPreferences | null;
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
