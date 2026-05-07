import type { AuthUser } from "@/lib/auth/types";

/** Sunucu `permissions` tablosu ile aynı kodlar (matris). */
export const PERM = {
  systemAdmin: "system.admin",
  adminUserPermissionOverrides: "admin.users.permission_overrides",
  adminUserDataScopes: "admin.users.data_scopes",
  operationsStaff: "operations.staff",
  warehouseDriver: "warehouse.driver",
  uiDashboard: "ui.dashboard",
  uiReports: "ui.reports",
  /** Finans analiz hubı (`/reports/financial`) ve ilgili API; `ui.reports` stok/kasa özeti vb. için ayrı kalır. */
  uiReportsFinancial: "ui.reports.financial",
  uiDailyBranchRegister: "ui.daily_branch_register",
  /** Şube gün sonu kasiyeri: atanmış şubelerde bugünkü kasa + delegeli avans; tam `ui.branches` değil. */
  uiBranchDayClerk: "ui.branch_day_clerk",
  uiPersonnel: "ui.personnel",
  uiMyAdvances: "ui.my_advances",
  uiBranches: "ui.branches",
  uiGeneralOverhead: "ui.general_overhead",
  uiInsurances: "ui.insurances",
  uiWarehouse: "ui.warehouse",
  uiShipments: "ui.shipments",
  shipmentCreate: "shipment.create",
  shipmentStart: "shipment.start",
  shipmentApprove: "shipment.approve",
  shipmentWarehousePrepare: "shipment.warehouse.prepare",
  shipmentAssignDriver: "shipment.assign.driver",
  shipmentDispatch: "shipment.dispatch",
  shipmentComplete: "shipment.complete",
  shipmentAdminLifecycle: "shipment.admin.lifecycle",
  uiProducts: "ui.products",
  uiSuppliers: "ui.suppliers",
  uiVehicles: "ui.vehicles",
} as const;

function norm(c: string): string {
  return String(c ?? "").trim().toLowerCase();
}

export function hasPermissionCode(
  user: Pick<AuthUser, "permissionCodes" | "role"> | null | undefined,
  code: string
): boolean {
  const want = norm(code);
  const codes = user?.permissionCodes;
  if (!codes?.length) return false;
  return codes.some((c) => norm(c) === want);
}

/** Kullanıcılar → kullanıcıya özel izin satırları modalı. */
export function canManageUserPermissionOverrides(
  user: Pick<AuthUser, "permissionCodes" | "role"> | null | undefined
): boolean {
  return (
    hasPermissionCode(user, PERM.systemAdmin) ||
    hasPermissionCode(user, PERM.adminUserPermissionOverrides)
  );
}

/**
 * Kullanıcılar → veri kapsamları.
 * Önce kullanıcı izin override yetkisi gerekir; ayrıca `admin.users.data_scopes` açıkça verilmelidir.
 */
export function canManageUserDataScopes(
  user: Pick<AuthUser, "permissionCodes" | "role"> | null | undefined
): boolean {
  return (
    canManageUserPermissionOverrides(user) &&
    hasPermissionCode(user, PERM.adminUserDataScopes)
  );
}

/** Kapsam düğmesi tooltip / toast için hangi engel geçerli. */
export type UserDataScopesBlockReason = "none" | "need_permission_overrides" | "need_data_scopes";

export function getUserDataScopesBlockReason(
  user: Pick<AuthUser, "permissionCodes" | "role"> | null | undefined
): UserDataScopesBlockReason {
  if (!canManageUserPermissionOverrides(user)) return "need_permission_overrides";
  if (!hasPermissionCode(user, PERM.adminUserDataScopes)) return "need_data_scopes";
  return "none";
}

/**
 * Menü / sayfa görünürlüğü. API `perm.any:ui.*|operations.staff` ile uyumlu:
 * `operations.staff` yalnızca DB’de hiç `ui.*` yoksa (eski kurulum) tam menü jokeri sayılır.
 */
export function canSeeUiModule(user: AuthUser | null | undefined, uiCode: string): boolean {
  if (!user) return false;
  if (hasPermissionCode(user, PERM.systemAdmin)) return true;
  const codes = user.permissionCodes ?? [];
  if (codes.length === 0) {
    const r = String(user.role ?? "").toUpperCase();
    if (r === "ADMIN" || r === "STAFF") return true;
    if (r === "PERSONNEL") return uiCode === PERM.uiBranches || uiCode === PERM.uiMyAdvances;
    if (r === "DRIVER") return uiCode === PERM.uiBranches || uiCode === PERM.uiWarehouse;
    if (r === "VIEWER")
      return (
        uiCode === PERM.uiDashboard ||
        uiCode === PERM.uiReports ||
        uiCode === PERM.uiDailyBranchRegister
      );
    if (r === "FINANCE")
      return (
        uiCode === PERM.uiDashboard ||
        uiCode === PERM.uiReports ||
        uiCode === PERM.uiDailyBranchRegister ||
        uiCode === PERM.uiPersonnel ||
        uiCode === PERM.uiMyAdvances ||
        uiCode === PERM.uiBranches ||
        uiCode === PERM.uiGeneralOverhead ||
        uiCode === PERM.uiProducts ||
        uiCode === PERM.uiSuppliers
      );
    if (r === "PROCUREMENT")
      return (
        uiCode === PERM.uiDashboard ||
        uiCode === PERM.uiReports ||
        uiCode === PERM.uiDailyBranchRegister ||
        uiCode === PERM.uiBranches ||
        uiCode === PERM.uiWarehouse ||
        uiCode === PERM.uiProducts ||
        uiCode === PERM.uiSuppliers
      );
    if (r === "BRANCH_DAY_REGISTER")
      return uiCode === PERM.uiBranchDayClerk || uiCode === PERM.uiDailyBranchRegister;
    return false;
  }
  if (
    hasPermissionCode(user, PERM.operationsStaff) &&
    !codes.some((c) => String(c).startsWith("ui."))
  ) {
    return true;
  }
  return hasPermissionCode(user, uiCode);
}

export function canSeeDailyBranchRegister(user: AuthUser | null | undefined): boolean {
  return (
    canSeeUiModule(user, PERM.uiDailyBranchRegister) || canSeeUiModule(user, PERM.uiBranches)
  );
}

/** Şube kartı / kasa ekranı: tam şube modülü veya gün sonu kasiyeri modu. */
export function canOpenBranchesWorkspace(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return (
    canSeeUiModule(user, PERM.uiBranches) || hasPermissionCode(user, PERM.uiBranchDayClerk)
  );
}

/**
 * Gelir/gider KPI, finans tabloları ve finans özeti API’leri (`/reports/financial`).
 * Matriste ayrı izin; `operations.staff` jokeri (hiç `ui.*` yokken) tam erişim sayılır.
 */
export function canSeeFinancialReports(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (hasPermissionCode(user, PERM.systemAdmin)) return true;
  const codes = user.permissionCodes ?? [];
  if (codes.length === 0) {
    const r = String(user.role ?? "").toUpperCase();
    return r === "ADMIN" || r === "STAFF" || r === "FINANCE";
  }
  if (
    hasPermissionCode(user, PERM.operationsStaff) &&
    !codes.some((c) => String(c).startsWith("ui."))
  ) {
    return true;
  }
  return hasPermissionCode(user, PERM.uiReportsFinancial);
}

export function hasStaffOperationsNotifications(user: AuthUser | null | undefined): boolean {
  return hasPermissionCode(user, PERM.systemAdmin) || hasPermissionCode(user, PERM.operationsStaff);
}
