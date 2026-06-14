"use client";

import { cn } from "@/lib/cn";
import type { PersonnelDetailTabId } from "@/modules/personnel/components/PersonnelDetailModal";

/** Tab tanımı: id → i18n key. Sıra UI'da soldan sağa render edilir. */
const TAB_DEFS: ReadonlyArray<{
  id: PersonnelDetailTabId;
  labelKey: string;
}> = [
  { id: "profile", labelKey: "personnel.detailTabProfile" },
  { id: "managerSummary", labelKey: "personnel.detailTabManagerSummary" },
  {
    id: "personnelCashPhysical",
    labelKey: "personnel.detailTabPersonnelCashPhysical",
  },
  { id: "insurance", labelKey: "personnel.detailTabInsurance" },
  { id: "seasonArrivals", labelKey: "personnel.detailTabSeasonArrivals" },
  { id: "costs", labelKey: "personnel.detailTabCosts" },
  { id: "yearClosures", labelKey: "personnel.detailTabYearClosures" },
  { id: "salaryHistory", labelKey: "personnel.detailTabSalaryHistory" },
  { id: "notes", labelKey: "personnel.detailTabNotes" },
  { id: "roles", labelKey: "personnel.detailTabRoles" },
];

/**
 * Personel detayı sekme çubuğu. Sticky, yatay scroll'lu, klavye-erişilebilir.
 * Sadece sekme seçim sorumluluğu — içerik dispatcher modal'da.
 */
export function PersonnelDetailTabBar({
  tab,
  onTabChange,
  t,
}: {
  tab: PersonnelDetailTabId;
  onTabChange: (id: PersonnelDetailTabId) => void;
  t: (k: string) => string;
}) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className="sticky top-0 z-[1] -mx-4 mb-3 flex flex-nowrap gap-1 overflow-x-auto overscroll-x-contain border-b border-zinc-200 bg-white/95 px-4 py-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden backdrop-blur-sm supports-[backdrop-filter]:bg-white/80 sm:-mx-6 sm:px-6"
    >
      {TAB_DEFS.map(({ id, labelKey }) => {
        const label = t(labelKey);
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            title={label}
            className={cn(
              "min-h-11 shrink-0 whitespace-nowrap rounded-t-lg px-3 py-2 text-xs font-medium leading-tight transition-colors sm:min-w-[8rem] sm:text-sm",
              active
                ? "border-b-2 border-zinc-900 bg-zinc-50 text-zinc-900"
                : "border-b-2 border-transparent text-zinc-600 hover:bg-zinc-50/80",
            )}
            onClick={() => onTabChange(id)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
