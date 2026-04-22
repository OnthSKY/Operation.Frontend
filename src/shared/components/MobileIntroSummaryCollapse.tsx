"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { useState } from "react";

type Props = {
  intro: ReactNode;
  summary: ReactNode | null;
};

/**
 * Mobil: varsayılan kapalı; kayıtlara hızlı inmek için.
 * Özet (`summary`) varsa mobilde özet her zaman görünür; yalnızca giriş katlanır.
 * md+: her zaman tam yükseklikte (mevcut düzen).
 */
export function MobileIntroSummaryCollapse({ intro, summary }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const stack = (
    <>
      {intro}
      {summary}
    </>
  );

  const summarySplitOnMobile = summary != null;
  const mobileToggleLabel = summarySplitOnMobile
    ? t("common.pageSectionIntro")
    : t("common.pageIntroSummaryToggle");
  const aria = `${mobileToggleLabel}. ${open ? t("common.pageIntroSummaryCollapse") : t("common.pageIntroSummaryExpand")}`;
  const mobileAccordionContent = summarySplitOnMobile ? <>{intro}</> : stack;

  return (
    <>
      <div className="hidden min-w-0 flex-col gap-6 md:flex">{stack}</div>

      <div className="flex min-w-0 flex-col gap-3 md:hidden">
        {summarySplitOnMobile ? (
          <div className="min-w-0 flex flex-col gap-3">{summary}</div>
        ) : null}
        <button
          type="button"
          className={cn(
            "flex min-h-12 w-full touch-manipulation items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white px-4 py-3 text-left shadow-sm ring-1 ring-zinc-950/[0.04] transition-colors",
            "hover:bg-zinc-50/90 active:bg-zinc-100/80",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
          )}
          aria-expanded={open}
          aria-label={aria}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="min-w-0 text-sm font-semibold leading-snug text-zinc-900">
            {mobileToggleLabel}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-xs font-medium text-violet-700">
              {open ? t("common.pageIntroSummaryCollapse") : t("common.pageIntroSummaryExpand")}
            </span>
            <svg
              className={cn(
                "h-5 w-5 text-zinc-500 transition-transform duration-200 ease-out motion-reduce:transition-none",
                open && "rotate-180"
              )}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="flex min-w-0 flex-col gap-4 pb-1">{mobileAccordionContent}</div>
          </div>
        </div>
      </div>
    </>
  );
}
