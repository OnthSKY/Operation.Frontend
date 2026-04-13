/** Genel bakış / Kasa sekmesi toplu kasa verisi. */
export type DashboardBulkCashParams =
  | { kind: "day"; date: string }
  | { kind: "season_single"; seasonYear: number }
  | { kind: "season_range"; fromYear: number; toYear: number }
  | { kind: "all_data" };

export type DashboardCashFilterMode =
  | "day"
  | "season_single"
  | "season_range"
  | "all_data";
