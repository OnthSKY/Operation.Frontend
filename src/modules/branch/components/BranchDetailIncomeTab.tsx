"use client";

import { FilterDrawer } from "@/components/mobile/FilterDrawer";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileList } from "@/components/mobile/MobileList";
import type { Locale } from "@/i18n/messages";
import {
  txCategoryLine,
} from "@/modules/branch/lib/branch-transaction-options";
import type {
  BranchIncomePeriodSummary,
  BranchRegisterSummary,
} from "@/types/branch";
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
import { BranchRegisterTourismSeasonStrip } from "@/modules/branch/components/BranchRegisterTourismSeasonStrip";
import { branchTourismSeasonDeepLink } from "@/modules/branch/lib/branch-tourism-season-nav";
import { CollapsibleInsightSection } from "@/modules/branch/components/CollapsibleInsightSection";
import { useMemo, type Dispatch, type SetStateAction } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import {
  BranchTxIncomeDeleteRow,
  incomeCashTotalAndParties,
  listSummaryPatronCardLine,
  listSummaryPatronCashLine,
  listSummaryPatronTotalLine,
  listSummaryPatronUnspecifiedNote,
  listSummaryPosPatronHint,
  partiesDayFromRegisterSummary,
  partiesFromPeriodSummary,
  partiesFromRegisterSummary,
  partiesSeasonFromRegisterSummary,
  registerCashSettlementLabel,
  type PatronIncomePin,
} from "./BranchDetailTabs.shared";

export type BranchDetailIncomeTabProps = {
  t: (key: string) => string;
  locale: Locale;
  employeeSelfService: boolean;
  /** Turizm sezonu sekmesine derin link (yalnızca tam yetkili görünümde). */
  branchIdForTourismLink?: number | null;
  incThroughToday: BranchRegisterSummary | null | undefined;
  incSummaryShowErr: boolean;
  incSummaryErrFirst: unknown;
  incSummaryShowSkeleton: boolean;
  incListSummaryShowErr: boolean;
  incListSummaryErrFirst: unknown | null;
  incListSummaryPending: boolean;
  incListDetailRangeActive: boolean;
  incListPeriod: BranchIncomePeriodSummary | null | undefined;
  incListDetailSingleDay: string | null;
  incListDayRegister: BranchRegisterSummary | null | undefined;
  incListDatesRangeInvalid: boolean;
  incListDatesPartialInvalid: boolean;
  incListPatronOverlay: PatronIncomePin | null;
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
  incFrom: string;
  incTo: string;
  setIncFrom: (v: string) => void;
  setIncTo: (v: string) => void;
  setIncPage: Dispatch<SetStateAction<number>>;
  incomeFiltersOpen: boolean;
  setIncomeFiltersOpen: (v: boolean) => void;
  incFiltersActive: boolean;
  incMainFilterOpts: { value: string; label: string }[];
  incCashFilterOpts: { value: string; label: string }[];
  incFilterMain: string;
  setIncFilterMain: (v: string) => void;
  incFilterCash: string;
  setIncFilterCash: (v: string) => void;
  refetchInc: () => unknown;
  refetchIncomeSummaryBlocks: () => void;
  incErr: boolean;
  incError: unknown;
  incLoading: boolean;
  incData:
    | {
        items: BranchTransaction[];
        totalCount: number;
        patronIncomeToPatron?: PatronIncomePin | null;
      }
    | null
    | undefined;
  canDeleteBranchTx: boolean;
  deleteTxMut: Pick<UseMutationResult<unknown, unknown, number, unknown>, "isPending">;
  confirmDeleteBranchTx: (id: number) => void | Promise<void>;
  incPage: number;
  incPages: number;
  incTotal: number;
  INC_PAGE: number;
};

