"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import {
  ReportHubDateRangeControls,
  type ReportHubRangeLock,
} from "@/modules/reports/components/ReportHubDateRangeControls";
import { ReportMobileFilterSurface } from "@/modules/reports/components/ReportMobileFilterSurface";
import { ReportTablesPageShell } from "@/modules/reports/components/ReportTablesPageShell";
import {
  useAllBranchesPatronExpenses,
  type PatronExpenseRow,
  type PatronExpensesPartialFailure,
} from "@/modules/reports/hooks/useAllBranchesPatronExpenses";
import {
  resolveReportDatePreset,
  startOfCalendarYearIso,
  type ReportDatePresetKey,
} from "@/modules/reports/lib/report-period-helpers";
import {
  compareValues,
  rowMatchesQuery,
  type SortDir,
} from "@/modules/reports/lib/report-table-utils";
import { PageWhenToUseInfoButton } from "@/shared/components/PageWhenToUseInfoButton";
import { buildBranchDetailHref, useBranchDetailOverlay } from "@/shared/branch-detail";
import { usePersonnelDetailOverlay } from "@/shared/personnel-detail";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { EyeIcon } from "@/shared/ui/EyeIcon";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

const eyeLinkClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400";

type SortKey = "date" | "amount";

type ExpenseBucket =
  | "personnel_advance"
  | "personnel_expense"
  | "vehicle"
  | "supplier"
  | "general_overhead"
  | "branch_ops"
  | "tax"
  | "patron_debt_repay"
  | "non_pnl"
  | "other";
type ExpenseBucketFilter = "all" | ExpenseBucket;

const BUCKET_ORDER: ExpenseBucket[] = [
  "personnel_advance",
  "personnel_expense",
  "vehicle",
  "supplier",
  "general_overhead",
  "branch_ops",
  "tax",
  "patron_debt_repay",
  "non_pnl",
  "other",
];

const DETAIL_PAGE_SIZE = 25;

/**
 * Classify a row into one of 8 expense buckets. Link fields (vehicle / supplier /
 * overhead pool) take precedence over `mainCategory` because the backend stamps
 * them all as OUT_OPS by default — without checking the link field first, vehicle
 * fuel + supplier rent + central overhead would all collapse into "Şube gideri".
 */
function bucketFromRow(row: PatronExpenseRow): ExpenseBucket {
  const cat = (row.category ?? "").toUpperCase();
  const mc = (row.mainCategory ?? "").toUpperCase();

  // 1) Personnel — strongest discriminators first (link fields, then sub-category
  //    code, then mainCategory). Backend sometimes leaves mainCategory empty for
  //    central personnel rows; without these fallbacks the row would drop into
  //    "Diğer" by mistake.
  if (row.linkedAdvanceId != null && row.linkedAdvanceId > 0)
    return "personnel_advance";
  if (cat === "PER_ADVANCE") return "personnel_advance";
  if (row.linkedSalaryPaymentId != null && row.linkedSalaryPaymentId > 0)
    return "personnel_expense";
  if (cat.startsWith("PER_")) return "personnel_expense";
  if (mc === "OUT_PERSONNEL" || mc.startsWith("OUT_PERSONNEL_")) {
    return "personnel_expense";
  }

  // 2) Other link fields BEFORE mainCategory: backend stamps OUT_OPS on all three.
  if (row.linkedVehicleExpenseId != null && row.linkedVehicleExpenseId > 0) {
    return "vehicle";
  }
  if (
    row.linkedSupplierInvoiceLineId != null &&
    row.linkedSupplierInvoiceLineId > 0
  ) {
    return "supplier";
  }
  // supplier_payments derived row (PATRON-paid, no branch_transaction)
  if (
    row.derivedFromSupplierPaymentId != null &&
    row.derivedFromSupplierPaymentId > 0
  ) {
    return "supplier";
  }
  if (
    (row.generalOverheadPoolId != null && row.generalOverheadPoolId > 0) ||
    row.derivedFromOverheadPoolId != null
  ) {
    return "general_overhead";
  }

  // 3) Personnel attribution fallback — placed BEFORE mainCategory checks so a
  //    row backend-stamped as OUT_OPS (default) but attached to a specific
  //    employee correctly classifies as personnel. Vehicle/supplier/overhead
  //    link fields above this point take precedence (they own the row).
  if (row.linkedPersonnelId != null && row.linkedPersonnelId > 0) {
    return "personnel_expense";
  }

  // 4) Remaining mainCategory-based buckets.
  if (mc === "OUT_OPS" || mc.startsWith("OUT_OPS_")) return "branch_ops";
  if (mc === "OUT_TAX" || mc.startsWith("OUT_TAX_")) return "tax";
  if (mc === "OUT_PATRON_DEBT_REPAY") return "patron_debt_repay";
  if (mc === "OUT_NON_PNL") return "non_pnl";

  // 5) Catch-all: OUT_GOODS (stock purchase), OUT_OTHER, unknown / null mainCategory.
  return "other";
}

function bucketLabel(t: (k: string) => string, b: ExpenseBucket): string {
  if (b === "personnel_advance") return t("reports.patronExpenseBucketPersonnelAdvance");
  if (b === "personnel_expense") return t("reports.patronExpenseBucketPersonnelExpense");
  if (b === "vehicle") return t("reports.patronExpenseBucketVehicle");
  if (b === "supplier") return t("reports.patronExpenseBucketSupplier");
  if (b === "general_overhead") return t("reports.patronExpenseBucketGeneralOverhead");
  if (b === "branch_ops") return t("reports.patronExpenseBucketBranchOps");
  if (b === "tax") return t("reports.patronExpenseBucketTax");
  if (b === "patron_debt_repay") return t("reports.patronExpenseBucketPatronDebtRepay");
  if (b === "non_pnl") return t("reports.patronExpenseBucketNonPnl");
  return t("reports.patronExpenseBucketOther");
}

/**
 * Bucket-specific tailwind classes. Grouped semantically by visual family:
 *   - Personnel:   sky (advance) + indigo (expense)
 *   - Operations:  orange (vehicle) + emerald (supplier) + violet (overhead) + teal (branch ops)
 *   - Obligation:  rose (tax) + amber (patron debt) + slate (non-P&L) + zinc (catch-all)
 *
 * All class strings are statically present so Tailwind's content scanner picks them up.
 */
