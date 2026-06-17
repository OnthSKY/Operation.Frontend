"use client";

import { useI18n } from "@/i18n/context";
import { expensePaymentSourceLabel } from "@/modules/branch/lib/branch-transaction-options";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import type {
  ExpenseAtAGlanceRow,
  ExpenseSourceSlice,
  ExpenseUsageSlice,
  FinancialReport,
} from "@/types/reports";
import { useMemo } from "react";

type Props = {
  data: FinancialReport;
  /** Seçili para birimi ("" = hepsi). */
  filterCurrencyCode?: string;
  /** Şube filtresi aktif mi (araç yalnızca tüm şubelerde anlamlı). */
  branchScoped?: boolean;
  className?: string;
};

const EPS = 0.005;

type SourceKey =
  | "REGISTER"
  | "PATRON"
  | "PERSONNEL_HELD_REGISTER_CASH"
  | "BANK"
  | "UNSET";

const SOURCE_ORDER: SourceKey[] = [
  "REGISTER",
  "PATRON",
  "PERSONNEL_HELD_REGISTER_CASH",
  "BANK",
  "UNSET",
];

const SOURCE_TONE: Record<
  SourceKey,
  { dot: string; bar: string; bg: string; text: string; ring: string }
> = {
  REGISTER: {
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    ring: "ring-emerald-200",
  },
  PATRON: {
    dot: "bg-violet-500",
    bar: "bg-violet-500",
    bg: "bg-violet-50",
    text: "text-violet-800",
    ring: "ring-violet-200",
  },
  PERSONNEL_HELD_REGISTER_CASH: {
    dot: "bg-indigo-500",
    bar: "bg-indigo-500",
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    ring: "ring-indigo-200",
  },
  BANK: {
    dot: "bg-cyan-500",
    bar: "bg-cyan-500",
    bg: "bg-cyan-50",
    text: "text-cyan-800",
    ring: "ring-cyan-200",
  },
  UNSET: {
    dot: "bg-zinc-400",
    bar: "bg-zinc-400",
    bg: "bg-zinc-100",
    text: "text-zinc-700",
    ring: "ring-zinc-200",
  },
};

type UsageKey = "PERSONNEL" | "BRANCH_OPS" | "VEHICLE" | "OVERHEAD";

const USAGE_ORDER: UsageKey[] = ["PERSONNEL", "BRANCH_OPS", "VEHICLE", "OVERHEAD"];

const USAGE_TONE: Record<UsageKey, { dot: string; bar: string }> = {
  PERSONNEL: { dot: "bg-violet-500", bar: "bg-violet-500" },
  BRANCH_OPS: { dot: "bg-sky-500", bar: "bg-sky-500" },
  VEHICLE: { dot: "bg-amber-500", bar: "bg-amber-500" },
  OVERHEAD: { dot: "bg-slate-400", bar: "bg-slate-400" },
};

function normSource(s: string): SourceKey {
  const u = (s ?? "").trim().toUpperCase();
  if (
    u === "REGISTER" ||
    u === "PATRON" ||
    u === "PERSONNEL_HELD_REGISTER_CASH" ||
    u === "BANK"
  )
    return u as SourceKey;
  // Legacy PERSONNEL_POCKET kaldırıldı; bu satırlar belirsiz olarak işaretlenir
  // ki UNSET uyarısı düşsün ve kullanıcı kaynağı düzeltsin.
  return "UNSET";
}

function normUsage(s: string): UsageKey | "OTHER" {
  const u = (s ?? "").trim().toUpperCase();
  if (
    u === "PERSONNEL" ||
    u === "BRANCH_OPS" ||
    u === "VEHICLE" ||
    u === "OVERHEAD"
  )
    return u as UsageKey;
  return "OTHER";
}

function sourceLabel(s: SourceKey, t: (k: string) => string): string {
  if (s === "UNSET") return t("reports.summaryTreeUnsetBadge");
  if (s === "BANK") return t("reports.summaryTreeSupplierBank");
  return expensePaymentSourceLabel(s, t);
}

function usageLabel(u: UsageKey, t: (k: string) => string): string {
  if (u === "PERSONNEL") return t("reports.summaryTreePersonnel");
  if (u === "BRANCH_OPS") return t("reports.summaryTreeBranchOther");
  if (u === "VEHICLE") return t("reports.summaryTreeVehicle");
  return t("reports.summaryTreeGeneralOverhead");
}

