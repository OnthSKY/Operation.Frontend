"use client";

import { useBranchTransactions } from "@/modules/branch/hooks/useBranchQueries";
import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { useEffect, useMemo, useState } from "react";

const EPS = 0.005;

type SourceKey = "REGISTER" | "PATRON" | "UNSET";
type TypeKey = "ADVANCE" | "PERSONNEL" | "SUPPLIER" | "OVERHEAD" | "BRANCH";

const SOURCE_TONE: Record<
  SourceKey,
  { bar: string; chip: string; label: string }
> = {
  REGISTER: {
    bar: "bg-rose-500",
    chip: "text-rose-900",
    label: "Kasadan ödenen",
  },
  PATRON: {
    bar: "bg-amber-500",
    chip: "text-amber-900",
    label: "Patron tarafından ödenen",
  },
  UNSET: {
    bar: "bg-zinc-400",
    chip: "text-zinc-700",
    label: "Sınıflandırılmamış",
  },
};

const TYPE_META: Record<TypeKey, { label: string; icon: string }> = {
  ADVANCE:   { label: "Avans",            icon: "💵" },
  PERSONNEL: { label: "Personel gideri",  icon: "👤" },
  SUPPLIER:  { label: "Tedarikçi gideri", icon: "🧾" },
  OVERHEAD:  { label: "Genel gider",      icon: "🏛️" },
  BRANCH:    { label: "Şube gideri",      icon: "🏪" },
};

const TYPE_ORDER: TypeKey[] = ["ADVANCE", "PERSONNEL", "SUPPLIER", "OVERHEAD", "BRANCH"];

const EXCLUDED_CLASSIFICATIONS = new Set([
  "OUT_POCKET_REPAY",
  "OUT_PATRON_DEBT_REPAY",
  "OUT_POCKET_CLAIM_TRANSFER",
  "OUT_POCKET_CLAIM_TO_PATRON",
]);

function classifySource(src: string | null | undefined): SourceKey | null {
  const u = String(src ?? "").trim().toUpperCase();
  if (u === "REGISTER") return "REGISTER";
  if (u === "PATRON") return "PATRON";
  if (u === "PERSONNEL_POCKET" || u === "PERSONNEL_HELD_REGISTER_CASH") return null;
  return "UNSET";
}

function classifyType(tx: BranchTransaction): TypeKey {
  const code = String(tx.mainCategory ?? "").trim().toUpperCase();
  if (tx.linkedAdvanceId != null && tx.linkedAdvanceId > 0) return "ADVANCE";
  if (code === "OUT_PER_ADVANCE") return "ADVANCE";
  if (tx.linkedSupplierInvoiceLineId != null && tx.linkedSupplierInvoiceLineId > 0)
    return "SUPPLIER";
  if (code === "OUT_OPS_INVOICE") return "SUPPLIER";
  if (tx.generalOverheadPoolId != null && tx.generalOverheadPoolId > 0) return "OVERHEAD";
  if (tx.linkedSalaryPaymentId != null && tx.linkedSalaryPaymentId > 0) return "PERSONNEL";
  if (code.startsWith("OUT_PER")) return "PERSONNEL";
  return "BRANCH";
}

type PersonnelTarget = {
  kind: "personnel";
  personnelId: number;
  txId: number;
  /** Avans satırı ise advance.id — personel detayında costs sekmesinde "a-<id>" hücresini işaretler. */
  advanceId?: number | null;
};
type SupplierTarget = { kind: "supplier"; invoiceLineId: number; txId: number };
type BranchTarget = { kind: "branch"; branchId: number; txId: number };
type OverheadTarget = { kind: "overhead"; poolId: number; txId: number };
type ClickTarget = PersonnelTarget | SupplierTarget | BranchTarget | OverheadTarget | null;

type LeafRow = {
  key: string;
  category: string;
  recipient: string | null;
  amount: number;
  target: ClickTarget;
};
type TypeBucket = { type: TypeKey; total: number; rows: LeafRow[] };
type SourceBucket = { source: SourceKey; total: number; types: TypeBucket[] };

function recipientFromTx(tx: BranchTransaction, ty: TypeKey): string | null {
  if (ty === "ADVANCE") {
    return (
      tx.linkedAdvancePersonnelFullName?.trim() ||
      tx.linkedPersonnelFullName?.trim() ||
      null
    );
  }
  if (ty === "PERSONNEL") {
    return (
      tx.linkedSalaryPersonnelFullName?.trim() ||
      tx.linkedPersonnelFullName?.trim() ||
      null
    );
  }
  return null; // SUPPLIER / OVERHEAD / BRANCH — yapı için ileride genişler
}

