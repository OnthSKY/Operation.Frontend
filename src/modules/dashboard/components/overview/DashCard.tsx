"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function DashCard({
  title,
  description,
  href,
  detailLabel,
  children,
  compact,
}: {
  title: string;
  description: string;
  href: string;
  detailLabel: string;
  children: ReactNode;
  /** Dar KPI kartı — mobilde 3'lü grid için küçük padding/font; açıklama telefonda gizlenir. */
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={`${title} — ${detailLabel}`}
      className={cn(
        "group flex min-w-0 flex-col rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-900/[0.03] transition hover:border-zinc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
        compact ? "p-2.5 sm:p-4" : "p-4"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            className={cn(
              "text-zinc-900",
              compact
                ? "text-[13px] font-bold leading-tight tracking-tight sm:text-[15px]"
                : "text-sm font-semibold"
            )}
          >
            {title}
          </h3>
          <p
            className={cn(
              "mt-0.5 text-xs text-zinc-500",
              compact && "hidden sm:line-clamp-2 sm:block"
            )}
          >
            {description}
          </p>
        </div>
        <span
          aria-hidden
          className={cn(
            "-mr-1 mt-0.5 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500",
            compact && "hidden sm:block"
          )}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </div>
      <div className={cn("flex flex-col gap-2", compact ? "mt-2 sm:mt-3" : "mt-3")}>
        {children}
      </div>
    </Link>
  );
}

export function Stat({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <span
        className={
          compact
            ? "text-sm font-medium tabular-nums text-zinc-900"
            : "text-base font-semibold tabular-nums text-zinc-900"
        }
      >
        {value}
      </span>
    </div>
  );
}
