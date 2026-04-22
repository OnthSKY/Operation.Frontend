"use client";

import { MAX_PRIMARY_FIELDS, TOUCH_TARGET_MIN } from "@/config/mobile.config";
import { cn } from "@/lib/cn";
import { memo, useId, useMemo, useState, type ReactNode } from "react";

type MobileCardProps = {
  title?: ReactNode;
  primaryFields: ReactNode[];
  secondaryFields?: ReactNode[];
  actions?: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
};

function MobileCardImpl({
  title,
  primaryFields,
  secondaryFields,
  actions,
  defaultExpanded = false,
  className,
}: MobileCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasSecondary = (secondaryFields?.length ?? 0) > 0;
  const detailsId = useId();
  const visiblePrimary = useMemo(
    () => primaryFields.slice(0, MAX_PRIMARY_FIELDS),
    [primaryFields]
  );

  return (
    <article
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm",
        className
      )}
    >
      {title ? <h3 className="break-words text-base font-semibold text-zinc-900">{title}</h3> : null}
      <div className={cn("space-y-2", title ? "mt-2" : undefined)}>
        {visiblePrimary.map((field, idx) => (
          <div key={idx} className="min-w-0 break-words text-sm text-zinc-800">
            {field}
          </div>
        ))}
      </div>

      {hasSecondary ? (
        <div className="mt-3 border-t border-zinc-100 pt-3">
          <button
            type="button"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-left text-sm font-medium text-zinc-700"
            style={{ minHeight: TOUCH_TARGET_MIN }}
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={expanded ? "Detaylari gizle" : "Detaylari goster"}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Detaylari gizle" : "Detaylari goster"}
          </button>
          {expanded ? (
            <div id={detailsId} className="mt-2 space-y-1.5 text-sm text-zinc-600">
              {secondaryFields?.map((field, idx) => (
                <div key={idx} className="min-w-0 break-words">
                  {field}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {actions ? <div className="mt-3 border-t border-zinc-100 pt-3">{actions}</div> : null}
    </article>
  );
}

export const MobileCard = memo(MobileCardImpl);