function targetFromTx(
  tx: BranchTransaction,
  ty: TypeKey,
  fallbackBranchId: number
): ClickTarget {
  const txId = Number(tx.id);
  if (ty === "ADVANCE" || ty === "PERSONNEL") {
    const pid =
      (tx.linkedAdvancePersonnelId as number | null | undefined) ??
      (tx.linkedSalaryPersonnelId as number | null | undefined) ??
      (tx.linkedPersonnelId as number | null | undefined) ??
      null;
    if (pid && pid > 0) {
      const advanceId =
        ty === "ADVANCE"
          ? ((tx.linkedAdvanceId as number | null | undefined) ?? null)
          : null;
      return { kind: "personnel", personnelId: pid, txId, advanceId };
    }
    return null;
  }
  if (ty === "SUPPLIER") {
    const lid = tx.linkedSupplierInvoiceLineId as number | null | undefined;
    if (lid && lid > 0) return { kind: "supplier", invoiceLineId: lid, txId };
    return null;
  }
  if (ty === "OVERHEAD") {
    const pid = tx.generalOverheadPoolId as number | null | undefined;
    if (pid && pid > 0) return { kind: "overhead", poolId: pid, txId };
    return null;
  }
  // BRANCH → şube detay overlay
  return { kind: "branch", branchId: fallbackBranchId, txId };
}

