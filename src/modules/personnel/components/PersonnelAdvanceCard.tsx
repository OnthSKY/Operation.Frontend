"use client";

import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/shared/ui/Tooltip";
import { formatLocaleDateTime } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { TrashIcon } from "@/shared/ui/TrashIcon";
import { formatAdvanceDay, sourceAbbrev } from "@/modules/personnel/lib/advance-formatters";
import type { Advance } from "@/types/advance";
import type { Personnel } from "@/types/personnel";

export type PersonnelAdvanceCardProps = {
  advance: Advance;
  /** Reconciliation/drill-down focus highlight. */
  highlighted: boolean;
  /** Optimistic siliniyor animasyonu için. */
  isDeleting: boolean;
  personnelIsDeleted: boolean;
  /** Sistem yöneticisi mi (Geri al / Kalıcı sil yetkisi). */
  isSystemAdmin: boolean;
  branchNameById: Map<number, string>;
  personnelById: Map<number, Personnel>;
  t: (k: string) => string;
  locale: Locale;
  dash: string;
  /** Karta tıklanınca / Enter ile detay aç. */
  onOpenDetail: () => void;
  /** Soft delete (trash). */
  onDelete: () => void;
  /** Restore (deleted + admin). */
  onRestore: () => void;
  /** Hard delete (deleted + admin). */
  onHardDelete: () => void;
  /** Soft/hard delete / restore mutation pending state'leri. */
  busyDelete: boolean;
  busyRestore: boolean;
  busyHardDelete: boolean;
};

/**
 * Mobil avans kartı — kompakt label-grid yapı.
 * Kart kendisi tıklanabilir (Enter/Space ile de açılır); silme/restore butonları
 * `stopPropagation` ile karta tıklamadan ayrılır.
 */
export function PersonnelAdvanceCard({
  advance,
  highlighted,
  isDeleting,
  personnelIsDeleted,
  isSystemAdmin,
  branchNameById,
  personnelById,
  t,
  locale,
  dash,
  onOpenDetail,
  onDelete,
  onRestore,
  onHardDelete,
  busyDelete,
  busyRestore,
  busyHardDelete,
}: PersonnelAdvanceCardProps) {
  const sourceWithContext = (() => {
    const u = (advance.sourceType ?? "").toUpperCase();
    const base = sourceAbbrev(t, advance.sourceType);
    if (u === "CASH" || u === "PATRON_BRANCH") {
      const bn =
        advance.branchId != null && advance.branchId > 0
          ? branchNameById.get(advance.branchId) ?? `#${advance.branchId}`
          : null;
      return bn ? `${base} · ${bn}` : base;
    }
    if (
      u === "PERSONNEL_HELD_REGISTER_CASH" ||
      u === "PERSONNEL_POCKET"
    ) {
      const ownerId = advance.heldRegisterSourcePersonnelId;
      const ownerName =
        advance.heldRegisterSourcePersonnelFullName?.trim() ||
        (ownerId ? personnelById.get(ownerId)?.fullName : null) ||
        null;
      return ownerName ? `${base} · ${ownerName}` : base;
    }
    return base;
  })();

  return (
    <article
      data-cost-row={`a-${advance.id}`}
      className={cn(
        "relative cursor-pointer rounded-lg border border-zinc-200 bg-white p-2 text-xs shadow-sm transition-all duration-200 active:scale-[0.997]",
        highlighted && "ring-2 ring-amber-400 ring-offset-1 bg-amber-50",
        advance.isDeleted && "border-red-200 bg-red-50/40 opacity-90",
        isDeleting && "pointer-events-none scale-[0.98] opacity-40 grayscale",
      )}
      onClick={onOpenDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail();
        }
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="inline-flex shrink-0 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] font-semibold uppercase leading-tight text-amber-900">
          {t("personnel.detailExpenseBadgeAdvance")}
        </span>
        {advance.isDeleted ? (
          <span
            className="inline-flex shrink-0 rounded-md border border-red-300 bg-red-100 px-1.5 py-0 text-[10px] font-semibold uppercase leading-tight text-red-900"
            title={[
              advance.deletedAt
                ? formatLocaleDateTime(advance.deletedAt, locale)
                : null,
              advance.deletedByName,
            ]
              .filter(Boolean)
              .join(" · ")}
          >
            {t("personnel.detailCostsAdvanceDeletedBadge")}
          </span>
        ) : null}
        <span className="shrink-0 tabular-nums text-[11px] text-zinc-500">
          {formatAdvanceDay(advance.advanceDate, locale, dash)}
        </span>
        <span className="ml-auto flex shrink-0 items-baseline gap-1 font-mono text-sm font-semibold tabular-nums text-zinc-900">
          {formatMoneyDash(advance.amount, dash, locale, advance.currencyCode)}
          <span className="text-[10px] font-normal text-zinc-500">
            {advance.currencyCode}
          </span>
        </span>
        {!advance.isDeleted && !personnelIsDeleted ? (
          <button
            type="button"
            className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-red-600 disabled:opacity-50"
            aria-label={t("branch.txDeleteAria")}
            disabled={busyDelete || isDeleting}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] leading-snug">
        <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          {t("personnel.sourceType")}
        </dt>
        <dd className="min-w-0 break-words text-zinc-700">
          {sourceWithContext}
        </dd>
        <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          {t("personnel.effectiveYear")}
        </dt>
        <dd className="min-w-0 break-words text-zinc-700 tabular-nums">
          {advance.effectiveYear}
        </dd>
        <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          {t("personnel.detailCostsDescriptionLabel")}
        </dt>
        <dd className="min-w-0 break-words text-zinc-700">
          {advance.description?.trim() || dash}
        </dd>
        <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          {t("personnel.detailCostsCreatedBy")}
        </dt>
        <dd className="min-w-0 break-words text-zinc-600">
          <span className="capitalize text-zinc-700">
            {advance.createdByName?.trim() || dash}
          </span>
          {advance.createdAt ? (
            <span className="ml-1 text-zinc-400 tabular-nums">
              · {formatLocaleDateTime(advance.createdAt, locale)}
            </span>
          ) : null}
        </dd>
        {advance.isDeleted ? (
          <>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-red-500">
              {t("personnel.detailCostsDeletedBy")}
            </dt>
            <dd className="min-w-0 break-words text-zinc-600">
              <span className="capitalize text-red-800">
                {advance.deletedByName?.trim() || dash}
              </span>
              {advance.deletedAt ? (
                <span className="ml-1 text-zinc-400 tabular-nums">
                  · {formatLocaleDateTime(advance.deletedAt, locale)}
                </span>
              ) : null}
            </dd>
          </>
        ) : null}
      </dl>
      {advance.isDeleted && isSystemAdmin ? (
        <div
          className="mt-1.5 flex items-center justify-between gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip
            content={t("personnel.detailCostsRestoreButton")}
            delayMs={250}
          >
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-300 bg-white text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
              disabled={busyRestore}
              aria-label={t("personnel.detailCostsRestoreButton")}
              onClick={onRestore}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip
            content={t("personnel.detailCostsHardDeleteButton")}
            delayMs={250}
          >
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-red-300 bg-white text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              disabled={busyHardDelete}
              aria-label={t("personnel.detailCostsHardDeleteButton")}
              onClick={onHardDelete}
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </Tooltip>
        </div>
      ) : null}
    </article>
  );
}