function IncomePatronRegisterSplitPanel({
  summary,
  t,
  locale,
}: {
  summary: BranchRegisterSummary;
  t: (key: string) => string;
  locale: Locale;
}) {
  const d = summary.expenseOverviewOnAsOfDay;
  if (!d) return null;
  const fmt = (n: number) =>
    formatMoneyDash(n, t("personnel.dash"), locale, "TRY");
  const splitBlock = (subTitle: string, rows: { label: string; value: number }[]) => (
    <div className="rounded-lg border border-white/90 bg-white/60 p-2.5 shadow-sm">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">{subTitle}</h4>
      <dl className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-3 text-sm">
            <dt className="text-zinc-600">{r.label}</dt>
            <dd className="font-mono font-medium tabular-nums text-zinc-900">{fmt(r.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
  return (
    <CollapsibleInsightSection
      sectionClassName="rounded-xl border border-violet-200/60 bg-violet-50/35 p-2 shadow-sm ring-1 ring-violet-950/[0.04] sm:p-3"
      title={t("branch.incomePatronKasaSplitTitle")}
      lead={t("branch.incomePatronKasaSplitLead")}
      defaultOpen={false}
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {splitBlock(t("branch.incomeSplitOffRegisterAdvTitle"), [
          {
            label: t("branch.incomeSplitOffRegisterAdvPatron"),
            value: summary.dayNonRegisterAdvancePatron ?? 0,
          },
          {
            label: t("branch.incomeSplitOffRegisterAdvBank"),
            value: summary.dayNonRegisterAdvanceBank ?? 0,
          },
          {
            label: t("branch.incomeSplitOffRegisterAdvTotal"),
            value: summary.dayNonRegisterAdvanceExpense,
          },
        ])}
        {splitBlock(t("branch.incomeSplitOutNonPnlTitle"), [
          {
            label: t("branch.incomeSplitOutNonPnlRegister"),
            value: d.outAdvanceNonPnlFromRegister,
          },
          {
            label: t("branch.incomeSplitOutNonPnlPatron"),
            value: d.outAdvanceNonPnlFromPatron,
          },
          {
            label: t("branch.incomeSplitOutNonPnlPocket"),
            value: d.outAdvanceNonPnlFromPersonnelPocket,
          },
          { label: t("branch.incomeSplitOutNonPnlTotal"), value: d.outAdvanceNonPnl },
        ])}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {splitBlock(t("branch.incomeSplitOtherOutTitle"), [
          { label: t("branch.incomeSplitOtherOutRegister"), value: d.outPaidFromRegister },
          { label: t("branch.incomeSplitOtherOutPatron"), value: d.outPaidFromPatron },
          { label: t("branch.incomeSplitOtherOutPocket"), value: d.outPaidFromPersonnelPocket },
        ])}
        <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-2.5 shadow-sm">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900/90">
            {t("branch.incomeSplitDayNetPatron")}
          </h4>
          <p className="mt-2 font-mono text-base font-semibold tabular-nums text-emerald-950">
            {fmt(summary.dayNetRegisterOwesPatron ?? 0)}
          </p>
        </div>
      </div>
    </CollapsibleInsightSection>
  );
}

export function BranchDetailIncomeTab(props: BranchDetailIncomeTabProps) {
  const {
    t,
    locale,
    employeeSelfService,
    branchIdForTourismLink,
    incThroughToday,
    incSummaryShowErr,
    incSummaryErrFirst,
    incSummaryShowSkeleton,
    incListSummaryShowErr,
    incListSummaryErrFirst,
    incListSummaryPending,
    incListDetailRangeActive,
    incListPeriod,
    incListDetailSingleDay,
    incListDayRegister,
    incListDatesRangeInvalid,
    incListDatesPartialInvalid,
    incListPatronOverlay,
    setTxModalLaunch,
    setTxModalOpen,
    incFrom,
    incTo,
    setIncFrom,
    setIncTo,
    setIncPage,
    incomeFiltersOpen,
    setIncomeFiltersOpen,
    incFiltersActive,
    incMainFilterOpts,
    incCashFilterOpts,
    incFilterMain,
    setIncFilterMain,
    incFilterCash,
    setIncFilterCash,
    refetchInc,
    refetchIncomeSummaryBlocks,
    incErr,
    incError,
    incLoading,
    incData,
    canDeleteBranchTx,
    deleteTxMut,
    confirmDeleteBranchTx,
    incPage,
    incPages,
    incTotal,
    INC_PAGE,
  } = props;

  const tourismSeasonHref = branchTourismSeasonDeepLink(branchIdForTourismLink, employeeSelfService);
  const todayIso = localIsoDate();
  const incMainLabel =
    incMainFilterOpts.find((x) => x.value === incFilterMain)?.label ?? incFilterMain;
  const incCashLabel =
    incCashFilterOpts.find((x) => x.value === incFilterCash)?.label ?? incFilterCash;
  const showIncDateFrom = incFrom.length === 10 && incFrom !== todayIso;
  const showIncDateTo = incTo.length === 10 && incTo !== todayIso;
  const hasIncDateFilters = showIncDateFrom || showIncDateTo;
  const hasIncMainFilter = incFilterMain.trim().length > 0;
  const hasIncCashFilter = incFilterCash.trim().length > 0;
  const incActiveFilterCount =
    (hasIncDateFilters ? 1 : 0) +
    (hasIncMainFilter ? 1 : 0) +
    (hasIncCashFilter ? 1 : 0);
  const unifiedFilters = useMemo(
    () => ({
      from: incFrom,
      to: incTo,
      main: incFilterMain,
      cash: incFilterCash,
    }),
    [incFrom, incTo, incFilterMain, incFilterCash]
  );
  const applyUnifiedFilters = (next: Partial<typeof unifiedFilters>) => {
    const merged = { ...unifiedFilters, ...next };
    setIncFrom(merged.from);
    setIncTo(merged.to);
    setIncFilterMain(merged.main);
    setIncFilterCash(merged.cash);
    setIncPage(1);
  };

  return (
          <div className="flex flex-col gap-4">
            {!employeeSelfService ? (
              <>
                <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {t("branch.incomeSummarySectionTitle")}
                  </h3>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600">
                    {t("branch.incomeSummaryCardsLead")}
                  </p>
                  {incSummaryShowErr && incSummaryErrFirst ? (
                    <p className="mt-2 text-sm text-red-600">{toErrorMessage(incSummaryErrFirst)}</p>
                  ) : null}
                  {incSummaryShowSkeleton ? (
                    <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
                  ) : incThroughToday ? (
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <CollapsibleInsightSection
                        sectionClassName="rounded-xl border border-emerald-200/70 bg-white/50 p-2 shadow-sm ring-1 ring-emerald-950/[0.03] sm:p-3"
                        title={t("branch.incomeCumulativeAllTimeTitle")}
                      >
                        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                          <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                              {t("branch.incomeCumulativeCash")}
                            </p>
                            {incomeCashTotalAndParties(
                              incThroughToday.cumulativeIncomeCashThroughAsOf ?? 0,
                              partiesFromRegisterSummary(incThroughToday),
                              t,
                              locale,
                              incThroughToday.cumulativeIncomeCashBranchManagerByPersonThroughAsOf
                            )}
                          </div>
                          <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                              {t("branch.incomeCumulativeCard")}
                            </p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
                              {formatMoneyDash(
                                incThroughToday.cumulativeIncomeCardThroughAsOf ?? 0,
                                t("personnel.dash"),
                                locale,
                                "TRY"
                              )}
                            </p>
                          </div>
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 shadow-sm ring-1 ring-emerald-200/60 sm:p-3">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                              {t("branch.incomeCumulativeTotal")}
                            </p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-emerald-900 sm:text-base">
                              {formatMoneyDash(
                                incThroughToday.cumulativeIncomeTotalThroughAsOf ?? 0,
                                t("personnel.dash"),
                                locale,
                                "TRY"
                              )}
                            </p>
                          </div>
                        </div>
                      </CollapsibleInsightSection>
                      <CollapsibleInsightSection
                        sectionClassName="rounded-xl border border-teal-200/80 bg-white/50 p-2 shadow-sm ring-1 ring-teal-950/[0.05] sm:p-3"
                        title={t("branch.incomeCumulativeSeasonTitle")}
                      >
                        <BranchRegisterTourismSeasonStrip
                          t={t}
                          locale={locale}
                          summary={incThroughToday}
                          missingHintKey="branch.incomeSeasonMissingForToday"
                          tourismSeasonHref={tourismSeasonHref}
                        />
                        {incThroughToday.hasActiveTourismSeasonForAsOf ? (
                          <div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                              <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                                  {t("branch.incomeCumulativeCash")}
                                </p>
                                {incomeCashTotalAndParties(
                                  incThroughToday.seasonCumulativeIncomeCashThroughAsOf ?? 0,
                                  partiesSeasonFromRegisterSummary(incThroughToday),
                                  t,
                                  locale,
                                  incThroughToday.seasonCumulativeIncomeCashBranchManagerByPersonThroughAsOf
                                )}
                              </div>
                              <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                                  {t("branch.incomeCumulativeCard")}
                                </p>
                                <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
                                  {formatMoneyDash(
                                    incThroughToday.seasonCumulativeIncomeCardThroughAsOf ?? 0,
                                    t("personnel.dash"),
                                    locale,
                                    "TRY"
                                  )}
                                </p>
                              </div>
                              <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-2.5 shadow-sm ring-1 ring-teal-200/50 sm:p-3">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-teal-950/80">
                                  {t("branch.incomeCumulativeTotal")}
                                </p>
                                <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-teal-950 sm:text-base">
                                  {formatMoneyDash(
                                    incThroughToday.seasonCumulativeIncomeTotalThroughAsOf ?? 0,
                                    t("personnel.dash"),
                                    locale,
                                    "TRY"
                                  )}
                                </p>
                              </div>
                            </div>
                        ) : null}
                      </CollapsibleInsightSection>
                    </div>
                  ) : null}
                </section>

                {incThroughToday && !incThroughToday.hideFinancialTotals ? (
                  <IncomePatronRegisterSplitPanel
                    summary={incThroughToday}
                    t={t}
                    locale={locale}
                  />
                ) : null}

                <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {t("branch.incomeListDatesSummaryTitle")}
                  </h3>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-600">
                    {t("branch.incomeListDatesSummaryLead")}
                  </p>
                  {incListSummaryShowErr && incListSummaryErrFirst ? (
                    <p className="mt-2 text-sm text-red-600">{toErrorMessage(incListSummaryErrFirst)}</p>
                  ) : null}
                  {incListSummaryPending ? (
                    <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
                  ) : incListDetailRangeActive && incListPeriod && !incListPeriod.hideFinancialTotals ? (
                    <>
                      <p className="mt-3 text-xs font-medium text-zinc-600">
                        {t("branch.incomePeriodForRangePrefix")}{" "}
                        <span className="tabular-nums">
                          {formatLocaleDate(incListPeriod.from, locale)} —{" "}
                          {formatLocaleDate(incListPeriod.to, locale)}
                        </span>
                      </p>
                      <div
                        className="mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3"
                        role="group"
                        aria-label={t("branch.incomePeriodTitle")}
                      >
                        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                          <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                              {t("branch.incomePeriodCash")}
                            </p>
                            {incomeCashTotalAndParties(
                              incListPeriod.incomeCash,
                              partiesFromPeriodSummary(incListPeriod),
                              t,
                              locale,
                              incListPeriod.incomeCashBranchManagerByPerson
                            )}
                            {listSummaryPatronCashLine(incListPatronOverlay, t, locale)}
                          </div>
                          <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                              {t("branch.incomePeriodCard")}
                            </p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
                              {formatMoneyDash(
                                incListPeriod.incomeCard,
                                t("personnel.dash"),
                                locale,
                                "TRY"
                              )}
                            </p>
                            {listSummaryPosPatronHint(t)}
                            {listSummaryPatronCardLine(incListPatronOverlay, t, locale)}
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-100/80 p-2.5 shadow-sm sm:p-3">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                              {t("branch.incomePeriodTotal")}
                            </p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
                              {formatMoneyDash(
                                incListPeriod.totalIncome,
                                t("personnel.dash"),
                                locale,
                                "TRY"
                              )}
                            </p>
                            {listSummaryPatronTotalLine(incListPatronOverlay, t, locale)}
                          </div>
                        </div>
                        {listSummaryPatronUnspecifiedNote(incListPatronOverlay, t, locale)}
                      </div>
                    </>
                  ) : incListDetailSingleDay != null &&
                    incListDayRegister &&
                    !incListDayRegister.hideFinancialTotals ? (
                    <>
                      <p className="mt-3 text-xs font-medium text-zinc-600">
                        {t("branch.incomeDayForDatePrefix")}{" "}
                        <span className="tabular-nums">
                          {formatLocaleDate(incListDetailSingleDay, locale)}
                        </span>
                      </p>
                      <div
                        className="mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3"
                        role="group"
                        aria-label={t("branch.incomeCloseTitle")}
                      >
                        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                          <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                              {t("branch.incomeCloseCash")}
                            </p>
                            {incomeCashTotalAndParties(
                              incListDayRegister.dayIncomeCash,
                              partiesDayFromRegisterSummary(incListDayRegister),
                              t,
                              locale,
                              incListDayRegister.dayIncomeCashBranchManagerByPerson
                            )}
                            {listSummaryPatronCashLine(incListPatronOverlay, t, locale)}
                          </div>
                          <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                              {t("branch.incomeCloseCard")}
                            </p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
                              {formatMoneyDash(
                                incListDayRegister.dayIncomeCard,
                                t("personnel.dash"),
                                locale,
                                "TRY"
                              )}
                            </p>
                            {listSummaryPosPatronHint(t)}
                            {listSummaryPatronCardLine(incListPatronOverlay, t, locale)}
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-100/80 p-2.5 shadow-sm sm:p-3">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                              {t("branch.incomeCloseTotal")}
                            </p>
                            <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
                              {formatMoneyDash(
                                incListDayRegister.dayTotalIncome,
                                t("personnel.dash"),
                                locale,
                                "TRY"
                              )}
                            </p>
                            {listSummaryPatronTotalLine(incListPatronOverlay, t, locale)}
                          </div>
                        </div>
                        {listSummaryPatronUnspecifiedNote(incListPatronOverlay, t, locale)}
                        <div className="mt-3">
                          <IncomePatronRegisterSplitPanel
                            summary={incListDayRegister}
                            t={t}
                            locale={locale}
                          />
                        </div>
                      </div>
                    </>
                  ) : incListDatesRangeInvalid ? (
                    <p className="mt-3 text-xs text-amber-800">{t("branch.incomeListInvalidRange")}</p>
                  ) : incListDatesPartialInvalid ? (
                    <p className="mt-3 text-xs text-zinc-600">{t("branch.incomeListDatesIncomplete")}</p>
                  ) : null}
                </section>
              </>
            ) : null}

            <div className="flex flex-col gap-4">
              <section
                className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"
                aria-label={t("branch.incomeActionsTitle")}
              >
                <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                  {t("branch.incomeActionsTitle")}
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                  <Button
                    type="button"
                    className="min-h-11 w-full sm:w-auto"
                    onClick={() => {
                      const d =
                        incFrom.length === 10 && incFrom === incTo ? incFrom : localIsoDate();
                      setTxModalLaunch({ defaultType: "IN", defaultTransactionDate: d });
                      setTxModalOpen(true);
                    }}
                  >
                    {t("branch.addIncomeTx")}
                  </Button>
                  {!employeeSelfService ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-full sm:w-auto"
                      onClick={() => {
                        const d =
                          incFrom.length === 10 && incFrom === incTo ? incFrom : localIsoDate();
                        setTxModalLaunch({
                          defaultType: "IN",
                          defaultMainCategory: "IN_DAY_CLOSE",
                          defaultTransactionDate: d,
                        });
                        setTxModalOpen(true);
                      }}
                    >
                      {t("branch.quickAddDayClose")}
                    </Button>
                  ) : null}
                </div>
              </section>

              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold text-zinc-900">{t("branch.incomeListSection")}</h3>
                    <p className="text-xs leading-relaxed text-zinc-600">
                      {t("branch.incomeListSection")} · {t("branch.incomeFilterDrawerHint")}
                    </p>
                  </div>
                  <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-zinc-700">
                        {t("branch.incomeFilterDrawerTitle")}
                      </p>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                        {incActiveFilterCount > 0
                          ? `${incActiveFilterCount} · ${t("branch.incomeFilterOpenButton")}`
                          : t("branch.txFilterAny")}
                      </span>
                    </div>
                    {incActiveFilterCount > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {hasIncDateFilters ? (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-700">
                            {t("branch.filterDateFrom")}:{" "}
                            {showIncDateFrom ? formatLocaleDate(incFrom, locale) : t("personnel.dash")} ·{" "}
                            {t("branch.filterDateTo")}:{" "}
                            {showIncDateTo ? formatLocaleDate(incTo, locale) : t("personnel.dash")}
                          </span>
                        ) : null}
                        {hasIncMainFilter ? (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-700">
                            {t("branch.txFilterMainCategory")}: {incMainLabel}
                          </span>
                        ) : null}
                        {hasIncCashFilter ? (
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-700">
                            {t("branch.txFilterCashSettlement")}: {incCashLabel}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-2 grid grid-cols-1 gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="relative min-h-11 w-full"
                        aria-label={`${t("branch.incomeFilterOpenButton")} (${incActiveFilterCount})`}
                        onClick={() => setIncomeFiltersOpen(true)}
                      >
                        {`${t("branch.incomeFilterOpenButton")} (${incActiveFilterCount})`}
                        {incFiltersActive ? (
                          <span
                            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white"
                            aria-hidden
                          />
                        ) : null}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-2.5">
                    <p className="text-xs font-semibold text-zinc-700">{t("branch.filterApplyRefresh")}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {t("branch.filterToday")} / {t("branch.filterAllDates")}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-full"
                      onClick={() => {
                        const d = localIsoDate();
                        applyUnifiedFilters({ from: d, to: d });
                      }}
                    >
                      {t("branch.filterToday")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-full"
                      onClick={() => {
                        applyUnifiedFilters({ from: "", to: "", main: "", cash: "" });
                      }}
                    >
                      {t("branch.filterAllDates")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-full"
                      onClick={() => {
                        void refetchInc();
                        refetchIncomeSummaryBlocks();
                      }}
                    >
                      {t("branch.filterApplyRefresh")}
                    </Button>
                  </div>
                </div>
                </div>
                <FilterDrawer
                  open={incomeFiltersOpen}
                  title={t("branch.incomeFilterDrawerTitle")}
                  onClose={() => setIncomeFiltersOpen(false)}
                  onReset={() => {
                    applyUnifiedFilters({ from: "", to: "", main: "", cash: "" });
                  }}
                  onApply={() => {
                    void refetchInc();
                    refetchIncomeSummaryBlocks();
                    setIncomeFiltersOpen(false);
                  }}
                  chips={[
                    ...(hasIncDateFilters
                      ? [
                          {
                            id: "date",
                            label: `${t("branch.filterDateFrom")}: ${
                              showIncDateFrom ? formatLocaleDate(incFrom, locale) : t("personnel.dash")
                            } · ${t("branch.filterDateTo")}: ${
                              showIncDateTo ? formatLocaleDate(incTo, locale) : t("personnel.dash")
                            }`,
                            onRemove: () => {
                              applyUnifiedFilters({ from: "", to: "" });
                            },
                          },
                        ]
                      : []),
                    ...(hasIncMainFilter
                      ? [
                          {
                            id: "main",
                            label: `${t("branch.txFilterMainCategory")}: ${incMainLabel}`,
                            onRemove: () => {
                              applyUnifiedFilters({ main: "" });
                            },
                          },
                        ]
                      : []),
                    ...(hasIncCashFilter
                      ? [
                          {
                            id: "cash",
                            label: `${t("branch.txFilterCashSettlement")}: ${incCashLabel}`,
                            onRemove: () => {
                              applyUnifiedFilters({ cash: "" });
                            },
                          },
                        ]
                      : []),
                  ]}
                >
                  <div className="space-y-4">
                    <p className="text-xs leading-relaxed text-zinc-600">{t("branch.incomeFilterDrawerHint")}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DateField
                        label={t("branch.filterDateFrom")}
                        value={unifiedFilters.from}
                        onChange={(e) => applyUnifiedFilters({ from: e.target.value })}
                        className="min-w-0"
                      />
                      <DateField
                        label={t("branch.filterDateTo")}
                        value={unifiedFilters.to}
                        onChange={(e) => applyUnifiedFilters({ to: e.target.value })}
                        className="min-w-0"
                      />
                    </div>
                    <div className="grid gap-3">
                      <Select
                        name="incFilterMain"
                        label={t("branch.txFilterMainCategory")}
                        options={incMainFilterOpts}
                        value={unifiedFilters.main}
                        menuZIndex={280}
                        onChange={(e) => applyUnifiedFilters({ main: e.target.value })}
                        onBlur={() => {}}
                      />
                      <Select
                        name="incFilterCash"
                        label={t("branch.txFilterCashSettlement")}
                        options={incCashFilterOpts}
                        value={unifiedFilters.cash}
                        menuZIndex={280}
                        onChange={(e) => applyUnifiedFilters({ cash: e.target.value })}
                        onBlur={() => {}}
                      />
                    </div>
                  </div>
                </FilterDrawer>
              </div>
            </div>
            {incErr && <p className="text-sm text-red-600">{toErrorMessage(incError)}</p>}
            {incLoading ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : !incData?.items.length ? (
              <p className="text-sm text-zinc-600">{t("branch.noIncome")}</p>
            ) : (
              <>
                <MobileList
                  className="sm:hidden"
                  items={incData.items}
                  getKey={(row) => row.id}
                  renderItem={(row) => (
                    <MobileCard
                      title={txCategoryLine(row.mainCategory, row.category, t) || t("personnel.dash")}
                      primaryFields={[
                        <div key="head" className="flex items-start justify-between gap-2">
                          <span className="text-sm text-zinc-500">
                            {formatLocaleDate(row.transactionDate, locale)}
                          </span>
                          <span className="shrink-0 font-mono text-base font-semibold text-emerald-800">
                            {formatMoneyDash(row.amount, t("personnel.dash"), locale, row.currencyCode)}
                          </span>
                        </div>,
                        ...(row.cashAmount != null && row.cardAmount != null
                          ? [
                              <p key="cashcard" className="text-sm text-zinc-600">
                                {t("branch.txColCashCard")}:{" "}
                                {formatMoneyDash(
                                  row.cashAmount,
                                  t("personnel.dash"),
                                  locale,
                                  row.currencyCode
                                )}{" "}
                                /{" "}
                                {formatMoneyDash(
                                  row.cardAmount,
                                  t("personnel.dash"),
                                  locale,
                                  row.currencyCode
                                )}
                              </p>,
                            ]
                          : []),
                      ]}
                      secondaryFields={[
                        ...(registerCashSettlementLabel(row, t)
                          ? [
                              <p key="settlement">
                                {t("branch.txColCashSettlement")}: {registerCashSettlementLabel(row, t)}
                              </p>,
                            ]
                          : []),
                        ...(row.description ? [<p key="desc">{row.description}</p>] : []),
                      ]}
                      actions={
                        canDeleteBranchTx ? (
                          <BranchTxIncomeDeleteRow
                            transactionId={row.id}
                            busy={deleteTxMut.isPending}
                            show
                            t={t}
                            onConfirm={confirmDeleteBranchTx}
                          />
                        ) : null
                      }
                    />
                  )}
                />
                <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 sm:block">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>{t("branch.advColDate")}</TableHeader>
                        <TableHeader>{t("branch.txColAmount")}</TableHeader>
                        <TableHeader className="hidden lg:table-cell">{t("branch.txColCashCard")}</TableHeader>
                        <TableHeader className="hidden lg:table-cell">{t("branch.txColCashSettlement")}</TableHeader>
                        <TableHeader className="hidden sm:table-cell">{t("branch.txColMainCategory")}</TableHeader>
                        <TableHeader className="hidden md:table-cell">{t("branch.txColNote")}</TableHeader>
                        {canDeleteBranchTx ? (
                          <TableHeader className="w-12 text-center text-xs font-medium text-zinc-500">
                            {t("branch.txColActions")}
                          </TableHeader>
                        ) : null}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {incData.items.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatLocaleDate(row.transactionDate, locale)}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-emerald-800">
                            {formatMoneyDash(
                              row.amount,
                              t("personnel.dash"),
                              locale,
                              row.currencyCode
                            )}
                          </TableCell>
                          <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 font-mono text-xs text-zinc-600 md:hidden lg:table-cell">
                            {row.cashAmount != null && row.cardAmount != null
                              ? `${formatMoneyDash(row.cashAmount, t("personnel.dash"), locale, row.currencyCode)} / ${formatMoneyDash(row.cardAmount, t("personnel.dash"), locale, row.currencyCode)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 text-xs text-zinc-600 md:hidden lg:table-cell">
                            {registerCashSettlementLabel(row, t) || "—"}
                          </TableCell>
                          <TableCell className="max-sm:hidden sm:max-md:flex sm:max-md:w-full sm:max-md:min-w-0 sm:max-md:items-start sm:max-md:justify-between sm:max-md:gap-3 text-sm text-zinc-600 md:table-cell">
                            {txCategoryLine(row.mainCategory, row.category, t) || t("personnel.dash")}
                          </TableCell>
                          <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 max-w-[14rem] truncate text-sm text-zinc-600 md:table-cell">
                            {row.description ?? "—"}
                          </TableCell>
                          {canDeleteBranchTx ? (
                            <TableCell className="align-top p-2">
                              <BranchTxIncomeDeleteRow
                                transactionId={row.id}
                                busy={deleteTxMut.isPending}
                                show
                                t={t}
                                onConfirm={confirmDeleteBranchTx}
                              />
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-zinc-600">
                    {(incPage - 1) * INC_PAGE + 1}–{Math.min(incPage * INC_PAGE, incTotal)} · {t("branch.pagingTotal")}{" "}
                    {incTotal}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-full"
                      disabled={incPage <= 1}
                      onClick={() => setIncPage((p) => Math.max(1, p - 1))}
                    >
                      {t("branch.pagingPrev")}
                    </Button>
                    <span className="col-span-2 flex min-h-11 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-sm tabular-nums text-zinc-700 sm:col-span-1 sm:min-h-0 sm:rounded-none sm:border-0 sm:bg-transparent">
                      {incPage} / {incPages}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11 w-full"
                      disabled={incPage >= incPages}
                      onClick={() => setIncPage((p) => Math.min(incPages, p + 1))}
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
