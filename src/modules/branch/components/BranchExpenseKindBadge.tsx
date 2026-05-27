"use client";

import {
  branchExpenseKind,
  branchExpenseKindLabel,
  type BranchExpenseKind,
} from "@/modules/branch/lib/branch-transaction-options";
import type { BranchTransaction } from "@/types/branch-transaction";

const KIND_STYLES: Record<BranchExpenseKind, string> = {
  advance: "border-amber-200 bg-amber-50 text-amber-900",
  personnel: "border-violet-200 bg-violet-50 text-violet-900",
  overhead: "border-sky-200 bg-sky-50 text-sky-900",
  invoice: "border-rose-200 bg-rose-50 text-rose-900",
  branch: "border-zinc-200 bg-zinc-100 text-zinc-700",
};

/** Şube gider satırının türünü renkli rozet olarak gösterir. */
export function BranchExpenseKindBadge({
  row,
  t,
  className,
}: {
  row: BranchTransaction;
  t: (key: string) => string;
  className?: string;
}) {
  const kind = branchExpenseKind(row);
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-tight ${KIND_STYLES[kind]}${className ? ` ${className}` : ""}`}
    >
      {branchExpenseKindLabel(kind, t)}
    </span>
  );
}
