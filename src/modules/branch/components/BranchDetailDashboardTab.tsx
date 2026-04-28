"use client";

import type { Locale } from "@/i18n/messages";
import {
  branchDashboardScopeActive,
  type BranchDashboardStockScope,
} from "@/modules/branch/api/branches-api";
import { branchTransactionReceiptPhotoUrl } from "@/modules/branch/api/branch-transactions-api";
import {
  branchTxLinkedExpenseLine,
  branchTxLinkedSupplierInvoiceLine,
  expensePaymentSourceLabel,
  txCategoryLine,
  txCodeLabel,
} from "@/modules/branch/lib/branch-transaction-options";
import type { BranchDashboard, BranchRegisterSummary } from "@/types/branch";
import type { BranchTransaction } from "@/types/branch-transaction";
import { formatLocaleAmount, formatMoneyDash } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import {
  WarehouseProductScopeFilters,
} from "@/modules/warehouse/components/WarehouseProductScopeFilters";
import { cn } from "@/lib/cn";
import { useMemo, type Dispatch, type SetStateAction } from "react";
import {
  DashCard,
  branchTxIsPocketRepayMain,
  branchTxNonPnl,
  expensePocketRepaySubline,
  expensePocketSubline,
  registerCashSettlementLabel,
} from "./BranchDetailTabs.shared";

export type BranchDetailDashboardTabProps = {
  t: (key: string) => string;
  locale: Locale;
  txDay: string;
  setTxDay: (v: string) => void;
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
  refetchTx: () => unknown;
  refetchRegSum: () => unknown;
  regSumError: boolean;
  regSumErr: unknown;
  regSumLoading: boolean;
  regSum: BranchRegisterSummary | null | undefined;
  txError: boolean;
  txErr: unknown;
  txLoading: boolean;
  transactions: BranchTransaction[];
  dashErr: boolean;
  dashError: unknown;
  dashLoading: boolean;
  dash: BranchDashboard | null | undefined;
  dashboardMonth: string;
  setDashboardMonth: (v: string) => void;
  dashboardStockScope: BranchDashboardStockScope;
  setDashboardStockScope: Dispatch<SetStateAction<BranchDashboardStockScope>>;
  refetchDash: () => unknown;
  /** Mobil ve dar ekranda satır satır stok listesi için şube «Stok» sekmesine geçer. */
  onOpenStockDetailTab?: () => void;
};

