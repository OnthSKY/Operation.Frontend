export const users = {
  title: "Users",
  description: "System accounts (login). Link optional staff records to personnel.",
  addUser: "New user",
  forbidden: "You need administrator access to view this page.",
  loadError: "Could not load users.",
  tableUser: "Username",
  tableName: "Display name",
  tableRole: "Role",
  tableStatus: "Status",
  tablePersonnel: "Personnel",
  personnelNone: "—",
  empty: "No users yet.",
  modalTitle: "Create user",
  modalHint:
    "Minimum 8 characters for password. Link to personnel only if this login is for an existing staff record.",
  fieldUsername: "Username",
  fieldPassword: "Password",
  fieldPasswordConfirm: "Confirm password",
  fieldFullName: "Display name (optional)",
  fieldRole: "Role",
  fieldPersonnel: "Personnel (optional)",
  personnelPlaceholder: "No link",
  roleAdmin: "Administrator",
  roleStaff: "Operations staff",
  rolePersonnel: "Branch staff (limited access)",
  roleDriver: "Warehouse driver (shipments only)",
  roleViewer: "Read-only (dashboard & reports)",
  roleFinance: "Finance & accounting",
  roleProcurement: "Procurement & warehouse",
  roleBranchDayRegister: "Branch day register (today only + delegated advances)",
  roleDetailAdmin:
    "All menus (branches, personnel, warehouse, products, suppliers, reports, users, authorization matrix). Broadest default API access; fine‑tuning is done in the matrix and optional per-user overrides.",
  roleDetailStaff:
    "Operations bundle: branches, personnel, warehouse movements, products, reports, and most day‑to‑day screens. The full permission set follows the “Operations staff” row in the Authorization matrix.",
  roleDetailPersonnel:
    "A reduced sidebar (typically branches, my advances, etc.). The assigned branch card and self-related data. Requires a personnel record with a branch before assigning this role.",
  roleDetailDriver:
    "Branches and warehouse; view and sign shipments assigned to you. A personnel link is required. “Own finances” can expose the driver’s own advances and attributed expenses when enabled.",
  roleDetailViewer:
    "Read-only areas such as dashboard, reports, and daily branch register views; no creating or approving data.",
  roleDetailFinance:
    "Dashboard, reports, personnel costs, branches, general overhead, products, and suppliers — finance-focused views. Details follow the “Finance & accounting” row in the matrix.",
  roleDetailProcurement:
    "Dashboard, reports, branches, warehouse, products, and suppliers — procurement and stock workflows. Details follow the “Procurement & warehouse” row in the matrix.",
  roleDetailBranchDayRegister:
    "Assigned branches only: enter today’s register movements, and cash advances only for personnel explicitly marked in data scopes (ADVANCE_DELEGATE_TARGET). No full branch module, no historical advances created by others.",
  branchDayRegisterSetupTitle: "Finish setup for this role",
  branchDayRegisterSetupIntro:
    "The account cannot work until you assign branches (and optional advance targets) in Data scopes.",
  branchDayRegisterSetupStep1:
    "Branch scopes: add each branch this user may open (summary level is enough for day-register cash lines).",
  branchDayRegisterSetupStep2:
    "Optional — delegated advances: add a personnel scope with level «Advance delegate target» for each person they may give register-cash advances to.",
  branchDayRegisterSetupStep3:
    "Save the role or user first; if you can edit data scopes, the scopes window opens next so you can add rows immediately.",
  branchDayRegisterSetupNote:
    "Register lines are limited to today’s date for this role; past days are blocked on the server.",
  branchDayRegisterSetupAfterSaveHint:
    "After you confirm below, the Data scopes window opens for this account (you have permission).",
  branchDayRegisterSetupNeedScopesPermission:
    "You cannot edit data scopes from this login. Ask an administrator with «admin.users.data_scopes» to assign branch rows (and optional advance targets) for this user.",
  branchDayRegisterSetupGuideLink: "Open the in-app guide (Admin tab)",
  branchDayRegisterRoleSavedNeedScopesPermission:
    "Role updated. Assign branch data scopes (and optional advance-delegate personnel) for this user — your account cannot open the scopes editor.",
  branchDayRegisterUserCreatedNeedScopesPermission:
    "User created. Assign branch data scopes (and optional advance-delegate personnel) for this account — your login cannot open the scopes editor.",
  statusActive: "Active",
  statusInactive: "Inactive",
  passwordMismatch: "Passwords do not match.",
  passwordTooShort: "Password must be at least 8 characters.",
  created: "User created",
  personnelPickInvalid: "Pick a valid person or leave personnel empty.",
  personnelRequiredForPortalRole:
    "Branch staff role requires selecting a personnel record with an assigned branch.",
  personnelRequiredForDriverRole:
    "Driver role requires a linked personnel record (for shipment signing).",
  tableSelfFinancials: "Own finances",
  selfFinancialsHint: "Driver can see own advances & attributed expenses when enabled.",
  selfFinancialsUpdated: "Visibility updated",
  roleUpdated: "Role updated. That user must sign in again (sessions ended).",
  roleChangeSelfDisabled: "You cannot change your own role here.",
  roleChangeModalTitle: "Change role",
  roleChangeModalDescription:
    "Pick the new role below. Saving ends this account’s active sessions; the user must sign in again.",
  roleChangeAccountHeading: "Account",
  roleChangeCurrentBadge: "Current role",
  roleChangePickHeading: "New role",
  roleChangePickSubhint:
    "Each option summarizes typical menus and data access; the exact permission list lives in the Authorization matrix.",
  roleChangePreviewHeading: "Summary",
  roleChangeConfirm: "Update role",
  roleChangeOpenAria: "Choose role and update",
  roleChangeSessionHint: "Confirming ends active sessions.",
  roleChangePersonnelFieldLabel: "Personnel link",
  roleChangePersonnelFieldHint:
    "For branch staff or driver, pick which personnel card this login is tied to. If the account already has a link, you can keep it or choose another.",
  roleChangePersonnelRequired:
    "Select a personnel record for this role (branch staff requires a person with an assigned branch).",
  activateUser: "Activate",
  deactivateUser: "Deactivate",
  activateUserHint: "User can sign in again.",
  deactivateUserHint:
    "Blocks sign-in and revokes “remember me” sessions. Logged to audit.",
  accountActivatedToast: "User activated",
  accountDeactivatedToast: "User deactivated",
  accountStatusDialogTitleActivate: "Activate account",
  accountStatusDialogTitleDeactivate: "Deactivate account",
  accountStatusDialogDescriptionActivate:
    "This user will be able to sign in again. Continue?",
  accountStatusDialogDescriptionDeactivate:
    "Sign-in is blocked and “remember me” sessions end. The action is logged to audit. Continue?",
  statusChangeSelfDisabled: "You cannot deactivate your own account here.",
  tablePermissions: "Permissions",
  tableMfa: "MFA",
  mfaOnShort: "On",
  mfaOffShort: "Off",
  listOverrideNone: "No per-user permission rows",
  listOverrideSome: "{count} permission override(s)",
  listScopeNone: "No custom data scope rows",
  listScopeSome: "{count} scope row(s)",
  managePermissions: "Manage permissions",
  managePermissionsForbidden: "You do not have permission to edit user permission overrides.",
  manageScopes: "Manage scopes",
  manageScopesForbidden:
    "Editing data scopes requires the «admin.users.data_scopes» permission. Ask an administrator to grant it on Settings → Authorization.",
  manageScopesRequiresPermissionOverridesFirst:
    "You need permission to edit user permission overrides first (system.admin or admin.users.permission_overrides). Ask your administrator on Settings → Authorization, or switch to an account that has it.",
  manageScopesGoAuthorization: "Open authorization settings →",
  permissionsModalTitle: "User permission overrides",
  permissionsModalUserLabel: "Account",
  permissionsGuideEyebrow: "Guide",
  permissionsGuideToggleLabel: "Inheritance, role matrix & per-user overrides (tap to expand)",
  permissionsModalRoleHighlight: "Assigned role",
  permissionsStatsMatrixTitle: "Role matrix summary",
  permissionsStatsMatrixSubtitle: "For «{role}» on the Authorization matrix",
  permissionsStatsMatrixGrantsLabel: "Role grants",
  permissionsStatsMatrixNotGrantedLabel: "Not granted by role",
  permissionsStatsMatrixTotalLabel: "Total definitions",
  permissionsStatsMatrixFootnote:
    "“Not granted” means unchecked for this role — not the same as an explicit user DENY.",
  permissionsStatsMatrixLoading: "Loading role row…",
  permissionsStatsMatrixMissing: "No matrix row for this role; cannot compute counts.",
  permissionsStatsOverridesTitle: "Per-user overrides",
  permissionsStatsOverridesSubtitle: "Exceptions to the matrix — draft counts below",
  permissionsStatsOverridesSaved: "Saved on server: {allow} ALLOW, {deny} DENY ({total} rows)",
  permissionsStatsOverridesSavedEmpty: "No saved per-user override rows.",
  permissionsStatsOverridesInheritLabel: "Inherited (follow role)",
  permissionsModalDescriptionShort:
    "Inherited: follow the Authorization matrix for this user’s role (not an explicit grant or block by itself). ALLOW / DENY: per-login exceptions only.",
  permissionsModalHint:
    "Edit the role’s default bundle under Settings → Authorization. This dialog only sets per-login exceptions.",
  permissionsHelpIntro:
    "Pick one of three outcomes per permission below. Warehouse: inbound, outbound, and aggregates are separate flags. Branch managers, branch card settings, and Manage scopes are separate from this list.",
  permissionsRoleVsUserTitle: "How this relates to the role matrix:",
  permissionsThreeStatesTitle: "What “Inherited” means",
  permissionsInheritPlainMeaning:
    "In short: “Inherited” does not grant and does not deny by itself; it only follows the role matrix (effective if the role has the permission, not effective if it does not). Use ALLOW for an explicit extra grant or DENY to block.",
  permissionsInheritExplain:
    "Inherited = no per-user ALLOW/DENY row for this code — it is neither “explicitly granted” nor “explicitly blocked.” The server applies whatever that user’s role has on the Authorization matrix. If you add a new permission to that role and leave Inherited here, this user picks it up on the next request automatically.",
  permissionsAllowExplain:
    "ALLOW = grant this permission for this login in addition to the role; it is added even if the role does not include the code.",
  permissionsDenyExplain:
    "DENY = block this permission for this login even when the role includes it.",
  permissionsInheritedStatHint:
    "Inherited count: no per-user ALLOW/DENY; effect comes only from the role (not a count of grants or blocks).",
  permissionWhereUsed: "Where it applies",
  permissionInheritSourceLine:
    "Inherited from role «{role}» — matrix checkmarks apply. That is not, by itself, an explicit grant or deny.",
  permissionServerDescriptionLabel: "Server description",
  permissionCardWhereHeading: "Menu & scope",
  permissionCardDetailHeading: "What it does",
  permissionCardTechnicalCodeHeading: "Permission code (system)",
  permissionMatrixRoleGrantsThis:
    "The role currently grants this: «{role}» has it on the matrix. With Inherited, it stays effective for this user (not a deny — the role allows it).",
  permissionMatrixRoleDoesNotGrant:
    "The role does not grant this: «{role}» does not have it on the matrix. With Inherited, this user will not get it — that is not an explicit DENY override; the role simply omits this code.",
  permissionInheritBadgeTitle: "Practical result while Inherited is selected",
  permissionInheritBadgeGranted:
    "Role grants this → effective for this user. (No explicit ALLOW row; it follows the matrix.)",
  permissionInheritBadgeNotGranted:
    "Role does not grant this → off for this user. (Not an explicit DENY; it is unchecked for this role on the matrix.)",
  permissionMatrixPending: "Loading role matrix…",
  permissionMatrixRoleMissing:
    "No matrix row found for this role. Check the Authorization page.",
  permissionChoiceOutcomeTitle: "What your choice does (after save)",
  permissionChoiceGroupAria: "Inherit, allow, or deny",
  permissionInheritIconAriaMatrixOn: "This permission is on in the matrix",
  permissionInheritIconAriaMatrixOff: "This permission is off in the matrix",
  permissionSaveEffectInheritOn:
    "Removes the per-user row; role «{role}» has this on the matrix, so it stays effective for this user (role grants).",
  permissionSaveEffectInheritOff:
    "Removes the per-user row; role «{role}» does not have this on the matrix, so it stays off (role does not grant — not counted as an explicit deny).",
  permissionSaveEffectInheritPending: "Matrix still loading; exact outcome not shown yet.",
  permissionSaveEffectInheritUnknown: "Cannot compute Inherited outcome because the role row is missing.",
  permissionSaveEffectAllow:
    "Explicitly grants this permission for this login (even if role «{role}» does not).",
  permissionSaveEffectDeny:
    "Explicitly blocks this permission for this login (even if role «{role}» does).",
  permissionButtonTitleInherit:
    "Reverts to the matrix for this role; removes per-user ALLOW/DENY. Does not grant or deny by itself — effective only if the role includes the permission.",
  permissionButtonTitleAllow: "Adds or keeps this permission for this user only.",
  permissionButtonTitleDeny: "Blocks this permission for this user only.",
  permissionGroupBranch: "Branch",
  permissionGroupPersonnel: "Personnel",
  permissionGroupWarehouse: "Warehouse",
  permissionGroupShipment: "Shipment",
  permissionGroupUi: "UI",
  permissionGroupSystem: "System",
  permissionGroupOperations: "Operations",
  permissionGroupOther: "Other",
  permissionsSearchPlaceholder: "Search by permission code or description",
  permissionsSearchEmpty: "No permissions match your search.",
  permissionsInheritedLabel: "Inherited",
  permissionsAllowLabel: "ALLOW",
  permissionsDenyLabel: "DENY",
  permissionsUpdated: "Saved. That user must sign in again (sessions ended).",
  scopesModalTitle: "Data scopes (branch / warehouse / personnel)",
  scopesModalHint:
    "Add rows to cap how much detail this user sees for a specific branch, warehouse, or personnel target. Empty list = no extra restriction (role permissions apply as-is). Branch managers: Branches → edit branch → Managers; if the login is linked to that personnel record, personnel scope for that branch appears below automatically.",
  scopesHelpPanelTitle: "How to read levels",
  scopesHelpPanelSubtitle:
    "Options in each dropdown go from narrow access to broader access. Each row only applies to the record you pick in that row.",
  scopesHelpBranchStep1: "Summary — branch overview cards and high-level view; least detail.",
  scopesHelpBranchStep2: "Operations — day-to-day work: cash, income/expense, stock and branch operational entries (write).",
  scopesHelpBranchStep3: "All data — full financial and detailed branch data.",
  scopesHelpWarehouseStep1: "Read-only — view movements.",
  scopesHelpWarehouseStep2: "Operations — record inbound/outbound and transfers.",
  scopesHelpWarehouseStep3: "Full data — costing and full movement detail.",
  scopesHelpPersonnelStep1: "Self — only the personnel record linked to this login.",
  scopesHelpPersonnelStep2: "Branch summary — that branch’s roster and summary info.",
  scopesHelpPersonnelStep3: "Branch detail — finance/HR detail for that branch.",
  scopesHelpPersonnelStep4: "All personnel — company-wide personnel detail.",
  scopesColumnTarget: "Record",
  scopesColumnAccessLevel: "Access level",
  scopesUpdated: "Saved. That user must sign in again (sessions ended).",
  branchScopesTitle: "Branch scopes",
  warehouseScopesTitle: "Warehouse scopes",
  personnelScopesTitle: "Personnel scopes",
  personnelScopeImpliedTitle: "Automatic (branch manager on branch card)",
  personnelScopeImpliedPrefix: "Branch:",
  personnelScopeImpliedDetail:
    "All personnel in this branch are covered at branch detail level (BRANCH_ALL_DATA) for this user.",
  personnelScopeImpliedRemoveHint:
    "To remove: Branches → edit that branch → Managers, and unselect this person (their login must be linked to that personnel record).",
  personnelScopeImpliedCoveredTitle: "Personnel visible under this branch scope",
  personnelScopeImpliedCoveredCount: "{count} people",
  personnelScopeImpliedCoveredEmpty: "No active personnel assigned to this branch.",
  personnelScopeImpliedMultiBranchNote:
    "If this user is a manager on multiple branches, each branch appears in its own block listing only that branch’s staff.",
  howToBranchResponsibleTitle: "How to set a branch manager",
  howToBranchResponsibleBody:
    "Open the branch → Edit → Managers, and pick staff assigned to that branch. After save they count as managers in cash workflows, and if their user account is linked to that personnel row, personnel data scope for the whole branch is implied automatically.",
  howToPersonnelScopeTitle: "Manual personnel scope",
  howToPersonnelScopeBody:
    "Use Add row to target one personnel record or an entire branch. Branch target = all personnel rows in that branch. You do not need a duplicate row for branches where they are already a manager.",
  branchScopeLevel: "Branch scope level",
  warehouseScopeLevel: "Warehouse scope level",
  personnelScopeLevel: "Personnel scope level",
  personnelScopeTarget: "Personnel scope target",
  scopeTargetPersonnel: "Personnel record",
  scopeTargetBranch: "Branch record",
  branchScopeSummary: "Summary — least detail",
  branchScopeOperations: "Operations — daily entries (cash, expenses, stock)",
  branchScopeAllData: "All data — full financial detail",
  warehouseScopeRead: "Read-only — view only",
  warehouseScopeOperations: "Operations — record movements",
  warehouseScopeAllData: "Full data — including costing",
  personnelScopeSelf: "Self only",
  personnelScopeBranchSummary: "Branch summary — roster & summary",
  personnelScopeBranchAllData: "Branch detail — finance / HR detail",
  personnelScopeAllPersonnelData: "All personnel — company-wide",
  personnelScopeAdvanceDelegateTarget:
    "Advance delegate target — day-register clerks may give register-cash advances to this person only",
} as const;
