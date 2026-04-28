"use client";

import type { Locale } from "@/i18n/messages";
import type { BranchRegisterSummary } from "@/types/branch";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { cn } from "@/lib/cn";
import Link from "next/link";

/** Gelir/gider özetlerinde tekrarlanan “bugüne kadar turizm sezonu” satırı (tek kaynak). */
export type BranchRegisterTourismSeasonAsOf = Pick<
  BranchRegisterSummary,
  | "hasActiveTourismSeasonForAsOf"
  | "activeTourismSeasonYear"
  | "activeTourismSeasonOpenedOn"
  | "activeTourismSeasonClosedOn"
>;

export type BranchRegisterTourismSeasonStripProps = {
  t: (key: string) => string;
  locale: Locale;
  /** Özet satırı (register summary veya aynı alanları taşıyan alt küme). */
  summary: BranchRegisterTourismSeasonAsOf | null | undefined;
  /**
   * `hasActiveTourismSeasonForAsOf` false iken gösterilecek i18n anahtarı.
   * Verilmezse ve sezon yoksa `null` döner.
   */
  missingHintKey?: string;
  /** Personel portalı dışında turizm sezonu sekmesine hızlı geçiş. */
  tourismSeasonHref?: string;
  className?: string;
};

export function BranchRegisterTourismSeasonStrip({
  t,
  locale,
  summary,
  missingHintKey,
  tourismSeasonHref,
  className,
}: BranchRegisterTourismSeasonStripProps) {
  if (summary == null) return null;

  if (!summary.hasActiveTourismSeasonForAsOf) {
    if (!missingHintKey) return null;
    return (
      <div
        className={cn(
          "flex flex-col gap-2 rounded-lg border border-amber-200/80 bg-amber-50/45 px-2.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-3",
          className
        )}
      >
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-amber-950/90">{t(missingHintKey)}</p>
        {tourismSeasonHref ? (
          <Link
            href={tourismSeasonHref}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-amber-300/80 bg-white/90 px-3 text-xs font-semibold text-amber-950 shadow-sm transition-colors hover:bg-amber-50/90 sm:min-h-[44px]"
          >
            {t("branch.tourismSeasonClosedOpenTab")}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-zinc-200/50 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:border-b-0 sm:pb-0",
        className
      )}
    >
      <p className="min-w-0 flex-1 text-[10px] leading-relaxed text-zinc-600 sm:text-[11px]">
        <span className="font-medium text-zinc-700">{t("branch.incomeSeasonYearShort")}</span>
        {": "}
        <span className="font-semibold tabular-nums text-zinc-900">
          {summary.activeTourismSeasonYear ?? "—"}
        </span>
        <span className="mx-1 text-zinc-400" aria-hidden>
          ·
        </span>
        <span className="inline-flex flex-wrap items-baseline gap-x-1 tabular-nums">
          <span>
            {summary.activeTourismSeasonOpenedOn
              ? formatLocaleDate(summary.activeTourismSeasonOpenedOn, locale)
              : "—"}
          </span>
          {summary.activeTourismSeasonClosedOn ? (
            <>
              <span className="text-zinc-400">→</span>
              <span>{formatLocaleDate(summary.activeTourismSeasonClosedOn, locale)}</span>
            </>
          ) : (
            <>
              <span className="text-zinc-400">·</span>
              <span className="font-medium text-teal-800/90">{t("branch.incomeSeasonOpenEnded")}</span>
            </>
          )}
        </span>
      </p>
      {tourismSeasonHref ? (
        <Link
          href={tourismSeasonHref}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-teal-200/80 bg-teal-50/60 px-3 text-xs font-semibold text-teal-900 shadow-sm transition-colors hover:bg-teal-50 sm:min-h-[44px] sm:self-center"
        >
          {t("branch.tourismSeasonClosedOpenTab")}
        </Link>
      ) : null}
    </div>
  );
}
