export const reports = {
  title: "Reports",
  subtitle:
    "Finance, cash, and stock live on separate menu entries or full pages. Use (i) for the short map; filters and summary are below.",
  tabOneLinerFinancial:
    "Branch register: operating income, operating expense, and net (same KPI rules as the financial summary).",
  tabOneLinerCash: "Estimated cash per branch and net register debts to staff / owner.",
  tabOneLinerStock: "Warehouse movement and stock received at branches.",
  patronStoryBoxTitle: "In this tab â€” read in this order (4 steps)",
  patronStoryInfoAria: "Reading order for this report â€” help",
  patronStoryFin1:
    "Start with NET in the selected currency: green is healthy, red needs attention.",
  patronStoryFin2:
    "Alerts and the worst/best branch callouts tell you where to focus first.",
  patronStoryFin3:
    "Charts show the trend; use â€œTablesâ€ when you need every line item.",
  patronStoryCash1:
    "First column: estimated cash in the drawer â€” how much is physically there?",
  patronStoryCash2:
    "Next columns: net register debts to staff pocket and to you (owner).",
  patronStoryCash3:
    "The bottom total row is the rollup; scan branch rows to see who stands out.",
  patronStoryStock1:
    "Read the short narrative first: busiest site, strongest lane, top SKU and branch.",
  patronStoryStock2:
    "Charts: green = into warehouse, orange = out; branch bars answer â€œwho received the mostâ€.",
  patronStoryStock3:
    "Use the â€œTablesâ€ tab to search, sort, and inspect quantities.",
  patronStoryFin4:
    "â€œIncomeâ€ here is operating income: owner cash placed into the drawer and internal register hand-over INs are excluded so totals match P&L-style reporting. Salary and advances show as separate totals; for per-person detail go to Personnel â€º Costs or the full-page financial tables. Expenses not paid from the drawer appear under payment source or in the Patron flow report.",
  patronStoryCash4:
    "This tab is a single-date snapshot of drawer cash and register debts â€” not a period P&L; use the Financial tab for income/expense trends.",
  patronStoryStock4:
    "For current on-hand stock by warehouse, use Warehouses; this screen is movement in the selected date range.",
  patronHubGuideEyebrow: "Guide for owners",
  patronHubGuideTitle: "What this page shows â€” and what it does not",
  patronHubGuideOpenHint: "Tap to collapse.",
  patronHubGuideClosedHint:
    "Open to see where cash, owner-paid flows, warehouse, and people costs live in the app.",
  patronHubGuideIntroFinancial:
    "This tab summarizes operating income and operating expenses on branch registers for the dates you pick (internal routing INs excluded; debt-closure OUTs excluded from expense KPIs), with charts. Day-to-day register lines are under Branches; per-person payroll and advances under Personnel costs.",
  patronHubGuideIntroCash:
    "This tab shows estimated drawer cash per branch and net register debts to staff pocket / you as of one date. For period income/expense trends, use the Financial tab.",
  patronHubGuideIntroStock:
    "This tab summarizes warehouse in/out and quantities received at branches in the range you select. For current on-hand stock by warehouse, use Warehouses.",
  patronHubGuideFlowTitle: "Suggested order on this screen",
  patronHubGuideFlow1Financial:
    "Set the period dates and branch filter at the top; open advanced financial filters if you need them.",
  patronHubGuideFlow2Financial:
    "The purple box below walks you through which KPIs and charts to read first in this tab.",
  patronHubGuideFlow3Financial:
    "If the summary is not enough, switch to â€œSummary / Tablesâ€ or use the full-page links at the bottom.",
  patronHubGuideFlow1Cash: "Set the as-of date and scope (open season only, etc.) at the top.",
  patronHubGuideFlow2Cash:
    "The purple box explains how to read drawer, staff-pocket, and owner lines in order.",
  patronHubGuideFlow3Cash:
    "Use the branch table below for rows; open the full-page cash table when you need a wider list.",
  patronHubGuideFlow1Stock: "Set the period dates and warehouse / branch filters at the top.",
  patronHubGuideFlow2Stock:
    "The purple box explains how to read the short narrative and charts in order.",
  patronHubGuideFlow3Stock:
    "For quantity detail, use â€œTablesâ€ or the full-page stock report.",
  patronHubGuideThisTabTitle: "Which question this tab answers",
  patronHubGuideTabFinancial:
    "Operating income and expense KPIs for the dates you pick, with branch and category splits (same rules as financial tables). Charts may ignore extra filters (currency, etc.) â€” read the yellow note when it appears.",
  patronHubGuideTabCash:
    "Estimated drawer cash and net register debts to staff pocket / you as of one date â€” not a period profit/loss view.",
  patronHubGuideTabStock:
    "Warehouse in/out and quantities received at branches in the range; for live stock levels use Warehouses.",
  patronHubGuideElsewhereTitle: "Common next steps â€” leave this box",
  patronHubGuideLinkBranchesLabel: "Branches",
  patronHubGuideLinkBranchesDesc:
    "Todayâ€™s register â€” line-by-line income and expense for daily operations.",
  patronHubGuideLinkPersonnelLabel: "Personnel costs",
  patronHubGuideLinkPersonnelDesc:
    "Payroll, advances, and related personnel spend by person and period.",
  patronHubGuideLinkWarehousesLabel: "Warehouses",
  patronHubGuideLinkWarehousesDesc: "Stock and transfers by site â€” whatâ€™s on hand.",
  patronHubGuideLinkPatronFlowLabel: "Owner pocket outflows (full page)",
  patronHubGuideLinkPatronFlowDesc:
    "Owner cash in plus owner-paid expenses in one filtered list.",
  patronHubGuideLinkBranchCompareLabel: "Branch comparison (full page)",
  patronHubGuideLinkBranchCompareDesc:
    "Side-by-side branches for the same period: operating income, operating expense, net.",
  patronHubGuideLinkFinancialHubLabel: "Financial summary (hub)",
  patronHubGuideLinkFinancialHubDesc:
    "Operating income, operating expense, and net for the selected period (KPI scope).",
  patronHubGuideLinkCashTablesLabel: "Cash table (full page)",
  patronHubGuideLinkCashTablesDesc:
    "Sortable table and export using the same cash-position rules.",
  patronHubGuideLinkBranchesStockDesc:
    "Branch inbound is summarized here; use Branches for day-to-day register lines.",
  patronHubGuideLinkStockTablesLabel: "Stock tables (full page)",
  patronHubGuideLinkStockTablesDesc:
    "Search and sort by product and warehouse when you need line-level quantities.",
  patronHubGuideFooterFinancial:
    "Terms: â€œOut from registerâ€ is cash leaving the drawer. Owner-paid and staff-pocket payments are tracked separately â€” use payment source in reports or Patron flow to tell them apart.",
  patronHubGuideFooterCash:
    "Cash position is a snapshot for one date; net debts are derived from register records â€” not a period P&L.",
  patronHubGuideFooterStock:
    "Figures here are movements in the selected range; for live inventory levels, use Warehouses.",
  cashPatronTotalsEyebrow: "Headline totals",
  cashPatronMaxDrawer: "Highest drawer cash: {{name}}",
  cashSnapshotPanelTitle: "Cash snapshot",
  cashSnapshotPanelHint:
    "As of your report date and scope: drawer cash, register cash marked with staff, net staff-pocket debt, and net owner position.",
  cashSnapshotMoreHint:
    "Row-level movements: use Branches or the table below; filters above change what is included.",
  cashSnapshotBadgeDrawer: "1 Â· Drawer",
  cashSnapshotBadgePocket: "2 Â· Staff pocket",
  cashSnapshotBadgePatron: "3 Â· Owner",
  cashSnapshotBadgeHeldPersonnel: "4 Â· With staff",
  cashSnapshotDescDrawer: "Estimated physical cash in the register drawer (included branches).",
  cashSnapshotDescPocket: "Net register â†” staff pocket (positive means the register owes the pocket).",
  cashSnapshotDescPatron: "Net register â†” owner (positive means the register owes the owner).",
  cashSnapshotDescHeldPersonnel:
    "Income cash recorded as handed to branch staff (register settlement: branch manager), cumulative through the report date.",
  cashPersonnelHeldBreakdownToggle: "Who holds it (by branch)",
  cashPersonnelHeldUnknownPerson: "Unnamed / not linked",
  cashDrawerWhyShort:
    "Drawer cash is cumulative IN cash minus REGISTER-paid OUT through the report date (same rules as the branch register). A branch can be negative when register-settled cash expenses exceed cash-side income up to that day.",
  cashPatronWhyShort:
    "Owner debt here is the registerâ€™s cumulative net â†” owner from posted lines (owner-paid expenses, owner cash-in, registerâ†’owner repayments, etc.) plus any outstanding patron advances for the branch through the report date.",
  cashDrawerBreakdownToggle: "By branch (drawer)",
  cashPatronBreakdownToggle: "By branch (owner debt)",
  cashPocketBreakdownToggle: "By branch (pocket debt)",
  cashAsOfCumulativeExplain:
    "All figures are cumulative through {{date}} (inclusive). This screen does not isolate one â€œproblemâ€ day â€” it sums every posted register movement up to that date. Branch links open Branches on the Dashboard tab with the register day set to {{date}} (same rules as here); use Income and Expenses with that day to see line detail, or Patron flow for owner-side lines across a period.",
  cashBreakdownOpenBranchHint:
    "Tap a branch: opens Dashboard with register day set to this report date; Income and Expenses lists are pre-filtered to that same day.",
  cashPatronFlowScreenLink: "Patron flow",
  cashPatronFlowScreenHint:
    "Filter a date range for owner cash-in, owner-paid expenses, and register repayments (not the same as this single-date snapshot).",
  tabHint: "Financial: cash & branches. Stock: warehouse & inbound to branches.",
  tabCashPosition: "Cash summary",
  tabHintCash:
    "Estimated physical cash in each branch drawer plus net register debts to staff pocket / owner (same rules as branch register summary).",
  cashPeriodHelp: "As-of date: register movements through this day (inclusive).",
  cashAsOfDate: "As-of date",
  cashOpenSeasonOnly: "Only branches with tourism season open (active branches first)",
  cashOpenSeasonOnlyShort: "open season only",
  cashAllBranchesShort: "all branches",
  cashPositionSectionTitle: "By branch",
  cashPositionLead: "Date & scope:",
  cashPositionEmpty:
    "No branches match. Uncheck â€œOnly branches with tourism season openâ€ to include every branch.",
  cashColDrawer: "Est. cash (drawer)",
  cashColHeldPersonnel: "Register cash with staff",
  cashColPocketDebt: "Net staff pocket debt",
  cashColPatronDebt: "Net owner debt",
  cashTotalsRow: "Total",
  hubFilterEffectsTitle: "Where your selections apply",
  hubFilterEffectsScopeLeadCash:
    "This is not a period P&L: it is an as-of snapshot of estimated drawer cash and register debts for the report date; summary and tables share the same date and scope.",
  hubFilterEffectsScopeLeadStock:
    "There is no separate â€œfiltered vs cumulativeâ€ split here: charts and tables both use the same date range plus warehouse / branch / product scope filters.",
  hubFilterEffectsCash1:
    "Summary callouts and the top block: as-of date and branch scope (open season only vs all branches).",
  hubFilterEffectsCash2: "â€œTablesâ€ tab: branch rows for the same date and scope.",
  hubFilterEffectsStock1:
    "Charts and the period narrative: selected date range plus warehouse, branch, and product scope filters.",
  hubFilterEffectsStock2: "â€œTablesâ€ tab: line detail with the same filters.",
  filtersSectionTitle: "Period & filters",
  finAdvancedFilters: "More financial filters",
  finAdvancedFiltersHint:
    "Currency, direction (in/out), category, and expense payment source â€” tables and KPI cards use the full filter set. When a currency is selected, charts in this drawer use that currency too; otherwise TRY or the first available currency. â€œMonthly trendsâ€ and â€œbranch â€” net by monthâ€ use only dates (and branch where applicable); other extra filters do not apply there.",
  finFilterAny: "Any",
  finFilterCurrency: "Currency",
  finFilterDirection: "Direction",
  finDirectionAll: "Income & expense",
  finDirectionIn: "IN only (operating-income scope)",
  finDirectionOut: "Expense only (OUT)",
  finFilterMainCategory: "Main category",
  finFilterCategory: "Subcategory",
  finFilterExpenseSource: "Expense payment source",
  finExpenseAll: "All sources",
  finFilterOptionsError: "Could not load filter lists; you can still type or pick values.",
  finChartsScopeNote:
    "Reminder: Monthly cumulative uses only dates + branch. Summary, Compare, Charts, and Tables use every filter in the drawer.",
  finChartsScopeNoteTrend:
    "You still have extra filters selected in the drawer â€” they do not change these charts. They remain in effect when you return to Summary, Compare, Charts, or Tables.",
  finChartsPageScopeReminder:
    "You are on the right tab for filter-heavy visuals. Monthly cumulative is only for calendar-month series (dates + branch).",
  finScopeStripAria: "How financial data is scoped",
  finScopeStripCumulativeAria: "Cumulative charts â€” monthly trend and branch-by-season view",
  finScopeStripTitle: "Data scope",
  finScopeStripBranch: "Branch filter",
  finScopeBucketFilter: "By filters",
  finScopeBucketYear: "Cumulative year (monthly trend)",
  finScopeBucketSeason: "Cumulative season (branches, by month)",
  finScopeBucketFilterBody:
    "KPI cards, pie and branch bars, expense payment mix, and every row on the Tables tab: computed with the selected date range, branch, and extra financial filters (currency, direction, category, payment source). When a currency filter is set, charts in this drawer use that currency too.",
  finScopeBucketYearBody:
    "â€œMonthly trendsâ€ chart: date range + branch only. Currency, category, and expense payment source filters are not applied to this chart.",
  finScopeBucketSeasonBody:
    "â€œBranch â€” net by monthâ€ chart: date range only, all branches. Branch selection and extra financial filters are not applied to this chart.",
  finScopeBucketSeasonHiddenWhenBranch:
    "This chart is hidden while a single branch is selected (it is meant for the all-branches view).",
  finScopeTablesFilterBody:
    "Every table on this page uses the selected dates, branch, and extra financial filters.",
  finScopeTablesYearBody:
    "The prior-period delta (Î”) on By branch and the currency net comparison use the immediately preceding window of the same length as your selection; the same filters apply to both windows.",
  finScopeTablesSeasonBody:
    "Calendar-year / season-year quick picks only adjust the period endpoints; tables always reflect transactions inside the selected window.",
  stockOptionalFilters: "Optional: warehouse, branch, product",
  stockOptionalFiltersOpen: "Narrow by warehouse, branch, or product scope.",
  stockScopeFiltersTitle: "Warehouse, branch, categories & products",
  fullPageReportsTitle: "Full-page tables",
  fullPageReportsLead:
    "Separate pages for many rows, search, and sort â€” the summary is often enough.",
  updatingHint: "Updatingâ€¦",
  stepPeriod: "1 Â· Period",
  stepRead: "2 Â· Summary & charts",
  stepReadStock: "2 Â· Stock â€” what happened?",
  stepTables: "3 Â· Tables (optional)",
  periodHelp: "Narrow the window and filters here.",
  stockProductScopeHint:
    "Subcategories are listed first (Parent â€º Child). Pick a subcategory for a narrow report, or a top-level category to include every product in its subcategories. Optional: main product group or one SKU (variants included).",
  detailTablesFin: "Show financial tables",
  detailTablesStock: "Show stock tables",
  reportViewSummary: "Summary",
  reportViewTables: "Tables",
  reportViewSummaryPatron: "Summary (start here)",
  reportViewTablesPatron: "Tables (detail)",
  reportViewSwitchAria: "Switch between summary and tables",
  reportTypePickerAria: "Report type: financial, cash, or stock",
  chartLegendHint:
    "Bars: green = healthier net, red = watch. Right pair = change vs previous period.",
  stockChartsSectionTitle: "Charts",
  stockChartsHint:
    "Horizontal bars read left-to-right. Green = into warehouse, orange = out (stacked per site). Branch chart = inbound qty sorted high â†’ low.",
  stockChartWarehouseDesc:
    "IN and OUT are separate segments; stacked length is total movement at that warehouse.",
  stockChartBranchDesc:
    "Branches ordered by total stock received this period; longer bar = more inbound qty.",
  stockSummaryTitle: "Stock in this period",
  stockSummaryPeriodLine: "Selected range: {{period}}",
  stockSummaryLead:
    "Numbers first, then a short read: busiest warehouse, strongest warehouseâ†’branch lane, top outbound SKU.",
  stockSummaryEmpty:
    "No warehouse or branch inbound activity for these dates/filters. Widen the range or clear filters.",
  stockSummaryNoWarehouseRows:
    "No warehouse rows in this window; branch figures below come from branch stock receipts.",
  stockKpiIn: "Into warehouse",
  stockKpiOut: "Out of warehouse",
  stockKpiNet: "Net (IN âˆ’ OUT)",
  stockKpiMovements: "Movement rows",
  stockSecWarehouses: "Warehouses",
  stockSecLanes: "Warehouse to branch",
  stockSecProducts: "Top outbound product",
  stockSecBranches: "Inbound to branches",
  stockSentenceBusiest:
    "Busiest warehouse: {{name}} â€” combined IN+OUT is {{qty}} units.",
  stockSentenceMostOut:
    "Most stock left from {{name}}: {{qty}} units (transfers, etc.).",
  stockSentenceTopLane:
    "Strongest tracked lane: {{wh}} â†’ {{br}}, {{qty}} units total ({{lines}} receipt lines).",
  stockSentenceTopProduct:
    "Top SKU on warehouse OUT: {{prod}} at {{wh}}, {{qty}} units.",
  stockSentenceTopBranch:
    "Largest branch inbound: {{name}}, {{qty}} units (all sources).",
  stockNotesTitle: "Heads-up",
  stockNoteNoWarehouseLink:
    "No warehouseâ†’branch lanes: older branch receipts may not record which warehouse they came from.",
  stockNotePartialWarehouseLink:
    "Some warehouse OUT volume is not tied to branch rows that include a warehouse link.",
  stockStoryUnknownProduct: "(unnamed product)",
  stockQtyUnitFallback: "pcs",
  stockQtyUnitGeneric: "units",
  stockStoryLinesAbbr: "lines",
  sectionWarehouseToBranch: "Warehouse â†’ branch (tracked)",
  sectionTopOutboundProducts: "Top outbound products (warehouse OUT)",
  colRouteLines: "Receipt lines",
  chipNegativeNet: "Negative net in a currency",
  chipTopExpense: "Top expense driver: {{cat}} (~{{pct}}%)",
  tabFinancial: "Financial",
  tabStock: "Stock summary",
  dateFrom: "From",
  dateTo: "To",
  allBranches: "All branches",
  allWarehouses: "All warehouses",
  apply: "Refresh",
  loading: "Loading reportâ€¦",
  error: "Report failed to load.",
  hubQuickFilterSeasonYear: "Quick filters:",
  presetThisMonth: "This month",
  presetLast30: "Last 30 days",
  presetLast7: "Last 7 days",
  seasonYearQuickPick: "Quick: Season year",
  seasonYearPickPlaceholder: "â€” pick season year â€”",
  seasonYearOption: "Full season year {year}",
  seasonYearHint:
    "Selects the full calendar year (1 Janâ€“31 Dec) and locks it; preset range buttons are disabled then. Use â€œedit dates manuallyâ€ below to change From/To. On this hub, the Cash tab as-of date is set to 31 Dec of that year.",
  dateRangeUnlockManual: "Edit start/end dates manually",
  cashFilterPeriodModeLabel: "Report date",
  cashFilterModeCalendarYearEnd: "Calendar year (31 Dec)",
  cashFilterModeCustomAsOf: "Custom date",
  cashFilterPeriodModeHint:
    "Calendar year: year-end cash snapshot. Custom date: any day; the year list is not used in that mode.",
  cashCalendarYearQuickPick: "Quick: calendar year",
  cashAsOfSeasonYearQuickPick: "Quick: year-end snapshot",
  cashAsOfSeasonYearOption: "As of 31 Dec {year}",
  cashAsOfSeasonYearHint:
    "Sets the as-of date to 31 December for the selected year. Use the date field for any other day.",
  cashAsOfSeasonYearCrossTabHint:
    "On this hub, the Financial and Stock tabsâ€™ From/To range is also set to the same calendar year (1 Janâ€“31 Dec).",
  sectionTotals: "Totals by currency",
  sectionTotalsFinancialKpiNote:
    "Income = operating income (excludes owner cash-in to the register and internal register hand-over INs). Expense = operating outflows (personnel pocket repayments and owner debt repayments from the register are excluded). Matches the financial summary and branch comparison.",
  sectionByBranch: "By branch",
  sectionByCategory: "By category (top lines)",
  sectionAdvances: "Advances in period",
  sectionSupplierPayments: "Supplier payments (period)",
  sectionGeneralOverheadAllocated: "General overhead allocated to branches (period)",
  colOverheadPoolTitle: "Pool",
  colOverheadPoolDate: "Pool date",
  sectionVehicleExpensesOffRegister: "Vehicle expenses (not on branch register)",
  vehicleOffRegisterHint:
    "Recorded in Vehicles only â€” no branch register OUT yet. Shown when all branches are selected.",
  vehicleOffRegisterHiddenWhenBranch:
    "Pick â€œAll branchesâ€ above to include fleet expenses that are not yet posted to a branch register.",
  headquartersBranch: "Head office (off-register)",
  colSupplierRegisterPaid: "Supplier paid from drawer",
  colSupplierPaySource: "Payment source",
  supplierPaySourceCash: "Branch cash",
  supplierPaySourceBank: "Bank",
  supplierPaySourcePatron: "Owner / off-books",
  sectionWarehousePeriod: "Warehouse movements (period)",
  sectionProductFlow: "Top product flows",
  sectionBranchReceipts: "Branch receipts (inbound qty)",
  colCurrency: "Currency",
  colIncome: "Income",
  colExpense: "Expense",
  colNet: "Net",
  colInCount: "Operating income lines",
  colOutCount: "Expense items",
  colBranch: "Branch",
  colType: "Type",
  colMainCat: "Main",
  colCategory: "Category",
  colAmount: "Amount",
  colLines: "Lines",
  colAdvAmount: "Advance total",
  colAdvCount: "Records",
  colWarehouse: "Warehouse",
  colQtyIn: "Qty IN",
  colQtyOut: "Qty OUT",
  colNetQty: "Net qty",
  colMovements: "Movements",
  colProduct: "Product",
  colTurnover: "Turnover",
  colReceiptQty: "Received qty",
  colReceiptLines: "Lines",
  insightsTitle: "Process notes",
  insightNegativeNet:
    "Negative net cash for at least one currency â€” review expenses and advances.",
  insightTopExpense:
    "Largest expense category: {{cat}} (~{{pct}}% of expense total in this report).",
  insightTopReceipt:
    "Highest inbound branch: {{name}} ({{qty}} total qty).",
  empty: "No rows for this filter.",
  linkBranchTx: "Open branch â†’ transactions",
  storyTitle: "Summary",
  storyDesc:
    "Prior-period comparison uses the same-length window before your range, for the selected currency.",
  finStoryPageLead:
    "Summary for the filtered period. Use the sub-tabs for prior-period comparison, mix charts, monthly cumulative view, or tables.",
  finStoryComparePageLead:
    "Prior-window net, payment mix, and branch callouts (same filters as Summary).",
  finIncomeKpiPos: "POS (card)",
  finIncomeKpiCash: "Cash",
  finIncomeKpiPctOfIncome: "{{pct}}% of income",
  finIncomeKpiPctOfCash: "{{pct}}% of cash",
  finIncomeKpiCashDrawer: "In drawer (register)",
  finIncomeKpiCashPatron: "With owner",
  finIncomeKpiCashPersonnel: "With staff",
  finIncomeKpiCashOther: "Cash (unset split)",
  finIncomeKpiBreakdownMissing:
    "No POS/cash split in this response. Update the financial API and refresh; the breakdown appears under the Income card.",
  finExpenseKpiPctOfExpense: "{{pct}}% of expense",
  finExpenseKpiByBranch: "By branch (top)",
  finExpenseKpiBreakdownMissing:
    "No expense payment-source split in this response. Update the financial API and refresh; it appears under the Expense card.",
  finSummaryKpiSupplierRegister: "Supplier (register cash)",
  finSummaryKpiAdvances: "Advances given",
  finSummaryKpiOverhead: "General overhead allocated",
  finSummaryKpiVehicleOffReg: "Vehicle (off register)",
  finSummaryKpiRowMetaRecords: "{{n}} records",
  finSummaryKpiRowMetaLines: "{{n}} lines",
  finStoryScopeBadgeFilter: "By filters",
  finStoryScopeBadgeCumulative: "Cumulative",
  finStoryScopeBadgeDistribution: "Mix",
  finStoryScopeBadgeRanking: "Branch ranking",
  finStoryFilterSectionTitle: "Net & branch signals",
  finStoryFilterSectionDesc:
    "Currency, direction, category, and payment source included â€” prior-window comparison and payment mix live here.",
  finStoryCumulativeSectionTitle: "Monthly & branch lines",
  finStoryCumulativeSectionDesc:
    "Date range only (and for branch-by-month: all-branches view). Extra financial filters are not applied to these charts.",
  finStoryDistributionSectionTitle: "Income, expense & category mix",
  finStoryDistributionSectionDesc:
    "Every financial filter you selected applies to these charts.",
  finStoryRankingSectionTitle: "Branch net and change vs prior period",
  finStoryRankingSectionDesc:
    "Bars ranked for this filtered window; scroll horizontally on small screens to see every branch.",
  storyDeckHint:
    "Cards left to right: net â†’ prior window â†’ expense payment mix; below that branch counts and highlights.",
  storyDeckHintSummary:
    "Comparison, payment mix, and branch signals use the same filters; category charts follow at the end.",
  storyDeckHintCharts:
    "Bars are ranked for this window; pies reflect every financial filter you set.",
  storyDeckHintCompare:
    "Scroll on small screens for full payment mix; branch counts summarize who moved vs the prior window.",
  storyCardNetEyebrow: "Headline",
  storyCardNetTitle: "Net",
  storyCardCompareTitle: "Vs prior period",
  storyCardCompareWindow: "{{from}} â€“ {{to}}",
  storyCardComparePrevLabel: "Prior net",
  storyCardCompareCurrentLabel: "Current net",
  storyCardCompareDiffLabel: "Difference",
  storyCardCompareDeltaLabel: "Net change",
  storyCardCompareTrend: "Trend: {{dir}}",
  storyCardPayMixTitle: "Expenses â€” payment source",
  storyCardPayMixCaption: "Register / patron / pocket (operational OUT).",
  storyCardBranchTrendTitle: "Branches",
  storyCardBranchTrendCaption: "Net change vs the prior window",
  storyCardBranchUpLabel: "Improved",
  storyCardBranchDownLabel: "Worsened",
  storyCardBranchFlatLabel: "Flat",
  storyCardWorstTitle: "Steepest drop",
  storyCardBestTitle: "Strongest gain",
  storyDetailsShow: "Payment mix, branches & highlights â€” show",
  storyDetailsHide: "Hide extra summary cards",
  storyOpenBranchLink: "Open branch â†’ transactions",
  storyNetPeriod: "Net ({{ccy}}): {{net}}.",
  storyVsPrevious:
    "vs {{prevFrom}}â€“{{prevTo}}: previous net was {{prevNet}}; change {{delta}} ({{dir}}).",
  storyDirBetter: "improving",
  storyDirWorse: "worsening",
  storyDirFlat: "flat",
  storyBranchTrendCounts:
    "{{up}} branch(es) improved net, {{down}} worsened, {{flat}} flat ({{ccy}} vs prior window).",
  storyWorstBranch: "Steepest drop: {{name}} (Î” {{delta}}).",
  storyBestBranch: "Strongest gain: {{name}} (Î” {{delta}}).",
  storyExpensePayMix:
    "Operational expenses ({{ccy}}) by payment source: {{parts}}.",
  expensePayStoryFragment: "{{label}} ~{{pct}}% ({{amt}})",
  expensePayStoryJoiner: " Â· ",
  expensePayTagAmount: "~{{pct}}% Â· {{amt}}",
  expensePayLineCountAbbr: "lines",
  sectionExpensePayment: "Expenses â€” payment source",
  sectionExpensePaymentDesc:
    "Register, patron, or employee pocket as recorded on OUT lines (non-PnL memos excluded).",
  colExpensePayTag: "Source",
  chartExpensePayBlockTitle: "Payment source snapshot",
  chartExpensePayHint:
    "Green: branch register Â· violet: patron Â· amber: employee pocket Â· gray: source not set.",
  compareCaption: "Prior window",
  financialEmptyTitle: "No movements for this period and filters",
  financialEmptyBody:
    "As you post branch income or expenses, period summaries and charts appear here. Try widening the date range or clearing the branch filter.",
  financialEmptyCtaBranch: "Branches â†’ post transactions",
  financialEmptyCtaGuide: "Guide: workflows",
  stockEmptyHint:
    "No warehouse or branch stock movement in this window. Widen dates, clear filters, or record warehouse in/out first.",
  stockEmptyCtaWarehouse: "Warehouses â†’ record movement",
  chartIncomeVsExpense: "Income vs expense",
  chartExpenseMix: "Expense mix by category",
  chartExpenseMixCaption: "How it was paid, then by category",
  chartBranchNet: "Branch net â€” this period",
  chartBranchDelta: "Branch net change vs prior period",
  chartIncome: "Income",
  chartExpense: "Expense",
  chartOther: "Other",
  chartWarehouseMix: "Warehouse IN vs OUT",
  chartBranchInboundMix: "Inbound qty by branch (ranked)",
  sectionStockCharts: "Mix",
  sectionCharts: "Charts",
  sectionMonthlyTrends: "1 Â· Month-by-month totals",
  sectionBranchMonthly: "2 Â· Branches across months",
  chartMonthlyTrendCaption:
    "Horizontal axis = calendar months inside your date range. Red = operating expense; green = net cash (register view, after salary & advances where applicable).",
  chartMonthlyExpenseNet: "Monthly expense & net",
  chartMonthlyExpense: "Operating expense",
  chartMonthlyNet: "Net cash",
  chartBranchMonthlyNet: "Monthly net by branch",
  chartBranchMonthlyHint:
    "Shown only when all branches are selected. Each line = one branchâ€™s net for that month; branches are the busiest ones so the legend stays readable.",
  chartMonthlyBarsNote:
    "Few months: net and expense are shown as grouped bars; pick a longer range to see a line trend.",
  chartBranchSingleMonthBarsNote:
    "Single month in range: each branchâ€™s net for that month as a horizontal bar; lines are used when multiple months are available.",
  colDeltaPrior: "Î” vs prior",
  finance: {
    direction: {
      in: "Operating income (IN)",
      out: "Expense",
    },
  },
  financialSummary: {
    kpi: {
      totalIncomeThisPeriod: "Operating income (this period)",
      totalExpenseThisPeriod: "Total operating expense (this period)",
      totalSalaryPaidThisPeriod: "Total salary paid (this period)",
      totalAdvanceGivenThisPeriod: "Total advances given (this period)",
      totalSupplierPaymentsThisPeriod: "Total supplier payments (this period)",
      totalSupplierRegisterCashThisPeriod: "Supplier paid from branch cash (this period)",
      totalVehicleExpenseOffRegisterThisPeriod:
        "Vehicle expense (off register, this period)",
      netCashThisPeriod: "Net cash (this period)",
    },
  },
  insight: {
    financialSummary: {
      noActivity: "No financial movements in this window.",
      netNegative: "Net cash is negative by {{amount}} {{currency}}.",
      netPositive: "Net cash is positive: {{amount}} {{currency}}.",
      personnelOutflowHigh:
        "Salary plus advances are {{percent}}% of income ({{currency}}) â€” watch personnel cash pressure.",
    },
  },
  export: {
    financial: {
      totalIncome: "Operating income",
      totalExpenseOperational: "Operating expense (excl. salary/advance OUT)",
      totalSalaryPaid: "Salary paid",
      totalAdvanceGiven: "Advances given",
      totalSupplierPayments: "Supplier payments (all sources)",
      totalSupplierRegisterCashPaid: "Supplier paid from branch cash",
      totalVehicleExpenseOffRegister: "Vehicle expense (off register)",
      netCash: "Net cash",
    },
  },
  tablesHubTitle: "Detailed tables",
  tablesHubLead:
    "Each block has its own search and sort â€” useful on mobile and for large exports.",
  tablesHubCollapsedHint:
    "Full-page table views: financial, stock, cash position, branch comparison, patron flow.",
  navFinancialTables: "Financial Â· tables",
  navStockTables: "Stock â€” full tables",
  navCashReport: "Cash â€” full table",
  navPatronFlow: "From my pocket â€” where it went",
  navBranchComparison: "Branches side by side",
  navBackToReportsHub: "All reports",
  sidebarFinances: "Period finance",
  sidebarOrderAccountStatement: "Order / account statement",
  sidebarCounterpartySummary: "Who received what summary",
  hubOpenCashFullTable: "Full cash table (sort & export)",
  hubOpenStockFullTables: "Stock â€” full tables page",
  finReportsLayoutTitle: "Financial reports",
  finToolbarPreviewEyebrow: "Selected period",
  finReportsLayoutSubtitle:
    "Summary Â· vs prior Â· Charts Â· Monthly cumulative Â· Tables â€” top tabs; shared filter drawer.",
  finNavSummary: "Period summary",
  finNavCompare: "vs prior period",
  finNavCharts: "Charts & mix",
  finNavTrend: "Monthly cumulative",
  finNavTables: "Financial tables",
  finNavCashFlow: "Owner pocket & register",
  finSummaryPageLead:
    "Cards follow the period and extra filters in the drawer. Use the tabs above for signals and charts.",
  finChartsPageIntroEyebrow: "This tab in brief",
  finChartsPageIntroBody: `Pie and branch-bar charts use the same financial filters as the Summary tab (dates, branch, currency, direction, category, payment source, etc.).

Above: branch net balances for the selected period and change vs the prior comparison window.
Below: incomeâ€“expense pies and category / payment mix â€” the same filter scope.

For month-by-month lines without a category filter, go to the â€œMonthly cumulativeâ€ tab.`,
  finComparePageLead:
    "Net vs prior period; expense mix and branches.",
  finCompareCurrentPeriodLabel: "Selected period",
  finComparePriorPeriodLabel: "Prior period (comparison)",
  finComparePriorPeriodHint:
    "Net change cards compare against the prior window shown here.",
  finTrendPageIntroEyebrow: "This tab in brief",
  finTrendPageIntroBody: `Charts group register activity by calendar month between your start and end dates. Extra drawer filters are ignored so long-range and branch comparisons stay consistent.

X-axis = month, Y-axis = amount. Net is still income minus expense on the register. First chart: each month shows company-wide operating expense (red) and net cash (green). Second chart appears only when all branches are selected; each line is one branchâ€™s monthly net.

Currency, category, direction, and payment-source filters do not apply to these lines; use Summary or Charts for that lens.`,
  finReportsNavAria: "Financial report sections",
  tablesPageFinTitle: "Financial report â€” tables",
  tablesPageFinSubtitle:
    "Pick a table block from the left list (desktop) or top chips (mobile); each block has search/sort and shares the same financial filters from the drawer.",
  finTablesSubnavAria: "Financial tables â€” choose a block",
  finTablesTotalsPageIntroEyebrow: "This block in brief",
  finTablesTotalsPageIntroBody: `Per currency: operating income, operating expense, and net. The drawerâ€™s dates, branch, and financial filters (currency, direction, category, payment source, etc.) apply here too â€” same slice as Summary.

Income excludes owner cash-in and internal register hand-over INs; expense excludes pocket and owner-debt closure lines from the register â€” same KPI rules everywhere in financial reports.

Prior-period deltas (Î”) and branch comparisons are summarized on â€œBy branchâ€ and other sub-tabs; switch using the menu on the left.`,
  tablesPageStockTitle: "Stock report â€” tables",
  tablesPageStockSubtitle: "Warehouses, flows, and branch receipts â€” filter per section.",
  tablesPageCashTitle: "Cash position",
  tablesPageCashSubtitle: "Drawer cash and register debts by branch.",
  tablesPagePatronFlowTitle: "From my pocket â€” where it went",
  tablesPagePatronFlowSubtitle:
    "Owner-related lines written to the register: cash you inject, income cash tagged to you, register payouts to you, and expenses with payer = owner â€” full list with branch/date filters.",
  patronFlowScopeNote:
    "â€œPaid from your pocketâ€ here means OUT rows with expense payment source Owner (split into supplier / accounting / other flow types). Cash you put in and income share lines are separate. If a line is not tagged Owner (e.g. salary defaults to register), it will not appear as owner-pocket outflow â€” different from the financial summary.",
  patronPocketStoryTitle: "Owner pocket — summary",
  patronPocketStoryBucketIntro:
    "Outflows are grouped as: advances, payroll/personnel, branch (supplier, stock, operations), and general (accounting and other). See the detailed list below.",
  patronPocketStoryHeadlineOut:
    "In this period, {{amount}} {{currency}} left your pocket in total.",
  patronPocketStoryInOnly:
    "{{amount}} {{currency}} net toward you from the register (deposits + income tagged to you); no owner-pocket payments out in this slice.",
  patronPocketStoryCashInAlso: "Register inflows on your side (deposits + income share): {{amount}} {{currency}}.",
  patronPocketStoryWhere: "What it paid for (share of pocket outflows)",
  patronFlowOutDetailTitle: "Paid from your pocket — detail",
  patronFlowOutDetailLead:
    "Only lines paid from your pocket. Filter by group, search, sort — 25 rows per page.",
  patronFlowOutBucketAll: "All outflows",
  patronFlowOutBucketAdvance: "Advance (off register)",
  patronFlowOutBucketPersonnel: "Payroll / personnel",
  patronFlowOutBucketBranch: "Branch: supplier, stock, operations",
  patronFlowOutBucketGeneral: "General: accounting, legal, other",
  patronFlowOutBucketFilter: "Expense group",
  patronFlowColExpenseGroup: "Group",
  patronFlowOutPaging:
    "Page {{page}} / {{totalPages}} · {{shown}} rows on this page ({{total}} after filters)",
  patronFlowOutPrevPage: "Previous page",
  patronFlowOutNextPage: "Next page",
  patronFlowAllLinesSectionTitle: "All flow lines (register inflows included)",
  patronFlowUnifiedLinesTitle: "Movements",
  patronFlowViewBarAria: "Choose which list to show",
  patronFlowViewBarOpen: "Pocket outflows",
  patronFlowViewBarIntegrated: "All movements",
  patronFlowViewBarIntegratedCaption:
    "Register inflows, register payouts to you, and every flow type — search and sort below.",
  patronPocketStoryNoMovement: "No movements for this currency.",
  patronFlowLead:
    "Rows come from branch register lines: owner cash in, income with cash settlement to owner, register payouts to owner (debt repay / on-books reassignment to owner), owner-paid OUT (supplier-linked, OUT_TAX, other). POS tags from each branch profile.",
  patronFlowTotalsTitle: "Totals by flow type",
  patronFlowKindPatronCashIn: "Patron cash in",
  patronFlowKindRegisterIncomeToPatron: "Register income (owner cash share)",
  patronFlowKindRegisterPaidToPatron: "Register paid to owner (debt repayment)",
  patronFlowKindPocketClaimToPatron: "On-books reassignment â†’ owner",
  patronFlowStoryInflowBreakdown:
    "Split: owner cash deposit {{deposit}} Â· register income tagged to you {{incomeShare}} {{currency}}.",
  patronFlowStoryRegisterReturns:
    "From the register back to you (repayment / on-books reassignment to owner): {{amount}} {{currency}}.",
  patronFlowKindSupplierPaidByPatron: "Supplier (paid by patron)",
  patronFlowKindAccountingPaidByPatron: "Accounting / legal (paid by patron)",
  patronFlowKindOtherPaidByPatron: "Other (paid by patron)",
  patronFlowKindAdvanceFromPatron: "Advance (owner-funded, no register OUT)",
  patronFlowKindSalaryFromPatron: "Salary (owner source, legacy)",
  patronFlowEmpty: "No patron-flow movements in this period for the selected filters.",
  patronFlowEmptyWhy:
    "Nothing matched patron-flow rules: no owner cash-in, no income lines with cash settlement to owner, no registerâ†’owner repayments, and no owner-paid expenses in this window.",
  patronFlowEmptyTrendCta: "Company net cash by month â†’ Financial Â· Monthly cumulative",
  patronFlowLinesSectionTitle: "Line items",
  patronFlowColDate: "Date",
  patronFlowColKind: "Flow type",
  patronFlowColAmount: "Amount",
  patronFlowColCategory: "Category",
  patronFlowColPosTag: "POS settlement",
  patronFlowColDescription: "Description",
  patronFlowPosSectionTitle: "POS settlement profile (per branch)",
  patronFlowPosSectionLead:
    "Sets who card/POS takings accrue to in reporting. For franchise, joint venture, or other, the note must state the economic destination. Save updates the selected branch profile.",
  patronFlowBranchesMissingProfile:
    "{{count}} branch(es) have no profile yet; they still appear in the list â€” set a profile to label POS lines.",
  patronFlowProfileBranchLabel: "Branch",
  patronFlowBeneficiaryTypeLabel: "POS beneficiary",
  patronFlowPersonnelLabel: "Branch personnel (when beneficiary is personnel)",
  patronFlowNotesLabel: "Notes",
  patronFlowNotesPlaceholder: "Optional note for this branchâ€¦",
  patronFlowSaveProfile: "Save profile",
  patronFlowProfileSaved: "POS profile saved.",
  patronFlowSelectBranch: "Choose branchâ€¦",
  patronFlowPersonnelPlaceholder: "Choose personâ€¦",
  patronFlowBeneficiaryPatron: "Patron",
  patronFlowBeneficiaryFranchise: "Franchise",
  patronFlowBeneficiaryJoint: "Joint venture",
  patronFlowBeneficiaryBranchPersonnel: "Branch personnel",
  patronFlowBeneficiaryOther: "Other",
  patronFlowPickBranchFirst: "Choose a branch first.",
  patronFlowPersonnelRequired: "Pick branch personnel when beneficiary is personnel.",
  tablesPageBranchComparisonTitle: "Branch comparison â€” operating KPIs",
  tablesPageBranchComparisonSubtitle:
    "Operating income, operating expense, and net by branch and currency. Use the row chevron to open cash/card/owner-tagged income and expense-by-payment-source splits.",
  branchComparisonKpiScopeCallout:
    "Income and expense columns use the same KPI rules as the financial summary (internal routing INs excluded from income; pocket and owner-debt repayments from the register excluded from expense). Drawer cash on the Cash tab is a physical snapshot and can differ.",
  branchComparisonScopeNote:
    "Branch comparison uses the same operating-income and operating-expense definitions as the financial report for the selected date range â€” not raw â€œevery IN/OUTâ€ register turnover.",
  branchComparisonPeriodHelp:
    "Uses branch register transactions in the date range. Sort columns by clicking headers.",
  branchComparisonSortHint: "Click a column title to sort; click again to reverse.",
  branchComparisonSortHintMobile:
    "In card view the text on the left is the column name. Sort using the table headers on a wider screen or in landscape.",
  branchComparisonExpandShow: "Show income & expense breakdown",
  branchComparisonExpandHide: "Hide breakdown",
  branchComparisonDetailIncomeTitle: "Operating income â€” cash vs card",
  branchComparisonDetailExpenseTitle: "Expense â€” payment source",
  branchComparisonIncomeCash: "Cash (income)",
  branchComparisonIncomeCard: "Card / POS (income)",
  branchComparisonIncomeCashPatron: "Cash leg tagged to owner",
  branchComparisonEmpty: "No rows for this period and filters.",
  branchComparisonPageSize: "Rows per page",
  branchComparisonPaging: "Page {{page}} / {{totalPages}} Â· {{total}} rows total",
  branchComparisonPrev: "Previous",
  branchComparisonNext: "Next",
  sectionFilter: "Filter rows",
  sectionSearchPlaceholder: "Type to narrowâ€¦",
  sectionSortBy: "Sort by",
  sectionShowing: "{{shown}} / {{total}}",
  sectionNoSearchMatches: "No rows match this filter.",
  sortAsc: "Ascending",
  sortDesc: "Descending",
  sortAscAria: "Sort ascending",
  sortDescAria: "Sort descending",
  sortStateAsc: "Aâ†’Z / lowâ†’high",
  sortStateDesc: "Zâ†’A / highâ†’low",
  orderAccountStatementTitle: "Order & account statement (PDF)",
  orderAccountStatementSubtitle:
    "Fill in the form on the left; the preview on the right is what the PDF will look like.",
  orderAccountStatementHeaderCompany: "Header â€” company",
  orderAccountStatementHeaderBranch: "Subheader â€” branch / unit",
  orderAccountStatementEmblem: "Emblem (optional)",
  orderAccountStatementEmblemHelp: "Upload a logo image to show at top-left of the PDF header.",
  orderAccountStatementEmblemUseInstitutionImage: "Use institution image",
  orderAccountStatementEmblemFetching: "Fetching institution image...",
  orderAccountStatementEmblemFetchError: "Could not fetch institution image. Upload a system logo first and try again.",
  orderAccountStatementEmblemClear: "Remove emblem",
  orderAccountStatementDocTitle: "Document title",
  orderAccountStatementShowTagline: "Show the â€œOrder summary Â· Account statementâ€ line in the PDF",
  orderAccountStatementShowTaglineHelp: "When off, that subtitle is omitted from the document and the downloaded PDF.",
  orderAccountStatementLayoutTemplate: "PDF layout",
  orderAccountStatementLayoutCorporate: "Corporate (spacious)",
  orderAccountStatementLayoutCompact: "Compact (dense)",
  orderAccountStatementLayoutMinimal: "Minimal (flat, light chrome)",
  orderAccountStatementLayoutInvoiceClassic: "Classic Invoice",
  orderAccountStatementLayoutEInvoice: "E-Invoice",
  orderAccountStatementLayoutProforma: "Proforma",
  orderAccountStatementLayoutDispatch: "Dispatch Note",
  orderAccountStatementLayoutServiceForm: "Service Form",
  orderAccountStatementContentTemplate: "Sample content",
  orderAccountStatementContentCustom: "Custom (keep current data)",
  orderAccountStatementContentTekin: "Wholesale-style example",
  orderAccountStatementContentCafe: "CafÃ© / retail example",
  orderAccountStatementContentBakery: "Bakery example",
  orderAccountStatementContentCatering: "Catering / event example",
  orderAccountStatementPreviewTemplateHint:
    "Change layout or sample set here too; type in the box to filter options.",
  orderAccountStatementLinesTitle: "Line items",
  orderAccountStatementColProduct: "Description",
  orderAccountStatementColAmount: "Amount (â‚º)",
  orderAccountStatementColQty: "Qty",
  orderAccountStatementColQtyShort: "Qty",
  orderAccountStatementColQtyPlaceholder: "e.g. 12 or 3 cases",
  orderAccountStatementUnit: "Unit",
  orderAccountStatementUnitPlaceholder: "kg / case / pcs",
  orderAccountStatementShowQtyColumn: "Show qty, unit, and unit price in PDF",
  orderAccountStatementShowQtyColumnHelp:
    "When enabled, each line can include qty, unit, and unit price; they are shown as separate columns in PDF. If qty and unit price are entered, an automatic amount suggestion is calculated.",
  orderAccountStatementAmount: "Amount",
  orderAccountStatementAddLine: "Add line",
  orderAccountStatementRemove: "Remove",
  orderAccountStatementGift: "Gift",
  orderAccountStatementGiftSuffix: "Gift",
  orderAccountStatementPickProduct: "Fill description from product catalog",
  orderAccountStatementCatalogNone: "â€” pick a product â€”",
  orderAccountStatementSuggestedCostShort: "Suggested cost",
  orderAccountStatementCostIncVatShort: "Incl. VAT",
  orderAccountStatementCostSuggestionMissing: "No saved cost found for this product.",
  orderAccountStatementAdjustments: "Discounts & prepayment",
  orderAccountStatementPromoDiscount: "Gift / promotion deduction (subtracted from gross)",
  orderAccountStatementAdvance: "Prepayment (subtracted from gross)",
  orderAccountStatementPromoLine: "Gift / Promotion",
  orderAccountStatementAdvanceLine: "Prepayment",
  orderAccountStatementPaidOnBehalfTitle: "Paid by you, not received into stock",
  orderAccountStatementPaidOnBehalfHelp:
    "Example: supplier items you paid for that do not ship to you. These amounts are added after the subtotal.",
  orderAccountStatementAddPaidLine: "Add line in this group",
  orderAccountStatementGross: "LINE ITEMS TOTAL",
  orderAccountStatementSubtotal: "SUBTOTAL",
  orderAccountStatementNet: "NET DUE",
  orderAccountStatementPreviewTitle: "Preview (A4)",
  orderAccountStatementPreviewHint: "Single-page A4 PDF; long content is scaled down to fit.",
  orderAccountStatementOpenFullscreenPreview: "Preview & download",
  orderAccountStatementPreviewIntro:
    "Open the preview in a full-screen dialog to review the layout without scrolling the page; download the PDF from there.",
  orderAccountStatementPreviewEmpty: "No lines yet â€” add rows using the form above.",
  orderAccountStatementStepHead: "1 Â· Header",
  orderAccountStatementStepLines: "2 Â· Line items",
  orderAccountStatementLinesSectionExpand: "Expand line items",
  orderAccountStatementLinesSectionCollapse: "Collapse line items",
  orderAccountStatementStepPromoLines: "3 Â· Promotion & prepayment",
  orderAccountStatementStepExtraPaid: "4 Â· Paid by you, not received",
  orderAccountStatementLinePlaceholder: "e.g. 304 tub ice cream (1.216 kg)",
  orderAccountStatementAddPromoLine: "Add promotion line",
  orderAccountStatementGiftAutoHint:
    "Amounts on rows marked â€œGiftâ€ are subtracted from the gross automatically and shown as a separate line on the PDF.",
  orderAccountStatementPromoLinesHelp:
    "Add extra discounts or campaigns as lines (description + amount). Amounts reduce the gross; gift-marked product rows are also subtracted automatically.",
  orderAccountStatementPromoLinesEmpty: "No promotion lines yet â€” leave empty if there is no extra discount.",
  orderAccountStatementPromoLineDesc: "Promotion description",
  orderAccountStatementPromoLineAmount: "Amount (â‚º)",
  orderAccountStatementDocumentTagline: "Order summary Â· Account statement",
  orderAccountStatementIssuedPrefix: "Statement date",
  orderAccountStatementGiftTotalLine: "Gift product lines",
  orderAccountStatementPaidSectionPdf: "Externally sourced",
  orderAccountStatementPromoLineFallback: "Promotion",
  orderAccountStatementAdvanceShort: "Prepayment",
  orderAccountStatementPreviousBalanceShort: "Carried-forward account balance",
  orderAccountStatementPreviousBalanceLine: "CARRIED-FORWARD ACCOUNT BALANCE",
  orderAccountStatementPaidEmpty: "No rows in this group â€” use â€œAdd lineâ€ if needed.",
  orderAccountStatementColRow: "#",
  orderAccountStatementColActions: "Action",
  orderAccountStatementTableScrollHint:
    "On small screens each row is a card; from tablet width up, rows appear in a table.",
  orderAccountStatementCalcHint: "Suggested amount (optional)",
  orderAccountStatementPriceModeLabel: "How to calculate",
  orderAccountStatementPriceModePiece: "By piece (qty)",
  orderAccountStatementPriceModeKg: "By kilogram (kg)",
  orderAccountStatementCalcHintPiece: "Enter quantity and unit price (â‚º). Suggested total = qty Ã— unit price.",
  orderAccountStatementCalcHintKg: "Enter total kg and price per kg (â‚º/kg). Suggested total = kg Ã— (â‚º/kg).",
  orderAccountStatementQty: "Qty",
  orderAccountStatementUnitPrice: "Unit price (â‚º)",
  orderAccountStatementKg: "Kg",
  orderAccountStatementTryPerKg: "TRY / kg",
  orderAccountStatementSuggestedTotal: "Suggested total",
  orderAccountStatementApplySuggestion: "Apply to amount",
  orderAccountStatementPriceCalcToggleShow: "Show amount suggestion & calculator",
  orderAccountStatementPriceCalcToggleHide: "Hide amount suggestion",
  orderAccountStatementDownloadPdf: "Download PDF",
  orderAccountStatementSystemSaveToggle: "Also keep downloaded document in system",
  orderAccountStatementSystemSaveToggleHelp:
    "When enabled, the PDF is also uploaded as a branch document and appears in Documents/Branch detail.",
  orderAccountStatementInvoiceSaveToggle: "Also create invoice/ledger record",
  orderAccountStatementInvoiceSaveToggleHelp:
    "When enabled, this document is also saved as an outbound invoice with a document number.",
  orderAccountStatementInvoiceAutoPost: "Auto-post to account on save",
  orderAccountStatementInvoiceAutoPostHelp:
    "When disabled it stays draft and can be posted later manually.",
  orderAccountStatementCustomerAccountId: "External customer account id",
  orderAccountStatementCustomerAccountIdPlaceholder: "e.g. 1001",
  orderAccountStatementCustomerAccountIdHelp:
    "If a branch is selected, branch is used as counterparty; otherwise this customer account id is used.",
  orderAccountStatementPaymentIban: "IBAN (optional)",
  orderAccountStatementPaymentAccountHolder: "Account holder (optional)",
  orderAccountStatementPaymentBankName: "Bank name (optional)",
  orderAccountStatementPaymentNote: "Payment note (optional)",
  orderAccountStatementPaymentShowOnPdf: "Show payment info on PDF footer",
  orderAccountStatementInvoiceCounterpartyRequired:
    "Select a branch or provide external customer account id for invoice save.",
  orderAccountStatementInvoiceLinesRequired:
    "At least one valid line is required to save invoice.",
  orderAccountStatementInvoiceSaved: "Invoice record created.",
  orderAccountStatementLastInvoiceNo: "Last created document no",
  orderAccountStatementSuggestionsTitle: "Who received what (open balance hints)",
  orderAccountStatementSuggestionsOpenReport: "Open detailed report",
  orderAccountStatementSuggestionsEmpty: "No suggestion rows yet.",
  counterpartySummaryTitle: "Who received what - counterparty summary",
  counterpartySummarySubtitle: "Invoice, receipt, and open balance totals by counterparty for selected filters.",
  counterpartySummaryBackToStatement: "Back to order/account statement",
  counterpartySummaryType: "Counterparty type",
  counterpartySummaryTypeAll: "All",
  counterpartySummaryTypeBranch: "Branch",
  counterpartySummaryTypeCustomer: "Customer",
  counterpartySummaryCurrency: "Currency",
  counterpartySummarySearch: "Search counterparty / document",
  counterpartySummarySearchPlaceholder: "Counterparty name or document no",
  counterpartySummaryDateFrom: "Issue date from",
  counterpartySummaryDateTo: "Issue date to",
  counterpartySummaryOnlyOpen: "Only with open balance",
  counterpartySummaryRefresh: "Refresh",
  counterpartySummaryInvoicedTotal: "Total invoiced",
  counterpartySummaryPaidTotal: "Total paid",
  counterpartySummaryOpenTotal: "Total open balance",
  counterpartySummaryCounterpartyCount: "Counterparty count",
  counterpartySummaryInvoiceCount: "Invoice count",
  counterpartySummaryColName: "Counterparty",
  counterpartySummaryColType: "Type",
  counterpartySummaryColInvoiced: "Invoiced",
  counterpartySummaryColPaid: "Paid",
  counterpartySummaryColOpen: "Open balance",
  counterpartySummaryColLastInvoice: "Last invoice",
  counterpartySummaryEmpty: "No records for these filters.",
  orderAccountStatementSystemBranchLabel: "System branch mapping",
  orderAccountStatementSystemBranchHelp:
    "Choose which branch will own this document in the system.",
  orderAccountStatementSystemBranchNone: "Select branch...",
  orderAccountStatementSystemBranchRequired:
    "Select a branch to save this document in the system.",
  orderAccountStatementSystemSaved:
    "PDF downloaded and saved under the selected branch documents.",
  orderAccountStatementSystemNotePrefix: "Order-account statement PDF",
  orderAccountStatementGeneratingPdf: "Generatingâ€¦",
  orderAccountStatementPdfError: "Could not create the PDF. Refresh and try again.",
  orderAccountStatementFillSample: "Fill sample",
  orderAccountStatementFillSampleDetail:
    "Fills the form from the selected â€œSample contentâ€ option above: when custom is selected, it loads the default wholesale sample; other templates load their matching sample set.",
  orderAccountStatementReset: "Clear all",
  orderAccountStatementNoAccess: "You need reports access to open this page.",
} as const;
