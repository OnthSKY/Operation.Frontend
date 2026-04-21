/** i18n `t` ile rol etiketi (presentational katmanına veri sağlar). */
export function accountRoleLabel(
  role: string,
  t: (key: string) => string
): string {
  switch (role) {
    case "ADMIN":
      return t("profile.roleAdmin");
    case "STAFF":
      return t("profile.roleStaff");
    case "PERSONNEL":
      return t("profile.rolePersonnel");
    case "DRIVER":
      return t("profile.roleDriver");
    case "VIEWER":
      return t("profile.roleViewer");
    case "FINANCE":
      return t("profile.roleFinance");
    case "PROCUREMENT":
      return t("profile.roleProcurement");
    default:
      return role;
  }
}
