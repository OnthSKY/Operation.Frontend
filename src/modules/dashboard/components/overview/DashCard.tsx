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
    <div className="flex min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        </div>
        <Link
          href={href}
          aria-label={`${title} — ${detailLabel}`}
          className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:underline"
        >
          {detailLabel}
        </Link>
      </div>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
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
