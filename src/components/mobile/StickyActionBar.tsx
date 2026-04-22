"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type StickyActionBarProps = {
  children: ReactNode;
  className?: string;
};

export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-[80] border-t border-zinc-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-2 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/85",
        className
      )}
    >
      <div className="mx-auto w-full max-w-screen-md">{children}</div>
    </div>
  );
}
