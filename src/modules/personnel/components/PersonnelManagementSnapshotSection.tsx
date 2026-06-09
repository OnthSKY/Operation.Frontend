"use client";

import { useI18n } from "@/i18n/context";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { fetchBranchPersonnelMoneySummaries } from "@/modules/branch/api/branches-api";
import { branchKeys } from "@/modules/branch/hooks/useBranchQueries";
import { txCategoryLine } from "@/modules/branch/lib/branch-transaction-options";
import { PersonnelHeldRegisterPersonLink } from "@/modules/personnel/components/PersonnelHeldRegisterPersonLink";
import {
  defaultPersonnelListFilters,
  usePersonnelCashAccountBranchBreakdown,
  usePersonnelCashAccountLedger,
  usePersonnelCashHandoverLinesPaged,
  usePersonnelCashHandoverOutflowsPaged,
  usePersonnelList,
  usePersonnelManagementSnapshot,
  type PersonnelCashHandoverLinesFilterState,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { personnelDisplayName } from "@/modules/personnel/lib/display-name";
import {
  classifyHandoverOutflowSpend,
  handoverOutflowBucketLabelKey,
  type HandoverOutflowSpendBucket,
} from "@/modules/personnel/lib/personnel-cash-handover-ui";
import { useBranchDetailOverlayOptional } from "@/shared/branch-detail";
import { usePersonnelDetailOverlay } from "@/shared/personnel-detail";
import type { BranchPersonnelMoneySummaryItem } from "@/types/branch-personnel-money";
import type {
  PersonnelCashHandoverLine,
  PersonnelCashHandoverOutflow,
  PersonnelCashLedgerEntry,
  PersonnelCurrencySnapshot,
} from "@/types/personnel-management-snapshot";
import type { Personnel } from "@/types/personnel";
import { RightDrawer } from "@/shared/components/RightDrawer";
import { enumerateLocalIsoDatesInclusive, localIsoDate } from "@/shared/lib/local-iso-date";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { OVERLAY_Z_INDEX, OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { RichCombobox, type RichComboboxOption } from "@/shared/ui/RichCombobox";
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
import { useCallback, useEffect, useMemo, useState } from "react";

function formatHireShort(iso: string, locale: Locale, dash: string): string {
  const d = iso?.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return dash;
  return formatLocaleDate(d, locale, dash);
}

function countSeasonDaysInclusive(seasonArrivalDate: string | null | undefined): number | null {
  const from = typeof seasonArrivalDate === "string" ? seasonArrivalDate.trim().slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return null;
  const to = localIsoDate();
  if (from > to) return null;
  const { dates, truncated } = enumerateLocalIsoDatesInclusive(from, to, 800);
  if (truncated || dates.length < 1) return null;
  return dates.length;
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
    totalPersonnelExpenseAllTime: 0,
    totalPersonnelExpenseYearToDate: 0,
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
  /**
   * Çoklu şubeye dağılmış cep parası için seçenek listesi (cash-account breakdown).
   * Patron transfer dialog'u >1 ise Select açar; yoksa statik label.
   */
  branchOptions?: Array<{ branchId: number; branchName: string; amount: number }>;
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
  /** Reconciliation drill-down'dan: işaretlenecek (handover/outflow) transaction id. */
  focusTransactionId?: number | null;
};

function emptyHandoverFilters(): PersonnelCashHandoverLinesFilterState {
  return { branchId: "", currency: "", dateFrom: "", dateTo: "", search: "" };
}

function CashHandoverOutflowParty({
  row,
  currentPersonnelId,
  personnelById,
  dash,
  t,
}: {
  row: PersonnelCashHandoverOutflow;
  currentPersonnelId: number;
  personnelById: Map<number, Personnel>;
  dash: string;
  t: (k: string) => string;
}) {
  const advPid = row.linkedAdvancePersonnelId;
  if (advPid != null && advPid > 0) {
    return (
      <div className="text-xs text-zinc-700">
        <span className="font-medium text-zinc-500">
          {t("personnel.detailMgmtOutflowsAdvanceRecipient")}:{" "}
        </span>
        <PersonnelHeldRegisterPersonLink
          personnelId={advPid}
          fullName={row.linkedAdvancePersonnelFullName}
          personnelById={personnelById}
          dash={dash}
        />
      </div>
    );
  }
  const linkedPid = row.linkedPersonnelId;
  if (linkedPid != null && linkedPid > 0 && linkedPid !== currentPersonnelId) {
    return (
      <PersonnelHeldRegisterPersonLink
        personnelId={linkedPid}
        fullName={row.linkedPersonnelFullName}
        personnelById={personnelById}
        dash={dash}
      />
    );
  }
  const pocketPid = row.expensePocketPersonnelId;
  if (pocketPid != null && pocketPid > 0 && pocketPid !== currentPersonnelId) {
    return (
      <PersonnelHeldRegisterPersonLink
        personnelId={pocketPid}
        fullName={row.expensePocketPersonnelFullName}
        personnelById={personnelById}
        dash={dash}
        openCashPhysicalTab
      />
    );
  }
  return <span className="text-xs text-zinc-500">{dash}</span>;
}

function CashHandoverOutflowNote({
  row,
  dash,
}: {
  row: PersonnelCashHandoverOutflow;
  dash: string;
}) {
  const desc = row.description?.trim();
  return <>{desc || dash}</>;
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
  focusTransactionId = null,
}: Props) {
  const { t, locale } = useI18n();
  const branchOverlay = useBranchDetailOverlayOptional();
  const personnelOverlay = usePersonnelDetailOverlay();
  const dash = t("personnel.dash");

  // Reconciliation drill-down'dan gelen "işaretlenecek" işlem; birkaç saniye vurgulanır.
  const [highlightTxId, setHighlightTxId] = useState<number | null>(null);
  useEffect(() => {
    if (!open || !focusTransactionId || focusTransactionId <= 0) {
      setHighlightTxId(null);
      return;
    }
    setHighlightTxId(focusTransactionId);
    const scrollTimer = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-cash-row="${focusTransactionId}"]`
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    const clearTimer = window.setTimeout(() => setHighlightTxId(null), 4000);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [open, focusTransactionId]);
  // Yeni layout'ta sadece "Patrona devret" butonu var (gider butonu kaldırıldı).
  // Bu yüzden tek başına patron callback yeterli — iki callback şartı kaldırıldı.
  const handoverActionsEnabled =
    !personnel.isDeleted &&
    typeof onHandoverOpenPatronRegisterRepay === "function";
  const [hovPage, setHovPage] = useState(1);
  const [outPage, setOutPage] = useState(1);
  const [cashHandoverSubTab, setCashHandoverSubTab] = useState<"in" | "out">("in");
  const [hovPageSize] = useState(25);
  const [hovApplied, setHovApplied] = useState<PersonnelCashHandoverLinesFilterState>(emptyHandoverFilters);
  const [hovDraft, setHovDraft] = useState<PersonnelCashHandoverLinesFilterState>(emptyHandoverFilters);
  const [hovFilterDrawerOpen, setHovFilterDrawerOpen] = useState(false);

  // Yeni ledger banka ekstresi state'leri (Faz 5.2b).
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize] = useState(50);
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState("");
  const [ledgerIncludeReversals, setLedgerIncludeReversals] = useState(false);
  /**
   * Üst seviye kategori grubu filtresi (UI dropdown). Backend uygun classification_code
   * ve counterparty_kind kombinasyonlarına eşler. value=""  → tüm hareketler.
   */
  const ledgerCategoryOptions = useMemo<RichComboboxOption[]>(
    () => [
      { value: "", title: t("personnel.detailMgmtCashAccountLedgerFilterAll") },
      { value: "INCOMING_CASH", title: t("personnel.detailMgmtCashAccountGroupIncomingCash") },
      { value: "PERSONNEL_ADVANCE", title: t("personnel.detailMgmtCashAccountGroupPersonnelAdvance") },
      { value: "PERSONNEL_EXPENSE", title: t("personnel.detailMgmtCashAccountGroupPersonnelExpense") },
      { value: "BRANCH_EXPENSE", title: t("personnel.detailMgmtCashAccountGroupBranchExpense") },
      { value: "SUPPLIER_INVOICE", title: t("personnel.detailMgmtCashAccountGroupSupplierInvoice") },
      { value: "GENERAL_EXPENSE", title: t("personnel.detailMgmtCashAccountGroupGeneralExpense") },
      { value: "VEHICLE_MAINTENANCE", title: t("personnel.detailMgmtCashAccountGroupVehicleMaintenance") },
      { value: "PERSONNEL_TRANSFER", title: t("personnel.detailMgmtCashAccountGroupPersonnelTransfer") },
      { value: "PATRON_TRANSFER", title: t("personnel.detailMgmtCashAccountGroupPatronTransfer") },
    ],
    [t],
  );
  const { data, isPending, isError, error, refetch } = usePersonnelManagementSnapshot(
    personnel.id,
    open
  );

  const snap = data;
  const primary = useMemo(() => (snap ? pickPrimaryCurrency(snap) : null), [snap]);
  const handoverRow = useMemo(() => (snap ? pickHandoverCurrencyRow(snap) : null), [snap]);
  /**
   * Yeni ledger sisteminden gelen kasa hesabı özeti.
   * 3 kart (Toplam giren / Mevcut bakiye / Toplam çıkan) bundan beslenir.
   * Eski `handoverRow` sadece manager-view metrikleri için kullanılmaya devam ediyor.
   */
  const cashAccountSummary = useMemo(() => {
    const list = snap?.cashAccountSummaries ?? [];
    if (list.length === 0) return null;
    const pc = (snap?.primaryCurrencyCode ?? "TRY").trim().toUpperCase() || "TRY";
    return (
      list.find((r) => r.currencyCode.trim().toUpperCase() === pc) ??
      list[0] ??
      null
    );
  }, [snap?.cashAccountSummaries, snap?.primaryCurrencyCode]);

  /**
   * "Patrona devret" aksiyonu için ctx. Havuz tek (cashAccountSummary) ama backend
   * dialog'u hâlâ branchId istiyor — personelin ana şubesini önceler, yoksa
   * linkedBranchIds[0]. Yeni ledger sisteminde kaynak şube kavramı arka planda kalır.
   */
  // Şube kırılımı: yeni ledger sisteminin `cash-account/breakdown-by-branch` endpoint'i.
  // Sadece kasa hesabı sekmesi açıkken + currency belirlendiyse çekilir.
  const branchBreakdownEnabled =
    open && viewMode === "cashPhysicalHandover" && cashAccountSummary != null;
  const branchBreakdownQuery = usePersonnelCashAccountBranchBreakdown(
    personnel.id,
    cashAccountSummary?.currencyCode ?? "TRY",
    branchBreakdownEnabled,
  );
  /**
   * Hero card'da gösterilecek "kişiye giren para — şube kırılımı". NetContribution > 0
   * olan şubeler, en yüksek katkıdan düşüğe sıralı. Veriler gerçek ledger üzerinden
   * (`personnel_cash_ledger`'ın source_branch_id'lerine göre GROUP BY).
   */
  const cashAccountBranchBreakdown = useMemo(() => {
    const rows = branchBreakdownQuery.data ?? [];
    return rows
      .filter((r) => r.netContribution > 0.009)
      .map((r) => ({
        branchId: r.branchId ?? 0,
        branchName: r.branchLabel || (r.branchId ? `#${r.branchId}` : "—"),
        amount: r.netContribution,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [branchBreakdownQuery.data]);

  /**
   * Patron devret aksiyonu için branchId seçimi:
   *   1) Personel ana şubesinde gerçek bakiye varsa onu kullan (en doğal seçim)
   *   2) Yoksa şube kırılımında EN YÜKSEK bakiyeli şube (gerçek IN açık olan)
   *   3) Hiçbiri olmazsa linkedBranchIds[0]
   *
   * Backend dialog kendi içinde o şubedeki FIFO IN'leri kapatır. Çoklu şubeye
   * dağılmış bakiyede tek istek tek şubeye gider — backend havuz-dağıtım endpoint'i
   * (Faz 4.2) yazıldığında bu kısıt kalkacak.
   */
  const cashAccountPatronAction = useMemo<PersonnelHandoverPoolActionContext | null>(() => {
    if (!cashAccountSummary || cashAccountSummary.currentBalance <= 0.009) return null;

    const primaryBranchHasBalance =
      personnel.branchId != null &&
      personnel.branchId > 0 &&
      cashAccountBranchBreakdown.some((b) => b.branchId === personnel.branchId);

    const topBranchFromBreakdown = cashAccountBranchBreakdown[0]?.branchId ?? null;
    const fallbackBranchId =
      snap?.linkedBranchIds?.find((id) => Number.isFinite(id) && id > 0) ?? null;

    const branchId = primaryBranchHasBalance
      ? personnel.branchId!
      : (topBranchFromBreakdown ?? fallbackBranchId ?? 0);

    if (branchId <= 0) return null;
    return {
      branchId,
      currencyCode: cashAccountSummary.currencyCode,
      suggestedAmount: cashAccountSummary.currentBalance,
      branchOptions: cashAccountBranchBreakdown.map((b) => ({
        branchId: b.branchId,
        branchName: b.branchName,
        amount: b.amount,
      })),
    };
  }, [
    cashAccountSummary,
    cashAccountBranchBreakdown,
    personnel.branchId,
    snap?.linkedBranchIds,
  ]);
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
      {
        totalRemainingHandover: number;
        actionBranchId: number;
        branchCount: number;
        branchBreakdown: Array<{
          branchId: number;
          branchName: string;
          amount: number;
        }>;
      }
    >();
    for (const row of handoverPoolRows) {
      const ccy = (row.currencyCode ?? "").trim().toUpperCase();
      if (!ccy) continue;
      const amount = Number(row.totalRemainingHandover) || 0;
      if (amount <= 0.009) continue;
      const branchName =
        row.branchName?.trim() ||
        branchNameById?.get(row.branchId) ||
        `#${row.branchId}`;
      const current = byCurrency.get(ccy);
      if (current == null) {
        byCurrency.set(ccy, {
          totalRemainingHandover: amount,
          actionBranchId: row.branchId,
          branchCount: 1,
          branchBreakdown: [{ branchId: row.branchId, branchName, amount }],
        });
        continue;
      }
      current.totalRemainingHandover += amount;
      current.branchCount += 1;
      current.branchBreakdown.push({
        branchId: row.branchId,
        branchName,
        amount,
      });
      if (
        personnel.branchId != null &&
        personnel.branchId > 0 &&
        row.branchId === personnel.branchId
      ) {
        current.actionBranchId = row.branchId;
      }
    }
    return [...byCurrency.entries()]
      .map(([currencyCode, row]) => ({
        currencyCode,
        ...row,
        branchBreakdown: [...row.branchBreakdown].sort((a, b) =>
          a.branchName.localeCompare(b.branchName)
        ),
      }))
      .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode));
  }, [handoverPoolRows, personnel.branchId, branchNameById]);
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

  const outflowBreakdownList = usePersonnelCashHandoverOutflowsPaged(
    personnel.id,
    1,
    500,
    hovApplied,
    handoverListEnabled
  );

  // Yeni ledger banka ekstresi — Faz 4.1 endpoint'inden besleniyor.
  const ledgerCurrency = (cashAccountSummary?.currencyCode ?? "TRY").trim().toUpperCase() || "TRY";
  const ledgerQuery = usePersonnelCashAccountLedger(
    personnel.id,
    ledgerPage,
    ledgerPageSize,
    {
      currency: ledgerCurrency,
      dateFrom: "",
      dateTo: "",
      counterpartyKind: "",
      classificationCode: "",
      categoryGroup: ledgerCategoryFilter,
      includeReversals: ledgerIncludeReversals,
    },
    handoverListEnabled && cashAccountSummary != null,
  );

  const labelPersonnelFilters = useMemo(
    () => ({
      ...defaultPersonnelListFilters,
      status: "active" as const,
      page: 1,
      pageSize: 500,
    }),
    [],
  );
  const { data: labelPersonnelList } = usePersonnelList(
    labelPersonnelFilters,
    handoverListEnabled,
  );
  const personnelById = useMemo(() => {
    const m = new Map<number, Personnel>();
    for (const p of labelPersonnelList?.items ?? []) {
      m.set(p.id, p);
    }
    return m;
  }, [labelPersonnelList]);

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
  const handoverHeroIncomingTotal = handoverRow?.totalCashHandoverAsResponsibleAllTime ?? 0;
  const handoverHeroSpentTotal = Math.max(
    0,
    handoverHeroIncomingTotal - handoverPoolHeroMetrics.heroValue
  );

  const handoverInById = useMemo(() => {
    const m = new Map<number, PersonnelCashHandoverLine>();
    for (const row of snap?.cashHandoverLines ?? []) {
      if (row.transactionId > 0) m.set(row.transactionId, row);
    }
    for (const row of hovItems) {
      if (row.transactionId > 0) m.set(row.transactionId, row);
    }
    return m;
  }, [snap?.cashHandoverLines, hovItems]);

  const spentBreakdown = useMemo(() => {
    const ccy = handoverPoolHeroMetrics.ccy;
    const items = outflowBreakdownList.data?.items ?? snap?.cashHandoverOutflows ?? [];
    const filtered = items.filter(
      (r) => (r.currencyCode ?? "TRY").trim().toUpperCase() === ccy
    );
    const byBucket = new Map<HandoverOutflowSpendBucket, number>();
    const byBranch = new Map<number, { name: string; total: number }>();
    for (const row of filtered) {
      const bucket = classifyHandoverOutflowSpend(row);
      byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + row.amount);
      const bid = row.branchId;
      const prev = byBranch.get(bid);
      const bname = row.branchName?.trim() || branchNameById?.get(bid) || `#${bid}`;
      byBranch.set(bid, {
        name: bname,
        total: (prev?.total ?? 0) + row.amount,
      });
    }
    return {
      ccy,
      total: filtered.reduce((s, r) => s + r.amount, 0),
      byBucket: [...byBucket.entries()].sort((a, b) => b[1] - a[1]),
      byBranch: [...byBranch.values()].sort((a, b) => b.total - a.total),
      loading: outflowBreakdownList.isPending && !outflowBreakdownList.data,
    };
  }, [
    outflowBreakdownList.data,
    outflowBreakdownList.isPending,
    snap?.cashHandoverOutflows,
    handoverPoolHeroMetrics.ccy,
    branchNameById,
  ]);

  const openOutflowDetail = useCallback(
    (row: PersonnelCashHandoverOutflow) => {
      if (!branchOverlay || row.branchId <= 0) return;
      const day = row.transactionDate.slice(0, 10);
      const tab =
        row.settlesCashHandoverTransactionId != null && row.settlesCashHandoverTransactionId > 0
          ? "income"
          : "expenses";
      branchOverlay.openBranchDetail(row.branchId, {
        initialTab: tab,
        initialRegisterDay: day.length === 10 ? day : null,
      });
    },
    [branchOverlay]
  );

  const openHandoverInDetail = useCallback(
    (inId: number) => {
      const line = handoverInById.get(inId);
      if (!branchOverlay || !line || line.branchId <= 0) return;
      const day = line.transactionDate.slice(0, 10);
      branchOverlay.openBranchDetail(line.branchId, {
        initialTab: "income",
        initialRegisterDay: day.length === 10 ? day : null,
      });
    },
    [branchOverlay, handoverInById]
  );

  // Ledger satırını kaynağına götür:
  //  • Avans / maaş / prim (PERSONNEL_PAYOUT) → ALICI personelin kartı, Maliyetler sekmesi,
  //    avansı/gideri işaretle.
  //  • Şube gideri vb. → şube kasası, Giderler sekmesi, o işlemi işaretle.
  const ledgerEntryTarget = useCallback(
    (row: PersonnelCashLedgerEntry): "personnel" | "branch" | null => {
      if (
        row.counterpartyKind === "PERSONNEL_PAYOUT" &&
        row.counterpartyPersonnelId != null &&
        row.counterpartyPersonnelId > 0
      ) {
        return "personnel";
      }
      if (branchOverlay != null && row.sourceBranchId != null && row.sourceBranchId > 0) {
        return "branch";
      }
      return null;
    },
    [branchOverlay]
  );
  const ledgerEntryHasSource = useCallback(
    (row: PersonnelCashLedgerEntry) => ledgerEntryTarget(row) != null,
    [ledgerEntryTarget]
  );
  const openLedgerEntryDetail = useCallback(
    (row: PersonnelCashLedgerEntry) => {
      const target = ledgerEntryTarget(row);
      if (target === "personnel" && row.counterpartyPersonnelId) {
        const isAdvance = row.linkedAdvanceId != null && row.linkedAdvanceId > 0;
        personnelOverlay.openPersonnelDetail(row.counterpartyPersonnelId, {
          initialTab: "costs",
          focusAdvanceId: isAdvance ? row.linkedAdvanceId : null,
          focusExpenseTransactionId: isAdvance ? null : row.sourceBranchTransactionId,
        });
        return;
      }
      if (target === "branch" && branchOverlay && row.sourceBranchId) {
        const day = row.entryDate.slice(0, 10);
        const isOut = row.direction === "OUT";
        branchOverlay.openBranchDetail(row.sourceBranchId, {
          initialTab: isOut ? "expenses" : "income",
          initialRegisterDay: day.length === 10 ? day : null,
          // Highlight yalnız giderler ekranında destekli; gelir tarafında günü açmak yeterli.
          focusTransactionId: isOut ? row.sourceBranchTransactionId : null,
        });
      }
    },
    [ledgerEntryTarget, personnelOverlay, branchOverlay]
  );

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
  const tourismSeasonDays = useMemo(
    () => countSeasonDaysInclusive(personnel.seasonArrivalDate),
    [personnel.seasonArrivalDate]
  );
  const hireDateLabel = formatHireShort(snap?.hireDate ?? "", locale, dash);
  const seasonArrivalDateLabel = formatHireShort(personnel.seasonArrivalDate ?? "", locale, dash);
  const simpleSummary = useMemo(() => {
    if (!primary) return "";
    const sal = formatMoneyDash(primary.totalSalaryAllTime, dash, locale, primary.currencyCode);
    const adv = formatMoneyDash(primary.totalAdvanceAllTime, dash, locale, primary.currencyCode);
    if (netAll > 0) {
      return t("personnel.detailMgmtSimpleSummaryPositive")
        .replace("{sal}", sal)
        .replace("{adv}", adv);
    }
    if (netAll < 0) {
      return t("personnel.detailMgmtSimpleSummaryNegative")
        .replace("{sal}", sal)
        .replace("{adv}", adv);
    }
    return t("personnel.detailMgmtSimpleSummaryZero")
      .replace("{sal}", sal)
      .replace("{adv}", adv);
  }, [primary, netAll, dash, locale, t]);

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
            <Button type="button" variant="secondary" className="w-full min-h-[44px] min-w-[44px] sm:w-auto" onClick={() => refetch()}>
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
                  <p className="text-sm font-semibold text-zinc-900">{personnelDisplayName(personnel)}</p>
                  <div className="mt-2 space-y-1 text-xs leading-relaxed text-zinc-800 sm:text-sm">
                    <p>
                      <span className="font-semibold">{t("personnel.tableCompanyHireDate")}:</span>{" "}
                      <span className="font-mono tabular-nums">{hireDateLabel}</span>
                    </p>
                    <p>
                      <span className="font-semibold">{t("personnel.seasonArrivalDate")}:</span>{" "}
                      <span className="font-mono tabular-nums">{seasonArrivalDateLabel}</span>
                    </p>
                    <p>
                      <span className="font-semibold">{t("personnel.detailMgmtSeasonWorkedDaysLabel")}:</span>{" "}
                      <span className="font-mono tabular-nums">
                        {tourismSeasonDays == null ? dash : String(tourismSeasonDays)}
                      </span>
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-900">{simpleSummary}</p>
                </div>

                <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
                  <MetricTile
                    label={t("personnel.detailMgmtTileTenure")}
                    value={`${snap.tenureDaysInclusive}`}
                    hint={t("personnel.detailMgmtTileTenureHint")}
                    emphasis="violet"
                  />
                  <MetricTile
                    label={t("personnel.detailMgmtTileTourismSeasonDays")}
                    value={tourismSeasonDays == null ? dash : String(tourismSeasonDays)}
                    hint={t("personnel.detailMgmtTileTourismSeasonDaysHint")}
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
                    label={t("personnel.detailMgmtTilePersonnelExpenseTotal")}
                    value={formatMoneyDash(
                      primary.totalPersonnelExpenseAllTime,
                      dash,
                      locale,
                      primary.currencyCode
                    )}
                    hint={primary.currencyCode}
                  />
                  <MetricTile
                    label={t("personnel.detailMgmtTileCostTotal")}
                    value={formatMoneyDash(
                      (primary.totalAdvanceAllTime ?? 0) + (primary.totalPersonnelExpenseAllTime ?? 0),
                      dash,
                      locale,
                      primary.currencyCode
                    )}
                    hint={primary.currencyCode}
                    emphasis="violet"
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
                            <br />
                            {t("personnel.detailMgmtTilePersonnelExpenseTotal")}: {formatMoneyDash(row.totalPersonnelExpenseAllTime, dash, locale, row.currencyCode)}
                            <br />
                            {t("personnel.detailMgmtTileCostTotal")}: {formatMoneyDash((row.totalAdvanceAllTime ?? 0) + (row.totalPersonnelExpenseAllTime ?? 0), dash, locale, row.currencyCode)}
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


              </>
            ) : (
              <div className="space-y-4">
                {personnel.isDeleted ? (
                  <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                    {t("personnel.detailCashPhysicalPassiveNotice")}
                  </p>
                ) : null}
                {cashAccountSummary ? (
                  <div className="space-y-3">
                    {/* HERO: Mevcut bakiye + şube kırılımı + Patrona devret butonu */}
                    <article className="rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50/80 to-white p-4 shadow-sm shadow-sky-900/5 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-sky-700">
                            {t("personnel.detailMgmtCashAccountCurrentBalance")}
                          </p>
                          <p className="mt-1 font-mono text-3xl font-bold tabular-nums leading-none text-zinc-900 sm:text-4xl">
                            {formatMoneyDash(
                              cashAccountSummary.currentBalance,
                              dash,
                              locale,
                              cashAccountSummary.currencyCode,
                            )}
                          </p>
                          <p className="mt-2 text-xs text-sky-900/70">
                            {t("personnel.detailMgmtCashAccountCurrentBalanceHint").replace(
                              "{count}",
                              String(cashAccountSummary.entryCount),
                            )}
                          </p>
                        </div>
                        {handoverActionsEnabled && cashAccountPatronAction ? (
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-[44px] shrink-0 self-start px-4 text-sm font-semibold sm:self-center"
                            onClick={() =>
                              onHandoverOpenPatronRegisterRepay?.(cashAccountPatronAction)
                            }
                          >
                            {t("personnel.detailMgmtCashAccountPatronTransferButton")}
                          </Button>
                        ) : null}
                      </div>
                      {cashAccountBranchBreakdown.length > 0 ? (
                        <div className="mt-4 border-t border-sky-100 pt-3">
                          <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-zinc-600">
                            {t("personnel.detailMgmtCashAccountBranchBreakdownTitle")}
                          </p>
                          <ul className="mt-2 space-y-1">
                            {cashAccountBranchBreakdown.map((b) => {
                              // Şube başı devir: dialog'u o şubenin context'iyle aç.
                              // Hero butonu birden çok şubede otomatik seçim yapıyor;
                              // bu satır kullanıcıya "şu şubenin parasını devret" net
                              // kontrolü verir → cepte kalan para sorunu çözülür.
                              const canDevret =
                                handoverActionsEnabled &&
                                b.branchId > 0 &&
                                b.amount > 0.009 &&
                                typeof onHandoverOpenPatronRegisterRepay ===
                                  "function";
                              return (
                                <li
                                  key={b.branchId}
                                  className="flex items-center justify-between gap-2 rounded-md border border-sky-100/80 bg-white/80 px-3 py-1.5 text-sm"
                                >
                                  <span className="min-w-0 flex-1 truncate text-zinc-800">
                                    {b.branchName}
                                  </span>
                                  <span className="shrink-0 font-mono font-semibold tabular-nums text-zinc-900">
                                    {formatMoneyDash(
                                      b.amount,
                                      dash,
                                      locale,
                                      cashAccountSummary.currencyCode,
                                    )}
                                  </span>
                                  {canDevret ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onHandoverOpenPatronRegisterRepay?.({
                                          branchId: b.branchId,
                                          currencyCode:
                                            cashAccountSummary.currencyCode,
                                          suggestedAmount: b.amount,
                                          branchOptions:
                                            cashAccountBranchBreakdown.map(
                                              (x) => ({
                                                branchId: x.branchId,
                                                branchName: x.branchName,
                                                amount: x.amount,
                                              }),
                                            ),
                                        })
                                      }
                                      className="shrink-0 rounded-md bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
                                      title={`${b.branchName} bakiyesini patrona devret`}
                                    >
                                      Devret
                                    </button>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}
                    </article>

                    {/* 2 kart: cebe gelen toplam + cebinden harcanan toplam */}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                      <MetricTile
                        label={t("personnel.detailMgmtCashAccountTotalIn")}
                        value={formatMoneyDash(
                          cashAccountSummary.totalIn,
                          dash,
                          locale,
                          cashAccountSummary.currencyCode,
                        )}
                        hint={t("personnel.detailMgmtCashAccountTotalInHint")}
                        emphasis="neutral"
                      />
                      <MetricTile
                        label={t("personnel.detailMgmtCashAccountTotalOut")}
                        value={formatMoneyDash(
                          cashAccountSummary.totalOut,
                          dash,
                          locale,
                          cashAccountSummary.currencyCode,
                        )}
                        hint={t("personnel.detailMgmtCashAccountTotalOutHint")}
                        emphasis="negative"
                      />
                    </div>
                  </div>
                ) : null}

                {handoverRow && spentBreakdown.byBucket.length > 0 ? (
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/35 p-3 sm:p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-950/90">
                      {t("personnel.detailMgmtSpentBreakdownTitle")} · {spentBreakdown.ccy}
                    </p>
                    {spentBreakdown.loading ? (
                      <p className="mt-2 text-xs text-amber-900/70">{t("common.loading")}</p>
                    ) : (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <ul className="space-y-1.5 text-sm">
                          {spentBreakdown.byBucket.map(([bucket, amt]) => (
                            <li
                              key={bucket}
                              className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/60 bg-white/80 px-2.5 py-1.5"
                            >
                              <span className="text-zinc-700">
                                {t(handoverOutflowBucketLabelKey(bucket))}
                              </span>
                              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-amber-950">
                                {formatMoneyDash(amt, dash, locale, spentBreakdown.ccy)}
                              </span>
                            </li>
                          ))}
                          <li className="flex items-center justify-between gap-3 border-t border-amber-200/70 pt-1.5 font-semibold text-zinc-900">
                            <span>{t("personnel.detailMgmtHandoverHeroSpentTotal")}</span>
                            <span className="font-mono tabular-nums">
                              {formatMoneyDash(
                                spentBreakdown.total,
                                dash,
                                locale,
                                spentBreakdown.ccy
                              )}
                            </span>
                          </li>
                        </ul>
                        {spentBreakdown.byBranch.length > 0 ? (
                          <div>
                            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                              {t("personnel.detailMgmtSpentBreakdownByBranch")}
                            </p>
                            <ul className="mt-1.5 space-y-1 text-sm">
                              {spentBreakdown.byBranch.map((b) => (
                                <li
                                  key={b.name}
                                  className="flex items-center justify-between gap-3 text-zinc-800"
                                >
                                  <span className="truncate">{b.name}</span>
                                  <span className="shrink-0 font-mono tabular-nums">
                                    {formatMoneyDash(b.total, dash, locale, spentBreakdown.ccy)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}

                {cashAccountSummary ? (
                  <section className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-900/5">
                    <div className="flex flex-col gap-2 border-b border-zinc-200/80 bg-gradient-to-b from-zinc-50 to-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                            </svg>
                            {t("personnel.detailMgmtCashAccountLedgerFilterLabel")}
                          </span>
                          <div className="min-w-[12rem]">
                            <RichCombobox
                              value={ledgerCategoryFilter}
                              onChange={(v) => {
                                setLedgerCategoryFilter(v);
                                setLedgerPage(1);
                              }}
                              options={ledgerCategoryOptions}
                              placeholder={t("personnel.detailMgmtCashAccountLedgerFilterAll")}
                              searchPlaceholder={t("personnel.detailMgmtCashAccountLedgerFilterSearch")}
                              emptyText={t("personnel.detailMgmtCashAccountLedgerFilterEmpty")}
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-1.5 text-xs text-zinc-700">
                          <input
                            type="checkbox"
                            checked={ledgerIncludeReversals}
                            onChange={(e) => {
                              setLedgerIncludeReversals(e.target.checked);
                              setLedgerPage(1);
                            }}
                            className="h-3.5 w-3.5"
                          />
                          {t("personnel.detailMgmtCashAccountLedgerIncludeReversals")}
                        </label>
                      </div>
                    </div>
                    {ledgerQuery.isError ? (
                      <div className="px-3 py-3">
                        <p className="text-sm text-red-600">{toErrorMessage(ledgerQuery.error)}</p>
                        <Button
                          type="button"
                          variant="secondary"
                          className="mt-2 min-h-[44px]"
                          onClick={() => ledgerQuery.refetch()}
                        >
                          {t("common.retry")}
                        </Button>
                      </div>
                    ) : ledgerQuery.isPending && !ledgerQuery.data ? (
                      <div className="space-y-2 p-3" aria-busy="true">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="h-12 animate-pulse rounded-md bg-zinc-100" />
                        ))}
                      </div>
                    ) : (ledgerQuery.data?.items.length ?? 0) === 0 ? (
                      <p className="px-3 py-4 text-sm text-zinc-500">
                        {t("personnel.detailMgmtCashAccountLedgerEmpty")}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="w-full min-w-0 lg:min-w-[60rem]">
                          <TableHead>
                            <TableRow>
                              <TableHeader>
                                {t("personnel.detailMgmtCashAccountLedgerColDate")}
                              </TableHeader>
                              <TableHeader className="text-right">
                                {t("personnel.detailMgmtCashAccountLedgerColAmount")}
                              </TableHeader>
                              <TableHeader className="text-right">
                                {t("personnel.detailMgmtCashAccountLedgerColBalanceAfter")}
                              </TableHeader>
                              <TableHeader>
                                {t("personnel.detailMgmtCashAccountLedgerColCounterparty")}
                              </TableHeader>
                              <TableHeader>
                                {t("personnel.detailMgmtCashAccountLedgerColBranch")}
                              </TableHeader>
                              <TableHeader>
                                {t("personnel.detailMgmtCashAccountLedgerColDescription")}
                              </TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {ledgerQuery.data!.items.map((row) => {
                              const isReversal = row.entryKind === "REVERSAL";
                              const isIn = row.direction === "IN";
                              const sign = isIn ? "+" : "−";
                              const amtClass = isIn
                                ? "text-emerald-700"
                                : "text-rose-700";
                              const clickable = ledgerEntryHasSource(row);
                              return (
                                <TableRow
                                  key={row.id}
                                  onClick={
                                    clickable ? () => openLedgerEntryDetail(row) : undefined
                                  }
                                  role={clickable ? "button" : undefined}
                                  tabIndex={clickable ? 0 : undefined}
                                  title={
                                    clickable
                                      ? t("personnel.detailMgmtCashAccountLedgerRowOpenHint")
                                      : undefined
                                  }
                                  aria-label={
                                    clickable
                                      ? t("personnel.detailMgmtCashAccountLedgerRowOpenHint")
                                      : undefined
                                  }
                                  onKeyDown={
                                    clickable
                                      ? (e) => {
                                          if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            openLedgerEntryDetail(row);
                                          }
                                        }
                                      : undefined
                                  }
                                  className={cn(
                                    isReversal && "opacity-60",
                                    clickable &&
                                      "cursor-pointer transition-colors hover:bg-sky-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500",
                                  )}
                                >
                                  <TableCell
                                    dataLabel={t("personnel.detailMgmtCashAccountLedgerColDate")}
                                    className="whitespace-nowrap"
                                  >
                                    {formatLocaleDate(row.entryDate, locale, dash)}
                                  </TableCell>
                                  <TableCell
                                    dataLabel={t("personnel.detailMgmtCashAccountLedgerColAmount")}
                                    className={cn(
                                      "text-right font-mono font-semibold tabular-nums",
                                      amtClass,
                                    )}
                                  >
                                    <span className="mr-0.5">{sign}</span>
                                    {formatMoneyDash(row.amount, dash, locale, row.currencyCode)}
                                  </TableCell>
                                  <TableCell
                                    dataLabel={t("personnel.detailMgmtCashAccountLedgerColBalanceAfter")}
                                    className="text-right font-mono tabular-nums text-zinc-900"
                                  >
                                    {formatMoneyDash(
                                      row.balanceAfter,
                                      dash,
                                      locale,
                                      row.currencyCode,
                                    )}
                                  </TableCell>
                                  <TableCell
                                    dataLabel={t("personnel.detailMgmtCashAccountLedgerColCounterparty")}
                                    className="max-w-[14rem]"
                                  >
                                    <div className="text-sm text-zinc-800">
                                      {row.counterpartyLabel ||
                                        t(
                                          `personnel.detailMgmtCashAccountKind${
                                            {
                                              BRANCH_REGISTER: "BranchRegister",
                                              OTHER_PERSONNEL: "OtherPersonnel",
                                              BRANCH_EXPENSE: "BranchExpense",
                                              GENERAL_EXPENSE: "GeneralExpense",
                                              PERSONNEL_PAYOUT: "PersonnelPayout",
                                              PATRON: "Patron",
                                            }[row.counterpartyKind] ?? "Patron"
                                          }`,
                                        )}
                                    </div>
                                    {isReversal ? (
                                      <span className="mt-0.5 inline-block rounded bg-zinc-200 px-1.5 text-[0.65rem] font-semibold uppercase text-zinc-700">
                                        {t("personnel.detailMgmtCashAccountLedgerReversalBadge")}
                                      </span>
                                    ) : null}
                                  </TableCell>
                                  <TableCell
                                    dataLabel={t("personnel.detailMgmtCashAccountLedgerColBranch")}
                                  >
                                    {row.sourceBranchName || dash}
                                  </TableCell>
                                  <TableCell
                                    dataLabel={t("personnel.detailMgmtCashAccountLedgerColDescription")}
                                    className="max-w-[16rem] text-zinc-600"
                                  >
                                    <span
                                      className="block truncate md:max-w-[16rem]"
                                      title={row.description ?? undefined}
                                    >
                                      {row.description || dash}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {(ledgerQuery.data?.totalCount ?? 0) > ledgerPageSize ? (
                      <div className="flex items-center justify-between gap-2 border-t border-zinc-200/80 bg-zinc-50/60 px-3 py-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-[40px]"
                          disabled={ledgerPage <= 1 || ledgerQuery.isFetching}
                          onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                        >
                          {t("personnel.detailMgmtHandoverPrev")}
                        </Button>
                        <span className="text-xs text-zinc-600">
                          {ledgerPage} /{" "}
                          {Math.max(
                            1,
                            Math.ceil(
                              (ledgerQuery.data?.totalCount ?? 0) / ledgerPageSize,
                            ),
                          )}
                        </span>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-[40px]"
                          disabled={
                            ledgerPage >=
                              Math.ceil(
                                (ledgerQuery.data?.totalCount ?? 0) / ledgerPageSize,
                              ) || ledgerQuery.isFetching
                          }
                          onClick={() => setLedgerPage((p) => p + 1)}
                        >
                          {t("personnel.detailMgmtHandoverNext")}
                        </Button>
                      </div>
                    ) : null}
                  </section>
                ) : null}


                {!personnel.isDeleted &&
                (pocketMoneyPending || pocketMoneyByBranch.length > 0) ? (
                  <div className="rounded-xl border border-violet-200/80 bg-violet-50/30 p-3 sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-violet-950/90">
                          {t("personnel.detailMgmtPocketSectionTitle")}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-violet-900/75">
                          {t("personnel.detailMgmtPocketSectionHint")}
                        </p>
                      </div>
                      {onOpenCostsDetail ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-[44px] shrink-0 px-3 text-xs font-semibold"
                          onClick={onOpenCostsDetail}
                        >
                          {t("personnel.detailMgmtPocketOpenCosts")}
                        </Button>
                      ) : null}
                    </div>
                    {pocketMoneyPending ? (
                      <p className="mt-3 text-sm text-zinc-600">{t("common.loading")}</p>
                    ) : pocketMoneyByBranch.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-600">
                        {t("personnel.detailMgmtPocketEmpty")}
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-3">
                        {pocketMoneyByBranch.map(({ branchId, row }) => {
                          const cur =
                            row.pocketCurrencyCode?.trim().toUpperCase() || "TRY";
                          const bname =
                            branchNameById?.get(branchId) ?? `#${branchId}`;
                          return (
                            <li
                              key={branchId}
                              className="rounded-lg border border-violet-200/70 bg-white/90 p-3 text-sm"
                            >
                              <p className="font-medium text-zinc-900">{bname}</p>
                              <dl className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
                                <div className="flex justify-between gap-2 sm:block">
                                  <dt className="text-zinc-500">
                                    {t("personnel.detailMgmtPocketLineGross")}
                                  </dt>
                                  <dd className="font-mono font-semibold tabular-nums text-zinc-900 sm:mt-0.5">
                                    {formatMoneyDash(
                                      row.grossPocketExpense,
                                      dash,
                                      locale,
                                      cur
                                    )}
                                  </dd>
                                </div>
                                <div className="flex justify-between gap-2 sm:block">
                                  <dt className="text-zinc-500">
                                    {t("personnel.detailMgmtPocketLineRepaidRegister")}
                                  </dt>
                                  <dd className="font-mono tabular-nums text-zinc-800 sm:mt-0.5">
                                    {formatMoneyDash(
                                      row.pocketRepaidFromRegister,
                                      dash,
                                      locale,
                                      cur
                                    )}
                                  </dd>
                                </div>
                                <div className="flex justify-between gap-2 sm:block">
                                  <dt className="text-zinc-500">
                                    {t("personnel.detailMgmtPocketLineRepaidPatron")}
                                  </dt>
                                  <dd className="font-mono tabular-nums text-zinc-800 sm:mt-0.5">
                                    {formatMoneyDash(
                                      row.pocketRepaidFromPatron,
                                      dash,
                                      locale,
                                      cur
                                    )}
                                  </dd>
                                </div>
                                <div className="flex justify-between gap-2 sm:block">
                                  <dt className="text-zinc-500">
                                    {t("personnel.detailMgmtPocketOwesShort")}
                                  </dt>
                                  <dd className="font-mono font-semibold tabular-nums text-violet-950 sm:mt-0.5">
                                    {formatMoneyDash(
                                      row.netRegisterOwesPocket,
                                      dash,
                                      locale,
                                      cur
                                    )}
                                  </dd>
                                </div>
                              </dl>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}

                {/* DEPRECATED — eski IN/OUT alt-sekme bloğu. Faz 5.4'te tamamen silinecek. */}
                <div className="hidden overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-sm shadow-zinc-900/5">
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
                            "min-h-[44px] min-w-[44px] rounded-[0.65rem] px-2.5 py-2 text-center text-xs font-semibold leading-snug transition sm:px-3 sm:text-sm",
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
                            "min-h-[44px] min-w-[44px] rounded-[0.65rem] px-2.5 py-2 text-center text-xs font-semibold leading-snug transition sm:px-3 sm:text-sm",
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
                        className="relative flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 self-stretch rounded-xl border border-zinc-300/90 bg-white px-3 text-zinc-800 shadow-sm transition hover:bg-zinc-50 sm:h-11 sm:min-h-[44px] sm:w-11 sm:px-0 sm:self-center"
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

                      {handoverList.isError ? (
                        <div className="mt-3 flex flex-col gap-2">
                          <p className="text-sm text-red-600">{toErrorMessage(handoverList.error)}</p>
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full min-h-[44px] min-w-[44px] sm:w-auto"
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
                                <Table className="w-full min-w-0 lg:min-w-[56rem]">
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
                                        <TableRow
                                          key={row.transactionId}
                                          data-cash-row={row.transactionId}
                                          className={cn(
                                            highlightTxId === row.transactionId &&
                                              "ring-2 ring-amber-400 ring-inset bg-amber-50"
                                          )}
                                        >
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
                                className="min-h-[44px] min-w-[44px] w-full sm:w-auto"
                                disabled={hovPage <= 1 || handoverList.isFetching}
                                onClick={() => setHovPage((p) => Math.max(1, p - 1))}
                              >
                                {t("personnel.detailMgmtHandoverPrev")}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-[44px] min-w-[44px] w-full sm:w-auto"
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
                            className="w-full min-h-[44px] min-w-[44px] sm:w-auto"
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
                                <Table className="w-full min-w-0 lg:min-w-[68rem]">
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
                                      <TableHeader>{t("personnel.detailMgmtOutflowsColParty")}</TableHeader>
                                      <TableHeader>{t("personnel.detailMgmtOutflowsColInRef")}</TableHeader>
                                      <TableHeader>{t("personnel.detailMgmtHandoverColCategory")}</TableHeader>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {outItems.map((row) => {
                                      const cat = txCategoryLine(row.mainCategory, row.category, t);
                                      const inId = row.settlesCashHandoverTransactionId;
                                      const inLine =
                                        inId != null && inId > 0
                                          ? handoverInById.get(inId)
                                          : undefined;
                                      return (
                                        <TableRow
                                          key={row.transactionId}
                                          data-cash-row={row.transactionId}
                                          className={cn(
                                            highlightTxId === row.transactionId &&
                                              "ring-2 ring-amber-400 ring-inset bg-amber-50"
                                          )}
                                        >
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
                                          <TableCell dataLabel={t("personnel.detailMgmtOutflowsColParty")} className="max-w-[10rem]">
                                            <CashHandoverOutflowParty
                                              row={row}
                                              currentPersonnelId={personnel.id}
                                              personnelById={personnelById}
                                              dash={dash}
                                              t={t}
                                            />
                                          </TableCell>
                                          <TableCell dataLabel={t("personnel.detailMgmtOutflowsColInRef")} className="text-xs">
                                            {inId != null && inId > 0 ? (
                                              branchOverlay ? (
                                                <button
                                                  type="button"
                                                  className="font-medium text-sky-800 underline-offset-2 hover:underline"
                                                  onClick={() => openHandoverInDetail(inId)}
                                                >
                                                  {t("personnel.detailMgmtHandoverInRefLink")
                                                    .replace("{id}", String(inId))
                                                    .replace(
                                                      "{date}",
                                                      inLine
                                                        ? formatLocaleDate(
                                                            inLine.transactionDate,
                                                            locale,
                                                            dash
                                                          )
                                                        : dash
                                                    )}
                                                </button>
                                              ) : (
                                                <span className="text-zinc-600">
                                                  {t("personnel.detailMgmtHandoverInRefLink")
                                                    .replace("{id}", String(inId))
                                                    .replace("{date}", inLine?.transactionDate ?? dash)}
                                                </span>
                                              )
                                            ) : (
                                              dash
                                            )}
                                          </TableCell>
                                          <TableCell
                                            dataLabel={t("personnel.detailMgmtHandoverColCategory")}
                                            className="max-w-[12rem] text-zinc-600"
                                          >
                                            {cat || dash}
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
                                className="min-h-[44px] min-w-[44px] w-full sm:w-auto"
                                disabled={outPage <= 1 || outflowList.isFetching}
                                onClick={() => setOutPage((p) => Math.max(1, p - 1))}
                              >
                                {t("personnel.detailMgmtHandoverPrev")}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-[44px] min-w-[44px] w-full sm:w-auto"
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
            onBlur={() => { }}
            menuZIndex={OVERLAY_Z_INDEX.dateFieldPopover + 20}
          />
          <Select
            name="hovCurrencyFilter"
            label={t("personnel.detailMgmtHandoverFilterCurrency")}
            options={handoverCurrencyOptions}
            value={hovDraft.currency}
            onChange={(e) => setHovDraft((d) => ({ ...d, currency: e.target.value }))}
            onBlur={() => { }}
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
              className="min-h-[44px] min-w-[44px] w-full sm:flex-1"
              onClick={() => setHovDraft(emptyHandoverFilters())}
            >
              {t("personnel.detailMgmtHandoverFilterReset")}
            </Button>
            <Button
              type="button"
              className="min-h-[44px] min-w-[44px] w-full sm:flex-1"
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
