"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/context";

/**
 * Gün sonu modunda en üstte gösterilen kompakt hero banner.
 * Şube + bağlam + bilgi (i) toggle. Yer kaplamaması için bilgi tooltip
 * default kapalı; tıklayınca tek satır expand olur.
 *
 * Responsive: mobile-first, tek satırda truncate; (i) butonu her zaman görünür.
 * Niye var: gün sonu işleminin geri dönüşsüz olduğunu (gider/gelir kilidi)
 * kullanıcıya küçük bir alanda, dikkat dağıtmadan iletmek.
 */
export type DayCloseHeroBannerProps = {
  branchName: string;
};

export function DayCloseHeroBanner({ branchName }: DayCloseHeroBannerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50/40 to-white px-3 py-2 sm:px-3.5 sm:py-2.5">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm sm:h-9 sm:w-9"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m17.66 6.34 1.41-1.41" />
            <path d="M22 22H2" />
            <path d="m8 6 4 4 4-4" />
            <path d="M16 18a4 4 0 0 0-8 0" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 leading-tight">
            {t("branch.txDayCloseHeroLabel")}
          </p>
          <p className="truncate text-sm font-semibold text-emerald-950 leading-tight sm:text-[15px]">
            <span className="font-bold">{branchName}</span>
            <span className="text-emerald-800/80"> · {t("branch.txDayCloseHeroLine")}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={t("branch.txDayCloseHeroInfoAria")}
          aria-expanded={open}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-300 bg-white/80 text-emerald-700 transition hover:bg-emerald-100 hover:text-emerald-900 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8h.01" />
            <path d="M11 12h1v4h1" />
          </svg>
        </button>
      </div>
      {open ? (
        <p className="mt-1.5 border-t border-emerald-200/70 pt-1.5 text-[11px] leading-snug text-emerald-900/85 sm:text-xs">
          {t("branch.txDayCloseHeroInfoBody")}
        </p>
      ) : null}
    </div>
  );
}
