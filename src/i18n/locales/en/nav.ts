export const nav = {
  home: "Overview",
  reports: "Reports",
  /** Sidebar group for hub tabs */
  reportsSection: "Reports",
  expandReportsSection: "Expand reports",
  collapseReportsSection: "Collapse reports",
  expandReportSubgroup: "Show links",
  collapseReportSubgroup: "Hide links",
  reportsFinSection: "Financial reports",
  reportsFinSystemSection: "Finance & cash",
  reportsPatronSection: "Owner pocket & register",
  reportsStockSection: "Stock",
  reportsOtherSection: "Branches & register day",
  groupOverview: "Overview",
  groupFinanceReporting: "Finance & Reporting",
  groupOperations: "Operations",
  groupWarehouseProducts: "Warehouse & Products",
  groupPeopleOrganization: "People & Organization",
  groupDocumentsRecords: "Documents & Records",
  groupProcurement: "Supply & Procurement",
  groupSystemManagement: "System Management",
  personnel: "Personnel management",
  personnelSection: "Personnel management",
  personnelList: "Staff",
  personnelNonAdvanceExpenses: "All personnel expenses (excluding advances)",
  personnelAdvances: "All advances",
  personnelCosts: "Personnel costs",
  systemSection: "System administration",
  systemSectionSubtitle: "Users, access & org settings",
  systemSettings: "Settings",
  /** /admin/settings hub — kartların özeti */
  systemSettingsHome: "All settings",
  systemUsers: "Users",
  adminNavAuthorization: "Roles & permissions",
  adminNavNotifications: "Notifications",
  adminNavBranding: "Branding",
  adminNavTourismSeasonPolicy: "Tourism season expense policy",
  branchSection: "Branch",
  inventorySection: "Warehouse & products",
  procurementSection: "Procurement",
  fleetSection: "Fleet",
  insuranceSection: "Insurance & coverage",
  branch: "Branch management",
  documents: "Documents",
  dailyBranchRegister: "Register day (all branches)",
  generalOverhead: "General overhead",
  warehouse: "Warehouse",
  products: "Products",
  productCategories: "Categories",
  productCostHistory: "Product cost history",
  suppliers: "Suppliers",
  supplierInvoices: "Supplier invoices",
  vehicles: "Vehicles",
  insurances: "Insurances",
  guide: "How to use",
  myFinances: "My advances & expenses",
  myFinancesAdvances: "Your advances",
  myFinancesExpenses: "Expenses attributed to you",
  hintAria: "What this menu item is for",
  mainNav: "Main navigation",
  menuOpen: "Open menu",
  menuClose: "Close menu",
  dockMore: "Full menu",
  dockNav: "Quick navigation",
  dockFinanceShort: "Finance",
  dockPeopleShort: "People",
  dockWarehouseShort: "Depot",
  mobileGroupHintTitle: "Quick hint",
  mobileGroupHintBody: "Tap a group title to expand or collapse its links.",
  tooltip: {
    guide:
      "Module purpose, daily tips, and the Mission tab map how cash and stock tracking fits together.",
    home:
      "Today’s income, expense, and net cash plus the branches daily grid—a snapshot of patron/branch cash activity. Use Reports for category and period breakdowns.",
    reports:
      "Financial periods (income/expense lines and category concentration), cash position, branch comparison, warehouse/branch stock. Answers “where money came from and went” and “which branch burns stock”.",
    reportsFinOneEntry:
      "One sidebar entry: open the page and use the top tabs (summary, vs prior, charts, monthly, tables).",
    reportsHubFinancial:
      "Period charts and tables: income, expense, and net with branch and advanced filters.",
    reportsHubFinSummary:
      "Period-at-a-glance for your filters; open vs prior period for deltas or Charts for mix and branch bars.",
    reportsHubFinCompare:
      "Prior-period net change, payment mix, and branch highlights — same financial filters as the KPI tab.",
    reportsHubFinCharts:
      "Branch ranking bars and income/expense mix charts for the same filtered slice as the KPI tab.",
    reportsHubFinTrend:
      "Monthly cumulative: net and expense by month (and by branch when all branches are selected). Same date and filter drawer as the Summary tab.",
    reportsHubFinTables:
      "Full financial tables (categories, branches, advances). Own screen; filters are independent from Summary/Trend for now.",
    reportsHubFinCashFlow:
      "Owner-specific register lines (owner cash-in, owner-paid expenses). For overall net cash, use Financial · Monthly cumulative.",
    reportsHubCashTable:
      "Full-page cash position table: same balances as the hub snapshot, with sortable rows and export-friendly layout.",
    reportsHubStockTables:
      "Stock report tables: warehouse flows, branch receipts, and product-level lines with per-block filters.",
    reportsHubBranches:
      "Compare branches for a period: income, expense, and net side by side to spot outliers.",
    reportsHubCash:
      "Cash position by branch: drawer estimate and net pocket/patron balances for an as-of date.",
    reportsHubStock:
      "Stock summary charts and tables: warehouse scope, branch receipts, and product filters.",
    reportsHubDailyRegister:
      "Same calendar day, every branch: cash vs card/POS intake, register-paid outflows, and net — alongside period and position reports.",
    reportsOrderAccountStatement:
      "Order & account statement: line items, gifts and promotions, prepayment, items you paid for but did not receive into stock, and net due. A4 preview and PDF download.",
    personnelSection:
      "Staff master data and the patron–personnel money line: advances and personnel expenses live here.",
    personnelList:
      "Employee records and access. Entry point for single advances; combined cost view is under Personnel costs.",
    personnelCosts:
      "Advances and non-advance personnel expenses in one place. Use it to follow patron-to-staff cash alongside branch operations.",
    branchSection:
      "Operational cash: daily branch transactions. This is where on-the-ground income and spending are captured for the system.",
    branch:
      "Record cash in/out, patron-to-till transfers, sales income, expenses, and ops lines. Accurate daily posting underpins all financial reports.",
    documents:
      "See system-wide documents in one place; search and filter branch documents and personnel ID images.",
    dailyBranchRegister:
      "Same-day snapshot per branch: cash vs card intake, register-paid expenses, and net — without opening each branch card.",
    generalOverhead:
      "Company-wide shared expenses (tax, accounting, etc.) with optional branch allocation. Use supplier invoices for stock purchases; single-branch expenses belong on the branch screen.",
    inventorySection:
      "Central warehouse stock, transfers to branches, and product definitions. Physical movement plus report views complete the stock picture.",
    procurementSection:
      "Vendor master data, purchase invoices and payments; warehouse receipts and split-to-branches flow through invoices.",
    fleetSection:
      "Company vehicles: assignments and operating costs; enter policies on each vehicle card. Use Insurances below for the cross-cutting tracker.",
    insuranceSection:
      "Personnel SGK, branch policies, and vehicle insurance in one place—not fleet-only; monitor all three together.",
    warehouse:
      "Stock summary, inbound/outbound, and transfers to branches. Follow movement history for what went where and when; use stock reports for trends.",
    products:
      "Product master and movement hints. Read warehouse/branch stock reports together to see quantities by location.",
    productCategories:
      "Group products for cleaner lists and analysis under consistent headings.",
    productCostHistory:
      "Record product purchase/cost values by date with VAT-included and VAT-excluded amounts to track historical cost changes.",
    productsOrderAccountStatement:
      "Order & account statement: fill lines from the product catalog, amounts, gifts and promotions, prepayment, paid-but-not-received items, and net due. A4 preview and PDF.",
    suppliers:
      "Vendor master records and contacts; use Supplier invoices for purchase invoices and payments.",
    supplierInvoices:
      "Purchase invoices (payables), filters, new invoice intake, and payments; warehouse receipt lines or split-to-branches from here.",
    vehicles:
      "Company-owned vehicles: assignment to staff or branches, insurance renewals, and operating expenses.",
    insurances:
      "Track personnel SGK coverage, vehicle policies, and branch policies in one place—filter by branch, status, and upcoming expiry.",
    systemSection:
      "Administration: who can see and post what. Separation of accounts supports accountability.",
    systemSettingsHome:
      "Cards for users, role permissions, and organization notification defaults.",
    systemSettings:
      "Users, login roles, and the permission matrix—who can access which parts of the app.",
    adminNavAuthorization:
      "Edit which permissions each system role has (staff, driver, admin).",
    adminNavNotifications:
      "Organization-wide toggles for operational reminders and the daily toast.",
    adminNavBranding:
      "Company display name and sidebar logo shown to all signed-in users.",
    adminNavTourismSeasonPolicy:
      "Which branch-register flows may run when the tourism season is closed for the transaction date.",
    systemUsers:
      "Create and list accounts; assign roles (admin, staff, branch portal, driver).",
    myFinances:
      "When enabled by an admin, view your own advances and expenses attributed to you.",
  },
} as const;
