"use client";

import { Tooltip } from "@/shared/ui/Tooltip";
import type { ReactNode } from "react";

function InfoCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  onHelpClick: () => void;
  /** Tooltip + aria-label */
  helpAriaLabel: string;
};

export function PageTitleWithHelp({ title, subtitle, onHelpClick, helpAriaLabel }: Props) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0 max-w-full flex-1">
        {typeof title === "string" ? (
          <h1 className="text-pretty text-2xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-xl">
            {title}
          </h1>
        ) : (
          title
        )}
        {subtitle ? (
          <div className="mt-2 text-pretty text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
            {subtitle}
          </div>
        ) : null}
      </div>
      <Tooltip content={helpAriaLabel} delayMs={200}>
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-800 shadow-sm transition hover:bg-violet-100 hover:text-violet-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
          aria-label={helpAriaLabel}
          aria-haspopup="dialog"
          onClick={onHelpClick}
        >
          <InfoCircleIcon className="h-5 w-5" />
        </button>
      </Tooltip>
    </div>
  );
}
