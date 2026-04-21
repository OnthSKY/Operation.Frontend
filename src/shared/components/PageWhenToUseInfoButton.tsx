"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { PageHelpModal } from "@/shared/components/PageHelpModal";
import type { PageWhenToUseGuideContentProps } from "@/shared/components/PageWhenToUseGuide";
import { Tooltip } from "@/shared/ui/Tooltip";
import { useState } from "react";

type Props = {
  /** Erişilebilir düğme adı */
  ariaLabel: string;
  className?: string;
  /** Modal başlığı; verilmezse «Bu sayfada ne yapabilirim?» */
  helpTitle?: string;
} & Omit<PageWhenToUseGuideContentProps, "showTitle" | "title">;

export function PageWhenToUseInfoButton({
  ariaLabel,
  className,
  helpTitle,
  ...content
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip content={t("common.pageInfoTooltip")} side="bottom" className={className}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full border border-violet-200 bg-white text-violet-900 shadow-sm outline-none ring-offset-2 transition hover:border-violet-300 hover:bg-violet-50/80 focus-visible:ring-2 focus-visible:ring-violet-400 touch-manipulation"
          )}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel}
        >
          <span className="font-serif text-[0.95rem] font-bold leading-none" aria-hidden>
            i
          </span>
        </button>
      </Tooltip>
      <PageHelpModal
        open={open}
        onClose={() => setOpen(false)}
        helpTitle={helpTitle}
        {...content}
      />
    </>
  );
}
