"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export type StatusBadgeTone =
  | "active"
  | "inactive"
  | "warning"
  | "danger"
  | "success"
  | "neutral"
  | "muted"
  | "info"
  | "deleted";

const lightTone: Record<StatusBadgeTone, string> = {
  active: "bg-emerald-100 text-emerald-900 ring-emerald-200/80",
  inactive: "bg-zinc-200/90 text-zinc-800 ring-zinc-300/70",
  warning: "bg-amber-100 text-amber-950 ring-amber-200/80",
  danger: "bg-red-100 text-red-900 ring-red-200/80",
  success: "bg-emerald-100 text-emerald-900 ring-emerald-200/80",
  neutral: "bg-slate-100 text-slate-800 ring-slate-200/80",
  muted: "bg-zinc-100 text-zinc-700 ring-zinc-200/80",
  info: "bg-sky-100 text-sky-900 ring-sky-200/80",
  deleted: "bg-zinc-200/90 text-zinc-700 ring-zinc-300/60",
};

const darkSurfaceTone: Record<StatusBadgeTone, string> = {
  active: "bg-emerald-500/20 text-emerald-100 ring-emerald-400/40",
  inactive: "bg-red-500/15 text-red-100 ring-red-400/35",
  warning: "bg-amber-500/15 text-amber-100 ring-amber-400/35",
  danger: "bg-red-500/15 text-red-100 ring-red-400/35",
  success: "bg-emerald-500/20 text-emerald-100 ring-emerald-400/40",
  neutral: "bg-zinc-500/20 text-zinc-100 ring-zinc-400/35",
  muted: "bg-zinc-500/20 text-zinc-200 ring-zinc-400/35",
  info: "bg-sky-500/20 text-sky-100 ring-sky-400/40",
  deleted: "bg-zinc-500/25 text-zinc-100 ring-zinc-400/40",
};

export type StatusBadgeProps = {
  tone: StatusBadgeTone;
  children: ReactNode;
  className?: string;
  /** Açık arka planlar (tablolar, kartlar) */
  surface?: "light" | "dark";
  size?: "sm" | "md";
};

export function StatusBadge({
  tone,
  children,
  className,
  surface = "light",
  size = "sm",
}: StatusBadgeProps) {
  const palette = surface === "dark" ? darkSurfaceTone : lightTone;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center font-semibold uppercase tracking-wide ring-1",
        size === "sm" && "rounded-md px-2 py-0.5 text-[11px]",
        size === "md" && "rounded-full px-3 py-1 text-xs",
        palette[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Sistem kullanıcısı hesap durumu (ACTIVE / …) */
export function appUserAccountStatusTone(status: string): StatusBadgeTone {
  return status.toUpperCase() === "ACTIVE" ? "active" : "inactive";
}
