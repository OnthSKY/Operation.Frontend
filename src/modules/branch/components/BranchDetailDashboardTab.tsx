"use client";

import type { Locale } from "@/i18n/messages";
import { branchTransactionReceiptPhotoUrl } from "@/modules/branch/api/branch-transactions-api";
import {
  branchTxLinkedExpenseLine,
  branchTxLinkedSupplierInvoiceLine,
  expensePaymentSourceLabel,
  txCategoryLine,
  txCodeLabel,
} from "@/modules/branch/lib/branch-transaction-options";
import type {
  BranchDashboard,
  BranchRegisterSummary,
  IncomeCashBranchManagerPersonRow,
} from "@/types/branch";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Personnel } from "@/types/personnel";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { toErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { MonthField } from "@/shared/ui/MonthField";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { cn } from "@/lib/cn";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  DashCard,
  branchTxIsPocketRepayMain,
  branchTxNonPnl,
  expensePocketRepaySubline,
  expensePocketSubline,
  registerCashSettlementLabel,
} from "./BranchDetailTabs.shared";
import { BranchDashboardConsumptionCta } from "./BranchDashboardConsumptionCta";

/** Özet tabı alt sekmeleri: gün / kasa durumu / genel bakış / ay. */
type DashboardSubTabId = "day" | "cash" | "overview" | "month";

export type BranchDetailDashboardTabProps = {
  t: (key: string) => string;
  locale: Locale;
  branchId: number;
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
  refetchDash: () => unknown;
  staff: Personnel[];
  heldRegisterCashByPerson: IncomeCashBranchManagerPersonRow[];
};

