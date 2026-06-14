"use client";

import { Button } from "@/shared/ui/Button";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import { Tooltip } from "@/shared/ui/Tooltip";

/**
 * Costs sekmesi başlık şeridi: başlık · filtre ikonu · 3-noktalı "İşlemler" butonu.
 * Filtre noktası `filtersActive` true ise mor noktayla işaretli.
 */
export function PersonnelCostsToolbar({
  filtersActive,
  onOpenFilters,
  onOpenActions,
  t,
}: {
  filtersActive: boolean;
  onOpenFilters: () => void;
  onOpenActions: () => void;
  t: (k: string) => string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
        {t("personnel.detailTabCosts")}
      </h3>
      <Tooltip
        content={t("personnel.detailCostsFiltersDrawerTitle")}
        delayMs={200}
      >
        <Button
          type="button"
          variant="secondary"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg p-0 sm:h-10 sm:w-10"
          onClick={onOpenFilters}
          aria-label={t("personnel.detailCostsFiltersDrawerTitle")}
        >
          <FilterFunnelIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          {filtersActive ? (
            <span
              className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-violet-500 ring-2 ring-white"
              aria-hidden
            />
          ) : null}
        </Button>
      </Tooltip>
      <Tooltip content={t("personnel.detailCostsActions")} delayMs={200}>
        <Button
          type="button"
          variant="secondary"
          className="flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-medium sm:h-10 sm:px-3 sm:text-sm"
          onClick={onOpenActions}
          aria-label={t("personnel.detailCostsActions")}
        >
          <svg
            className="h-4 w-4 sm:h-5 sm:w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="5" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="19" r="1.5" />
          </svg>
          <span className="hidden sm:inline">
            {t("personnel.detailCostsActions")}
          </span>
        </Button>
      </Tooltip>
    </div>
  );
}
