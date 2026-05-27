"use client";

import { useI18n } from "@/i18n/context";
import { financialBreakdownMainLabel } from "@/modules/reports/lib/financial-breakdown-labels";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type { FinancialReport } from "@/types/reports";
import { useMemo } from "react";

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
  const personnelTotal = advance + salary;

  // Tedarikçi ödemeleri kaynak bazında (CASH=kasa / PATRON / BANK); kaynak tipinde topla.
  const supplierBySource = new Map<string, { sourceType: string; total: number }>();
  for (const r of (data.supplierPayments ?? []).filter((x) => norm(x.currencyCode) === ccu)) {
    const key = norm(r.sourceType);
    const g = supplierBySource.get(key) ?? { sourceType: key, total: 0 };
    g.total += r.totalAmount;
    supplierBySource.set(key, g);
  }
  const supplierRows = [...supplierBySource.values()].sort((a, b) => b.total - a.total);
  const supplier = supplierRows.reduce((s, r) => s + r.total, 0);
  // Net'e (kasa) yansıyan kısım — yalnızca şube kasasından nakit ödenen.
  const supplierRegisterCash = totals?.totalSupplierRegisterCashPaid ?? 0;

  const overhead = (data.generalOverheadAllocated ?? [])
    .filter((r) => norm(r.currencyCode) === ccu)
    .reduce((s, r) => s + r.totalAmount, 0);

  const residualRows = (data.branchExpenseResidualByCategory ?? []).filter(
    (r) => norm(r.currencyCode) === ccu
  );
  const residualTotal = residualRows.reduce((s, r) => s + r.totalAmount, 0);

  const vehicleRows = (data.vehicleExpensesByPlate ?? []).filter(
    (r) => norm(r.currencyCode) === ccu
  );
  const vehicleTotal = vehicleRows.reduce((s, r) => s + r.totalAmount, 0);

  // Araç satırlarını plaka altında grupla.
  const vehicleByPlate = new Map<
    string,
    { plate: string; brand: string; model: string; total: number; items: { type: string; amount: number }[] }
  >();
  for (const r of vehicleRows) {
    const key = r.plateNumber || "—";
    const g =
      vehicleByPlate.get(key) ??
      { plate: key, brand: r.brand, model: r.model, total: 0, items: [] };
    g.total += r.totalAmount;
    g.items.push({ type: r.expenseType, amount: r.totalAmount });
    vehicleByPlate.set(key, g);
  }

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
    personnelTotal,
    supplier,
    supplierRows,
    supplierRegisterCash,
    overhead,
    residualRows,
    residualTotal,
    vehicleGroups: [...vehicleByPlate.values()].sort((a, b) => b.total - a.total),
    vehicleTotal,
    expenseTotal,
    treeNet,
    systemNet,
    hasAny: incomeTotal !== 0 || expenseTotal !== 0,
  };
}

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
    <div className={`space-y-6 ${className ?? ""}`}>
      {trees.map((tree) => {
        const fmt = (n: number) => formatLocaleAmount(n, locale, tree.cc);
        const netDelta = tree.systemNet - tree.treeNet;
        return (
          <section
            key={tree.cc}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <header className="mb-3 flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {t("reports.summaryTreeTitle")}
              </h2>
              <span className="text-xs font-medium text-zinc-400">{tree.cc.toUpperCase()}</span>
            </header>

            {/* GELİR */}
            <Row
              label={t("reports.summaryTreeIncome")}
              amount={fmt(tree.incomeTotal)}
              tone="income"
              level={0}
            />
            <Row
              label={t("reports.summaryTreeIncomeFromBranches")}
              amount={fmt(tree.incomeCash + tree.incomeCard)}
              level={1}
            />
            <Row label={t("reports.summaryTreeCash")} amount={fmt(tree.incomeCash)} level={2} muted />
            <Row label={t("reports.summaryTreeCard")} amount={fmt(tree.incomeCard)} level={2} muted />

            <div className="my-3 border-t border-dashed border-zinc-200 dark:border-zinc-800" />

            {/* GİDER */}
            <Row
              label={t("reports.summaryTreeExpense")}
              amount={fmt(tree.expenseTotal)}
              tone="expense"
              level={0}
            />

            {/* Personel */}
            <Row label={t("reports.summaryTreePersonnel")} amount={fmt(tree.personnelTotal)} level={1} />
            <Row label={t("reports.summaryTreeAdvance")} amount={fmt(tree.advance)} level={2} muted />
            <Row
              label={t("reports.summaryTreePersonnelExpense")}
              amount={fmt(tree.salary)}
              level={2}
              muted
            />

            {/* Şubeye giden (diğer) — kategori bazlı */}
            <Row
              label={t("reports.summaryTreeBranchOther")}
              amount={fmt(tree.residualTotal)}
              level={1}
            />
            {tree.residualRows.map((r) => (
              <Row
                key={`res-${r.mainCategory ?? r.category}`}
                label={financialBreakdownMainLabel(r.mainCategory, t)}
                amount={fmt(r.totalAmount)}
                level={2}
                muted
              />
            ))}

            {/* Araç — plaka bazlı */}
            <Row label={t("reports.summaryTreeVehicle")} amount={fmt(tree.vehicleTotal)} level={1} />
            {tree.vehicleGroups.map((g) => (
              <div key={`veh-${g.plate}`}>
                <Row
                  label={`${g.plate}${g.brand ? ` · ${g.brand} ${g.model}` : ""}`}
                  amount={fmt(g.total)}
                  level={2}
                />
                {g.items.map((it, i) => (
                  <Row
                    key={`veh-${g.plate}-${it.type}-${i}`}
                    label={it.type || "—"}
                    amount={fmt(it.amount)}
                    level={3}
                    muted
                  />
                ))}
              </div>
            ))}

            {/* Genel gider */}
            <Row
              label={t("reports.summaryTreeGeneralOverhead")}
              amount={fmt(tree.overhead)}
              level={1}
            />

            {/* Tedarikçi — ödeme kaynağı bazında (kasa / patron / banka) */}
            <Row label={t("reports.summaryTreeSupplier")} amount={fmt(tree.supplier)} level={1} />
            {tree.supplierRows.map((r) => (
              <Row
                key={`sup-${r.sourceType}`}
                label={supplierSourceLabel(r.sourceType, t)}
                amount={fmt(r.total)}
                level={2}
                muted
              />
            ))}

            <div className="my-3 border-t border-zinc-300 dark:border-zinc-700" />

            {/* NET */}
            <Row
              label={t("reports.summaryTreeNet")}
              amount={fmt(tree.treeNet)}
              tone={tree.treeNet >= 0 ? "income" : "expense"}
              level={0}
              strong
            />

            {Math.abs(netDelta) > EPS && (
              <p className="mt-2 text-[11px] text-zinc-400">
                {t("reports.summaryTreeSystemNetNote")}: {fmt(tree.systemNet)} ·{" "}
                {t("reports.summaryTreeOffRegisterNote")}
              </p>
            )}

            {branchScoped && (
              <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-500">
                {t("reports.summaryTreeBranchOnlyAllBranches")}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Row({
  label,
  amount,
  level,
  tone,
  muted,
  strong,
}: {
  label: string;
  amount: string;
  level: 0 | 1 | 2 | 3;
  tone?: "income" | "expense";
  muted?: boolean;
  strong?: boolean;
}) {
  // Mobilde dar, sm+ ekranda geniş girinti; alt seviyeler ayrıca sol çizgiyle vurgulanır.
  const padByLevel = [
    "pl-0",
    "pl-2 sm:pl-4",
    "pl-3 sm:pl-8 border-l border-zinc-100 dark:border-zinc-800",
    "pl-4 sm:pl-12 border-l border-zinc-100 dark:border-zinc-800",
  ] as const;
  const toneClass =
    tone === "income"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "expense"
        ? "text-rose-600 dark:text-rose-400"
        : muted
          ? "text-zinc-500 dark:text-zinc-400"
          : "text-zinc-800 dark:text-zinc-200";
  const weight = strong || level === 0 ? "font-semibold" : "font-normal";
  const size = level >= 2 ? "text-[13px]" : "text-sm";
  return (
    <div
      className={`flex items-baseline justify-between gap-2 py-0.5 sm:gap-3 ${padByLevel[level]} ${size}`}
    >
      <span className={`${toneClass} ${weight} min-w-0 truncate`} title={label}>
        {label}
      </span>
      <span className={`${toneClass} ${weight} shrink-0 tabular-nums whitespace-nowrap`}>
        {amount}
      </span>
    </div>
  );
}
