export const dashboardSummaryKeys = {
  all: ["dashboard", "daily-summary"] as const,
  today: (date: string) => [...dashboardSummaryKeys.all, date] as const,
};
