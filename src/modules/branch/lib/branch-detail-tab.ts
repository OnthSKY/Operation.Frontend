export type BranchDetailTabId =
  | "dashboard"
  | "personnel"
  | "income"
  | "expenses"
  | "stock"
  | "tourismSeason"
  | "zReportAccounting"
  | "notes";

const VALID: ReadonlySet<string> = new Set<BranchDetailTabId>([
  "dashboard",
  "personnel",
  "income",
  "expenses",
  "stock",
  "tourismSeason",
  "zReportAccounting",
  "notes",
]);

export function parseBranchDetailTabParam(raw: string | null): BranchDetailTabId | null {
  if (!raw?.trim()) return null;
  const v = raw.trim();
  return VALID.has(v) ? (v as BranchDetailTabId) : null;
}

const ESS_HIDDEN_TABS: ReadonlySet<BranchDetailTabId> = new Set([
  "dashboard",
  "personnel",
  "tourismSeason",
  "zReportAccounting",
]);

/** Şube değişiminde URL/`initialTab` ile varsayılan sekmeyi seçer (personel portalı kısıtları dahil). */
export function resolveBranchDetailTabOnBranchChange(
  initialTab: BranchDetailTabId | null | undefined,
  employeeSelfService: boolean
): BranchDetailTabId {
  if (employeeSelfService) {
    if (initialTab && !ESS_HIDDEN_TABS.has(initialTab)) return initialTab;
    return "income";
  }
  if (initialTab) return initialTab;
  return "dashboard";
}
