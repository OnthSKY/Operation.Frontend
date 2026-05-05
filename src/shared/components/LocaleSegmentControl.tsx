"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";

const LOCALES = ["tr", "en"] as const satisfies readonly Locale[];

type LocaleSegmentControlProps = {
  /** compact: header pill; comfortable: full-width row in menus */
  density?: "compact" | "comfortable";
  className?: string;
};

export function LocaleSegmentControl({
  density = "compact",
  className,
}: LocaleSegmentControlProps) {
  const { t, locale, setLocale } = useI18n();
  const comfortable = density === "comfortable";

  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className={cn(
        "shadow-inner backdrop-blur-sm",
        comfortable
          ? "flex w-full gap-0.5 rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-zinc-100/90 p-1 ring-1 ring-zinc-950/[0.03]"
          : "inline-flex shrink-0 gap-0.5 rounded-full border border-zinc-200/70 bg-zinc-100/70 p-0.5 ring-1 ring-white/60",
        className
      )}
    >
      {LOCALES.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={cn(
              "font-semibold tracking-wide transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/80 focus-visible:ring-offset-1",
              comfortable
                ? "min-h-11 flex-1 rounded-xl px-3 text-sm"
                : "min-h-11 min-w-[2.75rem] rounded-full px-2.5 text-xs sm:min-h-8 sm:min-w-0 sm:px-3 sm:text-[11px]",
              active
                ? comfortable
                  ? "bg-white text-indigo-700 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(99,102,241,0.12)] ring-1 ring-indigo-100"
                  : "bg-gradient-to-b from-zinc-800 to-zinc-950 text-white shadow-md shadow-zinc-900/20"
                : comfortable
                  ? "text-zinc-500 hover:bg-white/50 hover:text-zinc-800 active:scale-[0.99]"
                  : "text-zinc-500 hover:bg-white/60 hover:text-zinc-800 active:scale-[0.98]"
            )}
          >
            {t(`lang.${code}`)}
          </button>
        );
      })}
    </div>
  );
}
