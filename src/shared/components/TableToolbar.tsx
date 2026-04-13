"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/** Arama vb. solda, ikonlar sağda — dikey ortalı */
export function TableToolbarSplit({
  lead,
  trailing,
  className,
}: {
  lead: ReactNode;
  trailing: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3",
        className
      )}
    >
      <div className="min-w-0 flex-1 sm:min-w-[12rem]">{lead}</div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{trailing}</div>
    </div>
  );
}

/** `Button` / `Link` ile — Personel maliyetleri tablo araç çubuğu ile aynı ölçü */
export const TABLE_TOOLBAR_ICON_BTN =
  "!min-h-11 !w-11 !min-w-11 !max-w-[2.75rem] shrink-0 !px-0 !py-0 sm:!w-11";

/** İkon `Link` (geri / liste geçişi) — araç çubuğu ile aynı ölçü */
export const TABLE_TOOLBAR_ICON_LINK =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50/90 text-zinc-700 shadow-sm transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70";

export function TableToolbarRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex min-w-0 flex-wrap items-center justify-end gap-2", className)}>
      {children}
    </div>
  );
}
