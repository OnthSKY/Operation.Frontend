import type { BranchDetailTabId } from "@/modules/branch/lib/branch-detail-tab";

export type BranchDetailDeepLinkOptions = {
  tab?: BranchDetailTabId | null;
  registerDay?: string | null;
};

export function buildBranchDetailHref(
  branchId: number,
  opts?: BranchDetailDeepLinkOptions
): string {
  const p = new URLSearchParams();
  p.set("openBranch", String(branchId));
  if (opts?.tab) p.set("branchTab", opts.tab);
  const day = opts?.registerDay?.trim();
  if (day) p.set("registerDay", day);
  return `/branches?${p.toString()}`;
}

/** Middle-click / modified clicks should keep default navigation (new tab, etc.). */
export function shouldUseDefaultLinkNavigation(e: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
}): boolean {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

/** Removes `openBranch`, `branchTab`, and `registerDay` from the current query string. */
export function stripBranchDetailSearchParams(
  pathname: string,
  qsString: string,
  replace: (href: string) => void
): void {
  const params = new URLSearchParams(qsString);
  if (!params.get("openBranch")?.trim()) return;
  params.delete("openBranch");
  params.delete("branchTab");
  params.delete("registerDay");
  const next = params.toString();
  replace(next ? `${pathname}?${next}` : pathname);
}
