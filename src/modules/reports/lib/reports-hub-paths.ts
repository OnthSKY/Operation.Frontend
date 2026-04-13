export type ReportsHubTab = "financial" | "cash" | "stock";

export const REPORTS_HUB_PATH: Record<ReportsHubTab, string> = {
  financial: "/reports/financial",
  /** Hub “nakit pozisyonu”; tam sayfa kasa tablosu `/reports/cash` kalır */
  cash: "/reports/position",
  stock: "/reports/stock",
};
