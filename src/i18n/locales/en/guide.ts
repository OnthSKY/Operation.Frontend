export const guide = {
  pageTitle: "How to use",
  pageLead:
    "Start with the Mission tab for how cash and stock tracking fits together, then open module tabs for detail. The (i) icons in the menu give short summaries.",
  tabsAria: "Guide — module tabs",
  whatsNewTitle: "Recent updates",
  tocShort: {
    mission: "Mission",
    nav: "Menu",
    dashboard: "Home",
    flows: "Workflows",
    reports: "Reports",
    personnel: "Staff",
    branch: "Branch",
    warehouse: "Warehouse",
    suppliers: "Suppliers",
    vehicles: "Vehicles",
    products: "Products",
    admin: "Users",
    tips: "Tips",
    portal: "My access",
  },
  roleNote:
    "Items in the left menu depend on your account permissions. Personnel accounts only see modules enabled for them.",
  mission: {
    title: "Mission: see patron cash, earnings, and stock in one place",
    whatsNew: "",
    p1:
      "The product goal is simple: track how much cash came from the patron into the system, what branches earned and spent, which categories concentrate money, and how warehouse shipments flow to branches over time.",
    p2:
      "Patron → till: branch transactions capture patron cash-in, debt/pocket repayments, and daily income/expense lines. That operational truth feeds the daily overview and financial reports.",
    p3:
      "“How much did we make?” is answered from branch income lines and the financial period report (income/expense breakdown). “Which categories are heavy?” comes from report groupings plus the categories chosen on branch transactions—read them together.",
    p4:
      "Stock and shipments: warehouses hold inbound/outbound and transfers to branches; stock and branch-stock reports show where consumption rises and when outbound spikes. Product records and categories keep those views grouped sensibly. Company vehicles (menu “Vehicles”) track fleet, assignments, insurance, and operating costs separately—they are not wired into branch cash or financial reports automatically.",
    p5:
      "Personnel: advances and non-advance expenses come together under Personnel costs, linking patron-to-staff cash with operational spend when those flows connect.",
    p6:
      "Suggested rhythm: post branch tickets through the day → validate the day on the home overview → review categories and cash position weekly/monthly in reports → cross-check stock spikes with warehouse movements and stock reports. The (i) icons in the menu summarize each module’s role in this mission.",
  },
  nav: {
    title: "Menu, search, and account",
    whatsNew:
      "Bell icon: operational reminders (e.g. day close and Z-report follow-ups). Account menu (top right): profile details, authenticator two-step sign-in (TOTP), and your activity history. On phones, the bottom dock and collapsible filters speed up common flows.",
    p1: "Use the left menu to open modules. On mobile, tap “Open menu” in the top bar first.",
    p2: "The top search box (and shortcut) jumps to pages and common actions quickly.",
    p3: "Top-right: language (TR / EN). Sign out is the button at the bottom of the sidebar.",
  },
  flows: {
    title: "Suggested workflows and shared terms",
    whatsNew: "",
    p1:
      "Daily: post branch transactions as they happen (income, out-from-register, and patron/pocket-paid expenses when applicable). Check the home overview totals at day end.",
    p2:
      "Weekly / monthly: under Reports → Financial pick the range; summary cards follow the selected currency only. “Vs prior period” and “Δ” compare to the previous window of the same length.",
    p3:
      "“Out from register” means the expense was paid from the branch drawer (REGISTER). Owner- or pocket-paid lines are not included—see branch detail for those nets.",
    p4:
      "“Held with register lead” cash is flagged on income lines; the overview shows currency totals and a per-person breakdown.",
    p5:
      "Stock: warehouse in/out and transfers populate stock reports; narrow filters can show an empty chart even when other data exists.",
    p6:
      "If something fails: check connectivity, use Retry, and read the error text.",
    p7:
      "Salary and advances: create the salary payment or advance record first; if you also post a personnel expense from the branch screen, link it to that record (amount and currency must match). Avoid posting the expense first and leaving the link empty. More detail: internal USER-FLOWS doc and technical ACCOUNTING-RULES-AND-FLOWS §7.1.",
    goHome: "Go to overview",
    goBranch: "Go to branches",
    goReports: "Go to reports",
  },
  dashboard: {
    title: "Overview (home)",
    whatsNew:
      "Branch summary supports compact metric panels and clearer filters; on small screens, filters can sit in a collapsible strip so the table stays readable.",
    p1: "Daily summary cards for income, expense, and net cash are here, together with the branches table.",
    p2: "Click a branch name in the table to focus it, or open “Branch management” from the menu.",
    go: "Go to overview",
  },
  reports: {
    title: "Reports",
    whatsNew: "",
    p1: "Financial period and stock reports live here. Narrow results with date / period filters.",
    p2: "Use detail rows to drill down by branch, warehouse, or product as available.",
    go: "Go to reports",
  },
  personnel: {
    title: "Personnel",
    whatsNew:
      "Personnel and advance flows align with updated branch money rules when pocket or settlement lines apply—use the on-screen pickers and hints when shown.",
    p1: "Under “Staff”, add or edit employees and open their detail.",
    p2: "To post an advance for one person, use the row action or the global-search advance shortcut.",
    p3: "“Personnel costs” lists advances and non-advance personnel expenses together; use tabs to narrow the view.",
    goList: "Go to staff list",
    goAdvances: "Go to personnel costs",
  },
  branch: {
    title: "Branch management",
    whatsNew:
      "New and clarified cash types: cash-in from patron, patron debt repayment, pocket repayment, pocket settlement lines, and operations expense with a cargo subtype. Some transactions allow clearer branch / linked-personnel handling; forms highlight required fields and receipt uploads when needed.",
    p1: "Pick a branch from the list; the detail sheet opens daily transactions, season/period info, and branch tabs.",
    p2: "New branch transactions (cash in/out, expenses, day close, etc.) are created from forms on that branch screen.",
    p3: "Some records ask for a receipt image—use the upload fields when shown.",
    go: "Go to branch management",
  },
  warehouse: {
    title: "Warehouse",
    whatsNew:
      "Stock and movement views were tightened for readability; use the warehouse detail tabs to move from summary to movement history.",
    p1: "Select a warehouse to see stock summary, movements, and operations tabs.",
    p2: "Inbound/outbound movements and transfers to branches are started from the warehouse detail sections.",
    go: "Go to warehouse",
  },
  suppliers: {
    title: "Suppliers & central purchase invoices",
    whatsNew:
      "Split an invoice line to branches: on lines not tied to stock, use “Split to branches” to save shares and create branch expenses (owner/patron-sourced; register cash does not move).",
    p1:
      "Open “Suppliers” from the menu: maintain vendor records, purchase invoices, and payments. This area tracks accounts payable (open balance) and when cash actually leaves.",
    p2:
      "New invoice: pick the supplier and enter lines. To tie a line to stock intake, enter the warehouse IN movement ID; those lines are stock-linked and cannot be split to branches.",
    p3:
      "For service-style lines (no warehouse link): open the invoice via “View”, then tap “Split to branches” on the line. Use “Split equally across all branches” or enter branch + amount rows manually.",
    p4:
      "“Save shares” stores a draft. The sum of shares must match the line total (shown in green/warning). Then pick the expense date and type and tap “Create branch expenses”; each branch gets an owner-funded expense line—register balance is unchanged, branch P&L reflects the cost.",
    p5:
      "Supplier payment: on an invoice with open balance, use “Pay” to record cash/bank/owner outflow. Payments live in the supplier module; splitting to branch expenses is a separate step.",
    go: "Go to suppliers",
  },
  vehicles: {
    title: "Company vehicles",
    whatsNew:
      "List and detail are readable for everyone; adding/editing vehicles, assignments, insurance, expenses, and the monthly summary require operations-staff permissions.",
    p1:
      "Open “Vehicles” from the menu. The table shows plate, brand/model, status (active / inactive / maintenance), current assignment, and an insurance badge: none, OK, renew soon (upcoming end date), or expired.",
    p2:
      "Assign a vehicle to either one person or one branch—not both. It can also stay unassigned. Every assignment change is recorded under the assignment history tab.",
    p3:
      "In detail, add insurance policies (e.g. traffic, comprehensive) and expenses (fuel, maintenance, insurance payment, repair, etc.). These records live in this module; they are not branch register lines or supplier invoices.",
    p4:
      "Use the “Monthly summary” tab for totals by year, month, vehicle, and branch. The branch filter uses the vehicle’s current branch assignment; expenses from months when the vehicle was under another branch may not match that filter.",
    go: "Go to vehicles",
  },
  products: {
    title: "Products",
    whatsNew: "",
    p1: "Browse the catalog, add or edit products. Product detail includes a movements tab for history.",
    go: "Go to products",
  },
  admin: {
    title: "System — users (admins)",
    whatsNew: "",
    p1: "Only admin accounts see this menu. Manage system users here.",
    go: "Go to users",
  },
  portal: {
    title: "Using a personnel account",
    whatsNew:
      "Same global shortcuts as full users where you have access: reminders bell (if visible), mobile dock, and account menu for security (TOTP) when enabled for your user.",
    p1: "Personnel portals only see modules allowed for your role (e.g. branch and personnel costs).",
    p2: "Track your advances from “Personnel costs” (Advances tab).",
    p3: "Use “Branch management” for branch tasks you are allowed to perform.",
    goBranch: "Go to branch management",
    goAdvances: "Go to personnel costs",
  },
  footer: {
    title: "Tips",
    whatsNew:
      "If a form rejects an image, reduce file size first. Validation messages are shown next to fields—read them before retrying.",
    p1: "Dates in tables use day.month.year order; the footer shows an example.",
    p2: "Fill required fields marked in red or labeled “Required”; read validation messages before submitting.",
    p3: "Large images may be rejected—watch the size warning on the form.",
  },
} as const;
