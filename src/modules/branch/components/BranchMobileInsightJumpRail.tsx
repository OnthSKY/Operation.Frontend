"use client";

import { cn } from "@/lib/cn";
import { useMediaMinWidth } from "@/shared/lib/use-media-min-width";

export type BranchMobileJumpItem = {
  id: string;
  label: string;
};

type Props = {
  ariaLabel: string;
  items: BranchMobileJumpItem[];
  className?: string;
};

export function BranchMobileInsightJumpRail({ ariaLabel, items, className }: Props) {
  const isSmUp = useMediaMinWidth(640);
  if (isSmUp || items.length === 0) return null;

  const scrollToId = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      className={cn(
        "-mx-0.5 flex gap-2 overflow-x-auto pb-2 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => scrollToId(item.id)}
          className="touch-manipulation shrink-0 rounded-full border border-zinc-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 shadow-sm outline-none ring-zinc-400 transition-[transform,box-shadow] active:scale-[0.98] focus-visible:ring-2"
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
