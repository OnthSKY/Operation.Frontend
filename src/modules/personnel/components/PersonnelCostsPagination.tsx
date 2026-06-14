"use client";

import { Tooltip } from "@/shared/ui/Tooltip";

const navBtnCls =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10";
const iconCls = "h-4 w-4 sm:h-5 sm:w-5";

/**
 * Sayfalama şeridi: solda Önceki ikonu, ortada "Sayfa N/M · K kayıt" metni,
 * sağda Sonraki ikonu. Tüm hesaplama caller tarafında; bileşen sadece sunum.
 */
export function PersonnelCostsPagination({
  currentPage,
  totalPages,
  totalRecords,
  onPrev,
  onNext,
  t,
}: {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  onPrev: () => void;
  onNext: () => void;
  t: (k: string) => string;
}) {
  const atFirst = currentPage <= 1;
  const atLast = currentPage >= totalPages;
  return (
    <div className="flex items-center gap-2 border-t border-zinc-100 bg-zinc-50/60 px-2 py-2 sm:px-3">
      <Tooltip content={t("personnel.detailPrev")} delayMs={300}>
        <button
          type="button"
          className={navBtnCls}
          disabled={atFirst}
          aria-label={t("personnel.detailPrev")}
          onClick={onPrev}
        >
          <svg
            className={iconCls}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </Tooltip>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 text-[11px] text-zinc-500 sm:gap-2 sm:text-xs">
        <span className="whitespace-nowrap">
          {t("personnel.detailPaginationPage")}{" "}
          <span className="font-semibold tabular-nums text-zinc-900">
            {currentPage}
          </span>
          <span className="text-zinc-400">/</span>
          <span className="font-semibold tabular-nums text-zinc-900">
            {totalPages}
          </span>
        </span>
        <span className="text-zinc-300" aria-hidden>
          ·
        </span>
        <span className="whitespace-nowrap">
          <span className="font-semibold tabular-nums text-zinc-900">
            {totalRecords}
          </span>{" "}
          {t("personnel.detailPaginationRecords")}
        </span>
      </div>
      <Tooltip content={t("personnel.detailNext")} delayMs={300}>
        <button
          type="button"
          className={navBtnCls}
          disabled={atLast}
          aria-label={t("personnel.detailNext")}
          onClick={onNext}
        >
          <svg
            className={iconCls}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </Tooltip>
    </div>
  );
}
