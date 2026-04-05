export const dashboardSummaryKeys = {
  all: ["dashboard", "daily-summary"] as const,
  today: (date: string) => [...dashboardSummaryKeys.all, date] as const,
};

export const dashboardOverviewKeys = {
  all: ["dashboard", "overview"] as const,
};
