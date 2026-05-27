"use client";

import { useI18n } from "@/i18n/context";
import { financialBreakdownMainLabel } from "@/modules/reports/lib/financial-breakdown-labels";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type { FinancialReport } from "@/types/reports";
import { useMemo, type ReactNode } from "react";

type Props = {
  data: FinancialReport;
  /** Seçili para birimi ("" = hepsi). */
  filterCurrencyCode?: string;
  /** Şube filtresi aktif mi (araç/diğer kırılım yalnızca tüm şubelerde gelir). */
  branchScoped?: boolean;
  className?: string;
};

const EPS = 0.005;

/** Tedarikçi ödeme kaynağı etiketi (CASH=kasa / PATRON / BANK). */
function supplierSourceLabel(sourceType: string, t: (k: string) => string): string {
  const u = sourceType.trim().toUpperCase();
  if (u === "CASH") return t("reports.summaryTreeSupplierCash");
  if (u === "PATRON") return t("reports.summaryTreeSupplierPatron");
  if (u === "BANK") return t("reports.summaryTreeSupplierBank");
  return sourceType || "—";
}

type DetailItem = { label: string; amount: number };

/** Bir para birimi için ağacı kuran türetilmiş model. */
function buildCurrencyTree(data: FinancialReport, cc: string) {
  const norm = (s: string) => s.trim().toUpperCase();
  const ccu = norm(cc);

  const totals = data.totalsByCurrency.find((r) => norm(r.currencyCode) === ccu);
  const incomeBd = (data.incomeRegisterBreakdownByCurrency ?? []).find(
    (r) => norm(r.currencyCode) === ccu
  );

  const incomeTotal = totals?.totalIncome ?? 0;
  const incomeCash = incomeBd?.incomeCash ?? 0;
  const incomeCard = incomeBd?.incomeCard ?? 0;

  const advance = totals?.totalAdvanceGiven ?? 0;
  const salary = totals?.totalSalaryPaid ?? 0;
  const personnelExpenseRows = (data.personnelExpenseByCategory ?? []).filter(
    (r) => norm(r.currencyCode) === ccu
  );
  const personnelExpenseExtra = personnelExpenseRows.reduce((s, r) => s + r.totalAmount, 0);
  const personnelTotal = advance + salary + personnelExpenseExtra;

  // Tedarikçi ödemeleri kaynak bazında (CASH=kasa / PATRON / BANK).
  const supplierBySource = new Map<string, { sourceType: string; total: number }>();
  for (const r of (data.supplierPayments ?? []).filter((x) => norm(x.currencyCode) === ccu)) {
    const key = norm(r.sourceType);
    const g = supplierBySource.get(key) ?? { sourceType: key, total: 0 };
    g.total += r.totalAmount;
    supplierBySource.set(key, g);
  }
  const supplierRows = [...supplierBySource.values()].sort((a, b) => b.total - a.total);
  const supplier = supplierRows.reduce((s, r) => s + r.total, 0);

  const overheadRows = (data.generalOverheadAllocated ?? []).filter(
    (r) => norm(r.currencyCode) === ccu
  );
  const overhead = overheadRows.reduce((s, r) => s + r.totalAmount, 0);

  const residualRows = (data.branchExpenseResidualByCategory ?? []).filter(
    (r) => norm(r.currencyCode) === ccu
  );
  const residualTotal = residualRows.reduce((s, r) => s + r.totalAmount, 0);

  const vehicleRows = (data.vehicleExpensesByPlate ?? []).filter(
    (r) => norm(r.currencyCode) === ccu
  );
  const vehicleTotal = vehicleRows.reduce((s, r) => s + r.totalAmount, 0);

  const expenseTotal = personnelTotal + supplier + overhead + residualTotal + vehicleTotal;
  const treeNet = incomeTotal - expenseTotal;
  const systemNet = totals?.netCash ?? treeNet;

  return {
    cc,
    incomeTotal,
    incomeCash,
    incomeCard,
    advance,
    salary,
    personnelExpenseRows,
    personnelTotal,
    supplierRows,
    supplier,
    overheadRows,
    overhead,
    residualRows,
    residualTotal,
    vehicleRows,
    vehicleTotal,
    expenseTotal,
    treeNet,
    systemNet,
    hasAny: incomeTotal !== 0 || expenseTotal !== 0,
  };
}

