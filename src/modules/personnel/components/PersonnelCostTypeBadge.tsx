"use client";

import { cn } from "@/lib/cn";

const iconCls = "h-3.5 w-3.5 shrink-0";

function IconAdvance() {
  return (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconExpense() {
  return (
    <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
    </svg>
  );
}

export function PersonnelCostTypeBadge({
  kind,
  t,
  className,
}: {
  kind: "advance" | "expense";
  t: (k: string) => string;
  className?: string;
}) {
  const isAdv = kind === "advance";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide",
        isAdv
          ? "border-amber-300/90 bg-amber-50 text-amber-900"
          : "border-rose-300/90 bg-rose-50 text-rose-900",
        className
      )}
    >
      {isAdv ? <IconAdvance /> : <IconExpense />}
      {t(isAdv ? "personnel.costsTypeAdvance" : "personnel.costsTypeExpense")}
    </span>
  );
}
