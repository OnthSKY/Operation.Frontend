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
  personnelLinkButton: "Link personnel",
  personnelLinkChangeButton: "Change personnel",
  personnelLinkSelfDisabled: "You can't change your own personnel link here.",
  personnelLinkModalTitle: "Link personnel",
  personnelLinkModalDescription:
    "Link this user to a personnel record, independent of their role — or remove the link.",
  personnelLinkCurrentBadge: "Current:",
  personnelLinkPickHeading: "Personnel record",
  personnelLinkPickHint:
    "Pick the personnel record this account represents. Choose “Don't link” to remove the link.",
  personnelLinkUnlinkHint:
    "Choosing “Don't link” removes the current personnel link; the user then appears under their own name.",
  personnelLinkSessionHint:
    "The personnel identity is embedded in the session token, so the user's active sessions are revoked after the change — they'll need to sign in again.",
  personnelLinkPortalBlockTitle: "Link can't be removed",
  personnelLinkPortalBlockHint:
    "This user has the PERSONNEL/DRIVER role, which requires a linked personnel. Remove that role before removing the link.",
  personnelLinkConfirm: "Link",
  personnelLinkUnlinkConfirm: "Remove link",
  personnelLinked: "User linked to personnel.",
  personnelUnlinked: "Personnel link removed.",
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
  roleAdmin: "System Administrator",
  roleStaff: "Operations Staff",
  rolePersonnel: "Branch Personnel",
  roleDriver: "Warehouse Driver",
  roleViewer: "Read-only Viewer",
  roleFinance: "Finance / Accounting Lead",
  roleProcurement: "Procurement & Warehouse Lead",
  roleBranchDayRegister: "Branch Day Register Clerk",
  roleBranchWarehouseStaff: "Branch Warehouse Staff",
  roleDetailAdmin:
    "Full control over system settings, user/role management, the authorization matrix, and per-user data scopes. The system.admin wildcard grants access to every module and API; only admin.users.data_scopes still requires an explicit grant.",
  roleDetailStaff:
    "Broad operations role: branch register, personnel, warehouse movements, products, suppliers, reports, and shipment workflows. The operations.staff wildcard opens every ui.* module; fine-grained codes (delete/reverse, payroll write, etc.) must still be granted explicitly in the matrix.",
  roleDetailPersonnel:
    "Branch personnel tied to a personnel card. May only operate on their assigned branch (no branch.cross_branch.view) and sees no financial totals (no branch.financials.view). Sees own advances and pocket summaries. Requires a personnel record with a branch assignment.",
  roleDetailDriver:
    "Warehouse driver completing branch shipments. Sees only their own warehouse movements/transfers (no warehouse.cross_user.view) and shipment assignments. With «own financials» enabled, may see their own advances and attributed expenses. A personnel link is required.",
  roleDetailViewer:
    "Read-only access to dashboard, reports, and daily branch register views. No write/approve actions. Has branch.financials.view and ui.reports.financial by default; the matrix can narrow specific reads.",
  roleDetailFinance:
    "Finance / accounting focused role. Sees branch financial totals, personnel payroll/advance data, and the financial analysis hub (/reports/financial). operations.staff wildcard also grants write access to most office modules by default.",
  roleDetailProcurement:
    "Procurement, warehouse, and shipment focused role. Branches, warehouse movements, products, and suppliers are open; warehouse.driver code also grants access to driver flows. General overhead and insurance modules are closed.",
  roleDetailBranchDayRegister:
    "Day-end cashier for assigned branches. Limited to today's register entries (branch.transactions.today_only). Can only create register-cash advances for personnel marked as ADVANCE_DELEGATE_TARGET in data scopes. No full Branches module access; cannot leave the branches assigned via user_branch_scopes.",
  roleDetailBranchWarehouseStaff:
    "Sees stock and records movements/transfers only in assigned warehouse(s). No financial (register/income/expense) or cross-branch access; cannot delete/reverse. If no warehouse data scope is set, sees ALL warehouses — so you are redirected to the scopes screen after assignment; pick the relevant branch's warehouse.",
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
  scopeRequiredRoleSavedNeedScopesPermission:
    "Role updated. This role requires data scopes — ask an administrator with «admin.users.data_scopes» to assign scope (branch/warehouse/personnel) rows for this user.",
  scopeRequiredUserCreatedNeedScopesPermission:
    "User created. The assigned role requires data scopes — ask an administrator with «admin.users.data_scopes» to assign scope rows for this account.",
  scopeMissingBadge: "Scope missing",
  scopeMissingHint:
    "This user's role requires data scopes but none are defined; operations may be incomplete or fail. Add branch/warehouse/personnel rows from the Scopes screen.",
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
  roleChangeModalTitle: "Edit roles",
  roleChangeModalDescription:
    "Pick this account’s roles below (you can select more than one). Saving ends active sessions; the user must sign in again.",
  roleChangeAccountHeading: "Account",
  roleChangeCurrentBadge: "Current roles",
  roleChangePickHeading: "Roles",
  roleChangePickSubhint:
    "Each option summarizes typical menus and data access; the exact permission list lives in the Authorization matrix.",
  rolesPickMultiSubhint:
    "You can select multiple roles; the user gets the combined permissions of all selected roles. The exact permission list lives in the Authorization matrix.",
  rolesNoneSelectedError: "Select at least one role.",
  rolePersonnelRequiredBadge: "Personnel required",
  personnelRequiredForRoleHint:
    "This role must be linked to a personnel record; otherwise the account won't work (branch/driver identity, shipment delivery signature).",
  personnelRequiredError: "Select a personnel for this role.",
  rolesNoneSelectedTitle: "No roles selected",
  rolesNoneSelectedHint:
    "You must select at least one role to save; an account with no roles cannot access any screen.",
  roleChangePreviewHeading: "Summary",
  roleChangeConfirm: "Update role",
  roleChangeOpenAria: "Choose role and update",
  roleEditButton: "Edit roles",
  roleChangeSessionHint: "Confirming ends active sessions.",
  roleChangePersonnelFieldLabel: "Link to a personnel",
  roleChangePersonnelFieldHint:
    "You can link this login to a personnel card. Once linked, the user appears with that personnel's name across the list and every screen. The link is required for branch staff and driver roles.",
  roleChangePersonnelRequired:
    "Select a personnel record for this role (branch staff requires a person with an assigned branch).",
  roleChangeUnlinkPersonnelTitle: "Unlink personnel",
  roleChangeUnlinkPersonnelHint:
    "This account is currently linked to personnel “{name}”, so it shows that person's name in the list and screens. Since the portal role (branch staff/driver) is removed, you can unlink it.",
  roleChangeUnlinkPersonnelCheckbox:
    "Unlink personnel — the user will appear with its own username/display name from now on.",
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
  editUser: "Edit",
  editDialogTitle: "Edit user",
  editDialogDescription:
    "Update the name, username and email. Reset the password below if needed.",
  editUsernameLabel: "Username",
  editUsernameRequired: "Username cannot be empty.",
  editFullNameLabel: "Full name",
  editEmailLabel: "Email",
  editEmailPlaceholder: "name@company.com",
  editProfileSaved: "User details updated",
  editPasswordSectionTitle: "Reset password",
  editPasswordSectionHint:
    "Setting a new password ends the user's current sessions and forces a fresh sign-in.",
  editNewPasswordLabel: "New password",
  editNewPasswordPlaceholder: "At least 8 characters",
  resetPasswordButton: "Reset password",
  passwordResetSaved: "Password reset",
  deleteUser: "Delete",
  deleteUserHint:
    "Removes the user (different from deactivating). Permanent delete is also possible if created by mistake.",
  deleteSelfDisabled: "You cannot delete your own account.",
  deleteDialogTitle: "Delete user",
  deleteDialogDescription:
    "Choose how you want to remove this user. The action is written to the audit log.",
  deleteDialogSoftHint:
    "Delete: the user is removed from the list and can no longer sign in; the username becomes reusable. Historical records (transactions, audit) are kept.",
  deleteDialogHardHint:
    "Permanent Delete: fully removes a user created by mistake. If the user has created or modified any records, it cannot be permanently deleted and automatically falls back to a normal delete.",
  deleteSoftButton: "Delete",
  deleteHardButton: "Permanent Delete",
  deleteSoftToast: "User deleted",
  deleteHardToast: "User permanently deleted",
  deleteHardFallbackToast:
    "The user has linked records, so it could not be permanently deleted; it was removed from the list instead.",
  tablePermissions: "Permissions",
  tableMfa: "MFA",
  mfaOnShort: "On",
  mfaOffShort: "Off",
  mfaAdminDisableButton: "Disable MFA",
  mfaAdminEnableButton: "Re-enable MFA",
  mfaAdminDisableTooltip:
    "Disable the user's MFA without clearing the secret. You can re-enable it later from the same place and the user keeps using their existing authenticator code. Open sessions are ended. System administrator only.",
  mfaAdminEnableTooltip:
    "Re-enable a previously disabled MFA. The user's authenticator code is preserved so they can sign in with the same code. Open sessions are ended. System administrator only.",
  mfaAdminUnavailableTooltip:
    "The user has not set up MFA yet (or cleared it themselves). It cannot be re-enabled here; they must enroll again from their profile.",
  mfaAdminForbidden: "Only the System Administrator can change MFA state.",
  mfaAdminToggleDialogTitleDisable: "Disable MFA",
  mfaAdminToggleDialogTitleEnable: "Re-enable MFA",
  mfaAdminToggleDialogDescriptionDisable:
    "You are about to disable MFA for «{username}». The authenticator secret will be preserved so you can re-enable from the same place. Their open sessions will end. Proceed?",
  mfaAdminToggleDialogDescriptionEnable:
    "You are about to re-enable MFA for «{username}». The user can sign in with their previously enrolled authenticator code (it has not changed). Open sessions end and MFA will be requested on next login. Proceed?",
  mfaAdminToggleConfirmDisable: "Disable MFA",
  mfaAdminToggleConfirmEnable: "Re-enable MFA",
  mfaAdminDisabledToast: "MFA disabled. The user must sign in again.",
  mfaAdminEnabledToast: "MFA re-enabled. The user can continue with their existing code.",
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
  warehouseScopeEmptyWarning:
    "No warehouse scope set — this user can see ALL warehouses. Add specific warehouses above to restrict access (e.g. only their own branch's warehouse).",
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
