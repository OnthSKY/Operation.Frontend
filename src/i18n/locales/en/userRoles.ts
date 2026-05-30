export const userRoles = {
  pageTitle: "User roles",
  pageDescription:
    "Edit all assigned roles for this user. Multiple roles grant the UNION of their permission sets.",
  backToUsers: "Back to users",
  currentSelectedLabel: "Selected roles",
  noneSelectedTitle: "No roles selected",
  noneSelectedHint:
    "If you save, the user will only keep system-wide permissions (e.g. super admin). You will get a confirmation preview.",
  searchPlaceholder: "Search role…",
  searchNoMatch: "No roles matched your search.",
  sectionSystem: "System roles",
  sectionCustom: "Custom roles",
  systemBadge: "System",
  removeRoleAria: "Remove role {role}",
  loadError: "Failed to load roles.",
  saveWithCount: "Save ({count} roles)",
  noChanges: "No changes",
  saved: "User roles updated. Active sessions revoked.",
  confirmEmpty:
    "No roles selected. This user will lose normal access. Continue?",

  manageButton: "Manage multi-roles",

  createRoleTitle: "New custom role",
  createRoleDescription:
    "Add your own roles alongside the system ones. After creation, assign permissions via the matrix.",
  createRoleButton: "+ New role",
  createRoleCodeLabel: "Role code",
  createRoleCodePlaceholder: "E.G. REGION_LEAD",
  createRoleCodeHint: "Uppercase, no spaces, unique. Auto-uppercased.",
  createRoleDisplayLabel: "Display name",
  createRoleDisplayPlaceholder: "e.g. Region Lead",
  createRoleSubmit: "Create role",
  createRoleCodeRequired: "Role code is required.",
  createRoleSuccess: "Role '{role}' created.",
  deleteRoleConfirmTitle: "Delete role {role}?",
  deleteRoleConfirmText:
    "The role will be removed from all users and permission assignments. System roles cannot be deleted.",
  deleteRoleSubmit: "Delete role",
  deleteRoleSuccess: "Role '{role}' deleted.",
  customBadge: "Custom",
} as const;
