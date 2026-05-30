/** i18n `t` ile rol etiketi (presentational katmanına veri sağlar). */
export function accountRoleLabel(
  role: string,
  t: (key: string) => string
): string {
  const code = String(role ?? "").trim().toUpperCase();
  switch (code) {
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
    case "BRANCH_DAY_REGISTER":
      return t("profile.roleBranchDayRegister");
    default:
      return t("profile.roleUnknown");
  }
}

/**
 * Kullanıcılar ve yetkilendirme matrisi için ortak başlık — `UsersScreen` ile aynı `users.role*` anahtarları.
 * Bilinmeyen kodda boş döner; çağıran API `displayName` vb. ile tamamlar.
 */
export function adminUsersRoleTitle(
  roleCode: string,
  t: (key: string) => string
): string {
  const code = String(roleCode ?? "").trim().toUpperCase();
  switch (code) {
    case "ADMIN":
      return t("users.roleAdmin");
    case "STAFF":
      return t("users.roleStaff");
    case "PERSONNEL":
      return t("users.rolePersonnel");
    case "DRIVER":
      return t("users.roleDriver");
    case "VIEWER":
      return t("users.roleViewer");
    case "FINANCE":
      return t("users.roleFinance");
    case "PROCUREMENT":
      return t("users.roleProcurement");
    case "BRANCH_DAY_REGISTER":
      return t("users.roleBranchDayRegister");
    default:
      return "";
  }
}

export function adminUsersRoleTitleOrFallback(
  roleCode: string,
  fallbackTitle: string,
  t: (key: string) => string
): string {
  const localized = adminUsersRoleTitle(roleCode, t).trim();
  if (localized) return localized;
  const fb = String(fallbackTitle ?? "").trim();
  if (fb) return fb;
  const code = String(roleCode ?? "").trim().toUpperCase();
  return code || t("profile.roleUnknown");
}

/**
 * Rol için tam açıklama metni (matris kartı, rol değiştirme modalı vb.).
 * Çevirisi yoksa boş döner.
 */
export function adminUsersRoleDescription(
  roleCode: string,
  t: (key: string) => string
): string {
  const code = String(roleCode ?? "").trim().toUpperCase();
  const key = (() => {
    switch (code) {
      case "ADMIN":
        return "users.roleDetailAdmin";
      case "STAFF":
        return "users.roleDetailStaff";
      case "PERSONNEL":
        return "users.roleDetailPersonnel";
      case "DRIVER":
        return "users.roleDetailDriver";
      case "VIEWER":
        return "users.roleDetailViewer";
      case "FINANCE":
        return "users.roleDetailFinance";
      case "PROCUREMENT":
        return "users.roleDetailProcurement";
      case "BRANCH_DAY_REGISTER":
        return "users.roleDetailBranchDayRegister";
      default:
        return "";
    }
  })();
  if (!key) return "";
  const value = t(key);
  return value === key ? "" : value;
}
