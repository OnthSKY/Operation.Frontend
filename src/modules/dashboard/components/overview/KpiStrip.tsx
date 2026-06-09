"use client";

import Link from "next/link";

export type KpiItem = {
  label: string;
  value: string;
  sub: string;
  href: string;
};

export function KpiStrip({ items }: { items: KpiItem[] }) {
  if (items.length === 0) return null;
  return (
    <div
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 sm:gap-3"
      role="list"
    >
      {items.map((k) => (
        <Link
          key={k.label}
          href={k.href}
          role="listitem"
          aria-label={`${k.label}: ${k.value}${k.sub ? ` — ${k.sub}` : ""}`}
          className="group rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 sm:p-4"
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            {k.label}
          </div>
          <div className="mt-1 break-words text-base font-semibold text-zinc-900 tabular-nums sm:text-lg lg:text-xl">
            {k.value}
          </div>
          {k.sub ? (
            <div className="mt-0.5 break-words text-xs text-zinc-500">
              {k.sub}
            </div>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
