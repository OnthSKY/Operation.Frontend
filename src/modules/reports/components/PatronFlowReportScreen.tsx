"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import { posSettlementBeneficiaryLabel } from "@/modules/branch/lib/pos-settlement-beneficiary";
import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import { ReportInteractiveRows } from "@/modules/reports/components/ReportInteractiveRows";
import {
  ReportHubDateRangeControls,
  type ReportHubRangeLock,
} from "@/modules/reports/components/ReportHubDateRangeControls";
import { ReportMobileFilterSurface } from "@/modules/reports/components/ReportMobileFilterSurface";
import { ReportTablesPageShell } from "@/modules/reports/components/ReportTablesPageShell";
import {
  addDaysFromIso,
  startOfCalendarYearIso,
  startOfMonthIso,
} from "@/modules/reports/lib/report-period-helpers";
import { usePatronFlowOverview } from "@/modules/reports/hooks/useReportsQueries";
import { PageWhenToUseInfoButton } from "@/shared/components/PageWhenToUseInfoButton";
import { toErrorMessage } from "@/shared/lib/error-message";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatLocaleAmount } from "@/shared/lib/locale-amount";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import type { PatronFlowLine } from "@/types/patron-flow";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  compareValues,
  rowMatchesQuery,
  type SortDir,
} from "@/modules/reports/lib/report-table-utils";

type SortKey = "date" | "branch" | "kind" | "amount";

function flowKindLabel(t: (k: string) => string, kind: string): string {
  const u = kind.toUpperCase();
  if (u === "PATRON_CASH_IN") return t("reports.patronFlowKindPatronCashIn");
  if (u === "REGISTER_INCOME_TO_PATRON")
    return t("reports.patronFlowKindRegisterIncomeToPatron");
  if (u === "REGISTER_PAID_TO_PATRON")
    return t("reports.patronFlowKindRegisterPaidToPatron");
  if (u === "POCKET_CLAIM_TO_PATRON")
    return t("reports.patronFlowKindPocketClaimToPatron");
  if (u === "SUPPLIER_PAID_BY_PATRON")
    return t("reports.patronFlowKindSupplierPaidByPatron");
  if (u === "ACCOUNTING_PAID_BY_PATRON")
    return t("reports.patronFlowKindAccountingPaidByPatron");
  if (u === "OTHER_PAID_BY_PATRON")
    return t("reports.patronFlowKindOtherPaidByPatron");
  if (u === "ADVANCE_FROM_PATRON")
    return t("reports.patronFlowKindAdvanceFromPatron");
  if (u === "SALARY_FROM_PATRON")
    return t("reports.patronFlowKindSalaryFromPatron");
  return kind;
}

function patronOutflowSortValue(
  r: PatronFlowLine,
  key: SortKey,
  t: (k: string) => string,
): string | number {
  switch (key) {
    case "date":
      return r.transactionDate;
    case "branch":
      return r.branchName ?? "";
    case "kind":
      return flowKindLabel(t, r.flowKind);
    case "amount":
      return r.amount;
    default:
      return "";
  }
}

const PATRON_OUT_KINDS = [
  "SUPPLIER_PAID_BY_PATRON",
  "ACCOUNTING_PAID_BY_PATRON",
  "OTHER_PAID_BY_PATRON",
  "ADVANCE_FROM_PATRON",
  "SALARY_FROM_PATRON",
] as const;

type PatronOutExpenseBucket = "advance" | "personnel" | "branch" | "general";
type PatronOutBucketFilter = "all" | PatronOutExpenseBucket;

const PATRON_OUT_BUCKET_ORDER: PatronOutExpenseBucket[] = [
  "advance",
  "personnel",
  "branch",
  "general",
];

const OUTFLOW_DETAIL_PAGE_SIZE = 25;

function isPatronOutflowKind(kind: string): boolean {
  const u = kind.toUpperCase();
  return (PATRON_OUT_KINDS as readonly string[]).includes(u);
}

