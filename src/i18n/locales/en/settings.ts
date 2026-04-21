export const settings = {
  title: "System settings",
  description: "Manage users, roles, and which permissions each role receives.",
  usersCardTitle: "Users",
  usersCardDesc: "Create accounts, assign login roles, and driver self-finance visibility.",
  usersCardLink: "Open users",
  authzCardTitle: "Roles & permissions",
  authzCardDesc: "Map permissions to system roles (staff, driver, admin). Changes apply on the next request.",
  authzCardLink: "Edit permission matrix",
  backToSettings: "System settings",
  authzPageTitle: "Role & permission matrix",
  authzPageDescription:
    "Check permissions per role and save each row. ADMIN always keeps system.admin.",
  authzMatrixHint:
    "Wide layout: each permission column shows the code; hover, focus, or tap the header for the full description. Saved permissions apply on the next request.",
  authzLoadError: "Could not load authorization matrix.",
  authzRole: "Role",
  authzActions: "Actions",
  authzSaveRow: "Save row",
  authzSaved: "Permissions updated",
  authzMobileRolePerms: "Permissions",
  authzUnsaved: "Unsaved",
  authzDesktopScrollHint:
    "Below 1280px width this page uses cards per role. On wide screens, scroll horizontally if needed; role and Actions columns stay pinned.",
  notificationsCardTitle: "Notifications",
  notificationsCardDesc:
    "Turn operational reminders on or off for the whole organization (bell, API, daily toast).",
  notificationsCardLink: "Notification settings",
  notificationsPageTitle: "Organization notification settings",
  notificationsPageDescription:
    "When disabled here, staff will not see operational reminder items or the daily toast, regardless of personal preferences.",
  notificationsSectionOrg: "Operational reminders",
  notificationsSectionOrgHint: "Applies to all staff users who can see the reminder bell.",
  notificationsOperationalReminders: "Enable operational reminders",
  notificationsOperationalRemindersDesc:
    "Day-close and Z-report-to-accounting reminders in the header bell and API.",
  notificationsOperationalDailyToast: "Enable daily reminder toast",
  notificationsOperationalDailyToastDesc:
    "One in-app info toast per calendar day when there are pending reminders (also requires each user’s personal setting).",
  notificationsSaved: "Organization notification settings saved.",
  notificationsLastSaved: "Last saved:",
  notificationsNeverUpdated: "No changes saved yet (defaults: all on).",
  notificationsUserPrefsNote:
    "Users can still turn off the daily toast for themselves under Account → System settings → Notifications.",
  brandingCardTitle: "Company name & logo",
  brandingCardDesc: "Shown at the top of the sidebar for all signed-in users.",
  brandingCardLink: "Edit branding",
  brandingPageTitle: "Company branding",
  brandingPageDescription:
    "Set the organization name and optional logo. If empty, the default app title from translations is used.",
  brandingSectionName: "Company name",
  brandingSectionNameHint: "Leave empty and save to use the default application title.",
  brandingCompanyNameLabel: "Display name",
  brandingCompanyNamePlaceholder: "e.g. ACME Tourism",
  brandingSectionLogo: "Logo",
  brandingSectionLogoHint: "Square or wide image; JPEG, PNG, WebP, HEIC or AVIF (max 5 MB).",
  brandingLogoEmpty: "No logo",
  brandingUploadLogo: "Upload logo",
  brandingReplaceLogo: "Replace logo",
  brandingRemoveLogo: "Remove logo",
  brandingSaved: "Company name saved.",
  brandingLogoSaved: "Logo updated.",
  brandingLogoRemoved: "Logo removed.",
  brandingNeverUpdated: "Not saved yet (defaults apply).",
  tourismSeasonCardTitle: "Tourism season — closed register",
  tourismSeasonCardDesc:
    "When the transaction date is not inside an open tourism window: allow income (IN) and other flows here. If the branch has no tourism season rows at all, expenses stay blocked regardless of these toggles.",
  tourismSeasonCardLink: "Edit closed-season policy",
  tourismSeasonPageTitle: "Tourism season closed — register policy",
  tourismSeasonPageDescription:
    "When season rows exist but the date is closed/outside the window, these flows are blocked unless enabled. If there is no open period at all for that date (missing season data), expenses and non-income register flows are always rejected; only register income (IN) can follow the switches on this page.",
  tourismSeasonSectionFlows: "Allowed when season is closed",
  tourismSeasonSectionFlowsHint:
    "Turn on only the flows you want to permit without an open tourism season window for that date.",
  tourismSeasonAllowRegisterIncome: "Branch register — income (IN)",
  tourismSeasonAllowRegisterIncomeDesc: "Cash sales and other income lines on the branch screen.",
  tourismSeasonAllowPersonnelExpense: "Branch register — personnel expense (OUT_PERSONNEL)",
  tourismSeasonAllowPersonnelExpenseDesc: "Personnel-linked expenses posted from the branch register.",
  tourismSeasonAllowPocketRepay: "Branch register — pocket / repay (cep)",
  tourismSeasonAllowPocketRepayDesc: "Pocket repay and related OUT lines classified for register pocket flow.",
  tourismSeasonAllowOtherExpense: "Branch register — other expenses",
  tourismSeasonAllowOtherExpenseDesc:
    "All other OUT register lines, including operasyon faturası settlement (OPS_INVOICE) on the branch.",
  tourismSeasonAllowAdvanceBranchCash: "Advances — branch cash source",
  tourismSeasonAllowAdvanceBranchCashDesc: "Creating or updating advances that write to the branch register (branch-cash source).",
  tourismSeasonAllowSupplierPost: "Supplier invoice — post branch share",
  tourismSeasonAllowSupplierPostDesc: "Posting saved branch allocations from a central supplier invoice line.",
  tourismSeasonAllowGeneralOverhead: "General overhead — allocate pool to branches",
  tourismSeasonAllowGeneralOverheadDesc: "Creating branch OUT lines when distributing an OPEN overhead pool.",
  tourismSeasonAllowVehicleExpense: "Fleet — vehicle expense posted to branch",
  tourismSeasonAllowVehicleExpenseDesc: "Vehicle expenses linked to a branch register transaction.",
  tourismSeasonSaved: "Tourism season closed policy saved.",
  tourismSeasonLastSaved: "Last saved:",
  tourismSeasonNeverUpdated: "No changes saved yet (defaults: all off).",
  tourismSeasonDefaultsNote:
    "Leaving everything off matches the original behavior: closed season blocks the listed flows with TOURISM_SEASON_CLOSED_FOR_REGISTER.",
  tourismSeasonWarningsTitle: "Review this combination",
  tourismSeasonWarnPocketWithoutPersonnel:
    "Pocket / repay is allowed while personnel register expenses are blocked. Those flows usually belong together; staff may hit errors or inconsistent cash handling.",
  tourismSeasonWarnAdvanceWithoutPersonnel:
    "Branch-cash advances are allowed while personnel register expenses are blocked. Advances are tied to personnel—closing one side but not the other is often inconsistent.",
  tourismSeasonWarnIndirectOutWithoutOther:
    "Supplier branch posting, general overhead allocation, or vehicle-to-branch expenses are allowed while “other register expenses” is blocked. All of them still create branch OUT lines; mixed rules can confuse operators and reports.",
  tourismSeasonWarnExpensesWithoutIncome:
    "Income on the branch register is blocked while some outflows are still allowed. During a closed season that can skew branch cash picture (expenses without matching income path).",
  tourismSeasonWarnAllEnabled:
    "Every toggle is on: a closed tourism season no longer blocks these paths. Only use if you intentionally want full register freedom off-season.",
} as const;
