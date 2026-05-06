"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export function StoryBlock({
  title,
  description,
  id: sectionId,
  children,
  /** Depo özeti gibi dar alanlarda daha küçük başlık ve boşluk. */
  dense = false,
}: {
  title: string;
  description: string;
  id?: string;
  children: ReactNode;
  dense?: boolean;
}) {
  return (
    <section
      id={sectionId}
      className={cn(
        "flex min-w-0 flex-col",
        dense ? "gap-2.5 sm:gap-3" : "gap-3 sm:gap-4",
        sectionId ? "scroll-mt-28 sm:scroll-mt-24" : ""
      )}
    >
      <div className="min-w-0">
        <h2
          className={cn(
            "font-semibold leading-snug tracking-tight text-zinc-900",
            dense ? "text-base sm:text-lg" : "text-xl sm:text-lg"
          )}
        >
          {title}
        </h2>
        <p
          className={cn(
            "leading-relaxed text-zinc-600",
            dense
              ? "mt-0.5 text-xs sm:mt-1 sm:text-sm sm:text-zinc-500"
              : "mt-1 text-sm sm:mt-0.5 sm:text-sm sm:text-zinc-500"
          )}
        >
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

/** Narrow screens: horizontal snap “story” slides; md+ full width in grid parents. */
export function DashboardStorySlide({ children }: { children: ReactNode }) {
  return <div className="w-full min-w-0">{children}</div>;
}
