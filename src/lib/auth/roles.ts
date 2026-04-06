export function isPersonnelPortalRole(role: string | undefined | null): boolean {
  return String(role ?? "").toUpperCase() === "PERSONNEL";
}
