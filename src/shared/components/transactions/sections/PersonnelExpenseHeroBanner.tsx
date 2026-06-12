"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/context";

/**
 * Personel gideri akışında en üstte gösterilen kompakt hero banner.
 * Day-close pattern'iyle paralel: personel kimliği + (i) toggle ile
 * "ödeme kaynağı nereye yansır" bilgisini gizler.
 */
export type PersonnelExpenseHeroBannerProps = {
  personnelLabel: string;
};

export function PersonnelExpenseHeroBanner({ personnelLabel }: PersonnelExpenseHeroBannerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const initials =
    personnelLabel
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 via-blue-50/40 to-white px-3 py-2 sm:px-3.5 sm:py-2.5">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white shadow-sm sm:h-9 sm:w-9 sm:text-xs"
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 leading-tight">
            {t("branch.txPersonnelExpenseHeroLabel")}
          </p>
          <p className="truncate text-sm font-semibold text-blue-950 leading-tight sm:text-[15px]">
            <span className="font-bold">{personnelLabel}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={t("branch.txPersonnelExpenseHeroInfoAria")}
          aria-expanded={open}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-blue-300 bg-white/80 text-blue-700 transition hover:bg-blue-100 hover:text-blue-900 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none"
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
        <p className="mt-1.5 border-t border-blue-200/70 pt-1.5 text-[11px] leading-snug text-blue-900/85 sm:text-xs">
          {t("branch.txPersonnelExpenseHeroInfoBody")}
        </p>
      ) : null}
    </div>
  );
}
