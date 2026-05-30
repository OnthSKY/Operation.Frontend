/** Labels for permission matrix grouping and “where this applies” hints (English). */
export const permissionMeta = {
  groupTitle_system: "System",
  groupTitle_operations: "Operations (broad)",
  groupTitle_warehouse: "Warehouse & driver",
  groupTitle_ui: "UI — menu / modules",
  groupTitle_branch: "Branch data & actions",
  groupTitle_personnel: "Personnel data & HR",
  groupTitle_shipment: "Shipments (driver)",
  groupTitle_other: "Other",

  prefixHint_system: "Administration, accounts, and this settings matrix.",
  prefixHint_operations: "Cross-cutting operational API access (often paired with UI flags).",
  prefixHint_warehouse: "Warehouse screens, stock movements, transfers, aggregates.",
  prefixHint_ui: "Whether the item appears in the sidebar and module home routes.",
  prefixHint_branch: "Branch register, cash, stock on branch, and related APIs.",
  prefixHint_personnel: "Personnel cards, lists, payroll-related views and edits.",
  prefixHint_shipment: "Assigned shipment lines and completion flows.",
  prefixHint_other: "Uncategorized permission; see code and server description.",

  screen_system_admin: "Users & admin: /admin/users, /admin/settings/authorization",
  screen_operations_staff: "Broad staff APIs (branches, personnel, warehouse writes) behind many screens",
  screen_warehouse_driver: "Driver flows: shipments and warehouse read paths",

  screen_ui_dashboard: "Menu: Dashboard — /",
  screen_ui_reports: "Menu: Reports (stock, cash position, branch comparison, patron flow) — /reports",
  screen_ui_reports_financial: "Menu: Financial analysis hub — /reports/financial and related APIs",
  screen_ui_daily_branch_register: "Menu: Daily branch register views",
  screen_ui_branch_day_clerk: "Menu: Branch day clerk — assigned branches, today-only register + delegated advances",
  screen_ui_personnel: "Menu: Personnel — /personnel",
  screen_ui_my_advances: "Menu: My advances / pocket (self-service)",
  screen_ui_branches: "Menu: Branches — /branches",
  screen_ui_general_overhead: "Menu: General overhead — /general-overhead",
  screen_ui_insurances: "Menu: Insurances — /insurance-track (or related)",
  screen_ui_warehouse: "Menu: Warehouses — /warehouse",
  screen_ui_products: "Menu: Products — /products",
  screen_ui_suppliers: "Menu: Suppliers — /suppliers",
  screen_ui_vehicles: "Menu: Vehicles — /vehicles",
  screen_ui_import: "Menu: Data import (when enabled in your build)",

  screen_branch_transactions_today_only: "Branch register: limit edits to “today only” for this user",
  screen_branch_operations_write: "Branch register: add or change cash / income / expense lines",
  screen_branch_stock_write: "Branch: stock and transfer actions from branch UI",
  screen_branch_all_data_view: "Branch detail: full financial / HR / stock visibility",
  screen_branch_delete_or_reverse: "Branch: delete, reverse, or reopen register records",
  screen_branch_cross_branch_view: "Branches: list multiple branches; absence = restricted to assigned branch",
  screen_branch_financials_view: "Branch summaries: see cash / income / expense totals",

  screen_advances_delegated_branch:
    "Advances: list delegate targets and create register-cash advances for scoped personnel (day clerk)",

  screen_personnel_self_financials_view: "Personnel: own advances / pocket summaries",
  screen_personnel_branch_summary_view: "Personnel: list & summary for a branch",
  screen_personnel_branch_all_data_view: "Personnel: detailed HR/finance for people in a branch",
  screen_personnel_all_data_view: "Personnel: company-wide detailed records",
  screen_personnel_write: "Personnel: create or edit personnel cards",
  screen_personnel_payroll_write: "Personnel: payroll parameters and payouts",

  screen_warehouse_movement_write: "Warehouse: create in/out movements",
  screen_warehouse_delete_or_reverse: "Warehouse: delete or reverse movement records (separate from write)",
  screen_warehouse_transfer_write: "Warehouse: transfers to branches",
  screen_warehouse_all_data_view: "Warehouse: costing and full movement detail",
  screen_warehouse_inbound_view: "Warehouse: inbound (IN) movement views",
  screen_warehouse_outbound_view: "Warehouse: outbound (OUT) movement views",
  screen_warehouse_aggregates_view: "Warehouse: totals, on-hand grid, summaries",
  screen_warehouse_cross_user_view: "Warehouse: see other users' records; absence = own records only (driver)",

  screen_shipment_own_view: "Shipments: see assignments for this user",
  screen_shipment_own_write: "Shipments: complete own assigned lines",
  screen_shipment_start: "Shipments: start flow (submit draft to approval)",

  // Risk 2 — master data write codes
  screen_branch_master_write: "Branches: create / update / delete branch master records",
  screen_products_write: "Products: create / update / delete products, categories, cost history",
  screen_suppliers_write: "Suppliers: write supplier cards, invoices, payments, photos",
  screen_vehicles_write: "Vehicles: write vehicles, insurance, expenses, maintenance",
  screen_advances_write: "Personnel advances: create / update / delete (non-delegated)",
  screen_outbound_invoices_write: "Sales invoices: create, post, receipts, customer accounts",
  screen_insurances_write: "Insurance tracking: create / update / delete branch + vehicle insurance",

  desc_system_admin: "User accounts, roles, and the authorization matrix — administration screens and edits.",
  desc_admin_users_permission_overrides:
    "On the Users screen, edit per-login permission rows (extra ALLOW / explicit DENY overrides).",
  desc_admin_users_data_scopes:
    "On the Users screen, edit per-login branch, warehouse, and personnel data scopes (which rows they can see).",
  desc_operations_staff:
    "Broad operational API and write access across branches, personnel, warehouse, and reports (used behind many screens).",
  desc_warehouse_driver: "Driver-only flows: warehouse read paths and branch shipment actions.",
  desc_ui_dashboard: "Show the dashboard overview and reminders; access the home route.",
  desc_ui_reports:
    "Expose operational report routes from the menu (stock, cash position, branch comparison, patron flow — not the P&L-style financial hub).",
  desc_ui_reports_financial:
    "Income/expense KPIs, trends, tables, and financial summary exports: `/reports/financial` and related report APIs.",
  desc_ui_daily_branch_register: "Expose daily branch register / register views from the menu.",
  desc_ui_branch_day_clerk:
    "Limited branch workspace for assigned branches: today-only register lines and delegated advances — not the full Branches module.",
  desc_ui_personnel: "Expose personnel records and payroll-related UI from the menu.",
  desc_ui_my_advances: "Expose self-service advances and pocket summaries from the menu.",
  desc_ui_branches: "Expose branch cards, register, and branch-side stock actions from the menu.",
  desc_ui_general_overhead: "Expose central overhead pools and allocations management.",
  desc_ui_insurances: "Expose vehicle and branch insurance tracking from the menu.",
  desc_ui_warehouse: "Expose warehouses, stock movements, and transfers from the menu.",
  desc_ui_products: "Expose products and categories management from the menu.",
  desc_ui_suppliers: "Expose suppliers and invoices from the menu.",
  desc_ui_vehicles: "Expose fleet, maintenance, and vehicle expenses from the menu.",
  desc_ui_import: "Expose bulk data import (when enabled in your build).",
  desc_branch_transactions_today_only:
    "For this user, branch register transactions are limited to the current day only (no edits to past days).",
  desc_branch_operations_write: "Add or change branch cash, income, and expense lines.",
  desc_branch_stock_write: "Perform branch-side stock actions and transfers to warehouse.",
  desc_branch_all_data_view: "View full financial, HR, and stock detail on a branch.",
  desc_branch_delete_or_reverse: "Delete, reverse, or reopen branch register records.",
  desc_branch_cross_branch_view:
    "List multiple branches and operate across branch screens; without this the user is scoped to their assigned PersonnelBranchId (PERSONNEL behaviour).",
  desc_branch_financials_view:
    "See cash, income, and expense totals on branch summary screens; absence hides financial figures (HideFinancialTotals).",
  desc_advances_delegated_branch:
    "List ADVANCE_DELEGATE_TARGET personnel for a branch and create register-cash advances for them; personnel advance history is limited to rows this user created.",
  desc_personnel_self_financials_view: "View own advances and expenses attributed to the user.",
  desc_personnel_branch_summary_view: "View personnel list and summary for a branch.",
  desc_personnel_branch_all_data_view: "View detailed HR/finance data for people in a branch.",
  desc_personnel_all_data_view: "View company-wide detailed personnel records.",
  desc_personnel_write: "Create or update personnel cards.",
  desc_personnel_payroll_write: "Write payroll parameters and payout records.",
  desc_warehouse_movement_write: "Create and update warehouse inbound/outbound movement records.",
  desc_warehouse_delete_or_reverse:
    "Soft-delete or reverse warehouse movement records; separate from write so drivers can register movements but not delete them (fraud surface reduction).",
  desc_warehouse_transfer_write: "Create and manage warehouse-to-branch transfer records.",
  desc_warehouse_all_data_view: "View detailed warehouse costing and full movement history.",
  desc_warehouse_inbound_view: "View inbound (IN) warehouse movements and related screens.",
  desc_warehouse_outbound_view: "View outbound (OUT) warehouse movements and related screens.",
  desc_warehouse_aggregates_view: "View movement totals, on-hand grid, and warehouse rollups.",
  desc_warehouse_cross_user_view:
    "See warehouse movements and transfers created by other users; without this the user is scoped to their own records (DRIVER behaviour).",
  desc_shipment_own_view: "View shipment lines assigned to this user.",
  desc_shipment_own_write: "Complete assigned shipment lines (driver signing flow).",
  desc_shipment_start:
    "Allows starting shipment workflow from draft to approval (for branch manager/master users).",

  // Risk 2 — master data write codes
  desc_branch_master_write:
    "Create, update, and soft-delete branch master records. Separate from branch operations (cash / income / expense write).",
  desc_products_write:
    "Create, update, and soft-delete products, categories, and product cost history records.",
  desc_suppliers_write:
    "Write supplier cards, supplier invoices and payments, and invoice photos. Invoice flows that cascade to warehouse use system-internal methods (no extra permission needed).",
  desc_vehicles_write:
    "Write vehicle records and their related insurance, expense, and maintenance entries.",
  desc_advances_write:
    "Write personnel advances directly (non-delegated path). Delegated branch advances use a separate code.",
  desc_outbound_invoices_write:
    "Create and post sales invoices, manage receipts, link shipments, and write customer account records.",
  desc_insurances_write:
    "Write branch and vehicle insurance tracking records (policy, dates, amounts).",

  roleVsUserMatrixIntro:
    "This page sets the default permission bundle for each role. It is the baseline for every user with that role.",
  roleVsUserOverrideIntro:
    "On Users → Permission overrides, you only change one login: ALLOW adds a permission on top of their role; DENY blocks it even if the role has it. Empty / INHERIT means “use the role matrix here.” Data scopes (branch / warehouse / personnel) are edited separately and limit which rows they see.",
} as const;