const BUCKET_TONE: Record<
  ExpenseBucket,
  {
    /** Active row in the KPI bucket list (filter selected). */
    activeRowBg: string;
    /** Inactive row label color in the KPI bucket list. */
    inactiveLabel: string;
    /** Active row label color in the KPI bucket list. */
    activeLabel: string;
    /** Progress bar fill when row is active. */
    barActive: string;
    /** Progress bar fill when row is inactive. */
    barInactive: string;
    /** Inline badge color (used in mobile row + desktop table "Group" cell). */
    badge: string;
  }
> = {
  personnel_advance: {
    activeRowBg: "bg-sky-50 ring-1 ring-sky-200",
    inactiveLabel: "text-zinc-800",
    activeLabel: "text-sky-900",
    barActive: "bg-sky-600",
    barInactive: "bg-sky-400",
    badge: "text-sky-800",
  },
  personnel_expense: {
    activeRowBg: "bg-indigo-50 ring-1 ring-indigo-200",
    inactiveLabel: "text-zinc-800",
    activeLabel: "text-indigo-900",
    barActive: "bg-indigo-600",
    barInactive: "bg-indigo-400",
    badge: "text-indigo-800",
  },
  vehicle: {
    activeRowBg: "bg-orange-50 ring-1 ring-orange-200",
    inactiveLabel: "text-zinc-800",
    activeLabel: "text-orange-900",
    barActive: "bg-orange-600",
    barInactive: "bg-orange-400",
    badge: "text-orange-800",
  },
  supplier: {
    activeRowBg: "bg-emerald-50 ring-1 ring-emerald-200",
    inactiveLabel: "text-zinc-800",
    activeLabel: "text-emerald-900",
    barActive: "bg-emerald-600",
    barInactive: "bg-emerald-400",
    badge: "text-emerald-800",
  },
  general_overhead: {
    activeRowBg: "bg-violet-50 ring-1 ring-violet-200",
    inactiveLabel: "text-zinc-800",
    activeLabel: "text-violet-900",
    barActive: "bg-violet-600",
    barInactive: "bg-violet-400",
    badge: "text-violet-800",
  },
  branch_ops: {
    activeRowBg: "bg-teal-50 ring-1 ring-teal-200",
    inactiveLabel: "text-zinc-800",
    activeLabel: "text-teal-900",
    barActive: "bg-teal-600",
    barInactive: "bg-teal-400",
    badge: "text-teal-800",
  },
  tax: {
    activeRowBg: "bg-rose-50 ring-1 ring-rose-200",
    inactiveLabel: "text-zinc-800",
    activeLabel: "text-rose-900",
    barActive: "bg-rose-600",
    barInactive: "bg-rose-400",
    badge: "text-rose-800",
  },
  patron_debt_repay: {
    activeRowBg: "bg-amber-50 ring-1 ring-amber-200",
    inactiveLabel: "text-zinc-800",
    activeLabel: "text-amber-900",
    barActive: "bg-amber-600",
    barInactive: "bg-amber-400",
    badge: "text-amber-800",
  },
  non_pnl: {
    activeRowBg: "bg-slate-100 ring-1 ring-slate-300",
    inactiveLabel: "text-zinc-800",
    activeLabel: "text-slate-900",
    barActive: "bg-slate-600",
    barInactive: "bg-slate-400",
    badge: "text-slate-700",
  },
  other: {
    activeRowBg: "bg-zinc-100 ring-1 ring-zinc-300",
    inactiveLabel: "text-zinc-800",
    activeLabel: "text-zinc-900",
    barActive: "bg-zinc-600",
    barInactive: "bg-zinc-400",
    badge: "text-zinc-700",
  },
};

function rowSortValue(r: PatronExpenseRow, key: SortKey): string | number {
  if (key === "date") return r.transactionDate;
  return r.amount;
}

type CurrencyRollup = {
  currencyCode: string;
  total: number;
  rowCount: number;
  branchCount: number;
  buckets: { bucket: ExpenseBucket; amount: number; pct: number; rowCount: number }[];
};

function buildRollups(rows: PatronExpenseRow[]): CurrencyRollup[] {
  const byCcy = new Map<
    string,
    {
      total: number;
      rowCount: number;
      branches: Set<number>;
      bucketSums: Record<ExpenseBucket, { amount: number; rowCount: number }>;
    }
  >();
  for (const r of rows) {
    const ccy = (r.currencyCode || "TRY").toUpperCase();
    let entry = byCcy.get(ccy);
    if (!entry) {
      entry = {
        total: 0,
        rowCount: 0,
        branches: new Set(),
        bucketSums: {
          personnel_advance: { amount: 0, rowCount: 0 },
          personnel_expense: { amount: 0, rowCount: 0 },
          vehicle: { amount: 0, rowCount: 0 },
          supplier: { amount: 0, rowCount: 0 },
          general_overhead: { amount: 0, rowCount: 0 },
          branch_ops: { amount: 0, rowCount: 0 },
          tax: { amount: 0, rowCount: 0 },
          patron_debt_repay: { amount: 0, rowCount: 0 },
          non_pnl: { amount: 0, rowCount: 0 },
          other: { amount: 0, rowCount: 0 },
        },
      };
      byCcy.set(ccy, entry);
    }
    entry.total += r.amount;
    entry.rowCount += 1;
    if (r.branchId != null && r.branchId > 0) entry.branches.add(r.branchId);
    const b = bucketFromRow(r);
    entry.bucketSums[b].amount += r.amount;
    entry.bucketSums[b].rowCount += 1;
  }
  const out: CurrencyRollup[] = [];
  for (const [currencyCode, e] of byCcy) {
    const buckets = BUCKET_ORDER.map((bucket) => {
      const { amount, rowCount } = e.bucketSums[bucket];
      const pct = e.total > 0.005 ? Math.round((amount / e.total) * 100) : 0;
      return { bucket, amount, pct, rowCount };
    });
    out.push({
      currencyCode,
      total: e.total,
      rowCount: e.rowCount,
      branchCount: e.branches.size,
      buckets,
    });
  }
  out.sort((a, b) => b.total - a.total);
  return out;
}

