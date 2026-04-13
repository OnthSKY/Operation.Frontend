"use client";

import type { ReactNode } from "react";

export function StoryBlock({
  title,
  description,
  id: sectionId,
  children,
}: {
  title: string;
  description: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={sectionId}
      className={`flex min-w-0 flex-col gap-3 sm:gap-4 ${sectionId ? "scroll-mt-28 sm:scroll-mt-24" : ""}`}
    >
      <div className="min-w-0">
        <h2 className="text-xl font-semibold leading-snug tracking-tight text-zinc-900 sm:text-lg">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-600 sm:mt-0.5 sm:text-sm sm:text-zinc-500">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

/** Narrow screens: horizontal snap “story” slides; md+ full width in grid parents. */
export function DashboardStorySlide({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-md:w-[min(88vw,20rem)] max-md:shrink-0 max-md:snap-start md:min-w-0">
      {children}
    </div>
  );
}
