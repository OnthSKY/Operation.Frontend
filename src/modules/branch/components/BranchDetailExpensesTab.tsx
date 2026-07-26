"use client";

import { RightDrawer } from "@/shared/components/RightDrawer";
import { CreatedByMeta } from "@/shared/components/CreatedByMeta";
import { BranchExpenseKindBadge } from "@/modules/branch/components/BranchExpenseKindBadge";
import { ExpenseAddSplitButton } from "@/modules/branch/components/ExpenseAddSplitButton";
import type { Locale } from "@/i18n/messages";
import { branchTransactionReceiptPhotoUrl } from "@/modules/branch/api/branch-transactions-api";
import {
  branchTxGeneralOverheadLine,
  branchTxLinkedExpenseLine,
  branchTxLinkedSupplierInvoiceLine,
  branchTxLinkedContractorLine,
  branchTxLinkedVehicleLine,
  branchTxUnpaidInvoice,
  expensePaymentSourceLabelShort,
  txCategoryMainSub,
  txFundedByPatron,
} from "@/modules/branch/lib/branch-transaction-options";
import type { BranchRegisterSummary } from "@/types/branch";
import type { BranchTransaction } from "@/types/branch-transaction";
import { formatLocaleAmount, formatMoneyDash } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { TablePagination } from "@/shared/ui/TablePagination";
import { DateField } from "@/shared/ui/DateField";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { Check, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import {
  BranchSectionTitleWithInfo,
  BranchTxDeleteRow,
  EMPTY_EXPENSE_TAB_BREAKDOWN,
  expenseCostBehaviorStrip,
  ExpenseOverviewDetailModal,
  branchTxIsPocketRepayMain,
  branchTxNonPnl,
  expensePocketRepaySubline,
  expensePocketSubline,
  expenseTabPeriodOverviewBlock,
  type ExpenseOverviewCardId,
} from "./BranchDetailTabs.shared";
import { BranchMobileInsightJumpRail } from "@/modules/branch/components/BranchMobileInsightJumpRail";
import type { ExpenseTabPeriodBreakdown } from "@/types/branch";
import type { BranchHeldSupplierPayment } from "@/modules/suppliers/api/suppliers-api";

export type BranchDetailExpensesTabProps = {
  t: (key: string) => string;
  locale: Locale;
  employeeSelfService: boolean;
  branchIdForTourismLink?: number | null;
  tabIsActive: boolean;
  /** Personel zimmetinden yapılan tedarikçi ödemeleri — "personel zimmetinden" filtresinde salt-okunur gösterilir. */
  heldSupplierPayments?: BranchHeldSupplierPayment[];
  /** İşaretlenecek branch_transaction id (cep kasası ledger'ından gelir). */
  focusTransactionId?: number | null;
  expenseOverviewDetail: {
    periodTitle: string;
    breakdown: ExpenseTabPeriodBreakdown;
    card: ExpenseOverviewCardId;
  } | null;
  setExpenseOverviewDetail: Dispatch<
    SetStateAction<{
      periodTitle: string;
      breakdown: ExpenseTabPeriodBreakdown;
      card: ExpenseOverviewCardId;
    } | null>
  >;
  expSummaryShowErr: boolean;
  expSummaryErrFirst: unknown;
  expSummaryShowSkeleton: boolean;
  expThroughToday: BranchRegisterSummary | null | undefined;
  expListSummaryShowErr: boolean;
  expListSummaryErrFirst: unknown | null;
  expListSummaryPending: boolean;
  expListDetailRangeActive: boolean;
  expLoading: boolean;
  expErr: boolean;
  expError: unknown;
  expData:
    | {
        items: BranchTransaction[];
        totalCount: number;
        filteredAmountTotal?: number;
        patronExpenseTotal?: number;
        registerExpenseTotal?: number;
        personnelPocketExpenseTotal?: number;
        personnelHeldRegisterCashExpenseTotal?: number;
        expenseFixedTotal?: number;
        expenseVariableTotal?: number;
        expenseCapexTotal?: number;
      }
    | null
    | undefined;
  expListDayRegister: BranchRegisterSummary | null | undefined;
  expListDetailSingleDay: string | null;
  expListDatesRangeInvalid: boolean;
  expListDatesPartialInvalid: boolean;
  setTxModalLaunch: Dispatch<
    SetStateAction<{
      defaultType?: "IN" | "OUT";
      defaultMainCategory?: string;
      defaultTransactionDate?: string;
      defaultPocketRepayPersonnelId?: number;
      defaultPocketRepayCurrencyCode?: string;
    }>
  >;
  setTxModalOpen: (v: boolean) => void;
  expFrom: string;
  expTo: string;
  setExpFrom: (v: string) => void;
  setExpTo: (v: string) => void;
  setExpPage: Dispatch<SetStateAction<number>>;
  expenseFiltersOpen: boolean;
  setExpenseFiltersOpen: (v: boolean) => void;
  expFiltersActive: boolean;
  expCategoryOpts: { value: string; label: string }[];
  expFilterCategory: string;
  onExpCategoryChange: (v: string) => void;
  expPayFilterOpts: { value: string; label: string }[];
  expKindFilterOpts: { value: string; label: string }[];
  expFilterMain: string;
  setExpFilterMain: (v: string) => void;
  expFilterSub: string;
  setExpFilterSub: (v: string) => void;
  expFilterPay: string;
  setExpFilterPay: (v: string) => void;
  expHeldPersonnelOpts: { value: string; label: string }[];
  expFilterHeldPersonnel: string;
  setExpFilterHeldPersonnel: (v: string) => void;
  expFilterKind: string;
  setExpFilterKind: (v: string) => void;
  refetchExp: () => unknown;
  refetchExpenseSummaryBlocks: () => void;
  canDeleteBranchTx: boolean;
  txDeletePendingId: number | null;
  setTxDeletePendingId: (id: number | null) => void;
  confirmDeleteBranchTx: (id: number) => void | Promise<void>;
  deleteTxMut: Pick<UseMutationResult<unknown, unknown, number, unknown>, "isPending">;
  setInvoiceSettleRow: (row: BranchTransaction | null) => void;
  expPage: number;
  expTotal: number;
  EXP_PAGE: number;
  onOpenDetail: (row: BranchTransaction) => void;
};

export function BranchDetailExpensesTab(props: BranchDetailExpensesTabProps) {
  const {
    t,
    locale,
    employeeSelfService,
    branchIdForTourismLink,
    tabIsActive,
    heldSupplierPayments,
    focusTransactionId,
    expenseOverviewDetail,
    setExpenseOverviewDetail,
    expSummaryShowErr,
    expSummaryErrFirst,
    expSummaryShowSkeleton,
    expThroughToday,
    expListSummaryShowErr,
    expListSummaryErrFirst,
    expListSummaryPending,
    expListDetailRangeActive,
    expLoading,
    expErr,
    expError,
    expData,
    expListDayRegister,
    expListDetailSingleDay,
    expListDatesRangeInvalid,
    expListDatesPartialInvalid,
    setTxModalLaunch,
    setTxModalOpen,
    expFrom,
    expTo,
    setExpFrom,
    setExpTo,
    setExpPage,
    expenseFiltersOpen,
    setExpenseFiltersOpen,
    expFiltersActive,
    expCategoryOpts,
    expFilterCategory,
    onExpCategoryChange,
    expPayFilterOpts,
    expKindFilterOpts,
    expFilterMain,
    setExpFilterMain,
    expFilterSub,
    setExpFilterSub,
    expFilterPay,
    setExpFilterPay,
    expHeldPersonnelOpts,
    expFilterHeldPersonnel,
    setExpFilterHeldPersonnel,
    expFilterKind,
    setExpFilterKind,
    refetchExp,
    refetchExpenseSummaryBlocks,
    canDeleteBranchTx,
    txDeletePendingId,
    setTxDeletePendingId,
    confirmDeleteBranchTx,
    deleteTxMut,
    setInvoiceSettleRow,
    expPage,
    expTotal,
    EXP_PAGE,
    onOpenDetail,
  } = props;

  // Cep kasası ledger'ından gelen "kaynağa git" → ilgili gider satırını işaretle + kaydır.
  const [highlightTxId, setHighlightTxId] = useState<number | null>(null);
  useEffect(() => {
    if (!tabIsActive || !focusTransactionId || focusTransactionId <= 0) {
      setHighlightTxId(null);
      return;
    }
    setHighlightTxId(focusTransactionId);
  }, [tabIsActive, focusTransactionId]);
  useEffect(() => {
    if (!highlightTxId) return;
    const scrollTimer = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>(`[data-tx-row="${highlightTxId}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    const clearTimer = window.setTimeout(() => setHighlightTxId(null), 4000);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [highlightTxId, expData]);

  const todayIso = localIsoDate();
  const expCategoryLabel = (
    expCategoryOpts.find((x) => x.value === expFilterCategory)?.label ?? expFilterCategory
  ).replace(/^›\s*/, "");
  const expPayLabel =
    expPayFilterOpts.find((x) => x.value === expFilterPay)?.label ?? expFilterPay;
  const showExpDateFrom = expFrom.length === 10 && expFrom !== todayIso;
  const showExpDateTo = expTo.length === 10 && expTo !== todayIso;
  const hasExpDateFilters = showExpDateFrom || showExpDateTo;
  const hasExpCategoryFilter = expFilterCategory.trim().length > 0;
  const hasExpPayFilter = expFilterPay.trim().length > 0;
  const expActiveFilterCount =
    (hasExpDateFilters ? 1 : 0) +
    (hasExpCategoryFilter ? 1 : 0) +
    (hasExpPayFilter ? 1 : 0);
  const showHeldRegisterInExpenseTab =
    expFilterPay.trim().toUpperCase() === "PERSONNEL_HELD_REGISTER_CASH";
  const visibleExpenseItems = useMemo(() => {
    const items = expData?.items ?? [];
    if (showHeldRegisterInExpenseTab) return items;
    return items.filter((row) => {
      const src = String(row.expensePaymentSource ?? "").trim().toUpperCase();
      return src !== "PERSONNEL_HELD_REGISTER_CASH";
    });
  }, [expData?.items, showHeldRegisterInExpenseTab]);

  // Tedarikçi ödemeleri bloğu — tedarikçiye göre filtre + sıralama. Personel filtresi ana
  // filtredeki (expFilterHeldPersonnel) seçime bağlıdır (tek personel filtresi).
  const [heldSupSupplier, setHeldSupSupplier] = useState("");
  const [heldSupSort, setHeldSupSort] = useState<"dateDesc" | "amountDesc">("dateDesc");
  const heldSupSupplierOptions = useMemo(() => {
    const s = new Set<string>();
    for (const p of heldSupplierPayments ?? []) if (p.supplierNames) s.add(p.supplierNames);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [heldSupplierPayments]);
  const heldSupVisible = useMemo(() => {
    let list = [...(heldSupplierPayments ?? [])];
    if (expFilterHeldPersonnel)
      list = list.filter((p) => String(p.personnelId) === expFilterHeldPersonnel);
    if (heldSupSupplier) list = list.filter((p) => (p.supplierNames || "") === heldSupSupplier);
    list.sort((a, b) =>
      heldSupSort === "amountDesc"
        ? b.amount - a.amount
        : b.paymentDate.localeCompare(a.paymentDate),
    );
    return list;
  }, [heldSupplierPayments, expFilterHeldPersonnel, heldSupSupplier, heldSupSort]);
  const heldSupVisibleTotal = useMemo(
    () => heldSupVisible.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [heldSupVisible],
  );
  const expenseListFilteredTotal = Number(expData?.filteredAmountTotal ?? 0);
  const expenseListPatronTotal = Number(expData?.patronExpenseTotal ?? 0);
  const expenseListSourceTotals = useMemo(() => {
    const patron = Number.isFinite(expenseListPatronTotal) ? Math.max(0, expenseListPatronTotal) : 0;
    const registerRaw = Number(expData?.registerExpenseTotal ?? Number.NaN);
    const pocketRaw = Number(expData?.personnelPocketExpenseTotal ?? Number.NaN);
    const heldRaw = Number(expData?.personnelHeldRegisterCashExpenseTotal ?? Number.NaN);
    const registerKnown = Number.isFinite(registerRaw);
    const pocketKnown = Number.isFinite(pocketRaw);
    const heldKnown = Number.isFinite(heldRaw);
    let register = registerKnown ? Math.max(0, registerRaw) : 0;
    const pocket = pocketKnown ? Math.max(0, pocketRaw) : 0;
    const held = heldKnown ? Math.max(0, heldRaw) : 0;
    const filteredFromApi = Number.isFinite(expenseListFilteredTotal)
      ? Math.max(0, expenseListFilteredTotal)
      : 0;
    // Toplam = kasa nakit + patron + personel zimmeti + (varsa) personel cebi.
    let total = filteredFromApi;
    if (registerKnown || pocketKnown || heldKnown) {
      total = register + patron + pocket + held;
    }
    if (!registerKnown) {
      register = Math.max(0, total - patron - pocket - held);
    }
    const pct = (amount: number) => (total > 0 ? (amount / total) * 100 : 0);
    return {
      total,
      patron,
      register,
      pocket,
      held,
      // PERSONNEL_POCKET (personel cebi) yeni kayıt için gizli; özet kartı yalnız geçmişte tutar varsa gösterilir.
      showPocket: pocket > 0.005,
      patronPct: pct(patron),
      registerPct: pct(register),
      pocketPct: pct(pocket),
      heldPct: pct(held),
    };
  }, [
    expData?.registerExpenseTotal,
    expData?.personnelPocketExpenseTotal,
    expData?.personnelHeldRegisterCashExpenseTotal,
    expenseListFilteredTotal,
    expenseListPatronTotal,
  ]);

  const expenseSeasonQuickRange = useMemo(() => {
    const from = String(expThroughToday?.activeTourismSeasonOpenedOn ?? "");
    const toRaw = String(expThroughToday?.activeTourismSeasonClosedOn ?? "");
    if (from.length !== 10) return null;
    const to = toRaw.length === 10 ? toRaw : String(expThroughToday?.asOfDate ?? todayIso);
    return to.length === 10 ? { from, to } : null;
  }, [expThroughToday, todayIso]);

  const expQuickTodaySelected = expFrom === todayIso && expTo === todayIso;
  const expQuickAllTimeSelected =
    expFrom === "" && expTo === "" && !hasExpCategoryFilter && !hasExpPayFilter;
  const expQuickSeasonSelected =
    !!expenseSeasonQuickRange &&
    expFrom === expenseSeasonQuickRange.from &&
    expTo === expenseSeasonQuickRange.to;

  const unifiedExpenseFilters = useMemo(
    () => ({
      from: expFrom,
      to: expTo,
      main: expFilterMain,
      pay: expFilterPay,
    }),
    [expFrom, expTo, expFilterMain, expFilterPay]
  );
  const applyUnifiedExpenseFilters = (
    next: Partial<typeof unifiedExpenseFilters>
  ) => {
    const merged = { ...unifiedExpenseFilters, ...next };
    setExpFrom(merged.from);
    setExpTo(merged.to);
    setExpFilterMain(merged.main);
    // Ana kategori değiştirildiğinde alt kategori geçersizleşir; sıfırla.
    if (next.main !== undefined) setExpFilterSub("");
    setExpFilterPay(merged.pay);
    setExpPage(1);
  };

  const expenseJumpItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    if (!employeeSelfService) {
      items.push({ id: "branch-expense-list-dates", label: t("branch.mobileJumpExpenseListDates") });
    }
    items.push({ id: "branch-expense-lines", label: t("branch.mobileJumpExpenseLines") });
    return items;
  }, [employeeSelfService, t]);

  return (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">{t("branch.expensesHint")}</p>
            <BranchMobileInsightJumpRail
              ariaLabel={t("branch.mobileJumpExpenseNavAria")}
              items={expenseJumpItems}
            />
            <section
              className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"
              aria-label={t("branch.expensesActionsTitle")}
            >
              <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                {t("branch.expensesActionsTitle")}
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                {branchIdForTourismLink ? (
                  <ExpenseAddSplitButton
                    branchId={branchIdForTourismLink}
                    onSelectOpsExpense={() => {
                      const d = expFrom.length === 10 && expFrom === expTo ? expFrom : localIsoDate();
                      setTxModalLaunch({
                        defaultType: "OUT",
                        defaultTransactionDate: d,
                        defaultMainCategory: "OUT_OPS",
                      });
                      setTxModalOpen(true);
                    }}
                  />
                ) : null}
              </div>
              <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
                <p className="text-xs font-semibold text-zinc-700">{t("branch.expenseQuickFiltersLead")}</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:contents">
                    <Button
                      type="button"
                      variant={expQuickTodaySelected ? "primary" : "secondary"}
                      aria-pressed={expQuickTodaySelected}
                      className={cn(
                        "min-h-11 w-full touch-manipulation sm:min-w-[9rem] sm:flex-1",
                        expQuickTodaySelected && "ring-2 ring-zinc-900 ring-offset-1 ring-offset-zinc-50"
                      )}
                      onClick={() => {
                        const d = localIsoDate();
                        applyUnifiedExpenseFilters({ from: d, to: d });
                      }}
                    >
                      {expQuickTodaySelected ? <Check className="mr-1.5 h-4 w-4" aria-hidden /> : null}
                      {t("branch.filterToday")}
                    </Button>
                    <Button
                      type="button"
                      variant={expQuickAllTimeSelected ? "primary" : "secondary"}
                      aria-pressed={expQuickAllTimeSelected}
                      className={cn(
                        "min-h-11 w-full touch-manipulation sm:min-w-[9rem] sm:flex-1",
                        expQuickAllTimeSelected && "ring-2 ring-zinc-900 ring-offset-1 ring-offset-zinc-50"
                      )}
                      onClick={() => applyUnifiedExpenseFilters({ from: "", to: "", main: "", pay: "" })}
                    >
                      {expQuickAllTimeSelected ? <Check className="mr-1.5 h-4 w-4" aria-hidden /> : null}
                      {t("branch.filterAllTime")}
                    </Button>
                    {expenseSeasonQuickRange ? (
                      <Button
                        type="button"
                        variant={expQuickSeasonSelected ? "primary" : "secondary"}
                        aria-pressed={expQuickSeasonSelected}
                        className={cn(
                          "col-span-2 min-h-11 w-full touch-manipulation sm:col-span-1 sm:min-w-[9rem] sm:flex-1",
                          expQuickSeasonSelected && "ring-2 ring-zinc-900 ring-offset-1 ring-offset-zinc-50"
                        )}
                        onClick={() =>
                          applyUnifiedExpenseFilters({
                            from: expenseSeasonQuickRange.from,
                            to: expenseSeasonQuickRange.to,
                          })
                        }
                      >
                        {expQuickSeasonSelected ? <Check className="mr-1.5 h-4 w-4" aria-hidden /> : null}
                        {t("branch.filterThisSeason")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            {!employeeSelfService ? (
              <>
                <section
                  id="branch-expense-list-dates"
                  className="scroll-mt-[5.5rem] rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4 sm:scroll-mt-0"
                >
                  <BranchSectionTitleWithInfo
                    title={t("branch.expensesListDatesSummaryTitle")}
                    body={t("branch.expensesListDatesSummaryLead")}
                    t={t}
                  />
                  {expListSummaryShowErr && expListSummaryErrFirst ? (
                    <p className="mt-2 text-sm text-red-600">
                      {toErrorMessage(expListSummaryErrFirst)}
                    </p>
                  ) : null}
                  {expListSummaryPending ? (
                    <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
                  ) : expData ? (
                    <>
                      <p className="mt-3 text-xs font-medium text-zinc-600">
                        {expListDetailRangeActive ? t("branch.incomePeriodForRangePrefix") : t("branch.expensesListDayForPrefix")}{" "}
                        <span className="tabular-nums">
                          {formatLocaleDate(expFrom, locale)} — {formatLocaleDate(expTo, locale)}
                        </span>
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-3">
                        <div className="rounded-lg border border-rose-200/90 bg-white p-2.5 shadow-sm lg:col-span-2 sm:p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                              {t("branch.expensesListFilteredTotal")}
                            </p>
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                              {t("branch.expensesListFilterScopeHint")}
                            </span>
                          </div>
                          <p className="mt-1 text-base font-semibold tabular-nums tracking-tight text-red-800 sm:text-lg">
                            {formatMoneyDash(
                              expenseListSourceTotals.total,
                              t("personnel.dash"),
                              locale,
                              "TRY"
                            )}
                          </p>
                          <p className="mt-1 text-xs leading-snug text-zinc-500">
                            {t("branch.expensesListBreakdownHint")}
                          </p>
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {[
                              {
                                key: "register",
                                label: t("branch.expensePayRegisterShort"),
                                amount: expenseListSourceTotals.register,
                                pct: expenseListSourceTotals.registerPct,
                                border: "border-rose-200/90",
                                bg: "bg-rose-50/50",
                                titleColor: "text-rose-800",
                                amountColor: "text-rose-900",
                                pctColor: "text-rose-700/80",
                              },
                              {
                                key: "patron",
                                label: t("branch.expensePayPatronShort"),
                                amount: expenseListSourceTotals.patron,
                                pct: expenseListSourceTotals.patronPct,
                                border: "border-amber-200/90",
                                bg: "bg-amber-50/50",
                                titleColor: "text-amber-800",
                                amountColor: "text-amber-900",
                                pctColor: "text-amber-700/80",
                              },
                              {
                                key: "held",
                                label: t("branch.expensePayPersonnelHeldRegisterCashShort"),
                                amount: expenseListSourceTotals.held,
                                pct: expenseListSourceTotals.heldPct,
                                border: "border-sky-200/90",
                                bg: "bg-sky-50/50",
                                titleColor: "text-sky-800",
                                amountColor: "text-sky-900",
                                pctColor: "text-sky-700/80",
                              },
                              ...(expenseListSourceTotals.showPocket
                                ? [
                                    {
                                      key: "pocket",
                                      label: t("branch.expensePayPersonnelPocketShort"),
                                      amount: expenseListSourceTotals.pocket,
                                      pct: expenseListSourceTotals.pocketPct,
                                      border: "border-zinc-200",
                                      bg: "bg-zinc-50/80",
                                      titleColor: "text-zinc-600",
                                      amountColor: "text-zinc-900",
                                      pctColor: "text-zinc-600",
                                    },
                                  ]
                                : []),
                            ].map((source) => (
                              <div
                                key={source.key}
                                className={`rounded-lg border ${source.border} ${source.bg} px-2.5 py-2`}
                              >
                                <p className={`text-[11px] font-semibold uppercase tracking-wide ${source.titleColor}`}>
                                  {source.label}
                                </p>
                                <p className={`mt-0.5 text-sm font-bold tabular-nums ${source.amountColor}`}>
                                  {formatMoneyDash(source.amount, t("personnel.dash"), locale, "TRY")}
                                </p>
                                <p className={`text-[11px] tabular-nums ${source.pctColor}`}>
                                  %{source.pct.toFixed(1)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-100/80 p-2.5 shadow-sm sm:p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                            {t("branch.expensesListPeriodRowCount")}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
                            {expData.totalCount}
                          </p>
                        </div>
                      </div>
                      {expenseCostBehaviorStrip({
                        fixed: expData.expenseFixedTotal ?? 0,
                        variable: expData.expenseVariableTotal ?? 0,
                        capex: expData.expenseCapexTotal ?? 0,
                        t,
                        locale,
                      })}
                    </>
                  ) : expListDatesRangeInvalid ? (
                    <p className="mt-3 text-xs text-amber-800">{t("branch.incomeListInvalidRange")}</p>
                  ) : expListDatesPartialInvalid ? (
                    <p className="mt-3 text-xs text-zinc-600">{t("branch.incomeListDatesIncomplete")}</p>
                  ) : null}
                </section>
              </>
            ) : null}

            {expenseOverviewDetail && tabIsActive ? (
              <ExpenseOverviewDetailModal
                detail={expenseOverviewDetail}
                onClose={() => setExpenseOverviewDetail(null)}
                t={t}
                locale={locale}
              />
            ) : null}

            <div
              id="branch-expense-lines"
              className="scroll-mt-[5.5rem] flex flex-col gap-4 sm:scroll-mt-0"
            >
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold text-zinc-900">{t("branch.expensesListSection")}</h3>
                    <p className="text-xs leading-relaxed text-zinc-600">
                      {t("branch.expensesListSection")} · {t("branch.expenseFilterDrawerHint")}
                    </p>
                  </div>

                  <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-zinc-700">
                        {t("branch.expenseFilterDrawerTitle")}
                      </p>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                        {expActiveFilterCount > 0
                          ? `${expActiveFilterCount} · ${t("branch.incomeFilterOpenButton")}`
                          : t("branch.txFilterAny")}
                      </span>
                    </div>
                    {expActiveFilterCount > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {hasExpDateFilters ? (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
                            {t("branch.filterDateFrom")}:{" "}
                            {showExpDateFrom ? formatLocaleDate(expFrom, locale) : t("personnel.dash")} ·{" "}
                            {t("branch.filterDateTo")}:{" "}
                            {showExpDateTo ? formatLocaleDate(expTo, locale) : t("personnel.dash")}
                          </span>
                        ) : null}
                        {hasExpCategoryFilter ? (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
                            {t("branch.txFilterCategory")}: {expCategoryLabel}
                          </span>
                        ) : null}
                        {hasExpPayFilter ? (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
                            {t("branch.txFilterExpensePayment")}: {expPayLabel}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="relative min-h-11 w-full touch-manipulation"
                        aria-label={`${t("branch.incomeFilterOpenButton")} (${expActiveFilterCount})`}
                        onClick={() => setExpenseFiltersOpen(true)}
                      >
                        {`${t("branch.incomeFilterOpenButton")} (${expActiveFilterCount})`}
                        {expFiltersActive ? (
                          <span
                            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white"
                            aria-hidden
                          />
                        ) : null}
                      </Button>
                    </div>
                  </div>
                </div>
                <RightDrawer
                  open={expenseFiltersOpen}
                  onClose={() => setExpenseFiltersOpen(false)}
                  title={t("branch.expenseFilterDrawerTitle")}
                  closeLabel={t("common.close")}
                  backdropCloseRequiresConfirm={false}
                  className="max-w-lg"
                >
                  <div className="space-y-4">
                    <p className="text-xs leading-relaxed text-zinc-600">
                      {t("branch.expenseFilterDrawerHint")}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DateField
                        label={t("branch.filterDateFrom")}
                        value={expFrom}
                        onChange={(e) => setExpFrom(e.target.value)}
                        className="min-w-0"
                      />
                      <DateField
                        label={t("branch.filterDateTo")}
                        value={expTo}
                        onChange={(e) => setExpTo(e.target.value)}
                        className="min-w-0"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        name="expFilterKind"
                        label={t("branch.txFilterExpenseKind")}
                        options={expKindFilterOpts}
                        value={expFilterKind}
                        menuZIndex={280}
                        onChange={(e) => setExpFilterKind(e.target.value)}
                        onBlur={() => {}}
                      />
                      <Select
                        name="expFilterPay"
                        label={t("branch.txFilterExpensePayment")}
                        options={expPayFilterOpts}
                        value={expFilterPay}
                        menuZIndex={280}
                        onChange={(e) => setExpFilterPay(e.target.value)}
                        onBlur={() => {}}
                      />
                      <Select
                        name="expFilterCategory"
                        label={t("branch.txFilterCategory")}
                        options={expCategoryOpts}
                        value={expFilterCategory}
                        menuZIndex={280}
                        onChange={(e) => onExpCategoryChange(e.target.value)}
                        onBlur={() => {}}
                      />
                      {showHeldRegisterInExpenseTab ? (
                        <Select
                          name="expFilterHeldPersonnel"
                          label={t("branch.expenseHeldPersonnelFilterLabel")}
                          options={expHeldPersonnelOpts}
                          value={expFilterHeldPersonnel}
                          menuZIndex={280}
                          onChange={(e) => setExpFilterHeldPersonnel(e.target.value)}
                          onBlur={() => {}}
                        />
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      className="min-h-11 w-full"
                      onClick={() => {
                        void refetchExp();
                        refetchExpenseSummaryBlocks();
                        setExpenseFiltersOpen(false);
                      }}
                    >
                      {t("branch.expenseFilterApplyAndClose")}
                    </Button>
                  </div>
                </RightDrawer>
              </div>
            {expErr && <p className="text-sm text-red-600">{toErrorMessage(expError)}</p>}
            {showHeldRegisterInExpenseTab && (heldSupplierPayments?.length ?? 0) > 0 ? (
              <section className="mb-3 rounded-2xl border border-sky-200/80 bg-sky-50/50 p-3 sm:p-4">
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-sky-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-sky-900">
                      {t("branch.expenseHeldSupplierPaymentsTitle")}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-sky-800/80">
                      {t("branch.expenseHeldSupplierPaymentsHint")}
                    </p>
                  </div>
                </div>

                {/* Blok içi filtre/sıralama */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {heldSupSupplierOptions.length > 1 ? (
                    <select
                      value={heldSupSupplier}
                      onChange={(e) => setHeldSupSupplier(e.target.value)}
                      className="min-h-9 rounded-lg border border-sky-200 bg-white px-2.5 text-xs text-zinc-800 outline-none focus:border-sky-500"
                    >
                      <option value="">{t("branch.expenseHeldSupplierAllSuppliers")}</option>
                      {heldSupSupplierOptions.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  ) : null}
                  <select
                    value={heldSupSort}
                    onChange={(e) => setHeldSupSort(e.target.value as "dateDesc" | "amountDesc")}
                    className="min-h-9 rounded-lg border border-sky-200 bg-white px-2.5 text-xs text-zinc-800 outline-none focus:border-sky-500"
                  >
                    <option value="dateDesc">{t("branch.expenseHeldSupplierSortDate")}</option>
                    <option value="amountDesc">{t("branch.expenseHeldSupplierSortAmount")}</option>
                  </select>
                  <span className="ml-auto text-xs font-semibold tabular-nums text-sky-900">
                    {t("branch.expenseHeldSupplierSubtotal")}: −
                    {formatLocaleAmount(
                      heldSupVisibleTotal,
                      locale,
                      heldSupVisible[0]?.currencyCode ?? "TRY",
                    )}
                  </span>
                </div>

                <ul className="mt-3 space-y-2">
                  {heldSupVisible.map((pay) => (
                    <li
                      key={pay.id}
                      className="rounded-xl border border-sky-200/70 bg-white px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {pay.supplierNames || t("branch.expenseHeldSupplierFallback")}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {formatLocaleDate(pay.paymentDate, locale)}
                            {pay.personnelName ? ` · ${pay.personnelName}` : ""}
                            {pay.invoiceDocumentNumbers ? ` · ${pay.invoiceDocumentNumbers}` : ""}
                          </p>
                          {pay.description ? (
                            <p className="mt-0.5 truncate text-xs text-zinc-500">{pay.description}</p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-rose-700">
                          −{formatLocaleAmount(pay.amount, locale, pay.currencyCode)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {expLoading ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : !visibleExpenseItems.length ? (
              <div
                role="status"
                className="rounded-2xl border border-dashed border-zinc-300/90 bg-gradient-to-b from-zinc-50 via-white to-zinc-50/80 px-4 py-10 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] sm:py-12"
              >
                <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600/90 ring-1 ring-red-200/80"
                    aria-hidden
                  >
                    <Wallet className="h-7 w-7 stroke-[1.5]" />
                  </span>
                  <p className="text-base font-semibold leading-snug text-zinc-900">{t("branch.noExpensesTitle")}</p>
                  <p className="text-sm leading-relaxed text-zinc-600">{t("branch.noExpensesHint")}</p>
                  {expActiveFilterCount > 0 ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-1 min-h-11 w-full max-w-xs touch-manipulation"
                      onClick={() => {
                        applyUnifiedExpenseFilters({ from: "", to: "", main: "", pay: "" });
                        void refetchExp();
                        refetchExpenseSummaryBlocks();
                      }}
                    >
                      {t("branch.noExpensesClearFilters")}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <ul className="space-y-2 sm:hidden">
                  {visibleExpenseItems.map((row) => {
                    const expenseLinkLine = branchTxLinkedExpenseLine(row, t);
                    const supplierLine = branchTxLinkedSupplierInvoiceLine(row, t);
                    const vehicleLinkLine = branchTxLinkedVehicleLine(row, t);
                    const contractorLinkLine = branchTxLinkedContractorLine(row, t);
                    const overheadLine = branchTxGeneralOverheadLine(row, t);
                    const pocketLine = expensePocketSubline(row, t);
                    const repayLine = expensePocketRepaySubline(row, t);
                    const pocketRepayMain = branchTxIsPocketRepayMain(row);
                    return (
                    <li
                      key={row.id}
                      data-tx-row={row.id}
                      role="button"
                      tabIndex={0}
                      aria-label={t("branch.txDetailViewAria")}
                      onClick={() => onOpenDetail(row)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOpenDetail(row);
                        }
                      }}
                      className={cn(
                        "cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm transition-colors hover:bg-zinc-50/80 active:bg-zinc-100/80",
                        highlightTxId === row.id &&
                          "border-sky-400 bg-sky-50/80 ring-2 ring-sky-400/70",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <BranchExpenseKindBadge row={row} t={t} />
                        <span className="shrink-0 font-mono text-sm font-semibold text-red-800">
                          {formatMoneyDash(row.amount, t("personnel.dash"), locale, row.currencyCode)}
                        </span>
                      </div>
                      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm leading-snug text-zinc-800">
                        <span className="font-medium">
                          {(() => {
                            const cat = txCategoryMainSub(row.mainCategory, t);
                            if (!cat.main && !cat.sub) return t("personnel.dash");
                            return (
                              <span className="flex flex-col leading-tight">
                                <span className={cat.sub ? "text-xs font-medium text-zinc-500" : "text-zinc-900"}>
                                  {cat.main}
                                </span>
                                {cat.sub ? <span className="text-zinc-900">{cat.sub}</span> : null}
                              </span>
                            );
                          })()}
                        </span>
                        <span className="text-[11px] font-normal text-zinc-500">
                          {formatLocaleDate(row.transactionDate, locale)}
                        </span>
                      </p>
                      {/* Tüm ödeme kaynakları (kasa, patron, personel cebi) tek-düzen badge gösterimi.
                          Eskiden patron için ayrı pill + diğerleri için düz metin vardı → görsel tutarsızlık. */}
                      {(() => {
                        const srcUpper = String(row.expensePaymentSource ?? "").trim().toUpperCase();
                        const isUnpaidInvoice = branchTxUnpaidInvoice(row);
                        const isNonPnl = branchTxNonPnl(row);
                        const showSourceBadge =
                          !pocketRepayMain && !isNonPnl && (isUnpaidInvoice || srcUpper.length > 0);
                        const sourceBadgeClass = isUnpaidInvoice
                          ? "border-rose-200 bg-rose-50 text-rose-800"
                          : srcUpper === "PATRON"
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : srcUpper === "PERSONNEL_POCKET" || srcUpper === "PERSONNEL_HELD_REGISTER_CASH"
                              ? "border-violet-200 bg-violet-50 text-violet-800"
                              : srcUpper === "REGISTER"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-zinc-200 bg-zinc-50 text-zinc-700";
                        const sourceBadgeLabel = isUnpaidInvoice
                          ? t("branch.invoiceUnpaidBadge")
                          : expensePaymentSourceLabelShort(row.expensePaymentSource, t);
                        return (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {showSourceBadge && sourceBadgeLabel ? (
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                  sourceBadgeClass
                                )}
                                title={t("branch.txColExpensePayment")}
                              >
                                {sourceBadgeLabel}
                              </span>
                            ) : null}
                            {row.isBundledWithDayClose ? (
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-800"
                                title="Bu gider gün sonu ile birlikte yazıldı; gün sonu silinirse bu da silinir."
                              >
                                <span aria-hidden="true">🔗</span> Gün sonu ile
                              </span>
                            ) : null}
                            {isNonPnl ? (
                              <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                                {t("branch.txNonPnlBadge")}
                              </span>
                            ) : null}
                          </div>
                        );
                      })()}
                      {expenseLinkLine ? (
                        <p className="mt-0.5 text-xs text-zinc-500">{expenseLinkLine}</p>
                      ) : null}
                      {supplierLine ? (
                        <p className="mt-0.5 text-xs text-zinc-500">{supplierLine}</p>
                      ) : null}
                      {vehicleLinkLine ? (
                        <p className="mt-0.5 text-xs text-zinc-500">{vehicleLinkLine}</p>
                      ) : null}
                      {contractorLinkLine ? (
                        <p className="mt-0.5 text-xs font-medium text-zinc-700">{contractorLinkLine}</p>
                      ) : null}
                      {overheadLine ? (
                        <p className="mt-0.5 text-xs text-amber-800/90">{overheadLine}</p>
                      ) : null}
                      {pocketLine ? (
                        <p className="mt-0.5 text-xs text-zinc-500">{pocketLine}</p>
                      ) : null}
                      {repayLine ? (
                        <p className="mt-0.5 text-xs text-zinc-500">{repayLine}</p>
                      ) : null}
                      {row.description ? (
                        <p className="mt-1 text-xs text-zinc-500">{row.description}</p>
                      ) : null}
                      <div className="mt-2 flex items-center gap-2 border-t border-zinc-100 pt-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          {t("branch.txColCreatedBy")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <CreatedByMeta
                            row={row}
                            locale={locale}
                            dash={t("personnel.dash")}
                          />
                        </div>
                        {canDeleteBranchTx ? (
                          <div
                            className="shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <BranchTxDeleteRow
                              transactionId={row.id}
                              pendingId={txDeletePendingId}
                              onSetPending={setTxDeletePendingId}
                              onConfirm={confirmDeleteBranchTx}
                              busy={deleteTxMut.isPending}
                              show
                              t={t}
                            />
                          </div>
                        ) : null}
                      </div>
                      {row.hasReceiptPhoto ? (
                        <p className="mt-2" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={branchTransactionReceiptPhotoUrl(row.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-blue-700 underline"
                          >
                            {t("branch.openReceiptPhoto")}
                          </a>
                        </p>
                      ) : null}
                      {canDeleteBranchTx && branchTxUnpaidInvoice(row) ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="mt-2 w-full min-h-[44px] text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInvoiceSettleRow(row);
                          }}
                        >
                          {t("branch.invoiceSettleSubmit")}
                        </Button>
                      ) : null}
                    </li>
                  );})}
                </ul>
                <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 sm:block">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>{t("branch.advColDate")}</TableHeader>
                        <TableHeader className="whitespace-nowrap">{t("branch.txColKind")}</TableHeader>
                        <TableHeader>{t("branch.txColAmount")}</TableHeader>
                        <TableHeader className="hidden sm:table-cell">{t("branch.txColMainCategory")}</TableHeader>
                        <TableHeader className="hidden lg:table-cell">{t("branch.txColExpensePayment")}</TableHeader>
                        <TableHeader className="hidden md:table-cell">{t("branch.txColNote")}</TableHeader>
                        <TableHeader className="whitespace-nowrap">{t("branch.txColCreatedBy")}</TableHeader>
                        <TableHeader className="w-[1%] whitespace-nowrap">{t("branch.txColReceipt")}</TableHeader>
                        {canDeleteBranchTx ? (
                          <TableHeader className="w-12 text-center text-xs font-medium text-zinc-500">
                            {t("branch.txColActions")}
                          </TableHeader>
                        ) : null}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleExpenseItems.map((row) => {
                        const expenseLinkLine = branchTxLinkedExpenseLine(row, t);
                        const supplierLine = branchTxLinkedSupplierInvoiceLine(row, t);
                        const vehicleLinkLine = branchTxLinkedVehicleLine(row, t);
                        const contractorLinkLine = branchTxLinkedContractorLine(row, t);
                        const overheadLine = branchTxGeneralOverheadLine(row, t);
                        const pocketLine = expensePocketSubline(row, t);
                        const repayLine = expensePocketRepaySubline(row, t);
                        const pocketRepayMain = branchTxIsPocketRepayMain(row);
                        return (
                        <TableRow
                          key={row.id}
                          data-tx-row={row.id}
                          onClick={() => onOpenDetail(row)}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-zinc-50",
                            highlightTxId === row.id &&
                              "bg-sky-50 ring-2 ring-inset ring-sky-400/70",
                          )}
                        >
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatLocaleDate(row.transactionDate, locale)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <BranchExpenseKindBadge row={row} t={t} />
                          </TableCell>
                          <TableCell className="font-mono text-sm text-red-800">
                            {formatMoneyDash(
                              row.amount,
                              t("personnel.dash"),
                              locale,
                              row.currencyCode
                            )}
                          </TableCell>
                          <TableCell className="max-sm:hidden sm:max-md:flex sm:max-md:w-full sm:max-md:min-w-0 sm:max-md:items-start sm:max-md:justify-between sm:max-md:gap-3 text-sm text-zinc-600 md:table-cell">
                            <div>
                              {(() => {
                            const cat = txCategoryMainSub(row.mainCategory, t);
                            if (!cat.main && !cat.sub) return t("personnel.dash");
                            return (
                              <span className="flex flex-col leading-tight">
                                <span className={cat.sub ? "text-xs font-medium text-zinc-500" : "text-zinc-900"}>
                                  {cat.main}
                                </span>
                                {cat.sub ? <span className="text-zinc-900">{cat.sub}</span> : null}
                              </span>
                            );
                          })()}
                            </div>
                            {row.isBundledWithDayClose ? (
                              <span
                                className="mt-1 inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-800"
                                title="Bu gider gün sonu ile birlikte yazıldı; gün sonu silinirse bu da silinir."
                              >
                                <span aria-hidden="true">🔗</span> Gün sonu ile
                              </span>
                            ) : null}
                            {branchTxNonPnl(row) ? (
                              <p className="mt-0.5 text-xs font-medium text-sky-800">
                                {t("branch.txNonPnlBadge")}
                              </p>
                            ) : null}
                            {expenseLinkLine ? (
                              <p className="mt-0.5 text-xs text-zinc-500">{expenseLinkLine}</p>
                            ) : null}
                            {supplierLine ? (
                              <p className="mt-0.5 text-xs text-zinc-500">{supplierLine}</p>
                            ) : null}
                            {vehicleLinkLine ? (
                              <p className="mt-0.5 text-xs text-zinc-500">{vehicleLinkLine}</p>
                            ) : null}
                            {contractorLinkLine ? (
                              <p className="mt-0.5 text-xs font-medium text-zinc-700">{contractorLinkLine}</p>
                            ) : null}
                            {overheadLine ? (
                              <p className="mt-0.5 text-xs text-amber-800/90">{overheadLine}</p>
                            ) : null}
                            {repayLine ? (
                              <p className="mt-0.5 text-xs text-zinc-500">{repayLine}</p>
                            ) : null}
                          </TableCell>
                          <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 text-xs text-zinc-600 md:hidden lg:table-cell">
                            <div>
                              {pocketRepayMain
                                ? repayLine || "—"
                                : branchTxNonPnl(row)
                                  ? t("branch.txNonPnlBadge")
                                  : branchTxUnpaidInvoice(row)
                                    ? t("branch.invoiceUnpaidBadge")
                                    : expensePaymentSourceLabelShort(row.expensePaymentSource, t) ||
                                      "—"}
                            </div>
                            {!branchTxNonPnl(row) && txFundedByPatron(row) ? (
                              <span className="mt-0.5 inline-block rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                                {t("branch.expensesOffRegisterPatronBadge")}
                              </span>
                            ) : null}
                            {pocketLine ? (
                              <p className="mt-0.5 text-xs text-zinc-500">{pocketLine}</p>
                            ) : null}
                          </TableCell>
                          <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 max-w-[14rem] truncate text-sm text-zinc-600 md:table-cell">
                            {row.description ?? "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <CreatedByMeta
                              row={row}
                              locale={locale}
                              dash={t("personnel.dash")}
                            />
                          </TableCell>
                          <TableCell
                            className="whitespace-nowrap text-xs"
                            onClick={(e) => {
                              if (row.hasReceiptPhoto) e.stopPropagation();
                            }}
                          >
                            {row.hasReceiptPhoto ? (
                              <a
                                href={branchTransactionReceiptPhotoUrl(row.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-blue-700 underline"
                              >
                                {t("branch.openReceiptPhoto")}
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          {canDeleteBranchTx ? (
                            <TableCell
                              className="align-top p-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {branchTxUnpaidInvoice(row) ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="mb-1.5 w-full min-h-[44px] min-w-[44px] px-2 text-xs"
                                  onClick={() => setInvoiceSettleRow(row)}
                                >
                                  {t("branch.invoiceSettleSubmit")}
                                </Button>
                              ) : null}
                              <BranchTxDeleteRow
                                transactionId={row.id}
                                pendingId={txDeletePendingId}
                                onSetPending={setTxDeletePendingId}
                                onConfirm={confirmDeleteBranchTx}
                                busy={deleteTxMut.isPending}
                                show
                                t={t}
                              />
                            </TableCell>
                          ) : null}
                        </TableRow>
                      );})}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  page={expPage}
                  pageSize={EXP_PAGE}
                  totalCount={expTotal}
                  onPageChange={setExpPage}
                />
              </>
            )}
            </div>
          </div>
  );
}
