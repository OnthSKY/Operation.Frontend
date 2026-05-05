"use client";

import { RightDrawer } from "@/shared/components/RightDrawer";
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
import { Wallet } from "lucide-react";
import { useMediaMinWidth } from "@/shared/lib/use-media-min-width";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
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
import { BranchRegisterTourismSeasonStrip } from "@/modules/branch/components/BranchRegisterTourismSeasonStrip";
import { branchTourismSeasonDeepLink } from "@/modules/branch/lib/branch-tourism-season-nav";
import { BranchMobileInsightJumpRail } from "@/modules/branch/components/BranchMobileInsightJumpRail";
import { CollapsibleInsightSection } from "@/modules/branch/components/CollapsibleInsightSection";
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
  } = props;

  const tourismSeasonHref = branchTourismSeasonDeepLink(branchIdForTourismLink, employeeSelfService);
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
  const visibleExpenseItems = useMemo(
    () =>
      (expData?.items ?? []).filter((row) => {
        const src = String(row.expensePaymentSource ?? "").trim().toUpperCase();
        return src !== "PERSONNEL_HELD_REGISTER_CASH";
      }),
    [expData?.items]
  );

  /** Mobilde gider özet kartları kapalı başlar; sm+ açık (gelir sekmesiyle aynı mantık). */
  const expenseInsightSmUp = useMediaMinWidth(640);
  const [expenseInsightLayoutReady, setExpenseInsightLayoutReady] = useState(false);
  useEffect(() => setExpenseInsightLayoutReady(true), []);
  const expenseCumulativeInsightOpen =
    expenseInsightLayoutReady && expenseInsightSmUp;
  const expenseCumulativeInsightKey = expenseInsightLayoutReady
    ? expenseInsightSmUp
      ? "wide"
      : "narrow"
    : "pending";

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
      items.push({ id: "branch-expense-summary", label: t("branch.mobileJumpExpenseSummary") });
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

            {!employeeSelfService ? (
              <>
                <section
                  id="branch-expense-summary"
                  className="scroll-mt-[5.5rem] rounded-xl border border-rose-100 bg-rose-50/50 p-3 sm:p-4 sm:scroll-mt-0"
                >
                  <BranchSectionTitleWithInfo
                    title={t("branch.expensesSummarySectionTitle")}
                    body={t("branch.expensesSummaryCardsLead")}
                    t={t}
                  />
                  {expSummaryShowErr && expSummaryErrFirst ? (
                    <p className="mt-2 text-sm text-red-600">{toErrorMessage(expSummaryErrFirst)}</p>
                  ) : null}
                  {expSummaryShowSkeleton ? (
                    <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
                  ) : expThroughToday && !expThroughToday.hideFinancialTotals ? (
                    (() => {
                      const seasonBreakdown = expThroughToday.expenseOverviewSeasonThroughAsOf;
                      const showSeasonColumn =
                        expThroughToday.hasActiveTourismSeasonForAsOf && seasonBreakdown != null;
                      return (
                        <div
                          className={
                            showSeasonColumn
                              ? "mt-3 grid gap-3 lg:grid-cols-2"
                              : "mt-3 flex flex-col gap-3"
                          }
                        >
                          <div className="flex min-w-0 flex-col gap-3">
                            <CollapsibleInsightSection
                              key={`exp-cum-lifetime-${expenseCumulativeInsightKey}`}
                              sectionClassName="rounded-xl border border-rose-200/70 bg-white/50 p-2 shadow-sm ring-1 ring-rose-950/[0.04] sm:p-3"
                              title={t("branch.expensesSummaryLifetimeBlockTitle")}
                              lead={
                                <>
                                  <p>{t("branch.expensesSummaryLifetimeBlockLead")}</p>
                                  <p className="mt-2 max-w-2xl rounded-md border border-zinc-200/80 bg-white/60 px-2 py-1.5 text-xs leading-snug text-zinc-600">
                                    {t("branch.expensesSummaryCardsOrthogonalNote")}
                                  </p>
                                </>
                              }
                              defaultOpen={expenseCumulativeInsightOpen}
                            >
                              {expenseTabPeriodOverviewBlock({
                                breakdown:
                                  expThroughToday.expenseOverviewLifetimeThroughAsOf ??
                                  EMPTY_EXPENSE_TAB_BREAKDOWN,
                                t,
                                locale,
                                onOpenCard: (card) =>
                                  setExpenseOverviewDetail({
                                    periodTitle: t("branch.expensesSummaryLifetimeBlockTitle"),
                                    breakdown:
                                      expThroughToday.expenseOverviewLifetimeThroughAsOf ??
                                      EMPTY_EXPENSE_TAB_BREAKDOWN,
                                    card,
                                  }),
                              })}
                            </CollapsibleInsightSection>
                            {!expThroughToday.hasActiveTourismSeasonForAsOf ? (
                              <BranchRegisterTourismSeasonStrip
                                t={t}
                                locale={locale}
                                summary={expThroughToday}
                                missingHintKey="branch.expensesSeasonMissingForToday"
                                tourismSeasonHref={tourismSeasonHref}
                              />
                            ) : null}
                          </div>
                          {showSeasonColumn ? (
                            <div className="flex min-w-0 flex-col gap-3">
                              <CollapsibleInsightSection
                                key={`exp-cum-season-${expenseCumulativeInsightKey}`}
                                sectionClassName="rounded-xl border border-rose-200/80 bg-white/50 p-2 shadow-sm ring-1 ring-rose-950/[0.06] sm:p-3"
                                title={t("branch.expensesSummarySeasonBlockTitle")}
                                lead={
                                  <>
                                    <p>{t("branch.expensesSummarySeasonBlockLead")}</p>
                                    <p className="mt-2 max-w-2xl rounded-md border border-zinc-200/80 bg-white/60 px-2 py-1.5 text-xs leading-snug text-zinc-600">
                                      {t("branch.expensesSummaryCardsOrthogonalNote")}
                                    </p>
                                  </>
                                }
                                defaultOpen={expenseCumulativeInsightOpen}
                              >
                                <BranchRegisterTourismSeasonStrip
                                  t={t}
                                  locale={locale}
                                  summary={expThroughToday}
                                  tourismSeasonHref={tourismSeasonHref}
                                  className="mb-2 sm:mb-3"
                                />
                                {expenseTabPeriodOverviewBlock({
                                  breakdown: seasonBreakdown,
                                  t,
                                  locale,
                                  onOpenCard: (card) =>
                                    setExpenseOverviewDetail({
                                      periodTitle: t("branch.expensesSummarySeasonBlockTitle"),
                                      breakdown: seasonBreakdown,
                                      card,
                                    }),
                                })}
                              </CollapsibleInsightSection>
                            </div>
                          ) : null}
                        </div>
                      );
                    })()
                  ) : null}
                </section>

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
                  ) : expListDetailRangeActive && expData ? (
                    <>
                      <p className="mt-3 text-xs font-medium text-zinc-600">
                        {t("branch.incomePeriodForRangePrefix")}{" "}
                        <span className="tabular-nums">
                          {formatLocaleDate(expFrom, locale)} — {formatLocaleDate(expTo, locale)}
                        </span>
                      </p>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                            {t("branch.expensesListFilteredTotal")}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-red-800 sm:text-base">
                            {formatMoneyDash(
                              expData.filteredAmountTotal ?? 0,
                              t("personnel.dash"),
                              locale,
                              "TRY"
                            )}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                            {t("branch.expensesListPeriodPatronTotal")}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-violet-950 sm:text-base">
                            {formatMoneyDash(
                              expData.patronExpenseTotal ?? 0,
                              t("personnel.dash"),
                              locale,
                              "TRY"
                            )}
                          </p>
                          <p className="mt-1 text-xs leading-snug text-zinc-500">
                            {t("branch.patronFlowExpenseHint")}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-100/80 p-2.5 shadow-sm sm:col-span-2 sm:p-3 lg:col-span-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                            {t("branch.expensesListPeriodRowCount")}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
                            {expData.totalCount}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : expListDetailSingleDay != null &&
                    expListDayRegister &&
                    !expListDayRegister.hideFinancialTotals ? (
                    <>
                      <p className="mt-3 text-xs font-medium text-zinc-600">
                        {t("branch.expensesListDayForPrefix")}{" "}
                        <span className="tabular-nums">
                          {formatLocaleDate(expListDetailSingleDay, locale)}
                        </span>
                      </p>
                      <p className="mt-2 max-w-2xl rounded-md border border-slate-200/90 bg-slate-100/50 px-2 py-1.5 text-xs leading-snug text-zinc-600">
                        {t("branch.expensesSummaryCardsOrthogonalNote")}
                      </p>
                      <div className="mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
                        {expenseTabPeriodOverviewBlock({
                          breakdown:
                            expListDayRegister.expenseOverviewOnAsOfDay ?? EMPTY_EXPENSE_TAB_BREAKDOWN,
                          t,
                          locale,
                          onOpenCard: (card) =>
                            setExpenseOverviewDetail({
                              periodTitle: `${t("branch.expensesListDayForPrefix")} ${formatLocaleDate(
                                expListDetailSingleDay,
                                locale
                              )}`,
                              breakdown:
                                expListDayRegister.expenseOverviewOnAsOfDay ?? EMPTY_EXPENSE_TAB_BREAKDOWN,
                              card,
                            }),
                        })}
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
                      const d =
                        expFrom.length === 10 && expFrom === expTo ? expFrom : localIsoDate();
                      setTxModalLaunch({ defaultType: "OUT", defaultTransactionDate: d });
                      setTxModalOpen(true);
                    }}
                  >
                    {t("branch.addExpenseTx")}
                  </Button>
                </div>
              </section>

              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold text-zinc-900">{t("branch.expensesListSection")}</h3>
                    <p className="text-xs leading-relaxed text-zinc-600">
                      {t("branch.expensesListSection")} · {t("branch.expenseFilterDrawerHint")}
                    </p>
                  </div>

                  <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm">
                    <p className="text-xs font-semibold text-zinc-700">{t("branch.expenseQuickFiltersLead")}</p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:contents">
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-11 w-full touch-manipulation sm:min-w-[9rem] sm:flex-1"
                          onClick={() => {
                            const d = localIsoDate();
                            applyUnifiedExpenseFilters({ from: d, to: d });
                          }}
                        >
                          {t("branch.filterToday")}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-11 w-full touch-manipulation sm:min-w-[9rem] sm:flex-1"
                          onClick={() =>
                            applyUnifiedExpenseFilters({ from: "", to: "", main: "", pay: "" })
                          }
                        >
                          {t("branch.filterAllDates")}
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-11 w-full touch-manipulation sm:ml-auto sm:w-auto sm:min-w-[8.5rem]"
                        onClick={() => {
                          void refetchExp();
                          refetchExpenseSummaryBlocks();
                        }}
                      >
                        {t("branch.filterApplyRefresh")}
                      </Button>
                    </div>
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
                    <li key={row.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-zinc-500">
                          {formatLocaleDate(row.transactionDate, locale)}
                        </span>
                        <span className="shrink-0 font-mono text-sm font-semibold text-red-800">
                          {formatMoneyDash(row.amount, t("personnel.dash"), locale, row.currencyCode)}
                        </span>
                      </div>
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
                      {pocketLine ? (
                        <p className="mt-0.5 text-xs text-zinc-500">{pocketLine}</p>
                      ) : null}
                      {repayLine ? (
                        <p className="mt-0.5 text-xs text-zinc-500">{repayLine}</p>
                      ) : null}
                      {row.description ? (
                        <p className="mt-1 text-xs text-zinc-500">{row.description}</p>
                      ) : null}
                      {row.hasReceiptPhoto ? (
                        <p className="mt-2">
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
                          onClick={() => setInvoiceSettleRow(row)}
                        >
                          {t("branch.invoiceSettleSubmit")}
                        </Button>
                      ) : null}
                      {canDeleteBranchTx ? (
                        <div className="mt-2 border-t border-zinc-100 pt-2">
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
                        <TableHeader>{t("branch.txColAmount")}</TableHeader>
                        <TableHeader className="hidden sm:table-cell">{t("branch.txColMainCategory")}</TableHeader>
                        <TableHeader className="hidden lg:table-cell">{t("branch.txColExpensePayment")}</TableHeader>
                        <TableHeader className="hidden md:table-cell">{t("branch.txColNote")}</TableHeader>
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
                        <TableRow key={row.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatLocaleDate(row.transactionDate, locale)}
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
                            {pocketLine ? (
                              <p className="mt-0.5 text-xs text-zinc-500">{pocketLine}</p>
                            ) : null}
                          </TableCell>
                          <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 max-w-[14rem] truncate text-sm text-zinc-600 md:table-cell">
                            {row.description ?? "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
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
                            <TableCell className="align-top p-2">
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
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-full"
                      disabled={expPage <= 1}
                      onClick={() => setExpPage((p) => Math.max(1, p - 1))}
                    >
                      {t("branch.pagingPrev")}
                    </Button>
                    <span className="col-span-2 flex min-h-11 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm tabular-nums text-zinc-700 sm:col-span-1 sm:min-h-0 sm:rounded-none sm:border-0 sm:bg-transparent">
                      {expPage} / {expPages}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-full"
                      disabled={expPage >= expPages}
                      onClick={() => setExpPage((p) => Math.min(expPages, p + 1))}
                    >
                      {t("branch.pagingNext")}
                    </Button>
                  </div>
                </div>
              </>
            )}
            </div>
          </div>
  );
}