/** Kova renk paleti (accent + bar dolgu). */
const BUCKET_COLORS = {
  personnel: { dot: "bg-violet-500", bar: "bg-violet-500/70" },
  branch: { dot: "bg-sky-500", bar: "bg-sky-500/70" },
  vehicle: { dot: "bg-amber-500", bar: "bg-amber-500/70" },
  overhead: { dot: "bg-slate-400", bar: "bg-slate-400/70" },
  supplier: { dot: "bg-teal-500", bar: "bg-teal-500/70" },
} as const;

export function FinancialSummaryTree({
  data,
  filterCurrencyCode,
  branchScoped = false,
  className,
}: Props) {
  const { t, locale } = useI18n();

  const currencies = useMemo(() => {
    const norm = (s: string) => s.trim().toUpperCase();
    const wanted = filterCurrencyCode ? norm(filterCurrencyCode) : "";
    const codes = data.totalsByCurrency
      .map((r) => r.currencyCode)
      .filter((c) => (wanted ? norm(c) === wanted : true));
    return [...new Set(codes.map((c) => c.trim()))];
  }, [data.totalsByCurrency, filterCurrencyCode]);

  const trees = useMemo(
    () => currencies.map((cc) => buildCurrencyTree(data, cc)).filter((x) => x.hasAny),
    [currencies, data]
  );

  if (trees.length === 0) {
    return (
      <p className={`text-sm text-zinc-500 ${className ?? ""}`}>
        {t("reports.summaryTreeNoData")}
      </p>
    );
  }

  return (
    <div className={`space-y-5 ${className ?? ""}`}>
      {trees.map((tree) => {
        const fmt = (n: number) => formatLocaleAmount(n, locale, tree.cc);
        const netDelta = tree.systemNet - tree.treeNet;
        const denom = tree.expenseTotal || 1;

        // Personel alt kalemleri
        const personnelItems: DetailItem[] = [
          { label: t("reports.summaryTreeAdvance"), amount: tree.advance },
          ...(tree.salary > EPS ? [{ label: t("reports.summaryTreeSalary"), amount: tree.salary }] : []),
          ...tree.personnelExpenseRows.map((r) => ({
            label: financialBreakdownMainLabel(r.mainCategory, t),
            amount: r.totalAmount,
          })),
        ].filter((i) => Math.abs(i.amount) > EPS);

        const branchItems: DetailItem[] = tree.residualRows.map((r) => ({
          label: financialBreakdownMainLabel(r.mainCategory, t),
          amount: r.totalAmount,
        }));

        const vehicleItems: DetailItem[] = tree.vehicleRows.map((r) => ({
          label: `${r.plateNumber || "—"} · ${r.expenseType || "—"}`,
          amount: r.totalAmount,
        }));

        const overheadItems: DetailItem[] = tree.overheadRows.map((r) => ({
          label: r.title || "—",
          amount: r.totalAmount,
        }));

        const supplierItems: DetailItem[] = tree.supplierRows.map((r) => ({
          label: supplierSourceLabel(r.sourceType, t),
          amount: r.total,
        }));

        const buckets = [
          {
            key: "personnel" as const,
            label: t("reports.summaryTreePersonnel"),
            amount: tree.personnelTotal,
            items: personnelItems,
          },
          {
            key: "branch" as const,
            label: t("reports.summaryTreeBranchOther"),
            amount: tree.residualTotal,
            items: branchItems,
          },
          {
            key: "vehicle" as const,
            label: t("reports.summaryTreeVehicle"),
            amount: tree.vehicleTotal,
            items: vehicleItems,
          },
          {
            key: "overhead" as const,
            label: t("reports.summaryTreeGeneralOverhead"),
            amount: tree.overhead,
            items: overheadItems,
          },
          {
            key: "supplier" as const,
            label: t("reports.summaryTreeSupplier"),
            amount: tree.supplier,
            items: supplierItems,
          },
        ];

        return (
          <section
            key={tree.cc}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("reports.summaryTreeTitle")}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">{t("reports.summaryTreeSubtitle")}</p>
              </div>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
                {tree.cc.toUpperCase()}
              </span>
            </header>

            {/* KPI tiles */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <Kpi
                label={t("reports.summaryTreeIncome")}
                amount={fmt(tree.incomeTotal)}
                tone="income"
              />
              <Kpi
                label={t("reports.summaryTreeExpense")}
                amount={fmt(tree.expenseTotal)}
                tone="expense"
              />
              <Kpi
                label={t("reports.summaryTreeNet")}
                amount={fmt(tree.treeNet)}
                tone={tree.treeNet >= 0 ? "income" : "expense"}
                emphasize
              />
            </div>

            {/* Gelir kırılımı */}
            <div className="mt-4">
              <SectionLabel>{t("reports.summaryTreeIncomeFromBranches")}</SectionLabel>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <MiniStat label={t("reports.summaryTreeCash")} value={fmt(tree.incomeCash)} />
                <MiniStat label={t("reports.summaryTreeCard")} value={fmt(tree.incomeCard)} />
              </div>
            </div>

            {/* Gider kovaları */}
            <div className="mt-4">
              <SectionLabel>{t("reports.summaryTreeExpense")}</SectionLabel>
              <div className="mt-1.5 divide-y divide-zinc-100 dark:divide-zinc-800">
                {buckets.map((b) => (
                  <ExpenseBucket
                    key={b.key}
                    label={b.label}
                    amount={fmt(b.amount)}
                    share={b.amount / denom}
                    colors={BUCKET_COLORS[b.key]}
                    items={b.items.map((it) => ({ label: it.label, amount: fmt(it.amount) }))}
                  />
                ))}
              </div>
            </div>

            {/* Net + notlar */}
            <div className="mt-4 flex items-baseline justify-between border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {t("reports.summaryTreeNet")}
              </span>
              <span
                className={`text-lg font-bold tabular-nums ${
                  tree.treeNet >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {fmt(tree.treeNet)}
              </span>
            </div>

            {Math.abs(netDelta) > EPS && (
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                {t("reports.summaryTreeSystemNetNote")}: {fmt(tree.systemNet)} ·{" "}
                {t("reports.summaryTreeOffRegisterNote")}
              </p>
            )}

            {branchScoped && (
              <p className="mt-2 text-[11px] leading-relaxed text-amber-600 dark:text-amber-500">
                {t("reports.summaryTreeBranchOnlyAllBranches")}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Kpi({
  label,
  amount,
  tone,
  emphasize,
}: {
  label: string;
  amount: string;
  tone: "income" | "expense";
  emphasize?: boolean;
}) {
  const toneClass =
    tone === "income"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        emphasize
          ? "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${toneClass}`}>{amount}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
      <div className="text-[11px] text-zinc-400">{label}</div>
      <div className="text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
        {value}
      </div>
    </div>
  );
}

function ExpenseBucket({
  label,
  amount,
  share,
  colors,
  items,
}: {
  label: string;
  amount: string;
  share: number;
  colors: { dot: string; bar: string };
  items: { label: string; amount: string }[];
}) {
  const pct = Math.max(0, Math.min(100, share * 100));
  const header = (
    <div className="flex items-center gap-2.5 py-2.5">
      <span className={`size-2 shrink-0 rounded-full ${colors.dot}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {label}
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
            {amount}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );

  if (items.length === 0) {
    return header;
  }

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden">
        <div className="flex-1">{header}</div>
        <svg
          className="ml-1 size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-90"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d="M7 5l6 5-6 5V5z" />
        </svg>
      </summary>
      <div className="mb-2 ml-[1.125rem] space-y-1 border-l border-zinc-100 pl-3 dark:border-zinc-800">
        {items.map((it, i) => (
          <div
            key={`${it.label}-${i}`}
            className="flex items-baseline justify-between gap-2 text-[13px]"
          >
            <span className="min-w-0 truncate text-zinc-500 dark:text-zinc-400" title={it.label}>
              {it.label}
            </span>
            <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
              {it.amount}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}
