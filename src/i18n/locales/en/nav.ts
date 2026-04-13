export const nav = {
  home: "Overview",
  reports: "Reports",
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
  adminNavTourismSeasonPolicy: "Tourism season expense policy",
  branchSection: "Branch",
  inventorySection: "Warehouse & products",
  procurementSection: "Procurement",
  fleetSection: "Fleet",
  insuranceSection: "Insurance & coverage",
  branch: "Branch management",
  generalOverhead: "General overhead",
  warehouse: "Warehouse",
  products: "Products",
  productCategories: "Categories",
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
  tooltip: {
    guide:
      "Module purpose, daily tips, and the Mission tab map how cash and stock tracking fits together.",
    home:
      "Today’s income, expense, and net cash plus the branches daily grid—a snapshot of patron/branch cash activity. Use Reports for category and period breakdowns.",
    reports:
      "Financial periods (income/expense lines and category concentration), cash position, branch comparison, warehouse/branch stock. Answers “where money came from and went” and “which branch burns stock”.",
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
    adminNavTourismSeasonPolicy:
      "Which branch-register flows may run when the tourism season is closed for the transaction date.",
    systemUsers:
      "Create and list accounts; assign roles (admin, staff, branch portal, driver).",
    myFinances:
      "When enabled by an admin, view your own advances and expenses attributed to you.",
  },
} as const;
