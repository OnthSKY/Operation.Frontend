"use client";

import Link from "next/link";

export type ActionItem = {
  label: string;
  href?: string;
  onClick?: () => void;
};

export function ActionGroup({
  title,
  hint,
  tone,
  items,
}: {
  title: string;
  hint: string;
  tone: "primary" | "neutral";
  items: ActionItem[];
}) {
  if (items.length === 0) return null;
  const primary = tone === "primary";
  const cls = primary
    ? "inline-flex min-h-11 items-center justify-center rounded-md bg-blue-600 px-3 text-center text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-1 sm:text-sm"
    : "inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-center text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 sm:text-sm";
  return (
    <section
      aria-label={title}
      className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <span className="text-[11px] uppercase tracking-wide text-zinc-500">
          {hint}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((a) =>
          a.onClick ? (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className={cls}
            >
              {a.label}
            </button>
          ) : (
            <Link key={a.label} href={a.href ?? "#"} className={cls}>
              {a.label}
            </Link>
          )
        )}
      </div>
    </section>
  );
}
