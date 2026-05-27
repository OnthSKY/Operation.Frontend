"use client";

import { RightDrawer } from "@/shared/components/RightDrawer";
import { CreatedByMeta } from "@/shared/components/CreatedByMeta";
import { BranchExpenseKindBadge } from "@/modules/branch/components/BranchExpenseKindBadge";
import type { Locale } from "@/i18n/messages";
import { branchTransactionReceiptPhotoUrl } from "@/modules/branch/api/branch-transactions-api";
import {
  branchTxGeneralOverheadLine,
  branchTxLinkedExpenseLine,
  branchTxLinkedSupplierInvoiceLine,
  branchTxLinkedVehicleLine,
  branchTxUnpaidInvoice,
  expensePaymentSourceLabelShort,
  txCategoryLine,
  txFundedByPatron,
} from "@/modules/branch/lib/branch-transaction-options";
import type { BranchRegisterSummary } from "@/types/branch";
import type { BranchTransaction } from "@/types/branch-transaction";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
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
import { Check, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { useMemo, type Dispatch, type SetStateAction } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import {
  BranchSectionTitleWithInfo,
  BranchTxDeleteRow,
  EMPTY_EXPENSE_TAB_BREAKDOWN,
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

export type BranchDetailExpensesTabProps = {
  t: (key: string) => string;
  locale: Locale;
  employeeSelfService: boolean;
  branchIdForTourismLink?: number | null;
  tabIsActive: boolean;
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
  expMainFilterOpts: { value: string; label: string }[];
  expPayFilterOpts: { value: string; label: string }[];
  expFilterMain: string;
  setExpFilterMain: (v: string) => void;
  expFilterPay: string;
  setExpFilterPay: (v: string) => void;
  refetchExp: () => unknown;
  refetchExpenseSummaryBlocks: () => void;
  canDeleteBranchTx: boolean;
  txDeletePendingId: number | null;
  setTxDeletePendingId: (id: number | null) => void;
  confirmDeleteBranchTx: (id: number) => void | Promise<void>;
  deleteTxMut: Pick<UseMutationResult<unknown, unknown, number, unknown>, "isPending">;
  setInvoiceSettleRow: (row: BranchTransaction | null) => void;
  expPage: number;
  expPages: number;
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
    expMainFilterOpts,
    expPayFilterOpts,
    expFilterMain,
    setExpFilterMain,
    expFilterPay,
    setExpFilterPay,
    refetchExp,
    refetchExpenseSummaryBlocks,
    canDeleteBranchTx,
    txDeletePendingId,
    setTxDeletePendingId,
    confirmDeleteBranchTx,
    deleteTxMut,
    setInvoiceSettleRow,
    expPage,
    expPages,
    expTotal,
    EXP_PAGE,
    onOpenDetail,
  } = props;

  const todayIso = localIsoDate();
  const expMainLabel =
    expMainFilterOpts.find((x) => x.value === expFilterMain)?.label ?? expFilterMain;
  const expPayLabel =
    expPayFilterOpts.find((x) => x.value === expFilterPay)?.label ?? expFilterPay;
  const showExpDateFrom = expFrom.length === 10 && expFrom !== todayIso;
  const showExpDateTo = expTo.length === 10 && expTo !== todayIso;
  const hasExpDateFilters = showExpDateFrom || showExpDateTo;
  const hasExpMainFilter = expFilterMain.trim().length > 0;
  const hasExpPayFilter = expFilterPay.trim().length > 0;
  const expActiveFilterCount =
    (hasExpDateFilters ? 1 : 0) +
    (hasExpMainFilter ? 1 : 0) +
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
    const held = showHeldRegisterInExpenseTab && heldKnown ? Math.max(0, heldRaw) : 0;
    const filteredFromApi = Number.isFinite(expenseListFilteredTotal)
      ? Math.max(0, expenseListFilteredTotal)
      : 0;
    let total = filteredFromApi;
    if (!showHeldRegisterInExpenseTab) {
      if (registerKnown || pocketKnown) {
        total = register + patron + pocket;
      } else {
        total = filteredFromApi;
      }
    }
    if (!registerKnown && !pocketKnown && !showHeldRegisterInExpenseTab) {
      register = Math.max(0, total - patron);
    } else if (!registerKnown && !showHeldRegisterInExpenseTab) {
      register = Math.max(0, total - patron - pocket);
    }
    const pct = (amount: number) => (total > 0 ? (amount / total) * 100 : 0);
    // Kasa ekseni ayrımı: REGISTER (+ görünürse HELD) çekmeceden çıkan nakit; PATRON ve
    // personel cebi kasa-dışıdır (patron faturası kasa toplamına sızmamalı).
    const cashOut = register + held;
    const offRegister = patron + pocket;
    return {
      total,
      patron,
      register,
      pocket,
      held,
      cashOut,
      offRegister,
      showHeld: showHeldRegisterInExpenseTab,
      patronPct: pct(patron),
      registerPct: pct(register),
      pocketPct: pct(pocket),
      heldPct: pct(held),
      cashOutPct: pct(cashOut),
      offRegisterPct: pct(offRegister),
    };
  }, [
    expData?.registerExpenseTotal,
    expData?.personnelPocketExpenseTotal,
    expData?.personnelHeldRegisterCashExpenseTotal,
    expenseListFilteredTotal,
    expenseListPatronTotal,
    showHeldRegisterInExpenseTab,
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
    expFrom === "" && expTo === "" && !hasExpMainFilter && !hasExpPayFilter;
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
                <Button
                  type="button"
                  className="min-h-11 w-full sm:w-auto"
                  onClick={() => {
                    const d = expFrom.length === 10 && expFrom === expTo ? expFrom : localIsoDate();
                    setTxModalLaunch({ defaultType: "OUT", defaultTransactionDate: d });
                    setTxModalOpen(true);
                  }}
                >
                  {t("branch.addExpenseTx")}
                </Button>
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
                            {showHeldRegisterInExpenseTab
                              ? t("branch.expensesListUnifiedBreakdownHint")
                              : t("branch.expensesListExcludesHeldRegisterHint")}
                          </p>
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div className="rounded-lg border border-rose-200/90 bg-rose-50/50 px-2.5 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-800">
                                {t("branch.expensesAxisCashOut")}
                              </p>
                              <p className="mt-0.5 text-sm font-bold tabular-nums text-rose-900">
                                {formatMoneyDash(expenseListSourceTotals.cashOut, t("personnel.dash"), locale, "TRY")}
                              </p>
                              <p className="text-[11px] tabular-nums text-rose-700/80">
                                %{expenseListSourceTotals.cashOutPct.toFixed(1)}
                              </p>
                            </div>
                            <div className="rounded-lg border border-amber-200/90 bg-amber-50/50 px-2.5 py-2">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                                {t("branch.expensesAxisOffRegister")}
                              </p>
                              <p className="mt-0.5 text-sm font-bold tabular-nums text-amber-900">
                                {formatMoneyDash(expenseListSourceTotals.offRegister, t("personnel.dash"), locale, "TRY")}
                              </p>
                              <p className="text-[11px] tabular-nums text-amber-700/80">
                                %{expenseListSourceTotals.offRegisterPct.toFixed(1)}
                              </p>
                            </div>
                          </div>
                          <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
                            {t("branch.expensesAxisSplitHint")}
                          </p>
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {[
                              {
                                key: "register",
                                label: t("branch.expensePayRegisterShort"),
                                amount: expenseListSourceTotals.register,
                                pct: expenseListSourceTotals.registerPct,
                              },
                              {
                                key: "patron",
                                label: t("branch.expensePayPatronShort"),
                                amount: expenseListSourceTotals.patron,
                                pct: expenseListSourceTotals.patronPct,
                              },
                              {
                                key: "pocket",
                                label: t("branch.expensePayPersonnelPocketShort"),
                                amount: expenseListSourceTotals.pocket,
                                pct: expenseListSourceTotals.pocketPct,
                              },
                              ...(expenseListSourceTotals.showHeld
                                ? [
                                    {
                                      key: "held",
                                      label: t("branch.expensePayPersonnelHeldRegisterCashShort"),
                                      amount: expenseListSourceTotals.held,
                                      pct: expenseListSourceTotals.heldPct,
                                    },
                                  ]
                                : []),
                            ].map((source) => (
                              <div
                                key={source.key}
                                className="rounded-md border border-zinc-200 bg-zinc-50/80 px-2 py-1.5"
                              >
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                                  {source.label}
                                </p>
                                <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">
                                  {formatMoneyDash(source.amount, t("personnel.dash"), locale, "TRY")}
                                </p>
                                <p className="text-[11px] tabular-nums text-zinc-600">
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
                        {hasExpMainFilter ? (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
                            {t("branch.txFilterMainCategory")}: {expMainLabel}
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
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Select
                        name="expFilterMain"
                        label={t("branch.txFilterMainCategory")}
                        options={expMainFilterOpts}
                        value={expFilterMain}
                        menuZIndex={280}
                        onChange={(e) => setExpFilterMain(e.target.value)}
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
                    const overheadLine = branchTxGeneralOverheadLine(row, t);
                    const pocketLine = expensePocketSubline(row, t);
                    const repayLine = expensePocketRepaySubline(row, t);
                    const pocketRepayMain = branchTxIsPocketRepayMain(row);
                    return (
                    <li
                      key={row.id}
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
                      className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm transition-colors hover:bg-zinc-50/80 active:bg-zinc-100/80"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <BranchExpenseKindBadge row={row} t={t} />
                        <span className="shrink-0 font-mono text-sm font-semibold text-red-800">
                          {formatMoneyDash(row.amount, t("personnel.dash"), locale, row.currencyCode)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatLocaleDate(row.transactionDate, locale)}
                      </p>
                      <p className="mt-1 text-sm text-zinc-800">
                        {txCategoryLine(row.mainCategory, row.category, t) || t("personnel.dash")}
                      </p>
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
                      {overheadLine ? (
                        <p className="mt-0.5 text-xs text-amber-800/90">{overheadLine}</p>
                      ) : null}
                      {!pocketRepayMain &&
                      !branchTxNonPnl(row) &&
                      (branchTxUnpaidInvoice(row)
                        ? true
                        : expensePaymentSourceLabelShort(row.expensePaymentSource, t)) ? (
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {t("branch.txColExpensePayment")}:{" "}
                          {branchTxUnpaidInvoice(row)
                            ? t("branch.invoiceUnpaidBadge")
                            : expensePaymentSourceLabelShort(row.expensePaymentSource, t)}
                        </p>
                      ) : null}
                      {!branchTxNonPnl(row) && txFundedByPatron(row) ? (
                        <span className="mt-0.5 inline-block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          {t("branch.expensesOffRegisterPatronBadge")}
                        </span>
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
                        <CreatedByMeta
                          row={row}
                          locale={locale}
                          dash={t("personnel.dash")}
                        />
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
                      {canDeleteBranchTx ? (
                        <div
                          className="mt-2 border-t border-zinc-100 pt-2"
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
                        const overheadLine = branchTxGeneralOverheadLine(row, t);
                        const pocketLine = expensePocketSubline(row, t);
                        const repayLine = expensePocketRepaySubline(row, t);
                        const pocketRepayMain = branchTxIsPocketRepayMain(row);
                        return (
                        <TableRow
                          key={row.id}
                          onClick={() => onOpenDetail(row)}
                          className="cursor-pointer transition-colors hover:bg-zinc-50"
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
                              {txCategoryLine(row.mainCategory, row.category, t) || t("personnel.dash")}
                            </div>
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
                <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-zinc-600">
                    {(expPage - 1) * EXP_PAGE + 1}–{Math.min(expPage * EXP_PAGE, expTotal)} · {t("branch.pagingTotal")}{" "}
                    {expTotal}
                  </p>
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex sm:flex-wrap sm:items-center">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 min-w-[44px] px-3"
                      disabled={expPage <= 1}
                      onClick={() => setExpPage((p) => Math.max(1, p - 1))}
                      aria-label={t("branch.pagingPrev")}
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                      <span className="sr-only">{t("branch.pagingPrev")}</span>
                    </Button>
                    <span className="flex min-h-11 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm tabular-nums text-zinc-700 sm:min-h-0 sm:rounded-none sm:border-0 sm:bg-transparent">
                      {expPage} / {expPages}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 min-w-[44px] px-3"
                      disabled={expPage >= expPages}
                      onClick={() => setExpPage((p) => Math.min(expPages, p + 1))}
                      aria-label={t("branch.pagingNext")}
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                      <span className="sr-only">{t("branch.pagingNext")}</span>
                    </Button>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>
  );
}
