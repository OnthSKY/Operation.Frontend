"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

export const UI = {
  surface: "rounded-xl border border-gray-200 bg-white",
  elevated:
    "rounded-xl bg-white shadow-md transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg",
  subtle: "rounded-lg border border-gray-200 bg-gray-50",
} as const;

export function DashboardSectionHeader({
  title,
  action,
  description,
}: {
  title: string;
  action?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        {description ? <div className="mt-1 text-sm text-zinc-600">{description}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function KpiCard({
  title,
  description,
  value,
  className,
  footer,
}: {
  title: string;
  description?: ReactNode;
  value: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <div className={cn("space-y-2.5 p-4", UI.elevated, className)}>
      <div>
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        {description ? <div className="mt-1 text-sm text-zinc-500">{description}</div> : null}
      </div>
      <div className="text-3xl font-bold">{value}</div>
      {footer ? <div className="text-xs text-zinc-500">{footer}</div> : null}
    </div>
  );
}

export function MiniMetricCard({
  title,
  value,
  description,
  className,
}: {
  title: string;
  value: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2 p-3", UI.surface, className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{title}</p>
      <div className="text-2xl font-semibold">{value}</div>
      {description ? <div className="text-xs text-zinc-500">{description}</div> : null}
    </div>
  );
}
