export const branchStockConsumption = {
  subTabsAria: "Branch stock sub-tabs",
  subTabInbound: "Inbound",
  subTabConsumption: "Usage & remaining",
  subTabBalances: "Current stock",

  // Current stock (on-hand balances) panel
  balancesHeading: "Current stock on hand",
  balancesHint: "Quantities currently in the branch. Only products with a non-zero balance are listed.",
  balancesColUnit: "Unit",
  balancesColBalance: "Balance",
  balancesEmpty: "No products currently in stock.",
  balancesSearchEmpty: "No products match your search.",

  actionQuickConsume: "+ Quick usage",
  actionSnapshot: "Count remaining",
  actionAdjust: "Manual adjustment",

  filterDateFrom: "From",
  filterDateTo: "To",
  includeDeleted: "Show deleted",

  // Quick entry modal
  quickEntryTitle: "Record stock usage",
  adjustEntryTitle: "Manual stock adjustment",
  productLabel: "Product",
  productHint: "Search by product name; only leaf products can be picked.",
  searchPlaceholder: "Search product…",
  loadingProducts: "Loading products…",
  noMatches: "No matching products.",
  directionLabel: "Direction",
  directionOut: "− Decrease",
  directionIn: "+ Increase",
  quantityLabel: "Quantity",
  dateLabel: "Date",
  noteLabel: "Note (optional)",
  notePlaceholder: "Reason, batch, vehicle… max 500 chars",

  errorProductRequired: "Please choose a product.",
  errorQuantityInvalid: "Enter a positive quantity.",
  errorDateRequired: "Please choose a valid date.",
  errorNoSnapshotRows: "Add at least one product and enter a count value.",

  // Snapshot panel
  snapshotEntryTitle: "Count remaining stock",
  snapshotEntryHeading: "Add the products you are counting",
  snapshotEntryDescription:
    "Search and add products; for each one enter the current remaining quantity. The system writes the difference vs. the current balance.",
  snapshotRowsHeading: "Counted products",
  snapshotEmptyHint: "No products added yet — search above to start counting.",
  currentBalanceLabel: "Current",
  remainingPlaceholder: "Remaining",
  balanceShort: "Bal.",
  diffNoChange: "no change",
  saveSnapshot: "Save count",
  snapshotPartialFailure: "Some rows could not be saved.",
  snapshotResultSummary: "{written} row(s) saved, {noop} unchanged.",

  // History table
  colDate: "Date",
  colProduct: "Product",
  colType: "Type",
  colQuantity: "Quantity",
  colSnapshot: "Snapshot",
  colCreatedBy: "Recorded by",
  typeConsumption: "Usage",
  typeSnapshot: "Count",
  typeAdjustment: "Adjustment",
  historyEmpty: "No usage records in the selected range.",
  restore: "Restore",
  deletedAtBy: "Deleted by {name} on {date}",

  // Generic pagination text reused only here for now
  paginationPrevious: "Previous",
  paginationNext: "Next",
  paginationPageOf: "Page {page} / {total}",
  loadFailed: "Could not load.",
} as const;
