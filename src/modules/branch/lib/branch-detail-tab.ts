export type BranchDetailTabId =
  | "dashboard"
  | "personnel"
  | "currentAccount"
  | "income"
  | "expenses"
  | "stock"
  | "tourismSeason"
  | "zReportAccounting"
  | "documents"
  | "notes";

const VALID: ReadonlySet<string> = new Set<BranchDetailTabId>([
  "dashboard",
  "personnel",
  "currentAccount",
  "income",
  "expenses",
  "stock",
  "tourismSeason",
  "zReportAccounting",
  "documents",
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
  "currentAccount",
  "tourismSeason",
  "zReportAccounting",
  "documents",
]);

/** Gün sonu kasiyeri: kasa sekmeleri; tam şube modülü yok. */
export const BRANCH_DAY_CLERK_HIDDEN_TABS: ReadonlySet<BranchDetailTabId> = new Set([
  "dashboard",
  "personnel",
  "currentAccount",
  "stock",
  "tourismSeason",
  "zReportAccounting",
  "documents",
]);

/** Şube değişiminde URL/`initialTab` ile varsayılan sekmeyi seçer (personel portalı kısıtları dahil). */
export function resolveBranchDetailTabOnBranchChange(
  initialTab: BranchDetailTabId | null | undefined,
  employeeSelfService: boolean,
  branchDayClerkMode = false
): BranchDetailTabId {
  if (employeeSelfService) {
    if (initialTab && !ESS_HIDDEN_TABS.has(initialTab)) return initialTab;
    return "income";
  }
  if (branchDayClerkMode) {
    if (initialTab && !BRANCH_DAY_CLERK_HIDDEN_TABS.has(initialTab)) return initialTab;
    return "expenses";
  }
  if (initialTab) return initialTab;
  return "dashboard";
}