export function BranchExpenseSourceTypeBreakdown({
  branchId,
  date,
  locale,
  t,
  totalExpense,
  onSelectTarget,
  onComputedTotalChange,
}: {
  branchId: number;
  date: string;
  locale: Locale;
  t: (key: string) => string;
  totalExpense?: number;
  /** Bir leaf satıra tıklanınca parent ilgili overlay/route'u açar. */
  onSelectTarget?: (target: ClickTarget) => void;
  /** Component'in gerçekten saydığı satırların toplamı — sticky bar parent ile birebir tutarlılık için. */
  onComputedTotalChange?: (total: number) => void;
}) {
  const query = useBranchTransactions(branchId, date, true);
  const [openSources, setOpenSources] = useState<Set<SourceKey>>(
    () => new Set(["REGISTER", "PATRON", "UNSET"])
  );

  const sourceBuckets = useMemo<SourceBucket[]>(() => {
    const list = (query.data ?? []) as BranchTransaction[];
    type LeafAgg = { category: string; recipient: string | null; amount: number; target: ClickTarget };
    const map = new Map<SourceKey, Map<TypeKey, Map<string, LeafAgg>>>();
    for (const tx of list) {
      if (String(tx.type ?? "").trim().toUpperCase() !== "OUT") continue;
      const code = String(tx.mainCategory ?? "").trim().toUpperCase();
      if (EXCLUDED_CLASSIFICATIONS.has(code)) continue;
      const src = classifySource(tx.expensePaymentSource);
      if (!src) continue;
      const amt = Number(tx.amount) || 0;
      if (amt <= EPS) continue;
      const ty = classifyType(tx);
      const category =
        txCategoryLine(tx.mainCategory, tx.category, t).trim() || t("personnel.dash");
      const recipient = recipientFromTx(tx, ty);
      const target = targetFromTx(tx, ty, branchId);
      // Aggregation key: category + recipient + target-kind|id (aynı kategori aynı kişi/teder. birleşir)
      const tgtKey = target
        ? `${target.kind}:${
            target.kind === "personnel"
              ? `${target.personnelId}|a${target.advanceId ?? 0}|tx${target.txId}`
              : target.kind === "supplier" ? target.invoiceLineId :
                target.kind === "overhead" ? target.poolId :
                target.branchId
          }`
        : "none";
      const aggKey = `${category}|${recipient ?? ""}|${tgtKey}`;
      const srcMap = map.get(src) ?? new Map<TypeKey, Map<string, LeafAgg>>();
      map.set(src, srcMap);
      const tyMap = srcMap.get(ty) ?? new Map<string, LeafAgg>();
      srcMap.set(ty, tyMap);
      const prev = tyMap.get(aggKey);
      if (prev) {
        prev.amount += amt;
      } else {
        tyMap.set(aggKey, { category, recipient, amount: amt, target });
      }
    }
    const out: SourceBucket[] = [];
    for (const src of ["REGISTER", "PATRON", "UNSET"] as SourceKey[]) {
      const srcMap = map.get(src);
      if (!srcMap) continue;
      const types: TypeBucket[] = [];
      let srcTotal = 0;
      for (const ty of TYPE_ORDER) {
        const tyMap = srcMap.get(ty);
        if (!tyMap) continue;
        const rows: LeafRow[] = [...tyMap.entries()]
          .map(([key, v]) => ({ key, ...v }))
          .sort((a, b) => b.amount - a.amount);
        const total = rows.reduce((s, c) => s + c.amount, 0);
        if (total <= EPS) continue;
        types.push({ type: ty, total, rows });
        srcTotal += total;
      }
      if (srcTotal > EPS) out.push({ source: src, total: srcTotal, types });
    }
    return out;
  }, [query.data, t, branchId]);

  const grandTotal = sourceBuckets.reduce((s, b) => s + b.total, 0);
  const totalMismatch =
    totalExpense != null && Math.abs(grandTotal - totalExpense) > EPS;

  // Parent'a hesaplanan toplamı bildir — sticky bar her zaman breakdown ile birebir aynı kalsın.
  useEffect(() => {
    if (!onComputedTotalChange) return;
    if (query.isPending) return;
    onComputedTotalChange(grandTotal);
  }, [grandTotal, query.isPending, onComputedTotalChange]);

  function toggleSource(src: SourceKey) {
    setOpenSources((prev) => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src);
      else next.add(src);
      return next;
    });
  }

  if (query.isPending) {
    return <p className="text-xs text-zinc-500">{t("common.loading")}</p>;
  }
  if (sourceBuckets.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 px-3 py-3 text-center text-xs text-zinc-500">
        {t("dashboard.dailyRegisterExpenseNoOutHint") || "Gider kaydı yok."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sourceBuckets.map((sb) => {
        const tone = SOURCE_TONE[sb.source];
        const open = openSources.has(sb.source);
        return (
          <div
            key={sb.source}
            className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
          >
            <button
              type="button"
              onClick={() => toggleSource(sb.source)}
              aria-expanded={open}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-zinc-50"
            >
              <span aria-hidden className={cn("h-5 w-1 shrink-0 rounded-full", tone.bar)} />
              <span className="min-w-0 flex-1 text-[12px] font-semibold text-zinc-800">
                {tone.label}
              </span>
              <span className={cn("shrink-0 text-sm font-bold tabular-nums", tone.chip)}>
                {formatLocaleAmount(sb.total, locale)}
              </span>
              <span
                aria-hidden
                className={cn(
                  "shrink-0 text-zinc-400 transition-transform",
                  open && "rotate-180"
                )}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </button>

            {open ? (
              <ul className="border-t border-zinc-100">
                {sb.types.map((tb) => {
                  const meta = TYPE_META[tb.type];
                  return (
                    <li key={tb.type} className="border-b border-zinc-100 last:border-b-0 px-3 py-2">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span aria-hidden className="text-[13px] leading-none">{meta.icon}</span>
                          <span className="text-[11px] font-semibold text-zinc-700">{meta.label}</span>
                        </div>
                        <span className="shrink-0 text-[12px] font-semibold tabular-nums text-zinc-800">
                          {formatLocaleAmount(tb.total, locale)}
                        </span>
                      </div>
                      <ul className="space-y-0.5">
                        {tb.rows.map((r) => {
                          const clickable = r.target != null && onSelectTarget != null;
                          const handleClick = () => {
                            if (clickable && r.target) onSelectTarget!(r.target);
                          };
                          return (
                            <li key={r.key}>
                              <button
                                type="button"
                                disabled={!clickable}
                                onClick={handleClick}
                                className={cn(
                                  "group flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left transition",
                                  clickable
                                    ? "hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 cursor-pointer"
                                    : "cursor-default"
                                )}
                              >
                                <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-600">
                                  {r.recipient ? (
                                    <>
                                      <span className="font-medium text-zinc-800">{r.recipient}</span>
                                      <span className="ml-1 text-zinc-400">· {r.category}</span>
                                    </>
                                  ) : (
                                    r.category
                                  )}
                                </span>
                                <span className="shrink-0 text-[11px] tabular-nums text-zinc-700">
                                  {formatLocaleAmount(r.amount, locale)}
                                </span>
                                {clickable ? (
                                  <span
                                    aria-hidden
                                    className="shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500"
                                  >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="m9 18 6-6-6-6" />
                                    </svg>
                                  </span>
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}

      {totalMismatch && onComputedTotalChange == null ? (
        <p className="text-[10px] text-amber-700">
          ⚠ Toplam ({formatLocaleAmount(grandTotal, locale)}) ile özet API ({formatLocaleAmount(
            totalExpense!,
            locale
          )}) eşleşmiyor.
        </p>
      ) : null}
    </div>
  );
}

export type BranchExpenseClickTarget = ClickTarget;
