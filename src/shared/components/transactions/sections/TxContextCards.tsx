"use client";

import { useI18n } from "@/i18n/context";

/**
 * Modal'ın başında gösterilen iki bağlam kartı:
 *  - Şube kartı (yeşil): modal şube context'inde açıldıysa şube adını gösterir.
 *  - Personel kartı (mavi): personnelExpenseFlow + bağlı personel id varsa personel adını gösterir.
 *
 * Salt görsel. Caller görünürlük koşulunu hesaplar ve ilgili `*Visible` flag'lerini geçer.
 */
export type TxContextCardsProps = {
  branchVisible: boolean;
  branchName: string;
  personnelVisible: boolean;
  personnelLabel: string;
};

export function TxContextCards(props: TxContextCardsProps) {
  const { t } = useI18n();
  const { branchVisible, branchName, personnelVisible, personnelLabel } = props;

  return (
    <>
      {branchVisible ? (
        <div className="min-w-0 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
          <span
            aria-hidden
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M19 21V11l-6-4" />
            </svg>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 shrink-0">
            {t("branch.txContextBranchLabel")}
          </span>
          <span className="min-w-0 truncate text-sm font-semibold text-emerald-950">
            {branchName}
          </span>
        </div>
      ) : null}

      {personnelVisible ? (
        <div className="min-w-0 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5">
          <span
            aria-hidden
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white"
          >
            {personnelLabel
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() ?? "")
              .join("") || "?"}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 shrink-0">
            {t("branch.txExpenseLinkPersonnelLabel")}
          </span>
          <span className="min-w-0 truncate text-sm font-semibold text-blue-950">
            {personnelLabel}
          </span>
        </div>
      ) : null}
    </>
  );
}
