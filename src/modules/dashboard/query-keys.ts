import type { DashboardBulkCashParams } from "@/modules/dashboard/types/dashboard-cash-filter";

export const dashboardSummaryKeys = {
  all: ["dashboard", "daily-summary"] as const,
  today: (date: string) => [...dashboardSummaryKeys.all, date] as const,
  bulk: (params: DashboardBulkCashParams) =>
    params.kind === "day"
      ? ([...dashboardSummaryKeys.all, "bulk", "day", params.date] as const)
      : params.kind === "season_single"
        ? ([
            ...dashboardSummaryKeys.all,
            "bulk",
            "season_single",
            String(params.seasonYear),
          ] as const)
        : params.kind === "season_range"
          ? ([
              ...dashboardSummaryKeys.all,
              "bulk",
              "season_range",
              String(params.fromYear),
              String(params.toYear),
            ] as const)
          : ([...dashboardSummaryKeys.all, "bulk", "all_data"] as const),
};

export const dashboardOverviewKeys = {
  /** v2: operations.warehouseStock — bump when overview shape changes (cache bust). */
  all: ["dashboard", "overview", "v2"] as const,
};