/** Avans / personel / şube (tedarikçi·stok·işletme) / genel (muhasebe·diğer) — kullanıcı dostu özet. */
function patronOutflowExpenseBucket(line: PatronFlowLine): PatronOutExpenseBucket {
  const fk = line.flowKind.toUpperCase();
  if (fk === "ADVANCE_FROM_PATRON") return "advance";
  if (fk === "SALARY_FROM_PATRON") return "personnel";
  if (fk === "SUPPLIER_PAID_BY_PATRON") return "branch";
  if (fk === "ACCOUNTING_PAID_BY_PATRON") return "general";
  const mc = (line.mainCategory ?? "").toUpperCase();
  if (mc === "OUT_PERSONNEL" || mc.startsWith("OUT_PER_")) return "personnel";
  if (mc === "OUT_GOODS" || mc.startsWith("OUT_GOODS_")) return "branch";
  if (mc === "OUT_OPS" || mc.startsWith("OUT_OPS_")) return "branch";
  return "general";
}

function expenseBucketLabel(t: (k: string) => string, b: PatronOutExpenseBucket): string {
  if (b === "advance") return t("reports.patronFlowOutBucketAdvance");
  if (b === "personnel") return t("reports.patronFlowOutBucketPersonnel");
  if (b === "branch") return t("reports.patronFlowOutBucketBranch");
  return t("reports.patronFlowOutBucketGeneral");
}