export function BranchDetailDashboardTab(props: BranchDetailDashboardTabProps) {
  const {
    t,
    locale,
    txDay,
    setTxDay,
    setTxModalLaunch,
    setTxModalOpen,
    refetchTx,
    refetchRegSum,
    regSumError,
    regSumErr,
    regSumLoading,
    regSum,
    txError,
    txErr,
    txLoading,
    transactions,
    dashErr,
    dashError,
    dashLoading,
    dash,
    dashboardMonth,
    setDashboardMonth,
    dashboardStockScope,
    setDashboardStockScope,
    refetchDash,
    onOpenStockDetailTab,
  } = props;

  const incomeDayRows = useMemo(
    () => transactions.filter((row) => row.type.toUpperCase() === "IN"),
    [transactions]
  );

  return (
          <div className="flex flex-col gap-6">
            <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex flex-col gap-3 border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">{t("branch.dashSectionDay")}</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">{t("branch.registerSummaryBlurb")}</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                  <div className="w-full min-w-0 sm:w-auto sm:min-w-[11rem]">
                    <DateField
                      label={t("branch.txDate")}
                      value={txDay}
                      onChange={(e) => setTxDay(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-2">
                    <Button
                      type="button"
                      className="min-h-12 w-full sm:w-auto"
                      onClick={() => {
                        setTxModalLaunch({ defaultTransactionDate: txDay });
                        setTxModalOpen(true);
                      }}
                    >
                      {t("branch.addTx")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-12 w-full sm:w-auto"
                      onClick={() => {
                        void refetchTx();
                        void refetchRegSum();
                      }}
                    >
                      {t("branch.refreshTx")}
                    </Button>
                  </div>
                </div>
              </div>

              {regSumError && (
                <p className="mt-3 text-sm text-red-600">{toErrorMessage(regSumErr)}</p>
              )}
              {regSumLoading ? (
                <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
              ) : regSum ? (
                <div className="mt-4 flex flex-col gap-6">
                  <div
                    className="rounded-xl border border-violet-200/80 bg-violet-50/50 p-3 sm:p-4"
                    role="note"
                    aria-label={t("branch.registerSummaryStoryTitle")}
                  >
                    <p className="text-sm font-semibold text-zinc-900">
                      {t("branch.registerSummaryStoryTitle")}
                    </p>
                    <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-zinc-700">
                      <li>{t("branch.registerSummaryStory1")}</li>
                      <li>{t("branch.registerSummaryStory2")}</li>
                      <li>{t("branch.registerSummaryStory3")}</li>
                    </ol>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {t("branch.dashDailySnapshotSection")}
                    </h4>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                      <DashCard
                        badge={t("branch.registerSummaryBadgePriority")}
                        label={t("branch.dashDailyProfitTitle")}
                        value={formatMoneyDash(
                          regSum.dayNetAccounting,
                          t("personnel.dash"),
                          locale,
                          "TRY"
                        )}
                        valueClass={
                          regSum.dayNetAccounting > 0.009
                            ? "text-emerald-800"
                            : regSum.dayNetAccounting < -0.009
                              ? "text-red-800"
                              : undefined
                        }
                        hint={t("branch.dashDailyProfitHint")}
                        compact
                        highlight
                      />
                      <div className="hidden md:block">
                        <DashCard
                          badge={t("branch.registerSummaryBadgeDayDebt")}
                          label={t("branch.dashTopExpenseTypeTitle")}
                          value={
                            (regSum.dayTopExpenseAmount ?? 0) > 0.009
                              ? formatMoneyDash(
                                  regSum.dayTopExpenseAmount ?? 0,
                                  t("personnel.dash"),
                                  locale,
                                  "TRY"
                                )
                              : "—"
                          }
                          hint={
                            (regSum.dayTopExpenseAmount ?? 0) > 0.009 ? (
                              <>
                                <span className="font-medium text-zinc-700">
                                  {txCodeLabel(regSum.dayTopExpenseMainCategory, t) ||
                                    t("branch.txCategoryUnknown")}
                                </span>
                                <span className="mt-0.5 block text-zinc-500">
                                  {t("branch.dashTopExpenseTypeHint")}
                                </span>
                              </>
                            ) : (
                              t("branch.dashTopExpenseNone")
                            )
                          }
                          compact
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {t("branch.registerTotalsSection")}
                    </h4>
                    <p className="mt-1 text-sm font-medium text-zinc-800">
                      {t("branch.registerTotalsSectionLead")}
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 xl:grid-cols-4">
                      <DashCard
                        badge={t("branch.registerSummaryBadgePriority")}
                        label={t("branch.registerTotalCashInDrawer")}
                        value={formatMoneyDash(regSum.cumulativeCashBalance, t("personnel.dash"), locale, "TRY")}
                        hint={t("branch.registerTotalCashInDrawerHint")}
                        compact
                        highlight
                      />
                      <DashCard
                        badge={t("branch.registerSummaryBadgePriority")}
                        label={t("branch.registerTotalPersonnelPocketNet")}
                        value={formatMoneyDash(
                          regSum.cumulativeNetRegisterOwesPersonnelPocket ?? 0,
                          t("personnel.dash"),
                          locale,
                          "TRY"
                        )}
                        valueClass={
                          (regSum.cumulativeNetRegisterOwesPersonnelPocket ?? 0) > 0
                            ? "text-amber-900"
                            : (regSum.cumulativeNetRegisterOwesPersonnelPocket ?? 0) < 0
                              ? "text-emerald-800"
                              : undefined
                        }
                        hint={t("branch.registerTotalPersonnelPocketNetHint")}
                        compact
                      />
                      <DashCard
                        badge={t("branch.registerSummaryBadgePriority")}
                        label={t("branch.registerTotalPatronNet")}
                        value={formatMoneyDash(
                          regSum.cumulativeNetRegisterOwesPatron ?? 0,
                          t("personnel.dash"),
                          locale,
                          "TRY"
                        )}
                        valueClass={
                          (regSum.cumulativeNetRegisterOwesPatron ?? 0) > 0
                            ? "text-amber-900"
                            : (regSum.cumulativeNetRegisterOwesPatron ?? 0) < 0
                              ? "text-emerald-800"
                              : undefined
                        }
                        hint={
                          <>
                            {t("branch.registerTotalPatronNetHint")}
                            {(regSum.cumulativeNetRegisterOwesPatron ?? 0) < 0 ? (
                              <span className="mt-1 block font-medium text-emerald-800">
                                {t("branch.registerPatronNetNegativeMeansBranchReceivable")}
                              </span>
                            ) : null}
                          </>
                        }
                        compact
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {t("branch.registerTodaySection")} · {regSum.asOfDate}
                    </h4>
                    <p className="mt-1 text-sm font-medium text-zinc-800">
                      {t("branch.registerTodaySectionLead")}
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                      <DashCard
                        label={t("branch.registerTodayIncome")}
                        value={formatMoneyDash(regSum.dayTotalIncome, t("personnel.dash"), locale, "TRY")}
                        valueClass="text-emerald-800"
                        compact
                      />
                      <div className="hidden md:block">
                        <DashCard
                          label={t("branch.registerTodayExpenseAccounting")}
                          value={formatMoneyDash(regSum.dayAccountingExpense, t("personnel.dash"), locale, "TRY")}
                          valueClass="text-red-800"
                          compact
                          hint={t("branch.registerTodayExpenseAccountingHint")}
                        />
                      </div>
                      <DashCard
                        badge={t("branch.registerSummaryBadgePriority")}
                        label={t("branch.registerTodayNet")}
                        value={formatMoneyDash(regSum.dayNetAccounting, t("personnel.dash"), locale, "TRY")}
                        hint={t("branch.registerTodayNetHint")}
                        compact
                        highlight
                      />
                      <div className="hidden md:block">
                        <DashCard
                          badge={t("branch.registerSummaryBadgeDayDebt")}
                          label={t("branch.registerTodayNetPersonnelPocket")}
                          value={formatMoneyDash(
                            regSum.dayNetRegisterOwesPersonnelPocket ?? 0,
                            t("personnel.dash"),
                            locale,
                            "TRY"
                          )}
                          valueClass={
                            (regSum.dayNetRegisterOwesPersonnelPocket ?? 0) > 0
                              ? "text-amber-900"
                              : (regSum.dayNetRegisterOwesPersonnelPocket ?? 0) < 0
                                ? "text-emerald-800"
                                : undefined
                          }
                          hint={t("branch.registerTodayNetPersonnelPocketHint")}
                          compact
                        />
                      </div>
                      <div className="hidden md:block">
                        <DashCard
                          badge={t("branch.registerSummaryBadgeDayDebt")}
                          label={t("branch.registerTodayNetPatron")}
                          value={formatMoneyDash(
                            regSum.dayNetRegisterOwesPatron ?? 0,
                            t("personnel.dash"),
                            locale,
                            "TRY"
                          )}
                          valueClass={
                            (regSum.dayNetRegisterOwesPatron ?? 0) > 0
                              ? "text-amber-900"
                              : (regSum.dayNetRegisterOwesPatron ?? 0) < 0
                                ? "text-emerald-800"
                                : undefined
                          }
                          hint={
                            <>
                              {t("branch.registerTodayNetPatronHint")}
                              {(regSum.dayNetRegisterOwesPatron ?? 0) < 0 ? (
                                <span className="mt-1 block font-medium text-emerald-800">
                                  {t("branch.registerPatronNetNegativeMeansBranchReceivable")}
                                </span>
                              ) : null}
                            </>
                          }
                          compact
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {txError && (
                <p className="mt-3 text-sm text-red-600">{toErrorMessage(txErr)}</p>
              )}
              {txLoading ? (
                <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
              ) : transactions.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-600">{t("branch.noTx")}</p>
              ) : (
                <div className="mt-3">
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 md:mb-2">
                    <span className="md:hidden">{t("branch.registerDayBookIncomeOnlyTitle")}</span>
                    <span className="hidden md:inline">{t("branch.registerDayBookTitle")}</span>
                  </h4>
                  <p className="mb-2 text-[11px] leading-snug text-zinc-500 md:hidden">
                    {t("branch.registerDayBookIncomeOnlyHint")}
                  </p>
                  {incomeDayRows.length === 0 && transactions.length > 0 ? (
                    <p className="mb-2 text-sm text-zinc-600 md:hidden">
                      {t("branch.dashMobileNoIncomeForDay")}
                    </p>
                  ) : null}
                  <div className="max-h-[min(50vh,16rem)] overflow-auto rounded-lg border border-zinc-200 md:max-h-[min(55vh,22rem)] lg:max-h-[min(60vh,26rem)]">
                    <Table>
                      <TableHead className="sticky top-0 z-[1] bg-zinc-50 shadow-[0_1px_0_0_theme(colors.zinc.200)]">
                        <TableRow>
                          <TableHeader>{t("branch.txColType")}</TableHeader>
                          <TableHeader>{t("branch.txColAmount")}</TableHeader>
                          <TableHeader className="hidden lg:table-cell">{t("branch.txColCashCard")}</TableHeader>
                          <TableHeader className="hidden lg:table-cell">{t("branch.txColCashSettlement")}</TableHeader>
                          <TableHeader className="hidden sm:table-cell">{t("branch.txColMainCategory")}</TableHeader>
                          <TableHeader className="hidden md:table-cell">{t("branch.txColCategory")}</TableHeader>
                          <TableHeader className="w-[1%] whitespace-nowrap">{t("branch.txColReceipt")}</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {transactions.map((row) => {
                          const expenseLinkLine = branchTxLinkedExpenseLine(row, t);
                          const supplierLine = branchTxLinkedSupplierInvoiceLine(row, t);
                          const pocketLine = expensePocketSubline(row, t);
                          const repayLine = expensePocketRepaySubline(row, t);
                          const pocketRepayMain = branchTxIsPocketRepayMain(row);
                          const isOut = row.type.toUpperCase() === "OUT";
                          return (
                            <TableRow
                              key={row.id}
                              className={cn(isOut && "max-md:hidden")}
                            >
                              <TableCell dataLabel={t("branch.txColType")} className="text-sm">
                                {row.type.toUpperCase() === "IN"
                                  ? t("branch.txTypeIn")
                                  : t("branch.txTypeOut")}
                              </TableCell>
                              <TableCell dataLabel={t("branch.txColAmount")} className="font-mono text-sm">
                                {formatMoneyDash(
                                  row.amount,
                                  t("personnel.dash"),
                                  locale,
                                  row.currencyCode
                                )}
                              </TableCell>
                              <TableCell
                                dataLabel={t("branch.txColCashCard")}
                                className="font-mono text-xs text-zinc-600 md:hidden lg:table-cell"
                              >
                                {row.cashAmount != null && row.cardAmount != null
                                  ? `${formatMoneyDash(row.cashAmount, t("personnel.dash"), locale, row.currencyCode)} / ${formatMoneyDash(row.cardAmount, t("personnel.dash"), locale, row.currencyCode)}`
                                  : "—"}
                              </TableCell>
                              <TableCell
                                dataLabel={t("branch.txColCashSettlement")}
                                className="text-xs text-zinc-600 md:hidden lg:table-cell"
                              >
                                {registerCashSettlementLabel(row, t) || "—"}
                              </TableCell>
                              <TableCell
                                dataLabel={t("branch.txColMainCategory")}
                                className="text-sm text-zinc-600"
                              >
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
                                {isOut &&
                                !pocketRepayMain &&
                                !branchTxNonPnl(row) &&
                                expensePaymentSourceLabel(row.expensePaymentSource, t) ? (
                                  <p className="mt-0.5 text-xs text-zinc-600">
                                    {t("branch.txColExpensePayment")}:{" "}
                                    {expensePaymentSourceLabel(row.expensePaymentSource, t)}
                                  </p>
                                ) : null}
                                {pocketLine ? (
                                  <p className="mt-0.5 text-xs text-zinc-500">{pocketLine}</p>
                                ) : null}
                                {repayLine ? (
                                  <p className="mt-0.5 text-xs text-zinc-500">{repayLine}</p>
                                ) : null}
                              </TableCell>
                              <TableCell
                                dataLabel={t("branch.txColCategory")}
                                className="text-sm text-zinc-600 md:table-cell"
                              >
                                {row.category
                                  ? txCodeLabel(row.category, t) || t("personnel.dash")
                                  : "—"}
                              </TableCell>
                              <TableCell dataLabel={t("branch.txColReceipt")} className="whitespace-nowrap text-xs">
                                {isOut && row.hasReceiptPhoto ? (
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
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-zinc-900">{t("branch.dashSectionLive")}</h3>
              <p className="mt-0.5 text-xs text-zinc-500">{t("branch.dashSectionLiveHint")}</p>
              {dashErr && (
                <p className="mt-2 text-sm text-red-600">{toErrorMessage(dashError)}</p>
              )}
              {dashLoading ? (
                <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
              ) : dash ? (
                <>
                  <div className="mt-3 flex flex-col gap-3 md:hidden">
                    <DashCard
                      label={t("branch.dashTodayIncome")}
                      value={formatMoneyDash(dash.todayIncomeTotal, t("personnel.dash"), locale, "TRY")}
                      valueClass="text-emerald-800"
                    />
                    <DashCard
                      label={t("branch.dashAllIncome")}
                      value={formatMoneyDash(dash.allTimeIncomeTotal, t("personnel.dash"), locale, "TRY")}
                      valueClass="text-emerald-800"
                    />
                  </div>
                  <div className="mt-3 hidden md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3">
                    <DashCard label={t("branch.dashPersonnel")} value={String(dash.personnelCount)} />
                    <DashCard
                      label={t("branch.dashAllIncome")}
                      value={formatMoneyDash(dash.allTimeIncomeTotal, t("personnel.dash"), locale, "TRY")}
                      valueClass="text-emerald-800"
                    />
                    <DashCard
                      label={t("branch.dashAllExpense")}
                      value={formatMoneyDash(dash.allTimeExpenseTotal, t("personnel.dash"), locale, "TRY")}
                      valueClass="text-red-800"
                    />
                    <DashCard
                      label={t("branch.dashCashRegister")}
                      value={formatMoneyDash(dash.cashRegisterBalance, t("personnel.dash"), locale, "TRY")}
                    />
                    <DashCard
                      label={t("branch.dashTodayIncome")}
                      value={formatMoneyDash(dash.todayIncomeTotal, t("personnel.dash"), locale, "TRY")}
                      valueClass="text-emerald-800"
                    />
                    <DashCard
                      label={t("branch.dashTodayExpense")}
                      value={formatMoneyDash(dash.todayExpenseTotal, t("personnel.dash"), locale, "TRY")}
                      valueClass="text-red-800"
                    />
                  </div>
                </>
              ) : null}
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {t("branch.dashStockInboundSection")}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {t("branch.dashStockInboundSectionHint")}
                  </p>
                </div>
                {onOpenStockDetailTab ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-11 w-full shrink-0 sm:min-h-[44px] sm:w-auto md:hidden"
                    onClick={onOpenStockDetailTab}
                  >
                    {t("branch.dashStockOpenDetailTab")}
                  </Button>
                ) : null}
              </div>
              <div className="mt-3">
                <WarehouseProductScopeFilters
                  value={dashboardStockScope}
                  onChange={setDashboardStockScope}
                />
              </div>
              {dashLoading ? (
                <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
              ) : dash && !dashErr ? (
                branchDashboardScopeActive(dashboardStockScope) ? (
                  <div className="mt-3">
                    <DashCard
                      label={t("branch.dashStockInboundTotal")}
                      value={formatLocaleAmount(
                        dash.stockInboundScopeTotal ?? 0,
                        locale
                      )}
                      hint={t("branch.dashStockInboundTotalHint")}
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">
                    {t("branch.dashStockInboundPickScope")}
                  </p>
                )
              ) : null}
            </section>

            <section className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">{t("branch.dashSectionMonth")}</h3>
                  <p className="mt-0.5 text-xs text-zinc-600">{t("branch.dashSectionMonthHint")}</p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <Input
                    type="month"
                    label={t("branch.dashMonthPicker")}
                    value={dashboardMonth}
                    onChange={(e) => setDashboardMonth(e.target.value)}
                    className="w-auto min-w-[10rem]"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-12"
                    onClick={() => void refetchDash()}
                  >
                    {t("branch.refreshTx")}
                  </Button>
                </div>
              </div>
              {dashLoading ? (
                <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
              ) : dash && !dashErr ? (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DashCard
                    label={t("branch.dashMonthIncome")}
                    value={formatMoneyDash(dash.monthIncomeTotal, t("personnel.dash"), locale, "TRY")}
                    valueClass="text-emerald-800"
                  />
                  <div className="hidden md:block">
                    <DashCard
                      label={t("branch.dashMonthExpense")}
                      value={formatMoneyDash(dash.monthExpenseTotal, t("personnel.dash"), locale, "TRY")}
                      valueClass="text-red-800"
                    />
                  </div>
                </div>
              ) : null}
            </section>
          </div>
  );
}