function supplierSourceLabel(sourceType: string, t: (k: string) => string): string {
  const u = sourceType.trim().toUpperCase();
  if (u === "CASH") return t("reports.summaryTreeSupplierCash");
  if (u === "PATRON") return t("reports.summaryTreeSupplierPatron");
  if (u === "BANK") return t("reports.summaryTreeSupplierBank");
  return sourceType || "—";
}

type CurrencyView = {
  cc: string;
  glance: ExpenseAtAGlanceRow;
  incomeTotal: number;
  incomeCash: number;
  incomeCard: number;
  sources: { key: SourceKey; slice: ExpenseSourceSlice }[];
  usages: { key: UsageKey; slice: ExpenseUsageSlice }[];
  supplierRows: { sourceType: string; total: number }[];
  supplierTotal: number;
  net: number;
};

function buildView(data: FinancialReport, glance: ExpenseAtAGlanceRow): CurrencyView {
  const norm = (s: string) => s.trim().toUpperCase();
  const ccu = norm(glance.currencyCode);

  const totals = data.totalsByCurrency.find((r) => norm(r.currencyCode) === ccu);
  const incomeBd = (data.incomeRegisterBreakdownByCurrency ?? []).find(
    (r) => norm(r.currencyCode) === ccu,
  );

  const sourceMap = new Map<SourceKey, ExpenseSourceSlice>();
  for (const s of glance.bySource) {
    const k = normSource(s.source);
    const existing = sourceMap.get(k);
    if (existing) {
      sourceMap.set(k, {
        source: existing.source,
        amount: existing.amount + s.amount,
        lineCount: existing.lineCount + s.lineCount,
      });
    } else {
      sourceMap.set(k, s);
    }
  }
  const sources = SOURCE_ORDER.flatMap((k) => {
    const s = sourceMap.get(k);
    if (!s || Math.abs(s.amount) < EPS) return [];
    return [{ key: k, slice: s }];
  });

  const usageMap = new Map<UsageKey, ExpenseUsageSlice>();
  for (const u of glance.byUsage) {
    const k = normUsage(u.usage);
    if (k === "OTHER") continue;
    usageMap.set(k, u);
  }
  const usages = USAGE_ORDER.flatMap((k) => {
    const u = usageMap.get(k);
    if (!u || Math.abs(u.amount) < EPS) return [];
    return [{ key: k, slice: u }];
  });

  const supplierMap = new Map<string, number>();
  for (const r of (data.supplierPayments ?? []).filter(
    (x) => norm(x.currencyCode) === ccu,
  )) {
    const k = norm(r.sourceType);
    supplierMap.set(k, (supplierMap.get(k) ?? 0) + r.totalAmount);
  }
  const supplierRows = [...supplierMap.entries()]
    .map(([k, v]) => ({ sourceType: k, total: v }))
    .sort((a, b) => b.total - a.total);
  const supplierTotal = supplierRows.reduce((s, r) => s + r.total, 0);

  return {
    cc: glance.currencyCode,
    glance,
    incomeTotal: totals?.totalIncome ?? 0,
    incomeCash: incomeBd?.incomeCash ?? 0,
    incomeCard: incomeBd?.incomeCard ?? 0,
    sources,
    usages,
    supplierRows,
    supplierTotal,
    net: (totals?.totalIncome ?? 0) - glance.totalOutflow,
  };
}