type PocketRollup = {
  currencyCode: string;
  patronCashIn: number;
  registerIncomeToPatron: number;
  totalPatronInflow: number;
  registerReturnsToPatron: number;
  totalOut: number;
  expenseBucketLines: {
    bucket: PatronOutExpenseBucket;
    amount: number;
    pct: number;
  }[];
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{{${k}}}`).join(v);
  }
  return s;
}

function buildPocketRollups(
  totals: { flowKind: string; totalAmount: number; currencyCode: string }[],
  lines: PatronFlowLine[],
): PocketRollup[] {
  const byCur = new Map<string, Map<string, number>>();
  for (const row of totals) {
    const cc = (row.currencyCode || "TRY").toUpperCase();
    if (!byCur.has(cc)) byCur.set(cc, new Map());
    const m = byCur.get(cc)!;
    const k = row.flowKind.toUpperCase();
    m.set(k, (m.get(k) ?? 0) + row.totalAmount);
  }
  const rollups: PocketRollup[] = [];
  for (const [currencyCode, m] of byCur) {
    const patronCashIn = m.get("PATRON_CASH_IN") ?? 0;
    const registerIncomeToPatron = m.get("REGISTER_INCOME_TO_PATRON") ?? 0;
    const totalPatronInflow = patronCashIn + registerIncomeToPatron;
    const registerReturnsToPatron =
      (m.get("REGISTER_PAID_TO_PATRON") ?? 0) +
      (m.get("POCKET_CLAIM_TO_PATRON") ?? 0);
    let totalOut = 0;
    for (const k of PATRON_OUT_KINDS) {
      totalOut += m.get(k) ?? 0;
    }
    const outForCur = lines.filter(
      (ln) =>
        isPatronOutflowKind(ln.flowKind) &&
        (ln.currencyCode || "TRY").toUpperCase() === currencyCode,
    );
    const bucketSums: Record<PatronOutExpenseBucket, number> = {
      advance: 0,
      personnel: 0,
      branch: 0,
      general: 0,
    };
    for (const ln of outForCur) {
      bucketSums[patronOutflowExpenseBucket(ln)] += ln.amount;
    }
    const expenseBucketLines = PATRON_OUT_BUCKET_ORDER.map((bucket) => {
      const amount = bucketSums[bucket];
      const pct = totalOut > 0.005 ? Math.round((amount / totalOut) * 100) : 0;
      return { bucket, amount, pct };
    }).filter((x) => x.amount > 0.005);
    rollups.push({
      currencyCode,
      patronCashIn,
      registerIncomeToPatron,
      totalPatronInflow,
      registerReturnsToPatron,
      totalOut,
      expenseBucketLines,
    });
  }
  rollups.sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
  return rollups;
}

const mobileCard =
  "rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:hidden";
const mobileCardStack = "flex flex-col gap-3 sm:hidden";

export function PatronFlowReportScreen() {
  const { t, locale } = useI18n();
  const [dateFrom, setDateFrom] = useState(() => startOfCalendarYearIso());
  const [dateTo, setDateTo] = useState(() => localIsoDate());
  const [dateRangeLock, setDateRangeLock] =
    useState<ReportHubRangeLock>("manual");
  const [filterBranchId, setFilterBranchId] = useState("");

  const { data: branches = [] } = useBranchesList();

  const flowParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      branchId:
        filterBranchId === "" ? undefined : Number.parseInt(filterBranchId, 10),
    }),
    [dateFrom, dateTo, filterBranchId],
  );

  const overview = usePatronFlowOverview(flowParams, true);

  const filterBranchOptions = useMemo(
    () => [
      { value: "", label: t("reports.allBranches") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t],
  );

  const applyDatePreset = (key: "month" | "d30" | "d7") => {
    const today = localIsoDate();
    if (key === "month") {
      setDateFrom(startOfMonthIso());
      setDateTo(today);
      return;
    }
    if (key === "d30") {
      setDateFrom(addDaysFromIso(today, -29));
      setDateTo(today);
      return;
    }
    setDateFrom(addDaysFromIso(today, -6));
    setDateTo(today);
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

  const items: PatronFlowLine[] = overview.data?.items ?? [];
  const totals = overview.data?.totalsByKind ?? [];

  const pocketRollups = useMemo(
    () => buildPocketRollups(totals, items),
    [totals, items],
  );

  const outflowLinesAll = useMemo(
    () => items.filter((r) => isPatronOutflowKind(r.flowKind)),
    [items],
  );

  const [outDetailBucket, setOutDetailBucket] =
    useState<PatronOutBucketFilter>("all");
  const [outDetailQuery, setOutDetailQuery] = useState("");
  const [outDetailSortKey, setOutDetailSortKey] = useState<SortKey>("date");
  const [outDetailSortDir, setOutDetailSortDir] = useState<SortDir>("desc");
  const [outDetailPage, setOutDetailPage] = useState(1);

  useEffect(() => {
    setOutDetailPage(1);
  }, [outDetailBucket, dateFrom, dateTo, filterBranchId]);

  const outflowHaystack = useCallback(
    (r: PatronFlowLine) =>
      [
        r.branchName,
        r.description,
        txCategoryLine(r.mainCategory, r.category, t),
        r.mainCategory,
        r.category,
        r.transactionType,
        flowKindLabel(t, r.flowKind),
        expenseBucketLabel(t, patronOutflowExpenseBucket(r)),
        r.posBeneficiaryPersonnelName,
        r.posSettlementNotes,
      ]
        .filter(Boolean)
        .join(" "),
    [t],
  );

  const outflowDetailProcessed = useMemo(() => {
    let rows = outflowLinesAll;
    if (outDetailBucket !== "all") {
      rows = rows.filter(
        (r) => patronOutflowExpenseBucket(r) === outDetailBucket,
      );
    }
    const q = outDetailQuery.trim();
    if (q) {
      rows = rows.filter((r) => rowMatchesQuery(outflowHaystack(r), q));
    }
    return [...rows].sort((a, b) =>
      compareValues(
        patronOutflowSortValue(a, outDetailSortKey, t),
        patronOutflowSortValue(b, outDetailSortKey, t),
        outDetailSortDir,
      ),
    );
  }, [
    outflowLinesAll,
    outDetailBucket,
    outDetailQuery,
    outDetailSortKey,
    outDetailSortDir,
    outflowHaystack,
    t,
  ]);

  const outflowDetailTotalPages = Math.max(
    1,
    Math.ceil(outflowDetailProcessed.length / OUTFLOW_DETAIL_PAGE_SIZE),
  );

  useEffect(() => {
    setOutDetailPage((p) => Math.min(p, outflowDetailTotalPages));
  }, [outflowDetailTotalPages]);

  const outflowDetailPageSafe = Math.min(outDetailPage, outflowDetailTotalPages);
  const outflowDetailSlice = useMemo(() => {
    const start = (outflowDetailPageSafe - 1) * OUTFLOW_DETAIL_PAGE_SIZE;
    return outflowDetailProcessed.slice(start, start + OUTFLOW_DETAIL_PAGE_SIZE);
  }, [outflowDetailProcessed, outflowDetailPageSafe]);

  /** pocketOut: sadece patron cebinden çıkanlar (filtre + sayfa). all: kasa girişleri dahil tüm akış. */
  const [linesView, setLinesView] = useState<"pocketOut" | "all">("pocketOut");

  useEffect(() => {
    if (outflowLinesAll.length === 0) setLinesView("all");
  }, [outflowLinesAll.length]);

  const outDetailBucketOptions = useMemo(
    () => [
      { value: "all" as const, label: t("reports.patronFlowOutBucketAll") },
      ...PATRON_OUT_BUCKET_ORDER.map((b) => ({
        value: b,
        label: expenseBucketLabel(t, b),
      })),
    ],
    [t],
  );

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
        onRefetch={() => void overview.refetch()}
        isRefetching={overview.isFetching}
        main={
          <>
            <p className="text-sm leading-relaxed text-zinc-600">
              {t("reports.patronFlowLead")}
            </p>
            <p className="mt-2 rounded-lg border border-zinc-200/80 bg-zinc-50/90 px-3 py-2 text-xs leading-relaxed text-zinc-700">
              {t("reports.patronFlowScopeNote")}
            </p>

            {overview.isFetching && overview.data ? (
              <p
                className="text-center text-xs text-zinc-400"
                aria-live="polite"
              >
                {t("reports.updatingHint")}
              </p>
            ) : null}

            {overview.isError ? (
              <p className="text-sm text-red-600">
                {t("reports.error")} {toErrorMessage(overview.error)}
              </p>
            ) : null}

            {overview.isPending ? (
              <p className="text-sm text-zinc-500">{t("reports.loading")}</p>
            ) : null}

            {pocketRollups.length > 0 ? (
              <div className="flex flex-col gap-4">
                {pocketRollups.map((roll) => {
                  const amt = (n: number) => formatLocaleAmount(n, locale);
                  const hasOut = roll.totalOut > 0.005;
                  const hasIn = roll.totalPatronInflow > 0.005;
                  return (
                    <section
                      key={roll.currencyCode}
                      className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/95 via-white to-amber-50/30 p-4 shadow-sm ring-1 ring-violet-100/60 sm:p-5"
                    >
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-violet-900/85">
                        {t("reports.patronPocketStoryTitle")}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-600">
                        {t("reports.patronPocketStoryBucketIntro")}
                      </p>
                      {hasOut ? (
                        <p className="mt-3 text-lg font-semibold leading-snug text-zinc-900 sm:text-xl">
                          {fillTemplate(
                            t("reports.patronPocketStoryHeadlineOut"),
                            {
                              amount: amt(roll.totalOut),
                              currency: roll.currencyCode,
                            },
                          )}
                        </p>
                      ) : hasIn ? (
                        <p className="mt-3 text-base font-semibold leading-snug text-zinc-900 sm:text-lg">
                          {fillTemplate(t("reports.patronPocketStoryInOnly"), {
                            amount: amt(roll.totalPatronInflow),
                            currency: roll.currencyCode,
                          })}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm text-zinc-600">
                          {t("reports.patronPocketStoryNoMovement")}
                        </p>
                      )}
                      {hasIn && hasOut ? (
                        <p className="mt-2 text-sm text-zinc-700">
                          {fillTemplate(
                            t("reports.patronPocketStoryCashInAlso"),
                            {
                              amount: amt(roll.totalPatronInflow),
                              currency: roll.currencyCode,
                            },
                          )}
                        </p>
                      ) : null}
                      {roll.registerIncomeToPatron > 0.005 ||
                      roll.patronCashIn > 0.005 ? (
                        <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                          {fillTemplate(
                            t("reports.patronFlowStoryInflowBreakdown"),
                            {
                              deposit: amt(roll.patronCashIn),
                              incomeShare: amt(roll.registerIncomeToPatron),
                              currency: roll.currencyCode,
                            },
                          )}
                        </p>
                      ) : null}
                      {roll.registerReturnsToPatron > 0.005 ? (
                        <p className="mt-2 text-xs font-medium leading-relaxed text-emerald-900/90">
                          {fillTemplate(
                            t("reports.patronFlowStoryRegisterReturns"),
                            {
                              amount: amt(roll.registerReturnsToPatron),
                              currency: roll.currencyCode,
                            },
                          )}
                        </p>
                      ) : null}
                      {hasOut && roll.expenseBucketLines.length > 0 ? (
                        <>
                          <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500">
                            {t("reports.patronPocketStoryWhere")}
                          </p>
                          <ul className="mt-2 space-y-3">
                            {roll.expenseBucketLines.map((line) => (
                              <li key={line.bucket}>
                                <div className="flex items-baseline justify-between gap-2 text-sm">
                                  <span className="min-w-0 font-medium text-zinc-800">
                                    {expenseBucketLabel(t, line.bucket)}
                                  </span>
                                  <span className="shrink-0 tabular-nums text-zinc-900">
                                    {amt(line.amount)} {roll.currencyCode}
                                    <span className="ml-1.5 text-xs font-normal text-zinc-500">
                                      {line.pct}%
                                    </span>
                                  </span>
                                </div>
                                <div
                                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-200/90"
                                  role="presentation"
                                >
                                  <div
                                    className="h-full min-w-[3px] rounded-full bg-violet-500/90"
                                    style={{
                                      width: `${roll.totalOut > 0.005 ? Math.min(100, (line.amount / roll.totalOut) * 100) : 0}%`,
                                    }}
                                  />
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            ) : null}

            {items.length > 0 ? (
              <section className="rounded-2xl border border-zinc-200 bg-white px-3 py-4 sm:px-5 sm:py-6">
                <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  {t("reports.patronFlowUnifiedLinesTitle")}
                </h2>
                {outflowLinesAll.length > 0 ? (
                  <div
                    role="tablist"
                    aria-label={t("reports.patronFlowViewBarAria")}
                    className="mt-3 flex rounded-xl border border-zinc-200/80 bg-zinc-100/90 p-1 shadow-inner"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={linesView === "pocketOut"}
                      className={cn(
                        "min-h-11 flex-1 touch-manipulation rounded-lg px-2 py-2 text-sm font-semibold transition-colors",
                        linesView === "pocketOut"
                          ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                          : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900",
                      )}
                      onClick={() => setLinesView("pocketOut")}
                    >
                      {t("reports.patronFlowViewBarOpen")}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={linesView === "all"}
                      className={cn(
                        "min-h-11 flex-1 touch-manipulation rounded-lg px-2 py-2 text-sm font-semibold transition-colors",
                        linesView === "all"
                          ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/80"
                          : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900",
                      )}
                      onClick={() => setLinesView("all")}
                    >
                      {t("reports.patronFlowViewBarIntegrated")}
                    </button>
                  </div>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {outflowLinesAll.length > 0
                    ? linesView === "pocketOut"
                      ? t("reports.patronFlowOutDetailLead")
                      : t("reports.patronFlowViewBarIntegratedCaption")
                    : t("reports.patronFlowViewBarIntegratedCaption")}
                </p>
                <div
                  className={cn(
                    outflowLinesAll.length === 0 || linesView !== "pocketOut"
                      ? "hidden"
                      : "mt-4",
                  )}
                >
                  <div
                    className="flex flex-col gap-3 border-b border-zinc-100 pb-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3"
                    role="search"
                  >
                  <label className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                      {t("reports.sectionFilter")}
                    </span>
                    <input
                      type="search"
                      enterKeyHint="search"
                      value={outDetailQuery}
                      onChange={(e) => setOutDetailQuery(e.target.value)}
                      placeholder={t("reports.sectionSearchPlaceholder")}
                      className="min-h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 sm:min-h-10 sm:text-sm"
                    />
                  </label>
                  <div className="min-w-0 sm:w-[min(100%,18rem)]">
                    <Select
                      name="patronFlowOutBucketFilter"
                      label={t("reports.patronFlowOutBucketFilter")}
                      options={outDetailBucketOptions.map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                      value={outDetailBucket}
                      onChange={(e) =>
                        setOutDetailBucket(e.target.value as PatronOutBucketFilter)
                      }
                      onBlur={() => {}}
                      className="min-h-11 sm:min-h-10 sm:text-sm"
                    />
                  </div>
                  <div className="min-w-0 sm:w-[min(100%,16rem)]">
                    <Select
                      name="patronFlowOutSort"
                      label={t("reports.sectionSortBy")}
                      options={[
                        { value: "date", label: t("reports.patronFlowColDate") },
                        { value: "branch", label: t("reports.colBranch") },
                        { value: "kind", label: t("reports.patronFlowColKind") },
                        { value: "amount", label: t("reports.patronFlowColAmount") },
                      ]}
                      value={outDetailSortKey}
                      onChange={(e) =>
                        setOutDetailSortKey(e.target.value as SortKey)
                      }
                      onBlur={() => {}}
                      className="min-h-11 sm:min-h-10 sm:text-sm"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOutDetailSortDir((d) => (d === "asc" ? "desc" : "asc"))
                      }
                      className="min-h-11 min-w-11 touch-manipulation rounded-lg border border-zinc-200 bg-white px-2 text-base font-semibold leading-none text-zinc-800 shadow-sm sm:min-h-10 sm:min-w-10 sm:text-sm"
                      aria-label={
                        outDetailSortDir === "asc"
                          ? t("reports.sortDescAria")
                          : t("reports.sortAscAria")
                      }
                      title={
                        outDetailSortDir === "asc"
                          ? t("reports.sortStateDesc")
                          : t("reports.sortStateAsc")
                      }
                    >
                      <span aria-hidden>
                        {outDetailSortDir === "asc" ? "↑" : "↓"}
                      </span>
                    </button>
                  </div>
                </div>
                {outflowDetailProcessed.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-500">
                    {t("reports.sectionNoSearchMatches")}
                  </p>
                ) : (
                  <>
                    <div className={mobileCardStack}>
                      {outflowDetailSlice.map((row) => (
                        <article key={row.id} className={mobileCard}>
                          <dl className="space-y-2">
                            <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                              <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                {t("reports.patronFlowColExpenseGroup")}
                              </dt>
                              <dd className="text-sm font-medium text-violet-900">
                                {expenseBucketLabel(
                                  t,
                                  patronOutflowExpenseBucket(row),
                                )}
                              </dd>
                            </div>
                            <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                              <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                {t("reports.patronFlowColDate")}
                              </dt>
                              <dd className="text-sm font-medium text-zinc-900">
                                {formatLocaleDate(row.transactionDate, locale)}
                              </dd>
                            </div>
                            <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                              <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                {t("reports.colBranch")}
                              </dt>
                              <dd className="text-sm text-zinc-800">
                                {row.branchId != null && row.branchId > 0 ? (
                                  <Link
                                    href={`/branches?openBranch=${row.branchId}`}
                                    className="text-violet-800 underline decoration-violet-200 underline-offset-2 hover:text-violet-950"
                                  >
                                    {row.branchName ?? "—"}
                                  </Link>
                                ) : (
                                  (row.branchName ?? "—")
                                )}
                              </dd>
                            </div>
                            <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                              <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                {t("reports.patronFlowColKind")}
                              </dt>
                              <dd className="text-sm text-zinc-800">
                                {flowKindLabel(t, row.flowKind)}
                              </dd>
                            </div>
                            <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                              <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                {t("reports.patronFlowColAmount")}
                              </dt>
                              <dd className="text-sm tabular-nums text-zinc-900">
                                {formatLocaleAmount(row.amount, locale)}{" "}
                                {row.currencyCode}
                              </dd>
                            </div>
                            <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                              <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                {t("reports.patronFlowColCategory")}
                              </dt>
                              <dd className="text-sm text-zinc-700">
                                {txCategoryLine(
                                  row.mainCategory,
                                  row.category,
                                  t,
                                ) || "—"}
                              </dd>
                            </div>
                            {row.description ? (
                              <div className="flex flex-col gap-0.5">
                                <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                  {t("reports.patronFlowColDescription")}
                                </dt>
                                <dd className="text-sm text-zinc-700">
                                  {row.description}
                                </dd>
                              </div>
                            ) : null}
                          </dl>
                        </article>
                      ))}
                    </div>
                    <div className="hidden sm:block">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableHeader>
                              {t("reports.patronFlowColDate")}
                            </TableHeader>
                            <TableHeader>
                              {t("reports.colBranch")}
                            </TableHeader>
                            <TableHeader>
                              {t("reports.patronFlowColExpenseGroup")}
                            </TableHeader>
                            <TableHeader>
                              {t("reports.patronFlowColKind")}
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
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {outflowDetailSlice.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="whitespace-nowrap text-sm">
                                {formatLocaleDate(row.transactionDate, locale)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {row.branchId != null && row.branchId > 0 ? (
                                  <Link
                                    href={`/branches?openBranch=${row.branchId}`}
                                    className="text-violet-800 underline decoration-violet-200 underline-offset-2 hover:text-violet-950"
                                  >
                                    {row.branchName ?? "—"}
                                  </Link>
                                ) : (
                                  (row.branchName ?? "—")
                                )}
                              </TableCell>
                              <TableCell className="text-sm font-medium text-violet-900">
                                {expenseBucketLabel(
                                  t,
                                  patronOutflowExpenseBucket(row),
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {flowKindLabel(t, row.flowKind)}
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
                              <TableCell className="max-w-[18rem] text-sm text-zinc-700">
                                {row.description ?? "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <p className="text-xs tabular-nums text-zinc-500">
                        {t("reports.patronFlowOutPaging")
                          .replace("{{page}}", String(outflowDetailPageSafe))
                          .replace(
                            "{{totalPages}}",
                            String(outflowDetailTotalPages),
                          )
                          .replace("{{shown}}", String(outflowDetailSlice.length))
                          .replace(
                            "{{total}}",
                            String(outflowDetailProcessed.length),
                          )}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={outflowDetailPageSafe <= 1}
                          onClick={() => setOutDetailPage((p) => Math.max(1, p - 1))}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {t("reports.patronFlowOutPrevPage")}
                        </button>
                        <button
                          type="button"
                          disabled={
                            outflowDetailPageSafe >= outflowDetailTotalPages
                          }
                          onClick={() =>
                            setOutDetailPage((p) =>
                              Math.min(outflowDetailTotalPages, p + 1),
                            )
                          }
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {t("reports.patronFlowOutNextPage")}
                        </button>
                      </div>
                    </div>
                  </>
                )}
                </div>

                <div
                  className={cn(linesView !== "all" ? "hidden" : "mt-4")}
                >
                  <ReportInteractiveRows<PatronFlowLine, SortKey>
                interactive
                rows={items}
                defaultSortKey="date"
                sortOptions={[
                  { id: "date", label: t("reports.patronFlowColDate") },
                  { id: "branch", label: t("reports.colBranch") },
                  { id: "kind", label: t("reports.patronFlowColKind") },
                  { id: "amount", label: t("reports.patronFlowColAmount") },
                ]}
                getSearchHaystack={(r) =>
                  [
                    r.branchName,
                    r.description,
                    txCategoryLine(r.mainCategory, r.category, t),
                    r.mainCategory,
                    r.category,
                    r.transactionType,
                    flowKindLabel(t, r.flowKind),
                    r.posBeneficiaryPersonnelName,
                    r.posSettlementNotes,
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
                getSortValue={(r, key) => {
                  switch (key) {
                    case "date":
                      return r.transactionDate;
                    case "branch":
                      return r.branchName ?? "";
                    case "kind":
                      return flowKindLabel(t, r.flowKind);
                    case "amount":
                      return r.amount;
                    default:
                      return "";
                  }
                }}
                t={t}
              >
                {({ displayRows, toolbar, emptyFiltered }) => (
                  <>
                    {toolbar}
                    {emptyFiltered ? (
                      <p className="text-sm text-zinc-500">
                        {t("reports.sectionNoSearchMatches")}
                      </p>
                    ) : (
                      <>
                        <div className={mobileCardStack}>
                          {displayRows.map((row) => (
                            <article key={row.id} className={mobileCard}>
                              <dl className="space-y-2">
                                <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                                  <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                    {t("reports.patronFlowColDate")}
                                  </dt>
                                  <dd className="text-sm font-medium text-zinc-900">
                                    {formatLocaleDate(row.transactionDate, locale)}
                                  </dd>
                                </div>
                                <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                                  <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                    {t("reports.colBranch")}
                                  </dt>
                                  <dd className="text-sm text-zinc-800">
                                    {row.branchId != null && row.branchId > 0 ? (
                                      <Link
                                        href={`/branches?openBranch=${row.branchId}`}
                                        className="text-violet-800 underline decoration-violet-200 underline-offset-2 hover:text-violet-950"
                                      >
                                        {row.branchName ?? "—"}
                                      </Link>
                                    ) : (
                                      (row.branchName ?? "—")
                                    )}
                                  </dd>
                                </div>
                                <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                                  <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                    {t("reports.patronFlowColKind")}
                                  </dt>
                                  <dd className="text-sm text-zinc-800">
                                    {flowKindLabel(t, row.flowKind)}
                                  </dd>
                                </div>
                                <div className="flex flex-col gap-0.5 border-b border-zinc-100 pb-2">
                                  <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                    {t("reports.patronFlowColAmount")}
                                  </dt>
                                  <dd className="text-sm tabular-nums text-zinc-900">
                                    {formatLocaleAmount(row.amount, locale)}{" "}
                                    {row.currencyCode}
                                  </dd>
                                </div>
                                {row.description ? (
                                  <div className="flex flex-col gap-0.5">
                                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                                      {t("reports.patronFlowColDescription")}
                                    </dt>
                                    <dd className="text-sm text-zinc-700">
                                      {row.description}
                                    </dd>
                                  </div>
                                ) : null}
                              </dl>
                            </article>
                          ))}
                        </div>
                        <div className="hidden sm:block">
                          <Table>
                            <TableHead>
                              <TableRow>
                                <TableHeader>
                                  {t("reports.patronFlowColDate")}
                                </TableHeader>
                                <TableHeader>
                                  {t("reports.colBranch")}
                                </TableHeader>
                                <TableHeader>
                                  {t("reports.patronFlowColKind")}
                                </TableHeader>
                                <TableHeader className="text-right tabular-nums">
                                  {t("reports.patronFlowColAmount")}
                                </TableHeader>
                                <TableHeader>
                                  {t("reports.patronFlowColCategory")}
                                </TableHeader>
                                <TableHeader>
                                  {t("reports.patronFlowColPosTag")}
                                </TableHeader>
                                <TableHeader>
                                  {t("reports.patronFlowColDescription")}
                                </TableHeader>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {displayRows.map((row) => (
                                <TableRow key={row.id}>
                                  <TableCell className="whitespace-nowrap text-sm">
                                    {formatLocaleDate(row.transactionDate, locale)}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {row.branchId != null && row.branchId > 0 ? (
                                      <Link
                                        href={`/branches?openBranch=${row.branchId}`}
                                        className="text-violet-800 underline decoration-violet-200 underline-offset-2 hover:text-violet-950"
                                      >
                                        {row.branchName ?? "—"}
                                      </Link>
                                    ) : (
                                      (row.branchName ?? "—")
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {flowKindLabel(t, row.flowKind)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm tabular-nums">
                                    {formatLocaleAmount(row.amount, locale)}{" "}
                                    {row.currencyCode}
                                  </TableCell>
                                  <TableCell className="max-w-[10rem] truncate text-sm text-zinc-600">
                                    {txCategoryLine(row.mainCategory, row.category, t) || "—"}
                                  </TableCell>
                                  <TableCell className="max-w-[12rem] text-xs text-zinc-600">
                                    {row.posBeneficiaryType
                                      ? [
                                          posSettlementBeneficiaryLabel(
                                            t,
                                            row.posBeneficiaryType,
                                          ),
                                          row.posBeneficiaryPersonnelName,
                                        ]
                                          .filter(Boolean)
                                          .join(" · ")
                                      : "—"}
                                  </TableCell>
                                  <TableCell className="max-w-[18rem] text-sm text-zinc-700">
                                    {row.description ?? "—"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </>
                )}
              </ReportInteractiveRows>
                </div>
              </section>
            ) : null}

            {overview.data && items.length === 0 ? (
              <div className="space-y-2 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
                <p>{t("reports.patronFlowEmpty")}</p>
                <p className="text-xs leading-relaxed text-amber-900/90">
                  {t("reports.patronFlowEmptyWhy")}
                </p>
                <p>
                  <Link
                    href="/reports/financial/trend"
                    className="font-semibold text-violet-800 underline decoration-violet-300 underline-offset-2 hover:text-violet-950"
                  >
                    {t("reports.patronFlowEmptyTrendCta")}
                  </Link>
                </p>
              </div>
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
