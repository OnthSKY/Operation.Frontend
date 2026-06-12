"use client";

import Link from "next/link";

export type KpiItem = {
  label: string;
  value: string;
  sub: string;
  href: string;
};

function isNegative(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("-") || trimmed.startsWith("−");
}

export function KpiStrip({ items }: { items: KpiItem[] }) {
  if (items.length === 0) return null;
  return (
    <div
      className="grid grid-cols-3 gap-1.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-5"
      role="list"
    >
      {items.map((k) => {
        const negative = isNegative(k.value);
        return (
          <Link
            key={k.label}
            href={k.href}
            role="listitem"
            aria-label={`${k.label}: ${k.value}${k.sub ? ` — ${k.sub}` : ""}`}
            className="group flex min-w-0 flex-col rounded-xl border border-zinc-200/90 bg-white p-2 shadow-sm ring-1 ring-zinc-900/[0.03] transition hover:border-zinc-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:p-4"
          >
            <span className="truncate text-[10px] font-medium text-zinc-500 sm:text-xs">
              {k.label}
            </span>
            <span
              className={`mt-0.5 break-words text-sm font-semibold tabular-nums sm:mt-1 sm:text-xl ${
                negative ? "text-rose-600" : "text-zinc-900"
              }`}
            >
              {k.value}
            </span>
            <span className="mt-0.5 line-clamp-2 min-h-[1.1em] text-[10px] leading-snug text-zinc-500 sm:text-xs">
              {k.sub || " "}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
