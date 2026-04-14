"use client";

import { cn } from "@/lib/cn";
import { FilterFunnelIcon } from "@/shared/components/FilterFunnelIcon";
import type { ReactNode } from "react";

/**
 * Mobil (ve masaüstü) için üst kontrol satırı: solda özet/preview, sağda filtre ve diğer ikonlar.
 * `PageScreenScaffold` `mobileToolbar` ile birlikte kullanım — filtre formu genelde `RightDrawer` içinde.
 */
export function MobilePageToolRow({
  preview,
  actions,
  className,
}: {
  preview: ReactNode;
  actions: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch justify-end gap-2 sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 flex-1 basis-[min(100%,20rem)] rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-3 py-2.5 ring-1 ring-zinc-950/[0.03] sm:py-2">
        {preview}
      </div>
      <div className="flex shrink-0 items-stretch gap-2">{actions}</div>
    </div>
  );
}

/** Standart filtre hunisi; aktif filtrede mor nokta. */
export function MobileFilterFunnelButton({
  active,
  expanded,
  onClick,
  ariaLabel,
  className,
}: {
  active: boolean;
  expanded: boolean;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70",
        active && "border-violet-300 bg-violet-50/90 text-violet-900",
        className
      )}
      aria-label={ariaLabel}
      aria-expanded={expanded}
      onClick={onClick}
    >
      <FilterFunnelIcon className="h-5 w-5" />
      {active ? (
        <span
          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white"
          aria-hidden
        />
      ) : null}
    </button>
  );
}
