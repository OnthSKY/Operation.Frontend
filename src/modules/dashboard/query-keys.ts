export const dashboardSummaryKeys = {
  all: ["dashboard", "daily-summary"] as const,
  today: (date: string) => [...dashboardSummaryKeys.all, date] as const,
  bulk: (date: string) => [...dashboardSummaryKeys.all, "bulk", date] as const,
};

export const dashboardOverviewKeys = {
  /** v2: operations.warehouseStock — bump when overview shape changes (cache bust). */
  all: ["dashboard", "overview", "v2"] as const,
};
