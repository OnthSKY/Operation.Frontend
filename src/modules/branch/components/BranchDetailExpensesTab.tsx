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
import type { Dispatch, SetStateAction } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import {
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

  return (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">{t("branch.expensesHint")}</p>

            {!employeeSelfService ? (
              <>
                <section className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {t("branch.expensesSummarySectionTitle")}
                  </h3>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600">
                    {t("branch.expensesSummaryCardsLead")}
                  </p>
                  {expSummaryShowErr && expSummaryErrFirst ? (
                    <p className="mt-2 text-sm text-red-600">{toErrorMessage(expSummaryErrFirst)}</p>
                  ) : null}
                  {expSummaryShowSkeleton ? (
                    <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
                  ) : expThroughToday && !expThroughToday.hideFinancialTotals ? (
                    <div className="mt-3 flex flex-col gap-6">
                      <CollapsibleInsightSection
                        sectionClassName="rounded-lg border border-rose-200/70 bg-white/50 p-2 shadow-sm sm:p-3"
                        title={t("branch.expensesSummaryLifetimeBlockTitle")}
                        lead={
                          <>
                            <p>{t("branch.expensesSummaryLifetimeBlockLead")}</p>
                            <p className="mt-2 max-w-2xl rounded-md border border-zinc-200/80 bg-white/60 px-2 py-1.5 text-[10px] leading-snug text-zinc-600">
                              {t("branch.expensesSummaryCardsOrthogonalNote")}
                            </p>
                          </>
                        }
                      >
                        {expenseTabPeriodOverviewBlock({
                          breakdown:
                            expThroughToday.expenseOverviewLifetimeThroughAsOf ?? EMPTY_EXPENSE_TAB_BREAKDOWN,
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
                      {(() => {
                        const seasonBreakdown = expThroughToday.expenseOverviewSeasonThroughAsOf;
                        if (!expThroughToday.hasActiveTourismSeasonForAsOf || seasonBreakdown == null) {
                          return null;
                        }
                        return (
                          <div className="border-t border-rose-200/80 pt-4">
                            <CollapsibleInsightSection
                              sectionClassName="rounded-lg border border-rose-200/70 bg-white/50 p-2 shadow-sm sm:p-3"
                              title={t("branch.expensesSummarySeasonBlockTitle")}
                              lead={
                                <>
                                  <p>{t("branch.expensesSummarySeasonBlockLead")}</p>
                                  <p className="mt-2 max-w-2xl rounded-md border border-zinc-200/80 bg-white/60 px-2 py-1.5 text-[10px] leading-snug text-zinc-600">
                                    {t("branch.expensesSummaryCardsOrthogonalNote")}
                                  </p>
                                </>
                              }
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
                        );
                      })()}
                    </div>
                  ) : null}
                </section>

                <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {t("branch.expensesListDatesSummaryTitle")}
                  </h3>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600">
                    {t("branch.expensesListDatesSummaryLead")}
                  </p>
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
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
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
                          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
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
                          <p className="mt-1 text-[10px] leading-snug text-zinc-500">
                            {t("branch.patronFlowExpenseHint")}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-100/80 p-2.5 shadow-sm sm:p-3">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
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
                      <p className="mt-2 max-w-2xl rounded-md border border-slate-200/90 bg-slate-100/50 px-2 py-1.5 text-[10px] leading-snug text-zinc-600">
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

            <div className="flex flex-col gap-4">
              <section
                className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"
                aria-label={t("branch.expensesActionsTitle")}
              >
                <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                  {t("branch.expensesActionsTitle")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="min-h-11"
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
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zinc-900">{t("branch.expensesListSection")}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="relative min-h-11"
                      onClick={() => setExpenseFiltersOpen(true)}
                    >
                      {t("branch.incomeFilterOpenButton")}
                      {expFiltersActive ? (
                        <span
                          className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white"
                          aria-hidden
                        />
                      ) : null}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11"
                      onClick={() => {
                        const d = localIsoDate();
                        setExpFrom(d);
                        setExpTo(d);
                        setExpPage(1);
                      }}
                    >
                      {t("branch.filterToday")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11"
                      onClick={() => {
                        setExpFrom("");
                        setExpTo("");
                        setExpFilterMain("");
                        setExpFilterPay("");
                        setExpPage(1);
                      }}
                    >
                      {t("branch.filterAllDates")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11"
                      onClick={() => {
                        void refetchExp();
                        refetchExpenseSummaryBlocks();
                      }}
                    >
                      {t("branch.filterApplyRefresh")}
                    </Button>
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
            </div>
            {expErr && <p className="text-sm text-red-600">{toErrorMessage(expError)}</p>}
            {expLoading ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : !expData?.items.length ? (
              <p className="text-sm text-zinc-600">{t("branch.noExpenses")}</p>
            ) : (
              <>
                <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white sm:hidden">
                  {expData.items.map((row) => {
                    const expenseLinkLine = branchTxLinkedExpenseLine(row, t);
                    const supplierLine = branchTxLinkedSupplierInvoiceLine(row, t);
                    const vehicleLinkLine = branchTxLinkedVehicleLine(row, t);
                    const overheadLine = branchTxGeneralOverheadLine(row, t);
                    const pocketLine = expensePocketSubline(row, t);
                    const repayLine = expensePocketRepaySubline(row, t);
                    const pocketRepayMain = branchTxIsPocketRepayMain(row);
                    return (
                    <li key={row.id} className="px-3 py-3">
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
                        <p className="mt-0.5 text-[11px] font-medium text-sky-800">
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
                          className="mt-2 w-full min-h-10 text-sm"
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
                      {expData.items.map((row) => {
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
                              <p className="mt-0.5 text-[11px] font-medium text-sky-800">
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
                              <p className="mt-0.5 text-[11px] text-zinc-500">{pocketLine}</p>
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
                                  className="mb-1.5 w-full min-h-9 px-2 text-xs"
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
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11"
                      disabled={expPage <= 1}
                      onClick={() => setExpPage((p) => Math.max(1, p - 1))}
                    >
                      {t("branch.pagingPrev")}
                    </Button>
                    <span className="flex items-center text-sm tabular-nums text-zinc-700">
                      {expPage} / {expPages}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11"
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
  );
}
