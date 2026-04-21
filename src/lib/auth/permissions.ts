import type { AuthUser } from "@/lib/auth/types";

/** Sunucu `permissions` tablosu ile aynı kodlar (matris). */
export const PERM = {
  systemAdmin: "system.admin",
  operationsStaff: "operations.staff",
  warehouseDriver: "warehouse.driver",
  uiDashboard: "ui.dashboard",
  uiReports: "ui.reports",
  uiDailyBranchRegister: "ui.daily_branch_register",
  uiPersonnel: "ui.personnel",
  uiMyAdvances: "ui.my_advances",
  uiBranches: "ui.branches",
  uiGeneralOverhead: "ui.general_overhead",
  uiInsurances: "ui.insurances",
  uiWarehouse: "ui.warehouse",
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

export function hasStaffOperationsNotifications(user: AuthUser | null | undefined): boolean {
  return hasPermissionCode(user, PERM.systemAdmin) || hasPermissionCode(user, PERM.operationsStaff);
}
