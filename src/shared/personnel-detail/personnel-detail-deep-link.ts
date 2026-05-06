import type { PersonnelDetailTabId } from "@/modules/personnel/components/PersonnelDetailModal";

const PERSONNEL_DETAIL_TAB_PARAMS = new Set<string>([
  "profile",
  "managerSummary",
  "personnelCashPhysical",
  "insurance",
  "seasonArrivals",
  "costs",
  "yearClosures",
  "notes",
  "roles",
]);

export function parsePersonnelDetailTabParam(raw: string | null): PersonnelDetailTabId | null {
  if (!raw?.trim()) return null;
  const v = raw.trim();
  return PERSONNEL_DETAIL_TAB_PARAMS.has(v) ? (v as PersonnelDetailTabId) : null;
}

export type PersonnelDetailDeepLinkOptions = {
  tab?: PersonnelDetailTabId | null;
};

export function buildPersonnelDetailHref(
  personnelId: number,
  opts?: PersonnelDetailDeepLinkOptions
): string {
  const p = new URLSearchParams();
  p.set("openPersonnel", String(personnelId));
  if (opts?.tab) p.set("personnelTab", opts.tab);
  return `/personnel?${p.toString()}`;
}

export function stripPersonnelDetailSearchParams(
  pathname: string,
  qsString: string,
  replace: (href: string) => void
): void {
  const params = new URLSearchParams(qsString);
  if (!params.get("openPersonnel")?.trim()) return;
  params.delete("openPersonnel");
  params.delete("personnelTab");
  const next = params.toString();
  replace(next ? `${pathname}?${next}` : pathname);
}
