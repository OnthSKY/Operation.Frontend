export const userRoles = {
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