export function FinancialSummaryTree({
  data,
  filterCurrencyCode,
  branchScoped = false,
  className,
}: Props) {
  const { t, locale } = useI18n();

  const views = useMemo(() => {
    const norm = (s: string) => s.trim().toUpperCase();
    const wanted = filterCurrencyCode ? norm(filterCurrencyCode) : "";
    const rows = data.expenseAtAGlanceByCurrency ?? [];
    return rows
      .filter((r) => (wanted ? norm(r.currencyCode) === wanted : true))
      .map((r) => buildView(data, r))
      .filter(
        (v) =>
          Math.abs(v.incomeTotal) > EPS ||
          Math.abs(v.glance.totalOutflow) > EPS ||
          Math.abs(v.supplierTotal) > EPS,
      );
  }, [data, filterCurrencyCode]);

  if (views.length === 0) {
    return (
      <p className={`text-sm text-zinc-500 ${className ?? ""}`}>
        {t("reports.summaryTreeNoData")}
      </p>
    );
  }

  return (
    <div className={`space-y-5 ${className ?? ""}`}>
      {views.map((v) => {
        const fmt = (n: number) => formatLocaleAmount(n, locale, v.cc);
        const incomeDenom = Math.max(v.incomeTotal, EPS);
        const outflowDenom = Math.max(v.glance.totalOutflow, EPS);
        const supplierTotal = v.glance.supplierAttributedTotal;
        const supplierPct =
          outflowDenom > EPS ? Math.round((supplierTotal / outflowDenom) * 100) : 0;

        return (
          <section
            key={v.cc}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            {/* Header */}
            <header className="flex items-start justify-between gap-3 border-b border-zinc-100 bg-gradient-to-br from-zinc-50 to-white px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-zinc-900 sm:text-lg">
                  {t("reports.summaryTreeTitle")}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
                  {t("reports.summaryTreeSubtitle")}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-zinc-900 px-2.5 py-1 text-xs font-semibold tracking-wide text-white">
                {v.cc.toUpperCase()}
              </span>
            </header>

            {branchScoped ? (
              <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-[11px] leading-relaxed text-amber-900 sm:px-5 sm:text-xs">
                {t("reports.summaryTreeBranchScopeWarn")}
              </div>
            ) : null}

            {/* INCOME hero */}
            <div className="border-b border-zinc-100 px-4 py-4 sm:px-5 sm:py-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {t("reports.summaryTreeIncomeGross")}
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums text-emerald-700 sm:text-3xl">
                {fmt(v.incomeTotal)}
              </p>
              <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                <IncomeChip
                  label={t("reports.summaryTreeCash")}
                  amount={fmt(v.incomeCash)}
                  pct={Math.round((v.incomeCash / incomeDenom) * 100)}
                  tone="emerald"
                />
                <IncomeChip
                  label={t("reports.summaryTreeCard")}
                  amount={fmt(v.incomeCard)}
                  pct={Math.round((v.incomeCard / incomeDenom) * 100)}
                  tone="sky"
                />
              </div>
            </div>

            {/* TOTAL OUTFLOW hero + iki kırılım birlikte (aynı toplam, iki bakış) */}
            <div className="bg-rose-50/40 px-4 py-4 sm:px-5 sm:py-5">
              {/* Büyük rakam + tedarikçi atfı */}
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                    {t("reports.summaryTreeOpsExpenseTotal")}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-rose-900/70 sm:text-xs">
                    {t("reports.summaryTreeTwoViewsHint")}
                  </p>
                </div>
                <p className="shrink-0 text-3xl font-black tabular-nums text-rose-700 sm:text-4xl">
                  {fmt(v.glance.totalOutflow)}
                </p>
              </div>
              {supplierTotal > EPS ? (
                <div className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-md bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-900 ring-1 ring-amber-200 sm:text-xs">
                  <span aria-hidden>🏷</span>
                  <span className="truncate">
                    {t("reports.summaryTreeSupplierAttributed")}:{" "}
                    <span className="font-bold tabular-nums">
                      {fmt(supplierTotal)}
                    </span>{" "}
                    <span className="font-medium">(%{supplierPct})</span>
                  </span>
                </div>
              ) : null}
            </div>

            {/* EXPENSE BY SOURCE — birincil */}
            <div className="border-t border-rose-100 px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  {t("reports.summaryTreeExpenseBySource")}
                </p>
                <p className="shrink-0 text-[11px] font-bold tabular-nums text-zinc-700 sm:text-xs">
                  Σ {fmt(v.glance.totalOutflow)}
                </p>
              </div>
              {(() => {
                const unset = v.sources.find((x) => x.key === "UNSET");
                if (!unset || Math.abs(unset.slice.amount) < EPS) return null;
                return (
                  <div
                    role="alert"
                    className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900 sm:text-xs"
                  >
                    <span aria-hidden className="text-base leading-none">⚠️</span>
                    <span className="min-w-0">
                      {t("reports.summaryTreeUnsetWarn")
                        .replace("{amount}", fmt(unset.slice.amount))
                        .replace("{count}", String(unset.slice.lineCount))}
                    </span>
                  </div>
                );
              })()}
              {v.sources.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-400">—</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {v.sources.map(({ key, slice }) => {
                    const tone = SOURCE_TONE[key];
                    const pct = Math.round((slice.amount / outflowDenom) * 100);
                    return (
                      <li
                        key={key}
                        className={`rounded-xl px-3 py-2.5 ring-1 ${tone.bg} ${tone.ring}`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={`inline-flex min-w-0 items-center gap-2 truncate text-sm font-semibold ${tone.text}`}
                          >
                            <span
                              aria-hidden
                              className={`size-2.5 shrink-0 rounded-full ${tone.dot}`}
                            />
                            {sourceLabel(key, t)}
                          </span>
                          <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-900">
                            {fmt(slice.amount)}
                            <span className="ml-1.5 text-[11px] font-medium text-zinc-500">
                              %{pct}
                            </span>
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
                          <div
                            className={`h-full rounded-full ${tone.bar}`}
                            style={{
                              width: `${Math.max(0, Math.min(100, pct))}%`,
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* EXPENSE BY USAGE — gider türü; tedarikçi atfı badge'li */}
            <div className="border-t border-zinc-100 bg-zinc-50/30 px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  {t("reports.summaryTreeExpenseByCategory")}
                </p>
                <p className="shrink-0 text-[11px] font-bold tabular-nums text-zinc-700 sm:text-xs">
                  Σ {fmt(v.glance.totalOutflow)}
                </p>
              </div>
              {v.usages.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-400">—</p>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {v.usages.map(({ key, slice }) => {
                    const tone = USAGE_TONE[key];
                    const pct = Math.round((slice.amount / outflowDenom) * 100);
                    const supAmt = slice.supplierAttributedAmount;
                    const supPct =
                      slice.amount > EPS
                        ? Math.round((supAmt / slice.amount) * 100)
                        : 0;
                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-zinc-200 bg-white p-3"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="inline-flex min-w-0 items-center gap-2 truncate text-sm font-medium text-zinc-700">
                            <span
                              aria-hidden
                              className={`size-2 shrink-0 rounded-full ${tone.dot}`}
                            />
                            {usageLabel(key, t)}
                          </span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                            {fmt(slice.amount)}
                            <span className="ml-1.5 text-[11px] font-medium text-zinc-500">
                              %{pct}
                            </span>
                          </span>
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={`h-full rounded-full ${tone.bar}`}
                            style={{
                              width: `${Math.max(0, Math.min(100, pct))}%`,
                            }}
                          />
                        </div>
                        {supAmt > EPS ? (
                          <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-200">
                            <span aria-hidden>🏷</span>
                            {t("reports.summaryTreeSupplierInBucket")}:{" "}
                            <span className="tabular-nums font-bold">
                              {fmt(supAmt)}
                            </span>{" "}
                            <span>(%{supPct})</span>
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SUPPLIER PAYMENTS — finansman (gider toplamına dahil değil) */}
            {v.supplierTotal > EPS ? (
              <div className="border-b border-zinc-100 bg-zinc-50/40 px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    {t("reports.summaryTreeSupplierPaymentsSection")}
                  </p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-700">
                    {fmt(v.supplierTotal)}
                  </p>
                </div>
                <div className="-mx-1 mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                  {v.supplierRows.map((r) => (
                    <span
                      key={r.sourceType}
                      className="inline-flex shrink-0 snap-start items-center gap-2 rounded-full bg-white px-3 py-1 text-xs ring-1 ring-zinc-200"
                    >
                      <span className="font-medium text-zinc-600">
                        {supplierSourceLabel(r.sourceType, t)}
                      </span>
                      <span className="tabular-nums font-semibold text-zinc-900">
                        {fmt(r.total)}
                      </span>
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                  {t("reports.summaryTreeSupplierPaymentsNote")}
                </p>
              </div>
            ) : null}

            {/* NET — tek değer */}
            <div className="flex items-baseline justify-between gap-3 px-4 py-4 sm:px-5 sm:py-5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  {t("reports.summaryTreeNet")}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                  {t("reports.summaryTreeNetHint")}
                </p>
              </div>
              <p
                className={`shrink-0 text-2xl font-black tabular-nums sm:text-3xl ${
                  v.net >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {fmt(v.net)}
              </p>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function IncomeChip({
  label,
  amount,
  pct,
  tone,
}: {
  label: string;
  amount: string;
  pct: number;
  tone: "emerald" | "sky";
}) {
  const ring =
    tone === "emerald" ? "ring-emerald-200 bg-emerald-50" : "ring-sky-200 bg-sky-50";
  const dot = tone === "emerald" ? "bg-emerald-500" : "bg-sky-500";
  const text = tone === "emerald" ? "text-emerald-800" : "text-sky-800";
  return (
    <span
      className={`inline-flex min-w-[8.5rem] shrink-0 snap-start items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1 ${ring}`}
    >
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${dot}`} />
      <span className={`font-semibold ${text}`}>{label}</span>
      <span className="tabular-nums font-bold text-zinc-900">{amount}</span>
      <span className="text-[10px] font-medium text-zinc-500">%{pct}</span>
    </span>
  );
}