function partialFailureSourcesText(
  failures: PatronExpensesPartialFailure[],
  t: (k: string) => string,
): string {
  const branchCount = failures.filter((f) => f.source === "branch").length;
  const hasAdvances = failures.some((f) => f.source === "advances");
  const hasPools = failures.some((f) => f.source === "overheadPools");
  const parts: string[] = [];
  if (branchCount > 0) {
    parts.push(
      t("reports.patronExpensesPartialFailureBranches").replace(
        "{{count}}",
        String(branchCount),
      ),
    );
  }
  if (hasAdvances) parts.push(t("reports.patronExpensesPartialFailureAdvances"));
  if (hasPools) parts.push(t("reports.patronExpensesPartialFailurePools"));
  if (failures.some((f) => f.source === "centralPersonnelExpenses")) {
    parts.push(t("reports.patronExpensesPartialFailureCentralPersonnel"));
  }
  if (failures.some((f) => f.source === "supplierPayments")) {
    parts.push(t("reports.patronExpensesPartialFailureSupplierPayments"));
  }
  return parts.join(", ");
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{{${k}}}`).join(v);
  }
  return s;
}

function expenseDetailHref(row: PatronExpenseRow): string | null {
  // OPEN general-overhead pool rows are branchless; send the user to the pool screen
  // with the specific pool deep-link (?openPool=ID).
  const poolId = row.derivedFromOverheadPoolId ?? row.generalOverheadPoolId;
  if (poolId != null && poolId > 0) {
    return `/general-overhead?openPool=${poolId}`;
  }
  // Supplier-bağlı satırlar tedarikçi faturalar sayfasına yönlendirir; PATRON-paid
  // supplier_payments ve branch_transactions üzerindeki linked_supplier_invoice_line_id
  // ikisi de aynı liste içinde bulunur.
  if (
    row.derivedFromSupplierPaymentId != null ||
    (row.linkedSupplierInvoiceLineId != null && row.linkedSupplierInvoiceLineId > 0)
  ) {
    return "/suppliers/invoices";
  }
  if (row.branchId == null || row.branchId <= 0) return null;
  return buildBranchDetailHref(row.branchId, {
    tab: "expenses",
    registerDay: row.transactionDate,
    expensePaymentSource: "PATRON",
  });
}

/**
 * Avans / personel gideri satırı: tıklanınca şube detayı yerine personel kartını
 * açıp Maliyetler sekmesinde ilgili satırı işaretler (shared overlay).
 *
 * Returns null when row isn't personnel-related → caller branch-detail link'ine düşer.
 */
type PersonnelDetailFocus = {
  personnelId: number;
  personnelName: string | null;
  focusAdvanceId?: number;
  focusExpenseTransactionId?: number;
};

function rowPersonnelDetailFocus(row: PatronExpenseRow): PersonnelDetailFocus | null {
  // Avans: linkedAdvanceId varsa, personel = linkedAdvancePersonnelId.
  if (row.linkedAdvanceId != null && row.linkedAdvanceId > 0) {
    const pid = row.linkedAdvancePersonnelId ?? row.linkedPersonnelId ?? 0;
    if (pid > 0) {
      return {
        personnelId: pid,
        personnelName: row.linkedAdvancePersonnelFullName ?? row.linkedPersonnelFullName ?? null,
        focusAdvanceId: row.linkedAdvanceId,
      };
    }
  }
  // Personel gideri: linkedPersonnelId + tx id ile expense satırı işaretlenir.
  if (row.linkedPersonnelId != null && row.linkedPersonnelId > 0) {
    return {
      personnelId: row.linkedPersonnelId,
      personnelName: row.linkedPersonnelFullName ?? null,
      focusExpenseTransactionId: row.id,
    };
  }
  return null;
}

export function PatronFlowReportScreen() {
  const { t, locale } = useI18n();
  const { openPersonnelDetail } = usePersonnelDetailOverlay();
  const { openBranchDetail } = useBranchDetailOverlay();
  const [dateFrom, setDateFromRaw] = useState(() => startOfCalendarYearIso());
  const [dateTo, setDateToRaw] = useState(() => localIsoDate());
  const [dateRangeLock, setDateRangeLock] =
    useState<ReportHubRangeLock>("manual");
  const [filterBranchId, setFilterBranchIdRaw] = useState("");

  const { data: branches = [] } = useBranchesList();

  const { state, isFetching, refetch } = useAllBranchesPatronExpenses({
    dateFrom,
    dateTo,
    branchFilterId: filterBranchId,
    enabled: true,
  });

  const filterBranchOptions = useMemo(
    () => [
      { value: "", label: t("reports.allBranches") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t],
  );

  const applyDatePreset = (key: ReportDatePresetKey) => {
    const r = resolveReportDatePreset(key);
    setDateFromRaw(r.dateFrom);
    setDateToRaw(r.dateTo);
    setPage(1);
  };

  const filtersActive = filterBranchId !== "" || dateRangeLock !== "manual";

  const filterPreview = useMemo(() => {
    const a = formatLocaleDate(dateFrom, locale);
    const b = formatLocaleDate(dateTo, locale);
    const branchName =
      filterBranchId === ""
        ? null
        : branches.find((x) => String(x.id) === filterBranchId)?.name;
    return (
      <>
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-400">
          {t("reports.navPatronFlow")}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900">
          {a} – {b}
        </p>
        {branchName ? (
          <p className="mt-0.5 truncate text-xs text-zinc-600">{branchName}</p>
        ) : null}
      </>
    );
  }, [dateFrom, dateTo, locale, t, filterBranchId, branches]);

  const allRows = useMemo<PatronExpenseRow[]>(
    () => (state.kind === "ok" ? state.rows : []),
    [state],
  );

  const rollups = useMemo(() => buildRollups(allRows), [allRows]);

  const [activeCcy, setActiveCcyRaw] = useState<string | null>(null);
  const effectiveCcy = useMemo(() => {
    if (rollups.length === 0) return null;
    if (activeCcy && rollups.some((r) => r.currencyCode === activeCcy)) return activeCcy;
    return rollups[0].currencyCode;
  }, [activeCcy, rollups]);
  const activeRollup =
    rollups.find((r) => r.currencyCode === effectiveCcy) ?? null;

  const [bucketFilter, setBucketFilterRaw] = useState<ExpenseBucketFilter>("all");
  const [query, setQueryRaw] = useState("");
  const [sortKey, setSortKeyRaw] = useState<SortKey>("date");
  const [sortDir, setSortDirRaw] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const setDateFrom = (v: string) => {
    setDateFromRaw(v);
    setPage(1);
  };
  const setDateTo = (v: string) => {
    setDateToRaw(v);
    setPage(1);
  };
  const setFilterBranchId = (v: string) => {
    setFilterBranchIdRaw(v);
    setPage(1);
  };
  const setActiveCcy = (v: string) => {
    setActiveCcyRaw(v);
    setBucketFilterRaw("all");
    setPage(1);
  };
  const setBucketFilter = (v: ExpenseBucketFilter) => {
    setBucketFilterRaw(v);
    setPage(1);
  };
  const setQuery = (v: string) => {
    setQueryRaw(v);
    setPage(1);
  };
  const setSortKey = (v: SortKey) => {
    setSortKeyRaw(v);
    setPage(1);
  };
  const toggleSortDir = () => {
    setSortDirRaw((d) => (d === "asc" ? "desc" : "asc"));
    setPage(1);
  };

  const haystack = useCallback(
    (r: PatronExpenseRow) =>
      [
        r.branchName,
        r.description,
        txCategoryLine(r.mainCategory, r.category, t),
        r.mainCategory,
        r.category,
        bucketLabel(t, bucketFromRow(r)),
      ]
        .filter(Boolean)
        .join(" "),
    [t],
  );

  const processed = useMemo(() => {
    if (!effectiveCcy) return [];
    let rows = allRows.filter(
      (r) => (r.currencyCode || "TRY").toUpperCase() === effectiveCcy,
    );
    if (bucketFilter !== "all") {
      rows = rows.filter(
        (r) => bucketFromRow(r) === bucketFilter,
      );
    }
    const q = query.trim();
    if (q) {
      rows = rows.filter((r) => rowMatchesQuery(haystack(r), q));
    }
    return [...rows].sort((a, b) =>
      compareValues(rowSortValue(a, sortKey), rowSortValue(b, sortKey), sortDir),
    );
  }, [allRows, effectiveCcy, bucketFilter, query, sortKey, sortDir, haystack]);

  const totalPages = Math.max(1, Math.ceil(processed.length / DETAIL_PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const slice = useMemo(() => {
    const start = (pageSafe - 1) * DETAIL_PAGE_SIZE;
    return processed.slice(start, start + DETAIL_PAGE_SIZE);
  }, [processed, pageSafe]);

  // (4) Sayfanın satırlarını güne göre grupla — başlıklarda günlük toplam gösterilir.
  // Sıralama sortKey="date" desc olduğunda doğal olarak ardışıktır; aksi halde de
  // gruplandırma görsel olarak işlevsel kalır (her gün ardı ardına gruplanır).
  const slicedByDay = useMemo(() => {
    const groups: {
      date: string;
      total: number;
      rows: PatronExpenseRow[];
    }[] = [];
    let last: (typeof groups)[number] | null = null;
    for (const row of slice) {
      const d = (row.transactionDate ?? "").slice(0, 10);
      if (!last || last.date !== d) {
        last = { date: d, total: 0, rows: [] };
        groups.push(last);
      }
      last.rows.push(row);
      last.total += row.amount;
    }
    return groups;
  }, [slice]);

  const hasAnyData = rollups.length > 0;
  const hasMultipleCcy = rollups.length > 1;

  return (
    <ReportTablesPageShell
      title={t("reports.tablesPagePatronFlowTitle")}
      subtitle={t("reports.tablesPagePatronFlowSubtitle")}
      pageGuide={
        <PageWhenToUseInfoButton
          ariaLabel={t("common.pageHelpHintLabel")}
          guideTab="reports"
          description={t("pageHelp.reportsPatronFlow.intro")}
          listVariant="ordered"
          items={[
            { text: t("pageHelp.reportsPatronFlow.step1") },
            {
              text: t("pageHelp.reportsPatronFlow.step2"),
              link: {
                href: "/branches",
                label: t("pageHelp.reportsPatronFlow.step2Link"),
              },
            },
          ]}
        />
      }
    >
      <ReportMobileFilterSurface
        variant="drawerOnly"
        filtersActive={filtersActive}
        drawerTitle={t("reports.filtersSectionTitle")}
        resetKey="patron-flow"
        preview={filterPreview}
        onRefetch={refetch}
        isRefetching={isFetching}
        main={
          <>
            {state.kind === "loading" ? (
              <div className="space-y-3" aria-live="polite">
                <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
                <div className="h-10 animate-pulse rounded-xl bg-zinc-100" />
                <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
              </div>
            ) : null}

            {state.kind === "error" ? (
              <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-900">
                <p className="font-medium">{t("reports.error")}</p>
                <p className="mt-1 text-xs">{toErrorMessage(state.message)}</p>
              </div>
            ) : null}

            {(state.kind === "ok" || state.kind === "empty") &&
            state.partialFailures &&
            state.partialFailures.length > 0 ? (
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                <div className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {t("reports.patronExpensesPartialFailureTitle")}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed">
                      {fillTemplate(
                        t("reports.patronExpensesPartialFailureHint"),
                        {
                          sources: partialFailureSourcesText(
                            state.partialFailures,
                            t,
                          ),
                        },
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={refetch}
                    disabled={isFetching}
                    className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t("reports.patronExpensesPartialFailureRetry")}
                  </button>
                </div>
              </div>
            ) : null}

            {state.kind === "empty" || (state.kind === "ok" && !hasAnyData) ? (
              <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-8 text-center">
                <p className="text-sm font-medium text-zinc-900">
                  {t("reports.patronExpensesEmpty")}
                </p>
              </div>
            ) : null}

            {state.kind === "ok" && activeRollup ? (
              <>
                {/* (5) HIZLI BAKIŞ özeti: dönemin toplamı + en yüksek 2 grup. */}
                {(() => {
                  const sortedBuckets = activeRollup.buckets
                    .filter((b) => b.amount > 0)
                    .slice()
                    .sort((a, b) => b.amount - a.amount);
                  const top = sortedBuckets[0];
                  const second = sortedBuckets[1];
                  const total = activeRollup.buckets.reduce(
                    (s, b) => s + b.amount,
                    0,
                  );
                  if (total <= 0) return null;
                  return (
                    <section className="mb-3 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                        Hızlı bakış
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-800 sm:text-base">
                        Patron cebinden çıkan toplam:{" "}
                        <span className="font-bold tabular-nums text-zinc-950">
                          {formatLocaleAmount(total, locale, activeRollup.currencyCode)}
                        </span>
                        {top ? (
                          <>
                            . En yüksek grup:{" "}
                            <span className="font-medium">
                              {bucketLabel(t, top.bucket)}
                            </span>{" "}
                            (%{Math.round(top.pct)})
                          </>
                        ) : null}
                        {second && Math.round(second.pct) > 0 ? (
                          <>
                            , ardından{" "}
                            <span className="font-medium">
                              {bucketLabel(t, second.bucket)}
                            </span>{" "}
                            (%{Math.round(second.pct)})
                          </>
                        ) : null}
                        .
                      </p>
                    </section>
                  );
                })()}
                {/* HERO KPI */}
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                  {hasMultipleCcy ? (
                    <div
                      role="tablist"
                      aria-label="Currency"
                      className="mb-4 inline-flex rounded-lg bg-zinc-100 p-1"
                    >
                      {rollups.map((r) => {
                        const active = r.currencyCode === effectiveCcy;
                        return (
                          <button
                            key={r.currencyCode}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setActiveCcy(r.currencyCode)}
                            className={cn(
                              "min-h-9 touch-manipulation rounded-md px-3 text-xs font-semibold transition-colors",
                              active
                                ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                                : "text-zinc-600 hover:text-zinc-900",
                            )}
                          >
                            {r.currencyCode}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tabular-nums text-zinc-900 sm:text-4xl">
                      {formatLocaleAmount(activeRollup.total, locale)}
                    </span>
                    <span className="text-sm font-medium text-zinc-500">
                      {activeRollup.currencyCode}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">
                    {fillTemplate(t("reports.patronExpensesKpiSummary"), {
                      count: String(activeRollup.rowCount),
                      branches: String(activeRollup.branchCount),
                    })}
                  </p>

                  {/* BUCKET BAR LIST (tıklanır = filtre) */}
                  {(() => {
                    const renderPill = (
                      b: (typeof activeRollup.buckets)[number],
                    ) => {
                      const active = bucketFilter === b.bucket;
                      const empty = b.amount < 0.005;
                      const tone = BUCKET_TONE[b.bucket];
                      return (
                        <button
                          key={b.bucket}
                          type="button"
                          onClick={() => setBucketFilter(b.bucket)}
                          className={cn(
                            "w-full rounded-lg px-3 py-2 text-left transition-colors",
                            active
                              ? tone.activeRowBg
                              : empty
                                ? "opacity-50 hover:opacity-70 hover:bg-zinc-50"
                                : "hover:bg-zinc-50",
                          )}
                        >
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span
                              className={cn(
                                "min-w-0 truncate font-medium",
                                active ? tone.activeLabel : tone.inactiveLabel,
                              )}
                            >
                              {bucketLabel(t, b.bucket)}
                            </span>
                            <span className="shrink-0 tabular-nums text-zinc-900">
                              {formatLocaleAmount(b.amount, locale)}
                              <span className="ml-1.5 text-xs font-normal text-zinc-500">
                                {b.pct}%
                              </span>
                            </span>
                          </div>
                          <div
                            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200/80"
                            role="presentation"
                          >
                            <div
                              className={cn(
                                "h-full min-w-[3px] rounded-full transition-colors",
                                empty
                                  ? "bg-transparent"
                                  : active
                                    ? tone.barActive
                                    : tone.barInactive,
                              )}
                              style={{
                                width: `${activeRollup.total > 0.005 ? Math.min(100, (b.amount / activeRollup.total) * 100) : 0}%`,
                              }}
                            />
                          </div>
                        </button>
                      );
                    };

                    const sumGroup = (
                      bs: (typeof activeRollup.buckets)[number][],
                    ) => ({
                      total: bs.reduce((s, b) => s + b.amount, 0),
                      rowCount: bs.reduce((s, b) => s + b.rowCount, 0),
                    });
                    const pctOf = (n: number) =>
                      activeRollup.total > 0.005
                        ? Math.round((n / activeRollup.total) * 100)
                        : 0;

                    const personnelBuckets = activeRollup.buckets.filter(
                      (b) =>
                        b.bucket === "personnel_advance" ||
                        b.bucket === "personnel_expense",
                    );
                    const personnel = sumGroup(personnelBuckets);

                    const generalBuckets = activeRollup.buckets.filter(
                      (b) =>
                        b.bucket === "general_overhead" || b.bucket === "tax",
                    );
                    const general = sumGroup(generalBuckets);

                    const otherBuckets = activeRollup.buckets.filter(
                      (b) =>
                        b.bucket !== "personnel_advance" &&
                        b.bucket !== "personnel_expense" &&
                        b.bucket !== "general_overhead" &&
                        b.bucket !== "tax",
                    );
                    return (
                      <div className="mt-5 space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setBucketFilter("all")}
                          className={cn(
                            "w-full rounded-lg px-3 py-2 text-left transition-colors",
                            bucketFilter === "all"
                              ? "bg-violet-50 ring-1 ring-violet-200"
                              : "hover:bg-zinc-50",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                bucketFilter === "all"
                                  ? "text-violet-900"
                                  : "text-zinc-700",
                              )}
                            >
                              {t("reports.patronExpenseBucketAll")}
                            </span>
                            <span className="text-xs tabular-nums text-zinc-500">
                              {activeRollup.rowCount}
                            </span>
                          </div>
                        </button>

                        {/* Personel grubu: başlık (toplam) + 2 alt bucket */}
                        <div className="pt-1">
                          <div className="flex items-baseline justify-between gap-2 px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                            <span>
                              {t("reports.patronExpenseGroupPersonnel")}
                              {personnel.rowCount > 0 ? (
                                <span className="ml-1.5 font-normal normal-case tracking-normal text-zinc-400">
                                  · {personnel.rowCount}
                                </span>
                              ) : null}
                            </span>
                            <span className="tabular-nums text-zinc-700">
                              {formatLocaleAmount(personnel.total, locale)}
                              {personnel.total > 0.005 ? (
                                <span className="ml-1.5 text-[10px] font-normal text-zinc-400">
                                  {pctOf(personnel.total)}%
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div className="ml-2 space-y-1.5 border-l-2 border-indigo-100 pl-2">
                            {personnelBuckets.map(renderPill)}
                          </div>
                        </div>

                        {/* Genel & vergi grubu: başlık (toplam) + 2 alt bucket */}
                        <div className="pt-1">
                          <div className="flex items-baseline justify-between gap-2 px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                            <span>
                              {t("reports.patronExpenseGroupGeneral")}
                              {general.rowCount > 0 ? (
                                <span className="ml-1.5 font-normal normal-case tracking-normal text-zinc-400">
                                  · {general.rowCount}
                                </span>
                              ) : null}
                            </span>
                            <span className="tabular-nums text-zinc-700">
                              {formatLocaleAmount(general.total, locale)}
                              {general.total > 0.005 ? (
                                <span className="ml-1.5 text-[10px] font-normal text-zinc-400">
                                  {pctOf(general.total)}%
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div className="ml-2 space-y-1.5 border-l-2 border-violet-100 pl-2">
                            {generalBuckets.map(renderPill)}
                          </div>
                        </div>

                        {/* Diğer bucket'lar */}
                        {otherBuckets.map(renderPill)}
                      </div>
                    );
                  })()}
                </section>

                {/* (3) ŞUBE KARŞILAŞTIRMA — şube bazlı patron harcamaları */}
                {(() => {
                  const totalsByBranch = new Map<
                    string,
                    { branchId: number | null; name: string; amount: number }
                  >();
                  for (const r of allRows) {
                    if ((r.currencyCode || "TRY").toUpperCase() !== effectiveCcy) continue;
                    const key =
                      r.branchId != null && r.branchId > 0
                        ? `b:${r.branchId}`
                        : "central";
                    const existing = totalsByBranch.get(key);
                    if (existing) {
                      existing.amount += r.amount;
                    } else {
                      totalsByBranch.set(key, {
                        branchId: r.branchId ?? null,
                        name: r.branchName ?? "Şubeye atanmamış",
                        amount: r.amount,
                      });
                    }
                  }
                  const list = Array.from(totalsByBranch.values())
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 6);
                  const grandTotal = list.reduce((s, x) => s + x.amount, 0);
                  if (list.length === 0 || grandTotal <= 0) return null;
                  return (
                    <section className="rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                        Şube karşılaştırma · Patron harcaması
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {list.map((b) => {
                          const pct = grandTotal > 0 ? (b.amount / grandTotal) * 100 : 0;
                          return (
                            <li
                              key={`${b.branchId ?? "central"}-${b.name}`}
                              className="flex flex-col gap-1"
                            >
                              <div className="flex items-baseline justify-between gap-3">
                                <span className="min-w-0 flex-1 break-words text-sm font-medium text-zinc-900">
                                  {b.name}
                                </span>
                                <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-900 sm:text-sm">
                                  {formatLocaleAmount(
                                    b.amount,
                                    locale,
                                    effectiveCcy ?? "TRY",
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="relative h-2 min-w-0 flex-1 rounded-full bg-zinc-100">
                                  <span
                                    className="absolute inset-y-0 left-0 rounded-full bg-violet-500"
                                    style={{ width: `${pct.toFixed(1)}%` }}
                                  />
                                </span>
                                <span className="shrink-0 text-[11px] tabular-nums text-zinc-500">
                                  %{Math.round(pct)}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })()}

                {/* SEARCH + SORT */}
                <section className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 sm:px-4">
                  <div
                    className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3"
                    role="search"
                  >
                    <label className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="sr-only">{t("reports.sectionFilter")}</span>
                      <input
                        type="search"
                        enterKeyHint="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t("reports.sectionSearchPlaceholder")}
                        className="min-h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 sm:min-h-10 sm:text-sm"
                      />
                    </label>
                    <div className="flex items-end gap-2 sm:w-auto">
                      <div className="min-w-0 flex-1 sm:w-44">
                        <Select
                          name="patronExpenseSort"
                          label={t("reports.sectionSortBy")}
                          options={[
                            { value: "date", label: t("reports.patronFlowColDate") },
                            { value: "amount", label: t("reports.patronFlowColAmount") },
                          ]}
                          value={sortKey}
                          onChange={(e) => setSortKey(e.target.value as SortKey)}
                          onBlur={() => {}}
                          className="min-h-11 sm:min-h-10 sm:text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={toggleSortDir}
                        className="min-h-11 min-w-11 touch-manipulation rounded-lg border border-zinc-200 bg-white px-2 text-base font-semibold leading-none text-zinc-800 shadow-sm sm:min-h-10 sm:min-w-10 sm:text-sm"
                        aria-label={
                          sortDir === "asc"
                            ? t("reports.sortDescAria")
                            : t("reports.sortAscAria")
                        }
                        title={
                          sortDir === "asc"
                            ? t("reports.sortStateDesc")
                            : t("reports.sortStateAsc")
                        }
                      >
                        <span aria-hidden>{sortDir === "asc" ? "↑" : "↓"}</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* DETAIL ROWS */}
                {/* (2) Çok para birimi uyarısı: liste tek para birimi gösterir, diğerleri gizli. */}
                {rollups.length > 1 && effectiveCcy ? (
                  <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Liste yalnız <strong>{effectiveCcy}</strong> kalemlerini gösterir.
                    Diğer {rollups.length - 1} para birimini görmek için üstteki para birimi
                    seçicisini kullanın.
                  </div>
                ) : null}
                {processed.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-6 text-center text-sm text-zinc-500">
                    {t("reports.sectionNoSearchMatches")}
                  </div>
                ) : (
                  <section className="rounded-2xl border border-zinc-200 bg-white">
                    {/* MOBILE: gün-bazlı gruplanmış kart listesi */}
                    <div className="sm:hidden">
                      {slicedByDay.map((g) => (
                        <div key={g.date}>
                          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-y border-zinc-100 bg-zinc-50/95 px-3 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/85">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                              {formatLocaleDate(g.date, locale)}
                            </span>
                            <span className="text-[11px] font-bold tabular-nums text-zinc-900">
                              {formatLocaleAmount(g.total, locale, activeRollup.currencyCode)}
                            </span>
                          </div>
                          <ul className="divide-y divide-zinc-100">
                            {g.rows.map((row) => {
                        const catLine = txCategoryLine(
                          row.mainCategory,
                          row.category,
                          t,
                        );
                        // Personel-bazlı (avans/personel gideri) satırlar shared overlay
                        // ile açılır; aksi halde şube detayı linki kullanılır.
                        const personnelFocus = rowPersonnelDetailFocus(row);
                        const isSupplier =
                          row.derivedFromSupplierPaymentId != null ||
                          (row.linkedSupplierInvoiceLineId != null &&
                            row.linkedSupplierInvoiceLineId > 0);
                        const href = personnelFocus ? null : expenseDetailHref(row);
                        const hasDetail = !!(personnelFocus || href);
                        return (
                          <li
                            key={row.id}
                            className={cn(
                              "relative flex items-center gap-3 py-2.5 pl-4 pr-3",
                              !hasDetail && "opacity-60",
                            )}
                          >
                            {/* (8) Renk şeridi — bucket'a göre */}
                            <span
                              aria-hidden
                              className={cn(
                                "absolute inset-y-1 left-1 w-1 rounded-full",
                                BUCKET_TONE[bucketFromRow(row)].barActive,
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] text-zinc-500 tabular-nums">
                                {formatLocaleDate(row.transactionDate, locale)}
                              </p>
                              <p className="truncate text-sm font-medium text-zinc-900">
                                {personnelFocus
                                  ? `${
                                      personnelFocus.focusAdvanceId ? "Avans" : "Personel"
                                    }: ${personnelFocus.personnelName ?? "—"}`
                                  : isSupplier && row.supplierName?.trim()
                                    ? `Tedarikçi: ${row.supplierName}`
                                    : row.branchName ?? "—"}
                              </p>
                              {personnelFocus && row.branchName?.trim() ? (
                                <p className="truncate text-[10px] text-emerald-700">
                                  Şube kasası: {row.branchName}
                                </p>
                              ) : null}
                              {isSupplier && row.supplierName?.trim() && row.branchName?.trim() ? (
                                <p className="truncate text-[10px] text-emerald-700">
                                  Şube: {row.branchName}
                                </p>
                              ) : null}
                              <p className="truncate text-xs">
                                <span
                                  className={cn(
                                    "font-medium",
                                    BUCKET_TONE[
                                      bucketFromRow(row)
                                    ].badge,
                                  )}
                                >
                                  {bucketLabel(
                                    t,
                                    bucketFromRow(row),
                                  )}
                                </span>
                                {catLine ? (
                                  <span className="text-zinc-500"> · {catLine}</span>
                                ) : null}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold tabular-nums text-zinc-900">
                                {formatLocaleAmount(row.amount, locale)}
                              </p>
                              <p className="text-[10px] text-zinc-500">
                                {row.currencyCode}
                              </p>
                            </div>
                            {personnelFocus ? (
                              <button
                                type="button"
                                aria-label={t("reports.patronExpensesOpenDetailAria")}
                                title={t("reports.patronExpensesOpenDetailAria")}
                                className={eyeLinkClass}
                                onClick={() =>
                                  openPersonnelDetail(personnelFocus.personnelId, {
                                    initialTab: "costs",
                                    focusAdvanceId: personnelFocus.focusAdvanceId ?? null,
                                    focusExpenseTransactionId:
                                      personnelFocus.focusExpenseTransactionId ?? null,
                                  })
                                }
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                            ) : !isSupplier && row.branchId != null && row.branchId > 0 ? (
                              <button
                                type="button"
                                aria-label={t("reports.patronExpensesOpenDetailAria")}
                                title={t("reports.patronExpensesOpenDetailAria")}
                                className={eyeLinkClass}
                                onClick={() =>
                                  openBranchDetail(row.branchId!, {
                                    initialTab: "expenses",
                                    initialRegisterDay: (row.transactionDate ?? "").slice(0, 10) || null,
                                    initialExpensePaymentSource: "PATRON",
                                    focusTransactionId: row.id,
                                  })
                                }
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                            ) : href ? (
                              <Link
                                href={href}
                                aria-label={t("reports.patronExpensesOpenDetailAria")}
                                title={t("reports.patronExpensesOpenDetailAria")}
                                className={eyeLinkClass}
                              >
                                <EyeIcon className="h-5 w-5" />
                              </Link>
                            ) : (
                              <span className={cn(eyeLinkClass, "pointer-events-none opacity-40")}>
                                <EyeIcon className="h-5 w-5" />
                              </span>
                            )}
                          </li>
                        );
                      })}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* DESKTOP: table with eye icon cell */}
                    <div className="hidden sm:block">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableHeader>{t("reports.patronFlowColDate")}</TableHeader>
                            <TableHeader>{t("reports.colBranch")}</TableHeader>
                            <TableHeader>
                              {t("reports.patronFlowColExpenseGroup")}
                            </TableHeader>
                            <TableHeader className="text-right tabular-nums">
                              {t("reports.patronFlowColAmount")}
                            </TableHeader>
                            <TableHeader>
                              {t("reports.patronFlowColCategory")}
                            </TableHeader>
                            <TableHeader>
                              {t("reports.patronFlowColDescription")}
                            </TableHeader>
                            <TableHeader className="w-12">
                              <span className="sr-only">
                                {t("reports.patronExpensesOpenDetailAria")}
                              </span>
                            </TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {slicedByDay.flatMap((g) => [
                            <TableRow key={`day-${g.date}`}>
                              <TableCell
                                colSpan={7}
                                className="sticky top-0 z-10 !bg-zinc-50 !py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 backdrop-blur"
                              >
                                <span className="flex items-center justify-between gap-3">
                                  <span>{formatLocaleDate(g.date, locale)}</span>
                                  <span className="tabular-nums text-zinc-800">
                                    Toplam:{" "}
                                    {formatLocaleAmount(
                                      g.total,
                                      locale,
                                      activeRollup.currencyCode,
                                    )}
                                  </span>
                                </span>
                              </TableCell>
                            </TableRow>,
                            ...g.rows.map((row) => {
                            const personnelFocus = rowPersonnelDetailFocus(row);
                            const isSupplier =
                              row.derivedFromSupplierPaymentId != null ||
                              (row.linkedSupplierInvoiceLineId != null &&
                                row.linkedSupplierInvoiceLineId > 0);
                            const href = personnelFocus ? null : expenseDetailHref(row);
                            return (
                              <TableRow key={row.id}>
                                <TableCell className="whitespace-nowrap text-sm tabular-nums">
                                  <span className="inline-flex items-center gap-2">
                                    <span
                                      aria-hidden
                                      className={cn(
                                        "inline-block h-3 w-1 rounded-full",
                                        BUCKET_TONE[bucketFromRow(row)].barActive,
                                      )}
                                    />
                                    {formatLocaleDate(row.transactionDate, locale)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm text-zinc-900">
                                  {personnelFocus ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="truncate">
                                        {`${personnelFocus.focusAdvanceId ? "Avans" : "Personel"}: ${personnelFocus.personnelName ?? "—"}`}
                                      </span>
                                      {row.branchName?.trim() ? (
                                        <span className="inline-flex max-w-fit items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                          Şube kasası: {row.branchName}
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : isSupplier && row.supplierName?.trim() ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span className="truncate">Tedarikçi: {row.supplierName}</span>
                                      {row.branchName?.trim() ? (
                                        <span className="inline-flex max-w-fit items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                          Şube: {row.branchName}
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : (
                                    row.branchName ?? "—"
                                  )}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "text-sm font-medium",
                                    BUCKET_TONE[
                                      bucketFromRow(row)
                                    ].badge,
                                  )}
                                >
                                  {bucketLabel(
                                    t,
                                    bucketFromRow(row),
                                  )}
                                </TableCell>
                                <TableCell className="text-right text-sm tabular-nums">
                                  {formatLocaleAmount(row.amount, locale)}{" "}
                                  {row.currencyCode}
                                </TableCell>
                                <TableCell className="max-w-[10rem] truncate text-sm text-zinc-600">
                                  {txCategoryLine(
                                    row.mainCategory,
                                    row.category,
                                    t,
                                  ) || "—"}
                                </TableCell>
                                <TableCell className="max-w-[14rem] text-sm text-zinc-700">
                                  <span
                                    className="block truncate"
                                    title={row.description ?? undefined}
                                  >
                                    {row.description ?? "—"}
                                  </span>
                                </TableCell>
                                <TableCell className="w-12 text-right">
                                  {personnelFocus ? (
                                    <button
                                      type="button"
                                      aria-label={t("reports.patronExpensesOpenDetailAria")}
                                      title={t("reports.patronExpensesOpenDetailAria")}
                                      className={eyeLinkClass}
                                      onClick={() =>
                                        openPersonnelDetail(personnelFocus.personnelId, {
                                          initialTab: "costs",
                                          focusAdvanceId: personnelFocus.focusAdvanceId ?? null,
                                          focusExpenseTransactionId:
                                            personnelFocus.focusExpenseTransactionId ?? null,
                                        })
                                      }
                                    >
                                      <EyeIcon className="h-5 w-5" />
                                    </button>
                                  ) : !isSupplier && row.branchId != null && row.branchId > 0 ? (
                                    <button
                                      type="button"
                                      aria-label={t("reports.patronExpensesOpenDetailAria")}
                                      title={t("reports.patronExpensesOpenDetailAria")}
                                      className={eyeLinkClass}
                                      onClick={() =>
                                        openBranchDetail(row.branchId!, {
                                          initialTab: "expenses",
                                          initialRegisterDay: row.transactionDate,
                                          initialExpensePaymentSource: "PATRON",
                                          focusTransactionId: row.id,
                                        })
                                      }
                                    >
                                      <EyeIcon className="h-5 w-5" />
                                    </button>
                                  ) : href ? (
                                    <Link
                                      href={href}
                                      aria-label={t("reports.patronExpensesOpenDetailAria")}
                                      title={t("reports.patronExpensesOpenDetailAria")}
                                      className={eyeLinkClass}
                                    >
                                      <EyeIcon className="h-5 w-5" />
                                    </Link>
                                  ) : (
                                    <span className={cn(eyeLinkClass, "pointer-events-none opacity-40")}>
                                      <EyeIcon className="h-5 w-5" />
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          }),
                          ])}
                        </TableBody>
                      </Table>
                    </div>

                    {/* PAGING */}
                    <div className="flex flex-col gap-2 border-t border-zinc-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs tabular-nums text-zinc-500">
                        {fillTemplate(t("reports.patronFlowOutPaging"), {
                          page: String(pageSafe),
                          totalPages: String(totalPages),
                          shown: String(slice.length),
                          total: String(processed.length),
                        })}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={pageSafe <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {t("reports.patronFlowOutPrevPage")}
                        </button>
                        <button
                          type="button"
                          disabled={pageSafe >= totalPages}
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {t("reports.patronFlowOutNextPage")}
                        </button>
                      </div>
                    </div>
                  </section>
                )}
              </>
            ) : null}

            {isFetching && state.kind === "ok" ? (
              <p
                className="text-center text-xs text-zinc-400"
                aria-live="polite"
              >
                {t("reports.updatingHint")}
              </p>
            ) : null}
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <ReportHubDateRangeControls
            t={t}
            dateFrom={dateFrom}
            dateTo={dateTo}
            rangeLock={dateRangeLock}
            onUnlockCalendarYear={() => setDateRangeLock("manual")}
            onPreset={(key) => {
              setDateRangeLock("preset");
              applyDatePreset(key);
            }}
            onCalendarYearRange={(f, d) => {
              setDateRangeLock("calendarYear");
              setDateFrom(f);
              setDateTo(d);
            }}
            onDateFromChange={(v) => {
              setDateRangeLock("manual");
              setDateFrom(v);
            }}
            onDateToChange={(v) => {
              setDateRangeLock("manual");
              setDateTo(v);
            }}
          />
          <div className="min-w-0 sm:max-w-md">
            <Select
              name="patronFlowBranchFilter"
              label={t("reports.colBranch")}
              options={filterBranchOptions}
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              onBlur={() => {}}
              className="min-h-11 sm:min-h-10 sm:text-sm"
            />
          </div>
        </div>
      </ReportMobileFilterSurface>
    </ReportTablesPageShell>
  );
}
