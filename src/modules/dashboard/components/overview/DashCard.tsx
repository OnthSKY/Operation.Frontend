"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function DashCard({
  title,
  description,
  href,
  detailLabel,
  children,
}: {
  title: string;
  description: string;
  href: string;
  detailLabel: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={`${title} — ${detailLabel}`}
      className="group flex min-w-0 flex-col rounded-xl border border-zinc-200/90 bg-white p-4 shadow-sm ring-1 ring-zinc-900/[0.03] transition hover:border-zinc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        </div>
        <span
          aria-hidden
          className="-mr-1 mt-0.5 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500"
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
      <div className="mt-3 flex flex-col gap-2">{children}</div>
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
