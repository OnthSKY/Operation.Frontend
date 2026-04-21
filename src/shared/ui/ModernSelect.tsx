"use client";

import { cn } from "@/lib/cn";
import { forwardRef, type ComponentProps } from "react";

export const ModernSelect = forwardRef<HTMLSelectElement, ComponentProps<"select">>(
  function ModernSelect({ className, children, ...rest }, ref) {
    return (
      <div className="group relative w-full min-w-0">
        <select
          ref={ref}
          className={cn(
            "w-full cursor-pointer appearance-none rounded-xl border border-zinc-200/80 bg-zinc-50/50 py-2.5 pl-3.5 pr-10 text-left text-sm font-medium text-zinc-900 shadow-sm",
            "transition",
            "hover:border-zinc-300 hover:bg-white",
            "focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30",
            "disabled:cursor-not-allowed disabled:opacity-60",
            className
          )}
          {...rest}
        >
          {children}
        </select>
        <span
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 transition group-hover:text-zinc-700"
          aria-hidden
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.22 7.22a.75.75 0 011.06 0L10 10.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.28a.75.75 0 010-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </div>
    );
  }
);
ModernSelect.displayName = "ModernSelect";
