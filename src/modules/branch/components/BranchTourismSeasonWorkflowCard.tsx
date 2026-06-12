"use client";

import Link from "next/link";

type Props = {
  t: (key: string) => string;
  showAdminPolicyLink: boolean;
};

/**
 * Turizm sezonu sekmesindeki iş akışı özeti — kompakt collapsible.
 * Varsayılan kapalı; "Nasıl çalışır?" başlığıyla tek satır.
 */
export function BranchTourismSeasonWorkflowCard({ t, showAdminPolicyLink }: Props) {
  return (
    <details className="group rounded-xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-950/[0.04]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden sm:px-4">
        <span className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8.5h.01M11 12h1v4.5h1" />
            </svg>
          </span>
          <span className="truncate text-sm font-medium text-zinc-900">
            {t("branch.tSeasonGuideTitle")}
          </span>
        </span>
        <span
          aria-hidden
          className="shrink-0 text-zinc-400 transition group-open:rotate-180"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-zinc-100 px-3 py-3 sm:px-4">
        <ol className="list-decimal space-y-1.5 pl-4 text-sm leading-relaxed text-zinc-700 sm:pl-5">
          <li>{t("branch.tSeasonGuideStep1")}</li>
          <li>{t("branch.tSeasonGuideStep2")}</li>
          <li>{t("branch.tSeasonGuideStep3")}</li>
          <li>{t("branch.tSeasonGuideStep4")}</li>
        </ol>
        {showAdminPolicyLink ? (
          <p className="mt-3 text-sm">
            <Link
              href="/admin/settings/tourism-season-closed-policy"
              className="inline-flex min-h-11 items-center font-medium text-emerald-700 underline decoration-emerald-700/40 underline-offset-2 hover:text-emerald-800 sm:min-h-0"
            >
              {t("branch.tSeasonGuidePolicyLink")}
            </Link>
          </p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            {t("branch.tSeasonGuidePolicyNoteViewer")}
          </p>
        )}
      </div>
    </details>
  );
}
