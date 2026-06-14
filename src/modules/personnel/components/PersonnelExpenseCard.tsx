"use client";

import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { formatLocaleDate, formatLocaleDateTime } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { TrashIcon } from "@/shared/ui/TrashIcon";
import {
  expensePaymentSourceLabelShort,
  txCategoryLine,
} from "@/modules/branch/lib/branch-transaction-options";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Personnel } from "@/types/personnel";

function expenseSourceLabel(
  t: (k: string) => string,
  source: string | null | undefined,
  dash: string,
): string {
  const label = expensePaymentSourceLabelShort(source, t);
  return label || dash;
}

export type PersonnelExpenseCardProps = {
  tx: BranchTransaction;
  highlighted: boolean;
  isDeleting: boolean;
  personnelIsDeleted: boolean;
  branchNameById: Map<number, string>;
  personnelById: Map<number, Personnel>;
  t: (k: string) => string;
  locale: Locale;
  dash: string;
  onOpenDetail: () => void;
  onDelete: () => void;
  busyDelete: boolean;
};

/**
 * Mobil gider kartı — kompakt label-grid yapı.
 * ÖDEME satırı, kaynağa göre şube/zimmet sahibi bilgisini inline ekler.
 */
export function PersonnelExpenseCard({
  tx,
  highlighted,
  isDeleting,
  personnelIsDeleted,
  branchNameById,
  personnelById,
  t,
  locale,
  dash,
  onOpenDetail,
  onDelete,
  busyDelete,
}: PersonnelExpenseCardProps) {
  const paymentSourceWithContext = (() => {
    const u = (tx.expensePaymentSource ?? "").toUpperCase();
    const base = expenseSourceLabel(t, tx.expensePaymentSource, dash);
    if (u === "REGISTER" || u === "" || !u) {
      const bn =
        tx.branchId != null && tx.branchId > 0
          ? branchNameById.get(tx.branchId) ?? `#${tx.branchId}`
          : null;
      return bn ? `${base} · ${bn}` : base;
    }
    if (
      u === "PERSONNEL_HELD_REGISTER_CASH" ||
      u === "PERSONNEL_POCKET"
    ) {
      const ownerId = tx.expensePocketPersonnelId;
      const ownerName =
        tx.expensePocketPersonnelFullName?.trim() ||
        (ownerId ? personnelById.get(ownerId)?.fullName : null) ||
        null;
      return ownerName ? `${base} · ${ownerName}` : base;
    }
    return base;
  })();

  return (
    <article
      data-cost-row={`e-${tx.id}`}
      className={cn(
        "relative cursor-pointer rounded-lg border border-zinc-200 bg-white p-2 text-xs shadow-sm transition-all duration-200 active:scale-[0.997]",
        highlighted && "ring-2 ring-amber-400 ring-offset-1 bg-amber-50",
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
        <span className="inline-flex shrink-0 rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0 text-[10px] font-semibold uppercase leading-tight text-violet-900">
          {t("personnel.detailExpenseBadgeExpense")}
        </span>
        <span className="shrink-0 tabular-nums text-[11px] text-zinc-500">
          {formatLocaleDate(tx.transactionDate, locale)}
        </span>
        <span className="ml-auto flex shrink-0 items-baseline gap-1 font-mono text-sm font-semibold tabular-nums text-zinc-900">
          {formatMoneyDash(tx.amount, dash, locale, tx.currencyCode)}
          <span className="text-[10px] font-normal text-zinc-500">
            {tx.currencyCode}
          </span>
        </span>
        {!personnelIsDeleted ? (
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
          {t("personnel.detailExpenseColCategory")}
        </dt>
        <dd className="min-w-0 break-words text-zinc-700">
          {txCategoryLine(tx.mainCategory, tx.category, t)}
        </dd>
        <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          {t("personnel.detailCostsMoneySourceLabel")}
        </dt>
        <dd className="min-w-0 break-words text-zinc-700">
          {paymentSourceWithContext}
        </dd>
        {tx.description?.trim() ? (
          <>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              {t("personnel.detailCostsDescriptionLabel")}
            </dt>
            <dd className="min-w-0 break-words text-zinc-700">
              {tx.description.trim()}
            </dd>
          </>
        ) : null}
        <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          {t("personnel.detailCostsCreatedBy")}
        </dt>
        <dd className="min-w-0 break-words text-zinc-600">
          <span className="capitalize text-zinc-700">
            {tx.createdByName?.trim() || dash}
          </span>
          {tx.createdAt ? (
            <span className="ml-1 text-zinc-400 tabular-nums">
              · {formatLocaleDateTime(tx.createdAt, locale)}
            </span>
          ) : null}
        </dd>
      </dl>
    </article>
  );
}
