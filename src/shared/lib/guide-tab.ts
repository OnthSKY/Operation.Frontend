/** `/guide?tab=` ile eşleşen sekme kimlikleri — `guide/page.tsx` ile aynı küme */
export const GUIDE_TABS = [
  "mission",
  "nav",
  "dashboard",
  "flows",
  "reports",
  "personnel",
  "branch",
  "warehouse",
  "suppliers",
  "vehicles",
  "products",
  "admin",
  "tips",
  "portal",
] as const;

export type GuideTabId = (typeof GUIDE_TABS)[number];

export function parseGuideTabQuery(raw: string | null): GuideTabId | null {
  if (!raw || !raw.trim()) return null;
  const v = raw.trim();
  return (GUIDE_TABS as readonly string[]).includes(v) ? (v as GuideTabId) : null;
}
