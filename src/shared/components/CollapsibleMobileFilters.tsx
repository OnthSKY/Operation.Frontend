"use client";

import { cn } from "@/lib/cn";
import { useMediaMinWidth } from "@/shared/lib/use-media-min-width";
import { useEffect, useState } from "react";

const SM_PX = 640;

function FilterFunnelIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

type Props = {
  /** Masaüstünde gösterilen başlık */
  title: string;
  /** aria-label / erişilebilirlik için kısa ad (ör. “Filtreler”) */
  toggleAriaLabel: string;
  children: React.ReactNode;
  /** Varsayılan dışı filtre varsa ikon üzerinde nokta */
  active?: boolean;
  className?: string;
  /** Değişince mobil panel kapanır (sekme / şube değişimi) */
  resetKey?: string | number;
  expandLabel: string;
  collapseLabel: string;
};

export function CollapsibleMobileFilters({
  title,
  toggleAriaLabel,
  children,
  active = false,
  className,
  resetKey,
  expandLabel,
  collapseLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const isSmUp = useMediaMinWidth(SM_PX);
  const panelExpanded = isSmUp || open;

  useEffect(() => {
    setOpen(false);
  }, [resetKey]);

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-3 sm:p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 sm:mb-3 sm:block">
        <button
          type="button"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm sm:hidden"
          aria-expanded={open}
          aria-label={`${toggleAriaLabel}. ${open ? collapseLabel : expandLabel}`}
          onClick={() => setOpen((v) => !v)}
        >
          <FilterFunnelIcon className="h-5 w-5" />
          {active ? (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white"
              aria-hidden
            />
          ) : null}
        </button>
        <p className="hidden text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:mb-0 sm:block">
          {title}
        </p>
      </div>
      <div
        className={cn(
          "max-sm:overflow-hidden",
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          "sm:grid-rows-[1fr]"
        )}
      >
        <div
          className="min-h-0 overflow-hidden sm:overflow-visible"
          aria-hidden={!panelExpanded || undefined}
          inert={!panelExpanded}
        >
          <div className="space-y-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
