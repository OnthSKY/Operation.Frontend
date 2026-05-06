import type { AuthUser } from "@/lib/auth/types";
import { canOpenBranchesWorkspace, canSeeUiModule, PERM } from "@/lib/auth/permissions";

export function isPersonnelPortalRole(role: string | undefined | null): boolean {
  return String(role ?? "").toUpperCase() === "PERSONNEL";
}

export function isDriverPortalRole(role: string | undefined | null): boolean {
  return String(role ?? "").toUpperCase() === "DRIVER";
}

export function postLoginHomePath(userOrRole: AuthUser | string | undefined | null): string {
  if (userOrRole != null && typeof userOrRole === "object") {
    const u = userOrRole;
    if (canSeeUiModule(u, PERM.uiDashboard)) return "/";
    if (canOpenBranchesWorkspace(u)) return "/branches";
    if (canSeeUiModule(u, PERM.uiWarehouse)) return "/warehouses";
    if (canSeeUiModule(u, PERM.uiMyAdvances)) return "/personnel/costs";
    return "/guide";
  }
  const r = String(userOrRole ?? "").toUpperCase();
  if (r === "BRANCH_DAY_REGISTER") return "/branches";
  if (r === "PERSONNEL") return "/branches";
  if (r === "DRIVER") return "/warehouses";
  if (r === "VIEWER" || r === "FINANCE") return "/";
  if (r === "PROCUREMENT") return "/warehouses";
  return "/";
}
