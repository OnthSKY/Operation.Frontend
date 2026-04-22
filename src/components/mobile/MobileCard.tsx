"use client";

import { cn } from "@/lib/cn";
import { useId, useState, type ReactNode } from "react";

type MobileCardProps = {
  title?: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
  actions?: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
};

export function MobileCard({
  title,
  primary,
  secondary,
  actions,
  defaultExpanded = false,
  className,
}: MobileCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasSecondary = secondary != null;
  const detailsId = useId();

  return (
    <article className={cn("rounded-xl border border-zinc-200 bg-white p-4 shadow-sm", className)}>
      {title ? <h3 className="text-base font-semibold text-zinc-900">{title}</h3> : null}
      <div className={cn("space-y-2", title ? "mt-2" : undefined)}>{primary}</div>

      {hasSecondary ? (
        <div className="mt-3 border-t border-zinc-100 pt-3">
          <button
            type="button"
            className="min-h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-left text-sm font-medium text-zinc-700"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Detaylari gizle" : "Detaylari goster"}
          </button>
          {expanded ? (
            <div id={detailsId} className="mt-2 space-y-1.5 text-sm text-zinc-600">
              {secondary}
            </div>
          ) : null}
        </div>
      ) : null}

      {actions ? <div className="mt-3 border-t border-zinc-100 pt-3">{actions}</div> : null}
    </article>
  );
}
