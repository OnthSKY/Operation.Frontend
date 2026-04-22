"use client";

import { MAX_PRIMARY_FIELDS, MOBILE_TOKENS } from "@/config/mobile.config";
import { useI18n } from "@/i18n/context";
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
  const { t } = useI18n();
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
        "min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm",
        MOBILE_TOKENS.LIST_CARD.RING,
        MOBILE_TOKENS.LIST_CARD.PX,
        MOBILE_TOKENS.LIST_CARD.PY,
        "flex flex-col gap-3",
        className
      )}
    >
      {title ? (
        <h3 className="min-w-0 break-words text-base font-semibold leading-snug text-zinc-900">
          {title}
        </h3>
      ) : null}
      <div className={cn("flex min-w-0 flex-col gap-1", title ? "mt-1" : undefined)}>
        {visiblePrimary.map((field, idx) => (
          <div key={idx} className="min-w-0 break-words text-sm text-zinc-800">
            {field}
          </div>
        ))}
      </div>

      {hasSecondary ? (
        <div className="border-t border-zinc-100 pt-3">
          <button
            type="button"
            className={cn(
              "w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-left text-sm font-medium text-zinc-700",
              MOBILE_TOKENS.TOUCH.MIN
            )}
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={
              expanded
                ? t("common.mobileCardDetailsHide")
                : t("common.mobileCardDetailsShow")
            }
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded
              ? t("common.mobileCardDetailsHide")
              : t("common.mobileCardDetailsShow")}
          </button>
          {expanded ? (
            <div
              id={detailsId}
              className="mt-2 flex min-w-0 flex-col gap-1 text-sm text-zinc-600"
            >
              {secondaryFields?.map((field, idx) => (
                <div key={idx} className="min-w-0 break-words">
                  {field}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {actions ? <div className="border-t border-zinc-100 pt-3">{actions}</div> : null}
    </article>
  );
}

export const MobileCard = memo(MobileCardImpl);
