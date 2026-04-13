"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function ReportLinkRow({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm ring-zinc-950/[0.02] transition hover:border-violet-300/50 hover:bg-violet-50/35"
    >
      <span className="min-w-0">{children}</span>
      <span
        className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600"
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}
