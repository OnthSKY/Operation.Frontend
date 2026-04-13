"use client";

import { cn } from "@/lib/cn";
import type { NonAdvanceExpenseSort } from "@/modules/personnel/lib/non-advance-expense-sort";
import { Tooltip } from "@/shared/ui/Tooltip";
import type { ReactNode } from "react";

const iconCls = "h-[18px] w-[18px] shrink-0";

function IconDateDown() {
  return (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
      <path d="M12 14v6M9 17l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDateUp() {
  return (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
      <path d="M12 20V14M9 17l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAmountDown() {
  return (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 3v18" strokeLinecap="round" />
      <path d="M8 7h5a3 3 0 0 1 0 6H8M8 17h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 21l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconAmountUp() {
  return (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 21V3" strokeLinecap="round" />
      <path d="M8 17h5a3 3 0 0 0 0-6H8M8 7h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 3l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCategoryTotals() {
  return (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-6M22 20V8" strokeLinecap="round" />
    </svg>
  );
}

type BtnDef = { sort: NonAdvanceExpenseSort; icon: ReactNode; labelKey: string };

const BTNS_ALL: BtnDef[] = [
  { sort: "dateDesc", icon: <IconDateDown />, labelKey: "personnel.nonAdvanceSortDateDesc" },
  { sort: "dateAsc", icon: <IconDateUp />, labelKey: "personnel.nonAdvanceSortDateAsc" },
  { sort: "amountDesc", icon: <IconAmountDown />, labelKey: "personnel.nonAdvanceSortAmountDesc" },
  { sort: "amountAsc", icon: <IconAmountUp />, labelKey: "personnel.nonAdvanceSortAmountAsc" },
  {
    sort: "categoryTotalDesc",
    icon: <IconCategoryTotals />,
    labelKey: "personnel.nonAdvanceSortCategoryTotal",
  },
];

type Props = {
  value: NonAdvanceExpenseSort;
  onChange: (v: NonAdvanceExpenseSort) => void;
  t: (key: string) => string;
  className?: string;
  /** When false, hides category-total sort (advances / combined list). Default true. */
  includeCategorySort?: boolean;
  /** i18n key for the group `aria-label` */
  groupAriaLabelKey?: string;
};

export function NonAdvanceExpenseSortBar({
  value,
  onChange,
  t,
  className,
  includeCategorySort = true,
  groupAriaLabelKey = "personnel.nonAdvanceSortGroupAria",
}: Props) {
  const btns = includeCategorySort
    ? BTNS_ALL
    : BTNS_ALL.filter((b) => b.sort !== "categoryTotalDesc");
  return (
    <div
      className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}
      role="group"
      aria-label={t(groupAriaLabelKey)}
    >
      <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500">
        {t("personnel.nonAdvanceSortLabel")}
      </span>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {btns.map(({ sort, icon, labelKey }) => {
          const label = t(labelKey);
          return (
            <Tooltip key={sort} content={label} delayMs={200}>
              <button
                type="button"
                aria-pressed={value === sort}
                aria-label={label}
                onClick={() => onChange(sort)}
                className={cn(
                  "inline-flex h-11 min-w-11 items-center justify-center rounded-xl border px-2.5 transition sm:h-10 sm:min-w-10",
                  value === sort
                    ? "border-violet-500 bg-violet-50 text-violet-900 shadow-sm ring-2 ring-violet-400/40"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                )}
              >
                {icon}
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