export function BranchDetailDashboardTab(props: BranchDetailDashboardTabProps) {
  const {
    t,
    locale,
    branchId,
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
    refetchDash,
    staff,
    heldRegisterCashByPerson,
  } = props;

  const incomeDayRows = useMemo(
    () => transactions.filter((row) => row.type.toUpperCase() === "IN"),
    [transactions]
  );
  const outDayRows = useMemo(
    () => transactions.filter((row) => row.type.toUpperCase() === "OUT"),
    [transactions]
  );
  const insuredPersonnelCount = useMemo(
    () => staff.filter((p) => p.insuranceStarted).length,
    [staff]
  );
  const heldRegisterCashTotal = useMemo(
    () => heldRegisterCashByPerson.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [heldRegisterCashByPerson]
  );
  const heldRegisterCashTopHolder = useMemo(() => {
    if (!heldRegisterCashByPerson.length) return null;
    const sorted = [...heldRegisterCashByPerson].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));
    return sorted[0] ?? null;
  }, [heldRegisterCashByPerson]);

  const [subTab, setSubTab] = useState<DashboardSubTabId>("day");
  const subTabs: { id: DashboardSubTabId; label: string; lead: string }[] = [
    { id: "day", label: t("branch.dashSubTabDay"), lead: t("branch.dashSubLeadDay") },
    { id: "cash", label: t("branch.dashSubTabCash"), lead: t("branch.dashSubLeadCash") },
    { id: "overview", label: t("branch.dashSubTabOverview"), lead: t("branch.dashSubLeadOverview") },
    { id: "month", label: t("branch.dashSubTabMonth"), lead: t("branch.dashSubLeadMonth") },
  ];
  const activeLead = subTabs.find((x) => x.id === subTab)?.lead ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-orientation="horizontal"
        aria-label={t("branch.dashSubTabsAria")}
        className="-mx-1 flex w-auto min-w-0 gap-1 overflow-x-auto px-1 pb-1"
      >
        {subTabs.map((s) => (
          <DashSubTabButton
            key={s.id}
            active={subTab === s.id}
            label={s.label}
            onClick={() => setSubTab(s.id)}
          />
        ))}
      </div>
      {activeLead ? (
        <p className="text-xs leading-relaxed text-zinc-500 sm:text-sm">{activeLead}</p>
      ) : null}

      {/* ── GÜN: seçili günün kasası + gün defteri ─────────────────────────── */}
      {subTab === "day" ? (
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
                  className="!min-h-11 !w-full px-3 text-sm sm:!w-auto sm:px-4"
                  onClick={() => {
                    setTxModalLaunch({ defaultTransactionDate: txDay });
                    setTxModalOpen(true);
                  }}
                >
                  {t("branch.addTx")}
                </Button>
                <BranchDashboardConsumptionCta
                  branchId={branchId}
                  className="!min-h-11 !w-full sm:!w-auto"
                />
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
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("branch.dashExpenseSourceBreakdownTitle")}
                </h4>
                <p className="mt-1 text-xs text-zinc-600">{t("branch.dashExpenseSourceBreakdownHint")}</p>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <DashCard
                    label={t("branch.expensePayPatronShort")}
                    value={formatMoneyDash(
                      regSum.expenseOverviewOnAsOfDay?.outPaidFromPatron ?? 0,
                      t("personnel.dash"),
                      locale,
                      "TRY"
                    )}
                    valueClass="text-violet-900"
                    compact
                  />
                  <DashCard
                    label={t("branch.expensePayRegisterShort")}
                    value={formatMoneyDash(
                      regSum.expenseOverviewOnAsOfDay?.outPaidFromRegister ?? 0,
                      t("personnel.dash"),
                      locale,
                      "TRY"
                    )}
                    compact
                  />
                  <DashCard
                    label={t("branch.expensePayPersonnelPocketShort")}
                    value={formatMoneyDash(
                      regSum.expenseOverviewOnAsOfDay?.outPaidFromPersonnelPocket ?? 0,
                      t("personnel.dash"),
                      locale,
                      "TRY"
                    )}
                    valueClass="text-amber-900"
                    compact
                  />
                  <DashCard
                    label={t("branch.dashSelectedDayExpenseTotal")}
                    value={formatMoneyDash(
                      regSum.dayTotalOutExpense ?? regSum.dayAccountingExpense,
                      t("personnel.dash"),
                      locale,
                      "TRY"
                    )}
                    valueClass="text-red-800"
                    compact
                  />
                </div>
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
                <div className="mt-2 grid grid-cols-2 gap-2 md:hidden">
                  <DashCard
                    label={t("branch.dashSelectedDayInCount")}
                    value={String(incomeDayRows.length)}
                    compact
                  />
                  <DashCard
                    label={t("branch.dashSelectedDayOutCount")}
                    value={String(outDayRows.length)}
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
      ) : null}

      {/* ── KASA DURUMU: kümülatif toplamlar + zimmet + anlatı ──────────────── */}
      {subTab === "cash" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
          {regSumError && (
            <p className="text-sm text-red-600">{toErrorMessage(regSumErr)}</p>
          )}
          {regSumLoading ? (
            <p className="text-sm text-zinc-500">{t("common.loading")}</p>
          ) : regSum ? (
            <div className="flex flex-col gap-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("branch.registerTotalsSection")}
                </h4>
                <p className="mt-1 text-sm font-medium text-zinc-800">
                  {t("branch.registerTotalsSectionLead")}
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
                  {t("branch.dashHeldRegisterCashTitle")}
                </h4>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                  <DashCard
                    label={t("branch.dashHeldRegisterCashTotal")}
                    value={formatMoneyDash(heldRegisterCashTotal, t("personnel.dash"), locale, "TRY")}
                    hint={t("branch.dashHeldRegisterCashTotalHint")}
                    compact
                  />
                  <DashCard
                    label={t("branch.dashHeldRegisterCashTopHolder")}
                    value={
                      heldRegisterCashTopHolder
                        ? `${heldRegisterCashTopHolder.fullName} · ${formatMoneyDash(
                            heldRegisterCashTopHolder.amount,
                            t("personnel.dash"),
                            locale,
                            "TRY"
                          )}`
                        : t("personnel.dash")
                    }
                    compact
                  />
                  <DashCard
                    label={t("branch.dashEntryDayCount")}
                    value={`${new Set(transactions.map((x) => x.transactionDate)).size}`}
                    hint={t("branch.dashEntryDayCountHint")}
                    compact
                  />
                </div>
              </div>

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
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── GENEL BAKIŞ: tüm zaman + bugün özet (tekilleştirilmiş) ──────────── */}
      {subTab === "overview" ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
          <h3 className="text-sm font-semibold text-zinc-900">{t("branch.dashSectionLive")}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{t("branch.dashSectionLiveHint")}</p>
          {dashErr && (
            <p className="mt-2 text-sm text-red-600">{toErrorMessage(dashError)}</p>
          )}
          {dashLoading ? (
            <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
          ) : dash ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
              <DashCard
                label={t("branch.dashTodayIncome")}
                value={formatMoneyDash(dash.todayIncomeTotal, t("personnel.dash"), locale, "TRY")}
                valueClass="text-emerald-800"
                compact
              />
              <DashCard
                label={t("branch.dashTodayExpense")}
                value={formatMoneyDash(dash.todayExpenseTotal, t("personnel.dash"), locale, "TRY")}
                valueClass="text-red-800"
                compact
              />
              <DashCard
                label={t("branch.dashCashRegister")}
                value={formatMoneyDash(dash.cashRegisterBalance, t("personnel.dash"), locale, "TRY")}
                compact
              />
              <DashCard
                label={t("branch.dashAllIncome")}
                value={formatMoneyDash(dash.allTimeIncomeTotal, t("personnel.dash"), locale, "TRY")}
                valueClass="text-emerald-800"
                compact
              />
              <DashCard
                label={t("branch.dashAllExpense")}
                value={formatMoneyDash(dash.allTimeExpenseTotal, t("personnel.dash"), locale, "TRY")}
                valueClass="text-red-800"
                compact
              />
              <DashCard label={t("branch.dashPersonnel")} value={String(staff.length)} compact />
              <DashCard
                label={t("branch.dashInsuredPersonnel")}
                value={String(insuredPersonnelCount)}
                hint={t("branch.dashInsuredPersonnelHint")}
                compact
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── AY: rapor ayına göre gelir/gider ───────────────────────────────── */}
      {subTab === "month" ? (
        <section className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">{t("branch.dashSectionMonth")}</h3>
              <p className="mt-0.5 text-xs text-zinc-600">{t("branch.dashSectionMonthHint")}</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <MonthField
                label={t("branch.dashMonthPicker")}
                value={dashboardMonth}
                onChange={(e) => setDashboardMonth(e.target.value)}
                className="w-auto min-w-[12rem]"
              />
            </div>
          </div>
          {dashLoading ? (
            <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
          ) : dash && !dashErr ? (
            (() => {
              const monthOther = Math.max(
                0,
                dash.monthExpenseTotal -
                  dash.monthExpenseFixedTotal -
                  dash.monthExpenseVariableTotal -
                  dash.monthExpenseCapexTotal
              );
              return (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                    <DashCard
                      label={t("branch.dashMonthIncome")}
                      value={formatMoneyDash(dash.monthIncomeTotal, t("personnel.dash"), locale, "TRY")}
                      valueClass="text-emerald-800"
                      compact
                    />
                    <DashCard
                      label={t("branch.dashMonthExpense")}
                      value={formatMoneyDash(dash.monthExpenseTotal, t("personnel.dash"), locale, "TRY")}
                      valueClass="text-red-800"
                      compact
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-zinc-700">
                      {t("branch.dashMonthExpenseBreakdownTitle")}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {t("branch.dashMonthExpenseBreakdownHint")}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                      <DashCard
                        badge={t("branch.dashMonthExpenseFamilyOps")}
                        label={t("branch.dashMonthExpenseFixed")}
                        value={formatMoneyDash(dash.monthExpenseFixedTotal, t("personnel.dash"), locale, "TRY")}
                        valueClass="text-red-700"
                        compact
                      />
                      <DashCard
                        badge={t("branch.dashMonthExpenseFamilyOps")}
                        label={t("branch.dashMonthExpenseVariable")}
                        value={formatMoneyDash(dash.monthExpenseVariableTotal, t("personnel.dash"), locale, "TRY")}
                        valueClass="text-orange-700"
                        compact
                      />
                      <DashCard
                        badge={t("branch.dashMonthExpenseFamilyCapex")}
                        label={t("branch.dashMonthExpenseCapex")}
                        value={formatMoneyDash(dash.monthExpenseCapexTotal, t("personnel.dash"), locale, "TRY")}
                        valueClass="text-violet-800"
                        compact
                      />
                      <DashCard
                        label={t("branch.dashMonthExpenseOther")}
                        value={formatMoneyDash(monthOther, t("personnel.dash"), locale, "TRY")}
                        valueClass="text-zinc-600"
                        hint={monthOther > 0.009 ? t("branch.dashMonthExpenseOtherHint") : undefined}
                        compact
                      />
                    </div>
                  </div>
                </>
              );
            })()
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function DashSubTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "min-h-[40px] shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all sm:text-sm",
        active
          ? "bg-zinc-900 text-white shadow-sm"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
