export function isPersonnelPortalRole(role: string | undefined | null): boolean {
  return String(role ?? "").toUpperCase() === "PERSONNEL";
}

export function isDriverPortalRole(role: string | undefined | null): boolean {
  return String(role ?? "").toUpperCase() === "DRIVER";
}

export function postLoginHomePath(role: string | undefined | null): string {
  const u = String(role ?? "").toUpperCase();
  if (u === "PERSONNEL") return "/branches";
  if (u === "DRIVER") return "/warehouses";
  return "/";
}
