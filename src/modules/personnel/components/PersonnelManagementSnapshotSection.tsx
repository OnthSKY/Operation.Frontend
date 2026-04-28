"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { fetchBranchPersonnelMoneySummaries } from "@/modules/branch/api/branches-api";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import {
  usePersonnelCashHandoverLinesPaged,
  usePersonnelCashHandoverOutflowsPaged,
  usePersonnelManagementSnapshot,
  type PersonnelCashHandoverLinesFilterState,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import type { BranchPersonnelMoneySummaryItem } from "@/types/branch-personnel-money";
import type {
  PersonnelCashHandoverOutflow,
  PersonnelCurrencySnapshot,
} from "@/types/personnel-management-snapshot";
import type { Personnel } from "@/types/personnel";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { OVERLAY_Z_INDEX, OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

function formatHireShort(iso: string): string {
  const d = iso?.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso ?? "—";
  return new Date(d + "T12:00:00").toLocaleDateString();
}

function signedMoney(
  n: number,
  dash: string,
  locale: Locale,
  currencyCode: string
): string {
  const abs = formatMoneyDash(Math.abs(n), dash, locale, currencyCode);
  if (n === 0) return abs;
  return n > 0 ? `+${abs}` : `−${abs}`;
}

function emptyRow(ccy: string): PersonnelCurrencySnapshot {
  return {
    currencyCode: ccy,
    totalAdvanceAllTime: 0,
    totalSalaryAllTime: 0,
    netSalaryMinusAdvanceAllTime: 0,
    totalAdvanceYearToDate: 0,
    totalSalaryYearToDate: 0,
    netSalaryMinusAdvanceYearToDate: 0,
    totalCashHandoverAsResponsibleAllTime: 0,
    totalCashHandoverAsResponsibleYearToDate: 0,
  };
}

function pickPrimaryCurrency(
  snap: { primaryCurrencyCode: string; byCurrency: PersonnelCurrencySnapshot[] }
): PersonnelCurrencySnapshot {
  const pc = snap.primaryCurrencyCode?.trim().toUpperCase() || "TRY";
  const hit = snap.byCurrency.find((c) => c.currencyCode.toUpperCase() === pc);
  if (hit) return hit;
  return snap.byCurrency[0] ?? emptyRow(pc);
}

/** Ana para biriminde kasa devri yoksa bile, devredilen tutarı olan ilk satırı seçer. */
function pickHandoverCurrencyRow(
  snap: { primaryCurrencyCode: string; byCurrency: PersonnelCurrencySnapshot[] }
): PersonnelCurrencySnapshot | null {
  const pc = snap.primaryCurrencyCode?.trim().toUpperCase() || "TRY";
  const withHand = snap.byCurrency.filter((r) => r.totalCashHandoverAsResponsibleAllTime > 0);
  if (withHand.length === 0) return null;
  return withHand.find((r) => r.currencyCode.toUpperCase() === pc) ?? withHand[0] ?? null;
}

function MetricTile({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: "neutral" | "positive" | "negative" | "violet" | "sky";
}) {
  const border =
    emphasis === "positive"
      ? "border-emerald-200/90 bg-emerald-50/50"
      : emphasis === "negative"
        ? "border-amber-200/90 bg-amber-50/50"
        : emphasis === "violet"
          ? "border-violet-200/90 bg-violet-50/40"
          : emphasis === "sky"
            ? "border-sky-400/95 bg-sky-50/70 ring-1 ring-sky-300/60"
            : "border-zinc-200/90 bg-zinc-50/80";
  return (
    <div className={cn("rounded-xl border p-3 shadow-sm shadow-zinc-900/5 sm:p-4", border)}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1.5 text-lg font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs leading-snug text-zinc-500">{hint}</p> : null}
    </div>
  );
}

/** Şube + para birimi havuzunda kalan toplam üzerinden gider / patrona ödeme. */
export type PersonnelHandoverPoolActionContext = {
  branchId: number;
  currencyCode: string;
  suggestedAmount: number;
};

type Props = {
  personnel: Personnel;
  open: boolean;
  /** `manager`: yönetici özeti. `cashPhysicalHandover`: kasa nakit / devir ekranı (ayrı sekme). */
  viewMode?: "manager" | "cashPhysicalHandover";
  branchNameById?: Map<number, string>;
  /** Maliyetler sekmesine geç (cep/kasa işlemleri). */
  onOpenCostsDetail?: () => void;
  /** Havuz toplamından şube gideri (kasa); formda IN # ile hangi devir satırından düşüleceği seçilir. */
  onHandoverOpenExpenseRegister?: (ctx: PersonnelHandoverPoolActionContext) => void;
  /** Havuz toplamından kasadan patrona; formda IN # gerekir. */
  onHandoverOpenPatronRegisterRepay?: (ctx: PersonnelHandoverPoolActionContext) => void;
};

function emptyHandoverFilters(): PersonnelCashHandoverLinesFilterState {
  return { branchId: "", currency: "", dateFrom: "", dateTo: "", search: "" };
}

function outflowKindLabel(
  kind: PersonnelCashHandoverOutflow["outflowKind"],
  t: (key: string) => string
): string {
  return kind === "SETTLES_HANDOVER_IN"
    ? t("personnel.detailMgmtOutflowKindSettles")
    : t("personnel.detailMgmtOutflowKindHeld");
}

function pocketRowHasSignal(row: BranchPersonnelMoneySummaryItem): boolean {
  if (row.pocketMixedCurrencies) return false;
  return (
    row.netRegisterOwesPocket > 0.009 ||
    row.grossPocketExpense > 0.009 ||
    row.pocketRepaidFromRegister + row.pocketRepaidFromPatron > 0.009 ||
    Math.abs(row.pocketClaimTransferNet) > 0.009
  );
}

export function PersonnelManagementSnapshotSection({
  personnel,
  open,
  viewMode = "manager",
  branchNameById,
  onOpenCostsDetail,
  onHandoverOpenExpenseRegister,
  onHandoverOpenPatronRegisterRepay,
}: Props) {
  const { t, locale } = useI18n();
  const dash = t("personnel.dash");
  const handoverActionsEnabled =
    !personnel.isDeleted &&
    typeof onHandoverOpenExpenseRegister === "function" &&
    typeof onHandoverOpenPatronRegisterRepay === "function";
  const [hovPage, setHovPage] = useState(1);
  const [outPage, setOutPage] = useState(1);
  const [cashHandoverSubTab, setCashHandoverSubTab] = useState<"in" | "out">("in");
  const [hovPageSize] = useState(25);
  const [hovApplied, setHovApplied] = useState<PersonnelCashHandoverLinesFilterState>(emptyHandoverFilters);
  const [hovDraft, setHovDraft] = useState<PersonnelCashHandoverLinesFilterState>(emptyHandoverFilters);
  const [hovFilterDrawerOpen, setHovFilterDrawerOpen] = useState(false);
  const { data, isPending, isError, error, refetch } = usePersonnelManagementSnapshot(
    personnel.id,
    open
  );

  const snap = data;
  const primary = useMemo(() => (snap ? pickPrimaryCurrency(snap) : null), [snap]);
  const handoverRow = useMemo(() => (snap ? pickHandoverCurrencyRow(snap) : null), [snap]);
  const handoverPoolRows = useMemo(
    () =>
      (snap?.cashHandoverPoolRemainingByBranch ?? []).filter(
        (r) => r.totalRemainingHandover > 0.009
      ),
    [snap?.cashHandoverPoolRemainingByBranch]
  );
  const handoverPoolCurrencyRows = useMemo(() => {
    const byCurrency = new Map<
      string,
      { totalRemainingHandover: number; actionBranchId: number; branchCount: number }
    >();
    for (const row of handoverPoolRows) {
      const ccy = (row.currencyCode ?? "").trim().toUpperCase();
      if (!ccy) continue;
      const amount = Number(row.totalRemainingHandover) || 0;
      if (amount <= 0.009) continue;
      const current = byCurrency.get(ccy);
      if (current == null) {
        byCurrency.set(ccy, {
          totalRemainingHandover: amount,
          actionBranchId: row.branchId,
          branchCount: 1,
        });
        continue;
      }
      current.totalRemainingHandover += amount;
      current.branchCount += 1;
      if (
        personnel.branchId != null &&
        personnel.branchId > 0 &&
        row.branchId === personnel.branchId
      ) {
        current.actionBranchId = row.branchId;
      }
    }
    return [...byCurrency.entries()]
      .map(([currencyCode, row]) => ({ currencyCode, ...row }))
      .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
  }, [handoverPoolRows, personnel.branchId]);
  useEffect(() => {
    setHovPage(1);
    setOutPage(1);
    setCashHandoverSubTab("in");
    const z = emptyHandoverFilters();
    setHovApplied(z);
    setHovDraft(z);
  }, [personnel.id]);

  const handoverListEnabled =
    open && snap != null && viewMode === "cashPhysicalHandover";
  const handoverList = usePersonnelCashHandoverLinesPaged(
    personnel.id,
    hovPage,
    hovPageSize,
    hovApplied,
    handoverListEnabled
  );

  const outflowList = usePersonnelCashHandoverOutflowsPaged(
    personnel.id,
    outPage,
    hovPageSize,
    hovApplied,
    handoverListEnabled
  );

  const handoverFiltersBadgeCount = useMemo(() => {
    let n = 0;
    if (hovApplied.branchId.trim()) n++;
    if (hovApplied.currency.trim()) n++;
    if (hovApplied.dateFrom.trim()) n++;
    if (hovApplied.dateTo.trim()) n++;
    if (hovApplied.search.trim()) n++;
    return n;
  }, [hovApplied]);

  const handoverBranchOptions = useMemo(() => {
    const all = t("common.all");
    const base: { value: string; label: string }[] = [{ value: "", label: all }];
    if (!snap?.linkedBranchIds?.length) return base;
    const ids = [...snap.linkedBranchIds].sort((a, b) => a - b);
    for (const id of ids) {
      if (!Number.isFinite(id) || id <= 0) continue;
      base.push({
        value: String(id),
        label: branchNameById?.get(id) ?? `#${id}`,
      });
    }
    return base;
  }, [snap?.linkedBranchIds, branchNameById, t]);

  const handoverCurrencyOptions = useMemo(() => {
    const all = t("common.all");
    const base: { value: string; label: string }[] = [{ value: "", label: all }];
    if (!snap?.byCurrency?.length) return base;
    for (const r of snap.byCurrency) {
      if (!r.currencyCode) continue;
      base.push({ value: r.currencyCode, label: r.currencyCode });
    }
    return base;
  }, [snap?.byCurrency, t]);

  const hovItems = handoverList.data?.items ?? [];
  const hovTotal = handoverList.data?.totalCount ?? 0;
  const hovPages = Math.max(1, Math.ceil(hovTotal / hovPageSize));

  const outItems = outflowList.data?.items ?? [];
  const outTotal = outflowList.data?.totalCount ?? 0;
  const outPages = Math.max(1, Math.ceil(outTotal / hovPageSize));

  const netAll = primary?.netSalaryMinusAdvanceAllTime ?? 0;
  const netTone =
    netAll > 0 ? ("positive" as const) : netAll < 0 ? ("negative" as const) : ("neutral" as const);

  const storyNet = useMemo(() => {
    if (!primary || !snap) return "";
    const ccy = primary.currencyCode;
    const netLabel = signedMoney(netAll, dash, locale, ccy);
    if (netAll > 0) return t("personnel.detailMgmtNetPositive").replace("{net}", netLabel);
    if (netAll < 0) return t("personnel.detailMgmtNetNegative").replace("{net}", netLabel);
    return t("personnel.detailMgmtNetZero").replace("{ccy}", ccy);
  }, [primary, snap, netAll, dash, locale, t]);

  const ytdLine = useMemo(() => {
    if (!primary || !snap) return "";
    return t("personnel.detailMgmtYtdLine")
      .replace("{year}", String(snap.currentCalendarYear))
      .replace(
        "{sal}",
        formatMoneyDash(primary.totalSalaryYearToDate, dash, locale, primary.currencyCode)
      )
      .replace(
        "{adv}",
        formatMoneyDash(primary.totalAdvanceYearToDate, dash, locale, primary.currencyCode)
      )
      .replace(
        "{net}",
        signedMoney(primary.netSalaryMinusAdvanceYearToDate, dash, locale, primary.currencyCode)
      );
  }, [primary, snap, dash, locale, t]);

  const handoverHint = useMemo(() => {
    if (!handoverRow || !snap) return "";
    const ytd = formatMoneyDash(
      handoverRow.totalCashHandoverAsResponsibleYearToDate,
      dash,
      locale,
      handoverRow.currencyCode
    );
    return `${t("personnel.detailMgmtTileCashHandoverHint")} · ${String(snap.currentCalendarYear)}: ${ytd} · ${t("personnel.detailProfileCashHandoverCount").replace("{n}", String(snap.cashHandoverResponsibleRecordCount))}`;
  }, [handoverRow, snap, dash, locale, t]);

  /** Büyük kutu: personelin bağlı tüm şubelerindeki kasa devir kalanlarının genel toplamı. */
  const handoverPoolHeroMetrics = useMemo(() => {
    if (!snap) {
      return {
        heroValue: 0,
        ccy: "TRY",
        totalAllBranches: 0,
        branchCount: 0,
      };
    }
    const ccy = (handoverRow?.currencyCode ?? primary?.currencyCode ?? "TRY").trim().toUpperCase();
    const rows = snap.cashHandoverPoolRemainingByBranch.filter(
      (r) =>
        r.currencyCode.trim().toUpperCase() === ccy &&
        (Number(r.totalRemainingHandover) || 0) > 0.009
    );
    const totalAllBranches = rows.reduce(
      (s, r) => s + (Number(r.totalRemainingHandover) || 0),
      0
    );
    const heroValue = totalAllBranches;
    return {
      heroValue,
      ccy,
      totalAllBranches,
      branchCount: rows.length,
    };
  }, [snap, handoverRow, primary]);

  const handoverSubTabHeroHint = useMemo(() => {
    if (!handoverRow || !snap) return "";
    const gross = formatMoneyDash(
      handoverRow.totalCashHandoverAsResponsibleAllTime,
      dash,
      locale,
      handoverRow.currencyCode
    );
    const grossLine = t("personnel.detailMgmtHandoverSubTabHintGross").replace("{gross}", gross);
    let out = `${grossLine} · ${handoverHint}`;
    const { heroValue, totalAllBranches, branchCount, ccy } = handoverPoolHeroMetrics;
    if (branchCount > 1) {
      const totalLabel = formatMoneyDash(totalAllBranches, dash, locale, ccy);
      out = `${out} · ${t("personnel.detailMgmtHandoverHeroAllBranchesFootnote").replace("{amount}", totalLabel)}`;
    }
    return out;
  }, [
    handoverRow,
    snap,
    handoverHint,
    handoverPoolHeroMetrics,
    dash,
    locale,
    t,
  ]);

  const branchIdsForPocket = useMemo(() => {
    if (!personnel || personnel.isDeleted) return [];
    const ids = new Set<number>();
    if (personnel.branchId != null && personnel.branchId > 0) {
      ids.add(personnel.branchId);
    }
    if (snap?.linkedBranchIds?.length) {
      for (const raw of snap.linkedBranchIds) {
        const id = typeof raw === "number" ? raw : parseInt(String(raw), 10);
        if (Number.isFinite(id) && id > 0) ids.add(id);
      }
    }
    return [...ids];
  }, [personnel, snap]);

  const pocketMoneyQueries = useQueries({
    queries: branchIdsForPocket.map((branchId) => ({
      queryKey: branchKeys.personnelMoney(branchId),
      queryFn: () => fetchBranchPersonnelMoneySummaries(branchId),
      enabled: open && !personnel.isDeleted && branchIdsForPocket.length > 0,
    })),
  });

  const pocketMoneyByBranch = useMemo(() => {
    const pid = personnel.id;
    const out: { branchId: number; row: BranchPersonnelMoneySummaryItem }[] = [];
    for (let i = 0; i < branchIdsForPocket.length; i++) {
      const branchId = branchIdsForPocket[i]!;
      const rows = pocketMoneyQueries[i]?.data;
      if (!rows) continue;
      const row = rows.find((r) => r.personnelId === pid) ?? null;
      if (!row || !pocketRowHasSignal(row)) continue;
      out.push({ branchId, row });
    }
    return out;
  }, [branchIdsForPocket, pocketMoneyQueries, personnel.id]);

  const pocketMoneyPending = pocketMoneyQueries.some((q) => q.isPending);

  const summaryHandoverAll = handoverRow?.totalCashHandoverAsResponsibleAllTime ?? 0;
  const summaryHandoverCcy =
    handoverRow?.currencyCode?.trim().toUpperCase() || primary?.currencyCode?.trim().toUpperCase() || "TRY";

  if (!open) return null;

  return (
    <>
    <section
      className="mb-3 w-full min-w-0 shrink-0 rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-md shadow-zinc-900/10 sm:p-5"
      aria-labelledby="personnel-mgmt-snapshot-title"
    >
      <div className="flex flex-col gap-3 border-b border-zinc-100 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <h3
            id="personnel-mgmt-snapshot-title"
            className="text-base font-semibold tracking-tight text-zinc-900"
          >
            {viewMode === "cashPhysicalHandover"
              ? t("personnel.detailCashPhysicalTabTitle")
              : t("personnel.detailMgmtTitle")}
          </h3>
          <p
            className={cn(
              "mt-1 text-xs font-medium uppercase tracking-wide",
              viewMode === "cashPhysicalHandover" ? "text-sky-800" : "text-violet-600",
            )}
          >
            {viewMode === "cashPhysicalHandover"
              ? t("personnel.detailCashPhysicalTabBadge")
              : t("personnel.detailMgmtBadge")}
          </p>
          {viewMode === "cashPhysicalHandover" ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              {t("personnel.detailCashPhysicalTabLead")}
            </p>
          ) : null}
        </div>
      </div>

      {isPending ? (
        <div className="mt-4 space-y-3" aria-busy="true">
          <div className="h-24 animate-pulse rounded-xl bg-zinc-100" />
          <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-100" />
            ))}
          </div>
        </div>
      ) : null}

      {isError ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm text-red-600">{toErrorMessage(error)}</p>
          <Button type="button" variant="secondary" className="w-full min-h-10 sm:w-auto" onClick={() => refetch()}>
            {t("common.retry")}
          </Button>
        </div>
      ) : null}

      {!isPending && !isError && snap && primary ? (
        <div className="mt-4 space-y-4">
          {viewMode === "manager" ? (
            <>
              <div
                className={cn(
                  "rounded-xl border-l-4 p-4 sm:p-5",
                  netTone === "positive" && "border-l-emerald-500 bg-emerald-50/35",
                  netTone === "negative" && "border-l-amber-500 bg-amber-50/35",
                  netTone === "neutral" && "border-l-zinc-400 bg-zinc-50/90"
                )}
              >
                <p className="text-xs font-medium leading-relaxed text-zinc-900 sm:text-sm">
                  {t("personnel.detailMgmtStoryP1")
                    .replace("{name}", personnelDisplayName(personnel))
                    .replace("{days}", String(snap.tenureDaysInclusive))
                    .replace("{hire}", formatHireShort(snap.hireDate))}
                </p>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-zinc-900">{storyNet}</p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-700 sm:text-sm">{ytdLine}</p>
                <p className="mt-3 text-xs leading-relaxed text-zinc-500">{t("personnel.detailMgmtFootnote")}</p>
              </div>

              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
                <MetricTile
                  label={t("personnel.detailMgmtTileTenure")}
                  value={`${snap.tenureDaysInclusive}`}
                  hint={t("personnel.detailMgmtTileTenureHint")}
                  emphasis="violet"
                />
                <MetricTile
                  label={t("personnel.detailMgmtTileAdvanceTotal")}
                  value={formatMoneyDash(
                    primary.totalAdvanceAllTime,
                    dash,
                    locale,
                    primary.currencyCode
                  )}
                  hint={primary.currencyCode}
                />
                <MetricTile
                  label={t("personnel.detailMgmtTileSalaryTotal")}
                  value={formatMoneyDash(
                    primary.totalSalaryAllTime,
                    dash,
                    locale,
                    primary.currencyCode
                  )}
                  hint={primary.currencyCode}
                />
                <MetricTile
                  label={t("personnel.detailMgmtTileNetAll")}
                  value={signedMoney(netAll, dash, locale, primary.currencyCode)}
                  hint={t("personnel.detailMgmtTileNetHint")}
                  emphasis={netTone === "neutral" ? "violet" : netTone}
                />
                <MetricTile
                  label={t("personnel.detailMgmtTileCashHandover")}
                  value={formatMoneyDash(summaryHandoverAll, dash, locale, summaryHandoverCcy)}
                  hint={`${summaryHandoverCcy} · ${t("personnel.detailProfileCashHandoverCount").replace("{n}", String(snap.cashHandoverResponsibleRecordCount))}`}
                  emphasis={summaryHandoverAll > 0.009 ? "sky" : undefined}
                />
                <MetricTile
                  label={t("personnel.detailMgmtTileRecords")}
                  value={`${snap.advanceRecordCount + snap.salaryPaymentRecordCount}`}
                  hint={t("personnel.detailMgmtTileRecordsHint")
                    .replace("{adv}", String(snap.advanceRecordCount))
                    .replace("{sal}", String(snap.salaryPaymentRecordCount))}
                />
                <MetricTile
                  label={t("personnel.detailMgmtTileWarehouses")}
                  value={`${snap.warehouseResponsibilityCount}`}
                  hint={t("personnel.detailMgmtTileWarehousesHint")}
                />
              </div>

              {snap.byCurrency.length > 1 ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("personnel.detailMgmtMultiTitle")}
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-zinc-800">
                    {snap.byCurrency.map((row) => (
                      <li
                        key={row.currencyCode}
                        className="flex flex-col gap-0.5 border-b border-zinc-200/80 py-2 last:border-0 last:pb-0"
                      >
                        <span className="font-semibold">{row.currencyCode}</span>
                        <span className="text-xs text-zinc-600">
                          {t("personnel.detailMgmtMultiLine")
                            .replace(
                              "{adv}",
                              formatMoneyDash(row.totalAdvanceAllTime, dash, locale, row.currencyCode)
                            )
                            .replace(
                              "{sal}",
                              formatMoneyDash(row.totalSalaryAllTime, dash, locale, row.currencyCode)
                            )
                            .replace(
                              "{net}",
                              signedMoney(
                                row.netSalaryMinusAdvanceAllTime,
                                dash,
                                locale,
                                row.currencyCode
                              )
                            )}
                          {row.totalCashHandoverAsResponsibleAllTime > 0
                            ? ` · ${t("personnel.detailMgmtMultiHandover").replace(
                                "{hand}",
                                formatMoneyDash(
                                  row.totalCashHandoverAsResponsibleAllTime,
                                  dash,
                                  locale,
                                  row.currencyCode
                                )
                              )}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {!personnel.isDeleted ? (
                <div className="rounded-xl border border-amber-200/90 bg-amber-50/35 p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-950/90">
                        {t("personnel.detailMgmtPocketSectionTitle")}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-amber-900/85">
                        {t("personnel.detailMgmtPocketSectionHint")}
                      </p>
                    </div>
                    {onOpenCostsDetail && pocketMoneyByBranch.length > 0 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-10 w-full shrink-0 sm:w-auto"
                        onClick={onOpenCostsDetail}
                      >
                        {t("personnel.detailMgmtPocketOpenCosts")}
                      </Button>
                    ) : null}
                  </div>
                  {pocketMoneyPending ? (
                    <p className="mt-3 text-sm text-zinc-600">{t("common.loading")}</p>
                  ) : pocketMoneyByBranch.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-600">{t("personnel.detailMgmtPocketEmpty")}</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {pocketMoneyByBranch.map(({ branchId, row }) => {
                        const cur = row.pocketCurrencyCode?.trim().toUpperCase() || "TRY";
                        const bname = branchNameById?.get(branchId) ?? `#${branchId}`;
                        return (
                          <li
                            key={branchId}
                            className="rounded-lg border border-amber-200/70 bg-white/90 p-3 text-sm"
                          >
                            <div className="flex flex-col gap-1 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
                              <span className="min-w-0 font-medium text-zinc-900">{bname}</span>
                              <span className="shrink-0 font-mono text-sm font-semibold text-amber-950">
                                {t("personnel.detailMgmtPocketOwesShort")}:{" "}
                                {formatMoneyDash(row.netRegisterOwesPocket, dash, locale, cur)}
                              </span>
                            </div>
                            <details className="mt-2 group">
                              <summary className="cursor-pointer list-none text-xs font-semibold text-amber-900/90 underline decoration-amber-800/30 underline-offset-2 [&::-webkit-details-marker]:hidden">
                                {t("personnel.detailMgmtPocketDetailToggle")}
                              </summary>
                              <dl className="mt-2 space-y-1.5 border-t border-amber-200/60 pt-2 text-xs text-zinc-700">
                                <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
                                  <dt>{t("personnel.detailMgmtPocketLineGross")}</dt>
                                  <dd className="font-mono font-medium text-zinc-900">
                                    {formatMoneyDash(row.grossPocketExpense, dash, locale, cur)}
                                  </dd>
                                </div>
                                <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
                                  <dt>{t("personnel.detailMgmtPocketLineRepaidRegister")}</dt>
                                  <dd className="font-mono font-medium text-zinc-900">
                                    {formatMoneyDash(row.pocketRepaidFromRegister, dash, locale, cur)}
                                  </dd>
                                </div>
                                <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
                                  <dt>{t("personnel.detailMgmtPocketLineRepaidPatron")}</dt>
                                  <dd className="font-mono font-medium text-zinc-900">
                                    {formatMoneyDash(row.pocketRepaidFromPatron, dash, locale, cur)}
                                  </dd>
                                </div>
                                <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
                                  <dt>{t("personnel.detailMgmtPocketLineClaimTransfer")}</dt>
                                  <dd className="font-mono font-medium text-zinc-900">
                                    {signedMoney(row.pocketClaimTransferNet, dash, locale, cur)}
                                  </dd>
                                </div>
                              </dl>
                            </details>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <div className="space-y-4">
              {personnel.isDeleted ? (
                <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                  {t("personnel.detailCashPhysicalPassiveNotice")}
                </p>
              ) : null}
              {handoverRow ? (
                <MetricTile
                  label={t("personnel.detailMgmtHandoverSubTabHeroRemaining")}
                  value={formatMoneyDash(
                    handoverPoolHeroMetrics.heroValue,
                    dash,
                    locale,
                    handoverPoolHeroMetrics.ccy
                  )}
                  hint={handoverSubTabHeroHint}
                  emphasis="sky"
                />
              ) : null}

              <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-900/5">
                <div className="border-b border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-white px-2 py-2 sm:px-3 sm:py-2.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-between sm:gap-3">
                    <div
                      className="grid min-h-[2.75rem] w-full grid-cols-2 gap-1 rounded-xl border border-zinc-200/90 bg-zinc-100/80 p-1 shadow-inner shadow-zinc-200/70 sm:w-auto sm:min-w-[19rem]"
                      role="tablist"
                      aria-orientation="horizontal"
                      aria-label={t("personnel.detailMgmtCashHandoverTabsAria")}
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={cashHandoverSubTab === "in"}
                        className={cn(
                          "min-h-10 rounded-[0.65rem] px-2.5 py-2 text-center text-xs font-semibold leading-snug transition sm:px-3 sm:text-sm",
                          cashHandoverSubTab === "in"
                            ? "bg-white text-sky-950 shadow-sm ring-1 ring-sky-300/70"
                            : "text-zinc-600 hover:bg-white/70 hover:text-zinc-800"
                        )}
                        onClick={() => setCashHandoverSubTab("in")}
                      >
                        {t("personnel.detailMgmtCashHandoverTabIn")}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={cashHandoverSubTab === "out"}
                        className={cn(
                          "min-h-10 rounded-[0.65rem] px-2.5 py-2 text-center text-xs font-semibold leading-snug transition sm:px-3 sm:text-sm",
                          cashHandoverSubTab === "out"
                            ? "bg-white text-amber-950 shadow-sm ring-1 ring-amber-300/70"
                            : "text-zinc-600 hover:bg-white/70 hover:text-zinc-800"
                        )}
                        onClick={() => setCashHandoverSubTab("out")}
                      >
                        {t("personnel.detailMgmtCashHandoverTabOut")}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="relative flex min-h-10 shrink-0 items-center justify-center gap-1.5 self-stretch rounded-xl border border-zinc-300/90 bg-white px-3 text-zinc-800 shadow-sm transition hover:bg-zinc-50 sm:h-10 sm:min-h-0 sm:w-10 sm:px-0 sm:self-center"
                      aria-label={t("personnel.detailMgmtHandoverFilterAria")}
                      onClick={() => {
                        setHovDraft(hovApplied);
                        setHovFilterDrawerOpen(true);
                      }}
                    >
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M4 6h16M7 12h10M10 18h4" />
                      </svg>
                      <span className="text-xs font-medium sm:hidden">
                        {t("personnel.detailMgmtHandoverFilterAria")}
                      </span>
                      {handoverFiltersBadgeCount > 0 ? (
                        <span className="absolute -right-1 -top-1 flex min-h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-zinc-700 px-1 text-[0.65rem] font-bold leading-none text-white">
                          {handoverFiltersBadgeCount > 9 ? "9+" : handoverFiltersBadgeCount}
                        </span>
                      ) : null}
                    </button>
                  </div>
                </div>

                {cashHandoverSubTab === "in" ? (
                <div className="border-t border-sky-200/50 bg-sky-50/40 p-3 sm:p-4">
                  <div className="min-w-0 space-y-2">
                    {handoverList.data != null ? (
                      <p className="text-xs leading-relaxed text-sky-900/75">
                        {t("personnel.detailMgmtHandoverPagedRange")
                          .replace(
                            "{from}",
                            String(hovTotal === 0 ? 0 : (hovPage - 1) * hovPageSize + 1)
                          )
                          .replace("{to}", String(Math.min(hovPage * hovPageSize, hovTotal)))
                          .replace("{total}", String(hovTotal))}
                        {" · "}
                        {t("personnel.detailMgmtHandoverPagedPages")
                          .replace("{page}", String(hovPage))
                          .replace("{pages}", String(hovPages))}
                      </p>
                    ) : handoverList.isPending ? (
                      <p className="text-xs text-sky-900/70">{t("common.loading")}</p>
                    ) : null}
                    {handoverActionsEnabled ? (
                      <p className="text-xs leading-relaxed text-sky-900/75">
                        {t("personnel.detailMgmtHandoverActionsIntro")}
                      </p>
                    ) : null}
                  </div>

                {handoverActionsEnabled && handoverPoolCurrencyRows.length > 0 ? (
                  <div className="mt-3 space-y-2 rounded-lg border border-sky-300/50 bg-white/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-950/90">
                      {t("personnel.detailMgmtHandoverPoolTitle")}
                    </p>
                    <ul className="space-y-2">
                      {handoverPoolCurrencyRows.map((r) => {
                        const ctx = {
                          branchId: r.actionBranchId,
                          currencyCode: r.currencyCode,
                          suggestedAmount: r.totalRemainingHandover,
                        };
                        return (
                          <li
                            key={r.currencyCode}
                            className="flex flex-col gap-2 rounded-md border border-sky-200/70 bg-white/90 p-2.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 text-sm">
                              <span className="font-medium text-zinc-900">
                                {t("personnel.detailMgmtHandoverPoolRemainingLabel")}
                              </span>
                              <span className="text-zinc-600"> · {r.currencyCode}</span>
                              <div className="mt-0.5 font-mono text-sm font-semibold text-zinc-900">
                                {formatMoneyDash(
                                  r.totalRemainingHandover,
                                  dash,
                                  locale,
                                  r.currencyCode
                                )}
                              </div>
                              {r.branchCount > 1 ? (
                                <div className="mt-0.5 text-xs text-zinc-600">
                                  {t("personnel.detailMgmtHandoverHeroAllBranchesFootnote").replace(
                                    "{amount}",
                                    formatMoneyDash(
                                      r.totalRemainingHandover,
                                      dash,
                                      locale,
                                      r.currencyCode
                                    )
                                  )}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2 max-md:w-full">
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-9 px-3 text-xs font-semibold max-md:w-full"
                                onClick={() => onHandoverOpenExpenseRegister?.(ctx)}
                              >
                                {t("personnel.detailMgmtHandoverActionExpenseShort")}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-9 px-3 text-xs font-semibold max-md:w-full"
                                onClick={() => onHandoverOpenPatronRegisterRepay?.(ctx)}
                              >
                                {t("personnel.detailMgmtHandoverActionPatronShort")}
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {handoverList.isError ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-sm text-red-600">{toErrorMessage(handoverList.error)}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full min-h-10 sm:w-auto"
                      onClick={() => handoverList.refetch()}
                    >
                      {t("common.retry")}
                    </Button>
                  </div>
                ) : handoverList.isPending && !handoverList.data ? (
                  <div className="mt-3 space-y-2" aria-busy="true">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-14 animate-pulse rounded-lg bg-white/70" />
                    ))}
                  </div>
                ) : (
                  <>
                    {hovItems.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-600">
                        {handoverFiltersBadgeCount > 0
                          ? t("personnel.detailMgmtHandoverNoRowsFilter")
                          : t("personnel.detailMgmtHandoverLinesEmpty")}
                      </p>
                    ) : (
                      <>
                        <div className="mt-3 overflow-x-auto">
                          <Table className="min-w-[56rem]">
                            <TableHead>
                              <TableRow>
                                <TableHeader>{t("personnel.detailMgmtHandoverColDate")}</TableHeader>
                                <TableHeader>{t("personnel.detailMgmtHandoverColBranch")}</TableHeader>
                                <TableHeader className="text-right">
                                  {t("personnel.detailMgmtHandoverColAmount")}
                                </TableHeader>
                                <TableHeader className="text-right">
                                  {t("personnel.detailMgmtHandoverColSettled")}
                                </TableHeader>
                                <TableHeader className="text-right">
                                  {t("personnel.detailMgmtHandoverColRemaining")}
                                </TableHeader>
                                <TableHeader>{t("personnel.detailMgmtHandoverColCategory")}</TableHeader>
                                <TableHeader>{t("personnel.detailMgmtHandoverColNote")}</TableHeader>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {hovItems.map((row) => {
                                const cat = txCategoryLine(row.mainCategory, row.category, t);
                                return (
                                  <TableRow key={row.transactionId}>
                                    <TableCell
                                      dataLabel={t("personnel.detailMgmtHandoverColDate")}
                                      className="whitespace-nowrap"
                                    >
                                      {formatLocaleDate(row.transactionDate, locale, dash)}
                                    </TableCell>
                                    <TableCell dataLabel={t("personnel.detailMgmtHandoverColBranch")}>
                                      {row.branchName?.trim() || dash}
                                    </TableCell>
                                    <TableCell
                                      dataLabel={t("personnel.detailMgmtHandoverColAmount")}
                                      className="text-right tabular-nums font-mono"
                                    >
                                      {formatMoneyDash(row.cashAmount, dash, locale, row.currencyCode)}
                                    </TableCell>
                                    <TableCell
                                      dataLabel={t("personnel.detailMgmtHandoverColSettled")}
                                      className="text-right tabular-nums font-mono text-zinc-700"
                                    >
                                      {formatMoneyDash(
                                        row.settledFromHandoverAmount,
                                        dash,
                                        locale,
                                        row.currencyCode
                                      )}
                                    </TableCell>
                                    <TableCell
                                      dataLabel={t("personnel.detailMgmtHandoverColRemaining")}
                                      className="text-right tabular-nums font-mono text-zinc-900"
                                    >
                                      {formatMoneyDash(
                                        row.remainingHandoverAmount,
                                        dash,
                                        locale,
                                        row.currencyCode
                                      )}
                                    </TableCell>
                                    <TableCell
                                      dataLabel={t("personnel.detailMgmtHandoverColCategory")}
                                      className="max-w-[12rem] text-zinc-600"
                                    >
                                      {cat || dash}
                                    </TableCell>
                                    <TableCell
                                      dataLabel={t("personnel.detailMgmtHandoverColNote")}
                                      className="max-w-[14rem] text-zinc-600"
                                    >
                                      {row.description?.trim() || dash}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}

                    {hovTotal > 0 ? (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-10 w-full sm:w-auto"
                          disabled={hovPage <= 1 || handoverList.isFetching}
                          onClick={() => setHovPage((p) => Math.max(1, p - 1))}
                        >
                          {t("personnel.detailMgmtHandoverPrev")}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-10 w-full sm:w-auto"
                          disabled={hovPage >= hovPages || handoverList.isFetching}
                          onClick={() => setHovPage((p) => p + 1)}
                        >
                          {t("personnel.detailMgmtHandoverNext")}
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
                ) : null}

                {cashHandoverSubTab === "out" ? (
              <div className="border-t border-amber-200/50 bg-amber-50/35 p-3 sm:p-4">
                  <div className="min-w-0 space-y-2">
                    <p className="text-xs leading-relaxed text-amber-950/80">
                      {t("personnel.detailMgmtOutflowsLead")}
                    </p>
                    {outflowList.data != null ? (
                      <p className="text-xs leading-relaxed text-amber-950/75">
                        {t("personnel.detailMgmtHandoverPagedRange")
                          .replace(
                            "{from}",
                            String(outTotal === 0 ? 0 : (outPage - 1) * hovPageSize + 1)
                          )
                          .replace("{to}", String(Math.min(outPage * hovPageSize, outTotal)))
                          .replace("{total}", String(outTotal))}
                        {" · "}
                        {t("personnel.detailMgmtHandoverPagedPages")
                          .replace("{page}", String(outPage))
                          .replace("{pages}", String(outPages))}
                      </p>
                    ) : outflowList.isPending ? (
                      <p className="text-xs text-amber-950/70">{t("common.loading")}</p>
                    ) : null}
                  </div>

                {outflowList.isError ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-sm text-red-600">{toErrorMessage(outflowList.error)}</p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full min-h-10 sm:w-auto"
                      onClick={() => outflowList.refetch()}
                    >
                      {t("common.retry")}
                    </Button>
                  </div>
                ) : outflowList.isPending && !outflowList.data ? (
                  <div className="mt-3 space-y-2" aria-busy="true">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-14 animate-pulse rounded-lg bg-white/70" />
                    ))}
                  </div>
                ) : (
                  <>
                    {outItems.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-600">
                        {handoverFiltersBadgeCount > 0
                          ? t("personnel.detailMgmtHandoverNoRowsFilter")
                          : t("personnel.detailMgmtOutflowsEmpty")}
                      </p>
                    ) : (
                      <>
                        <div className="mt-3 overflow-x-auto">
                          <Table className="min-w-[68rem]">
                            <TableHead>
                              <TableRow>
                                <TableHeader>{t("personnel.detailMgmtHandoverColDate")}</TableHeader>
                                <TableHeader>{t("personnel.detailMgmtHandoverColBranch")}</TableHeader>
                                <TableHeader className="text-right">
                                  {t("personnel.detailMgmtOutflowsColAmount")}
                                </TableHeader>
                                <TableHeader className="text-right">
                                  {t("personnel.detailMgmtOutflowsColBalanceBefore")}
                                </TableHeader>
                                <TableHeader className="text-right">
                                  {t("personnel.detailMgmtOutflowsColBalanceAfter")}
                                </TableHeader>
                                <TableHeader>{t("personnel.detailMgmtOutflowsColKind")}</TableHeader>
                                <TableHeader>{t("personnel.detailMgmtOutflowsColInRef")}</TableHeader>
                                <TableHeader>{t("personnel.detailMgmtHandoverColCategory")}</TableHeader>
                                <TableHeader>{t("personnel.detailMgmtHandoverColNote")}</TableHeader>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {outItems.map((row) => {
                                const cat = txCategoryLine(row.mainCategory, row.category, t);
                                const inRef =
                                  row.settlesCashHandoverTransactionId != null
                                    ? `#${row.settlesCashHandoverTransactionId}`
                                    : dash;
                                return (
                                  <TableRow key={row.transactionId}>
                                    <TableCell
                                      dataLabel={t("personnel.detailMgmtHandoverColDate")}
                                      className="whitespace-nowrap"
                                    >
                                      {formatLocaleDate(row.transactionDate, locale, dash)}
                                    </TableCell>
                                    <TableCell dataLabel={t("personnel.detailMgmtHandoverColBranch")}>
                                      {row.branchName?.trim() || dash}
                                    </TableCell>
                                    <TableCell
                                      dataLabel={t("personnel.detailMgmtOutflowsColAmount")}
                                      className="text-right tabular-nums font-mono"
                                    >
                                      {formatMoneyDash(row.amount, dash, locale, row.currencyCode)}
                                    </TableCell>
                                    <TableCell
                                      dataLabel={t("personnel.detailMgmtOutflowsColBalanceBefore")}
                                      className="text-right tabular-nums font-mono text-zinc-700"
                                    >
                                      {row.balanceBefore != null
                                        ? formatMoneyDash(row.balanceBefore, dash, locale, row.currencyCode)
                                        : dash}
                                    </TableCell>
                                    <TableCell
                                      dataLabel={t("personnel.detailMgmtOutflowsColBalanceAfter")}
                                      className="text-right tabular-nums font-mono text-zinc-700"
                                    >
                                      {row.balanceAfter != null
                                        ? formatMoneyDash(row.balanceAfter, dash, locale, row.currencyCode)
                                        : dash}
                                    </TableCell>
                                    <TableCell dataLabel={t("personnel.detailMgmtOutflowsColKind")} className="text-zinc-700">
                                      {outflowKindLabel(row.outflowKind, t)}
                                    </TableCell>
                                    <TableCell dataLabel={t("personnel.detailMgmtOutflowsColInRef")} className="font-mono text-zinc-600">
                                      {inRef}
                                    </TableCell>
                                    <TableCell
                                      dataLabel={t("personnel.detailMgmtHandoverColCategory")}
                                      className="max-w-[12rem] text-zinc-600"
                                    >
                                      {cat || dash}
                                    </TableCell>
                                    <TableCell
                                      dataLabel={t("personnel.detailMgmtHandoverColNote")}
                                      className="max-w-[14rem] text-zinc-600"
                                    >
                                      {row.description?.trim() || dash}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}

                    {outTotal > 0 ? (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-10 w-full sm:w-auto"
                          disabled={outPage <= 1 || outflowList.isFetching}
                          onClick={() => setOutPage((p) => Math.max(1, p - 1))}
                        >
                          {t("personnel.detailMgmtHandoverPrev")}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-10 w-full sm:w-auto"
                          disabled={outPage >= outPages || outflowList.isFetching}
                          onClick={() => setOutPage((p) => p + 1)}
                        >
                          {t("personnel.detailMgmtHandoverNext")}
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>

      <RightDrawer
        open={hovFilterDrawerOpen}
        onClose={() => setHovFilterDrawerOpen(false)}
        title={t("personnel.detailMgmtHandoverFilterDrawerTitle")}
        closeLabel={t("common.close")}
        backdropCloseRequiresConfirm={false}
        rootClassName={OVERLAY_Z_TW.modalNested}
      >
        <div className="flex flex-col gap-4">
          <Select
            name="hovBranchFilter"
            label={t("personnel.detailMgmtHandoverFilterBranch")}
            options={handoverBranchOptions}
            value={hovDraft.branchId}
            onChange={(e) => setHovDraft((d) => ({ ...d, branchId: e.target.value }))}
            onBlur={() => {}}
            menuZIndex={OVERLAY_Z_INDEX.dateFieldPopover + 20}
          />
          <Select
            name="hovCurrencyFilter"
            label={t("personnel.detailMgmtHandoverFilterCurrency")}
            options={handoverCurrencyOptions}
            value={hovDraft.currency}
            onChange={(e) => setHovDraft((d) => ({ ...d, currency: e.target.value }))}
            onBlur={() => {}}
            menuZIndex={OVERLAY_Z_INDEX.dateFieldPopover + 20}
          />
          <div className="grid grid-cols-1 gap-3">
            <DateField
              label={t("personnel.detailMgmtHandoverFilterDateFrom")}
              value={hovDraft.dateFrom}
              onChange={(e) => setHovDraft((d) => ({ ...d, dateFrom: e.target.value }))}
            />
            <DateField
              label={t("personnel.detailMgmtHandoverFilterDateTo")}
              value={hovDraft.dateTo}
              onChange={(e) => setHovDraft((d) => ({ ...d, dateTo: e.target.value }))}
            />
          </div>
          <Input
            name="hovSearchFilter"
            label={t("personnel.detailMgmtHandoverFilterSearch")}
            value={hovDraft.search}
            onChange={(e) => setHovDraft((d) => ({ ...d, search: e.target.value }))}
          />
          <p className="text-xs text-zinc-500">{t("personnel.detailMgmtHandoverFilterSearchHint")}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="secondary"
              className="min-h-10 w-full sm:flex-1"
              onClick={() => setHovDraft(emptyHandoverFilters())}
            >
              {t("personnel.detailMgmtHandoverFilterReset")}
            </Button>
            <Button
              type="button"
              className="min-h-10 w-full sm:flex-1"
              onClick={() => {
                setHovApplied(hovDraft);
                setHovPage(1);
                setOutPage(1);
                setHovFilterDrawerOpen(false);
              }}
            >
              {t("personnel.detailMgmtHandoverFilterApply")}
            </Button>
          </div>
        </div>
      </RightDrawer>
    </>
  );
}
