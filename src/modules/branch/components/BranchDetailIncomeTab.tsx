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
import type { Personnel } from "@/types/personnel";
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
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { BranchMobileInsightJumpRail } from "@/modules/branch/components/BranchMobileInsightJumpRail";
import { useMediaMinWidth } from "@/shared/lib/use-media-min-width";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { RegisterIncomeCashSettlementDialog } from "@/modules/branch/components/RegisterIncomeCashSettlementDialog";
import {
  BranchSectionTitleWithInfo,
  BranchTxIncomeDeleteRow,
  listSummaryPatronCardLine,
  listSummaryPatronCashLine,
  listSummaryPatronTotalLine,
  listSummaryPatronUnspecifiedNote,
  listSummaryPosPatronHint,
  partiesDayFromRegisterSummary,
  partiesFromPeriodSummary,
  isRegisterIncomeCashSettlementRow,
  registerCashSettlementLabel,
  type PatronIncomePin,
} from "./BranchDetailTabs.shared";

export type BranchDetailIncomeTabProps = {
  t: (key: string) => string;
  locale: Locale;
  employeeSelfService: boolean;
  branchId: number;
  staff: Personnel[];
  allPersonnel: Personnel[];
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
    filteredAmountTotal?: number;
    filteredCashTotal?: number;
    filteredCardTotal?: number;
    patronIncomeToPatron?: PatronIncomePin | null;
  }
  | null
  | undefined;
  canDeleteBranchTx: boolean;
  canEditRegisterIncomeCashSettlement: boolean;
  deleteTxMut: Pick<UseMutationResult<unknown, unknown, number, unknown>, "isPending">;
  confirmDeleteBranchTx: (id: number) => void | Promise<void>;
  incPage: number;
  incPages: number;
  incTotal: number;
  INC_PAGE: number;
};

export function BranchDetailIncomeTab(props: BranchDetailIncomeTabProps) {
  const {
    t,
    locale,
    employeeSelfService,
    branchId,
    staff,
    allPersonnel,
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
    canEditRegisterIncomeCashSettlement,
    deleteTxMut,
    confirmDeleteBranchTx,
    incPage,
    incPages,
    incTotal,
    INC_PAGE,
  } = props;

  const [cashSettleDialog, setCashSettleDialog] = useState<
    null | { mode: "single"; row: BranchTransaction } | { mode: "bulk" }
  >(null);

  /** Mobilde özet kartları kapalı başlar; sm+ açık. Mount öncesi kapalı tutulur (SSR/hydration uyumu). */
  const incomeInsightSmUp = useMediaMinWidth(640);
  const [incomeInsightLayoutReady, setIncomeInsightLayoutReady] = useState(false);
  useEffect(() => setIncomeInsightLayoutReady(true), []);
  const incomeCumulativeInsightOpen =
    incomeInsightLayoutReady && incomeInsightSmUp;
  const incomeCumulativeInsightKey = incomeInsightLayoutReady
    ? incomeInsightSmUp
      ? "wide"
      : "narrow"
    : "pending";

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
  const pctLine = (amount: number, total: number) => `%${(total > 0 ? (amount / total) * 100 : 0).toFixed(1)}`;
  const incomeListTotals = useMemo(() => {
    const rows = incData?.items ?? [];
    const total = Number(
      incData?.filteredAmountTotal ?? rows.reduce((s, r) => s + Number(r.amount || 0), 0)
    );
    const cash = Number(
      incData?.filteredCashTotal ?? rows.reduce((s, r) => s + Number(r.cashAmount ?? 0), 0)
    );
    const card = Number(
      incData?.filteredCardTotal ?? rows.reduce((s, r) => s + Number(r.cardAmount ?? 0), 0)
    );
    return { total, cash, card };
  }, [incData?.filteredAmountTotal, incData?.filteredCashTotal, incData?.filteredCardTotal, incData?.items]);
  const seasonQuickRange = useMemo(() => {
    const from = String(incThroughToday?.activeTourismSeasonOpenedOn ?? "");
    const toRaw = String(incThroughToday?.activeTourismSeasonClosedOn ?? "");
    if (from.length !== 10) return null;
    const to = toRaw.length === 10 ? toRaw : String(incThroughToday?.asOfDate ?? todayIso);
    return to.length === 10 ? { from, to } : null;
  }, [incThroughToday, todayIso]);

  const incomeJumpItems = useMemo(() => {
    const items: { id: string; label: string }[] = [];
    if (!employeeSelfService) {
      items.push({ id: "branch-income-list-dates", label: t("branch.mobileJumpIncomeListDates") });
    }
    items.push({ id: "branch-income-lines", label: t("branch.mobileJumpIncomeLines") });
    return items;
  }, [employeeSelfService, incThroughToday, t]);

  return (
    <div className="flex flex-col gap-4">
      <BranchMobileInsightJumpRail
        ariaLabel={t("branch.mobileJumpIncomeNavAria")}
        items={incomeJumpItems}
      />
      <section
        className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"
        aria-label={t("branch.incomeActionsTitle")}
      >
        <h3 className="mb-2 text-sm font-semibold text-zinc-900">{t("branch.incomeActionsTitle")}</h3>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => {
              const d = incFrom.length === 10 && incFrom === incTo ? incFrom : localIsoDate();
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
                const d = incFrom.length === 10 && incFrom === incTo ? incFrom : localIsoDate();
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
          {canEditRegisterIncomeCashSettlement ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => setCashSettleDialog({ mode: "bulk" })}
            >
              {t("branch.registerCashSettlementOpenBulk")}
            </Button>
          ) : null}
        </div>
        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/70 p-3">
          <p className="text-xs font-semibold text-zinc-700">{t("branch.incomeQuickFiltersLead")}</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:contents">
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full touch-manipulation sm:min-w-[9rem] sm:flex-1"
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
                className="min-h-11 w-full touch-manipulation sm:min-w-[9rem] sm:flex-1"
                onClick={() => {
                  applyUnifiedFilters({ from: "", to: "", main: "", cash: "" });
                }}
              >
                {t("branch.filterAllTime")}
              </Button>
              {seasonQuickRange ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="col-span-2 min-h-11 w-full touch-manipulation sm:col-span-1 sm:min-w-[9rem] sm:flex-1"
                  onClick={() => applyUnifiedFilters({ from: seasonQuickRange.from, to: seasonQuickRange.to })}
                >
                  {t("branch.filterThisSeason")}
                </Button>
              ) : null}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full touch-manipulation sm:ml-auto sm:w-auto sm:min-w-[8.5rem]"
              onClick={() => {
                void refetchInc();
                refetchIncomeSummaryBlocks();
              }}
            >
              {t("branch.filterApplyRefresh")}
            </Button>
          </div>
        </div>
      </section>
      {!employeeSelfService ? (
        <>
          <section
            id="branch-income-list-dates"
            className="scroll-mt-[5.5rem] rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4 sm:scroll-mt-0"
          >
            <BranchSectionTitleWithInfo
              title={t("branch.incomeListDatesSummaryTitle")}
              body={t("branch.incomeListDatesSummaryLead")}
              t={t}
            />
            {incListSummaryShowErr && incListSummaryErrFirst ? (
              <p className="mt-2 text-sm text-red-600">{toErrorMessage(incListSummaryErrFirst)}</p>
            ) : null}
            {incListSummaryPending ? (
              <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
            ) : incData ? (
              <>
                <p className="mt-3 text-xs font-medium text-zinc-600">
                  {incListDetailRangeActive ? t("branch.incomePeriodForRangePrefix") : t("branch.incomeDayForDatePrefix")}{" "}
                  <span className="tabular-nums">{formatLocaleDate(incFrom, locale)} — {formatLocaleDate(incTo, locale)}</span>
                </p>
                <div
                  className="mt-1 rounded-xl border border-emerald-200/80 bg-white p-2 shadow-sm sm:p-3"
                  role="group"
                  aria-label={t("branch.incomePeriodTitle")}
                >
                  <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/40 p-2.5 sm:p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                        {t("branch.incomePeriodTotal")}
                      </p>
                      <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        {t("branch.incomeListFilterScopeHint")}
                      </span>
                    </div>
                    <p className="mt-1 text-base font-semibold tabular-nums tracking-tight text-emerald-900 sm:text-lg">
                      {formatMoneyDash(
                        Number(incomeListTotals.total),
                        t("personnel.dash"),
                        locale,
                        "TRY"
                      )}
                    </p>
                    <p className="mt-1 text-xs leading-snug text-zinc-600">
                      {t("branch.incomeListUnifiedBreakdownHint")}
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {[
                        { key: "cash", label: t("branch.incomePeriodCash"), amount: incomeListTotals.cash },
                        { key: "card", label: t("branch.incomePeriodCard"), amount: incomeListTotals.card },
                        {
                          key: "patron",
                          label: t("branch.incomeListPatronTransferredTotal"),
                          amount: incListPatronOverlay?.total ?? 0,
                        },
                      ].map((row) => (
                        <div key={row.key} className="rounded-md border border-zinc-200 bg-white px-2 py-1.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                            {row.label}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-900">
                            {formatMoneyDash(row.amount, t("personnel.dash"), locale, "TRY")}
                          </p>
                          <p className="text-[11px] tabular-nums text-zinc-600">
                            {pctLine(
                              row.amount,
                              Number(incomeListTotals.total)
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 space-y-1">
                      {listSummaryPosPatronHint(t)}
                      {listSummaryPatronCashLine(incListPatronOverlay, t, locale)}
                      {listSummaryPatronCardLine(incListPatronOverlay, t, locale)}
                      {listSummaryPatronTotalLine(incListPatronOverlay, t, locale)}
                    </div>
                  </div>
                  {listSummaryPatronUnspecifiedNote(incListPatronOverlay, t, locale)}
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

      <div
        id="branch-income-lines"
        className="scroll-mt-[5.5rem] flex flex-col gap-4 sm:scroll-mt-0"
      >
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
            <div className="mt-0 rounded-lg border border-zinc-200 bg-white p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-zinc-700">
                  {t("branch.incomeFilterDrawerTitle")}
                </p>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                  {incActiveFilterCount > 0
                    ? `${incActiveFilterCount} · ${t("branch.incomeFilterOpenButton")}`
                    : t("branch.txFilterAny")}
                </span>
              </div>
              {incActiveFilterCount > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {hasIncDateFilters ? (
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
                      {t("branch.filterDateFrom")}:{" "}
                      {showIncDateFrom ? formatLocaleDate(incFrom, locale) : t("personnel.dash")} ·{" "}
                      {t("branch.filterDateTo")}:{" "}
                      {showIncDateTo ? formatLocaleDate(incTo, locale) : t("personnel.dash")}
                    </span>
                  ) : null}
                  {hasIncMainFilter ? (
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
                      {t("branch.txFilterMainCategory")}: {incMainLabel}
                    </span>
                  ) : null}
                  {hasIncCashFilter ? (
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
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
                    label: `${t("branch.filterDateFrom")}: ${showIncDateFrom ? formatLocaleDate(incFrom, locale) : t("personnel.dash")
                      } · ${t("branch.filterDateTo")}: ${showIncDateTo ? formatLocaleDate(incTo, locale) : t("personnel.dash")
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
                  onBlur={() => { }}
                />
                <Select
                  name="incFilterCash"
                  label={t("branch.txFilterCashSettlement")}
                  options={incCashFilterOpts}
                  value={unifiedFilters.cash}
                  menuZIndex={280}
                  onChange={(e) => applyUnifiedFilters({ cash: e.target.value })}
                  onBlur={() => { }}
                />
              </div>
            </div>
          </FilterDrawer>
        </div>
        {incErr && <p className="text-sm text-red-600">{toErrorMessage(incError)}</p>}
        {incLoading ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : !incData?.items.length ? (
          <div
            role="status"
            className="rounded-2xl border border-dashed border-zinc-300/90 bg-gradient-to-b from-zinc-50 via-white to-zinc-50/80 px-4 py-10 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] sm:py-12"
          >
            <div className="mx-auto flex max-w-md flex-col items-center gap-3">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200/90"
                aria-hidden
              >
                <Receipt className="h-7 w-7 stroke-[1.5]" />
              </span>
              <p className="text-base font-semibold leading-snug text-zinc-900">{t("branch.noIncomeTitle")}</p>
              <p className="text-sm leading-relaxed text-zinc-600">{t("branch.noIncomeHint")}</p>
              {incActiveFilterCount > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-1 min-h-11 w-full max-w-xs touch-manipulation"
                  onClick={() => {
                    applyUnifiedFilters({ from: "", to: "", main: "", cash: "" });
                    void refetchInc();
                    refetchIncomeSummaryBlocks();
                  }}
                >
                  {t("branch.noIncomeClearFilters")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <MobileList
              className="sm:hidden"
              items={incData.items}
              getKey={(row) => row.id}
              renderItem={(row) => {
                const totalGelir = Number(row.amount);
                const cardIncome = Number(row.cardAmount || 0);
                const netCash = Number(row.cashAmount || 0);
                const grossCash = totalGelir - cardIncome;
                const expense = grossCash - netCash;
                const netGelir = netCash + cardIncome;

                return (
                  <MobileCard
                    title={txCategoryLine(row.mainCategory, row.category, t) || t("personnel.dash")}
                    primaryFields={[
                      <div key="head" className="flex items-start justify-between gap-2">
                        <span className="text-sm text-zinc-500">
                          {formatLocaleDate(row.transactionDate, locale)}
                        </span>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Toplam Gelir</p>
                          <p className="font-mono text-sm text-zinc-600">
                            {formatMoneyDash(totalGelir, "—", locale, row.currencyCode)}
                          </p>
                        </div>
                      </div>,
                      <div key="net" className="flex items-start justify-between gap-2 border-t border-zinc-50 pt-2 mt-1">
                        <span className="text-xs font-bold text-zinc-700">Net Gelir</span>
                        <span className="font-mono text-base font-black text-emerald-800">
                          {formatMoneyDash(netGelir, "—", locale, row.currencyCode)}
                        </span>
                      </div>,
                      ...(row.cardAmount != null && row.cashAmount != null
                        ? [
                          <div key="cashrecon" className="mt-2 space-y-1 rounded-lg border border-zinc-100 bg-zinc-50/50 p-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-zinc-500 font-medium">Kazanılan Nakit:</span>
                              <span className="font-bold text-zinc-900">{formatMoneyDash(grossCash, "—", locale, row.currencyCode)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500 font-medium">POS / Kart:</span>
                              <span className="font-bold text-zinc-900">{formatMoneyDash(cardIncome, "—", locale, row.currencyCode)}</span>
                            </div>
                            {Math.abs(expense) > 0.005 && (
                              <div className="flex justify-between border-t border-zinc-100 pt-1 text-orange-600">
                                <span className="font-medium">Kasa Gideri:</span>
                                <span className="font-bold">− {formatMoneyDash(expense, "—", locale, row.currencyCode)}</span>
                              </div>
                            )}
                          </div>,
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
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {canEditRegisterIncomeCashSettlement &&
                          isRegisterIncomeCashSettlementRow(row) ? (
                          <Button
                            type="button"
                            variant="secondary"
                            className="min-h-[44px] min-w-[44px] shrink-0 px-2 text-xs"
                            onClick={() => setCashSettleDialog({ mode: "single", row })}
                          >
                            {t("branch.registerCashSettlementOpenSingle")}
                          </Button>
                        ) : null}
                        {canDeleteBranchTx ? (
                          <BranchTxIncomeDeleteRow
                            transactionId={row.id}
                            busy={deleteTxMut.isPending}
                            show
                            t={t}
                            onConfirm={confirmDeleteBranchTx}
                          />
                        ) : null}
                      </div>
                    }
                  />
                );
              }}
            />
            <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 sm:block">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>{t("branch.advColDate")}</TableHeader>
                    <TableHeader>Toplam Gelir</TableHeader>
                    <TableHeader>Net Gelir</TableHeader>
                    <TableHeader className="hidden lg:table-cell">Nakit / Kart Detay</TableHeader>
                    <TableHeader className="hidden lg:table-cell">{t("branch.txColCashSettlement")}</TableHeader>
                    <TableHeader className="hidden sm:table-cell">{t("branch.txColMainCategory")}</TableHeader>
                    <TableHeader className="hidden md:table-cell">{t("branch.txColNote")}</TableHeader>
                    {canEditRegisterIncomeCashSettlement ? (
                      <TableHeader className="w-[7.5rem] text-center text-xs font-medium text-zinc-500">
                        {t("branch.registerCashSettlementColShort")}
                      </TableHeader>
                    ) : null}
                    {canDeleteBranchTx ? (
                      <TableHeader className="w-12 text-center text-xs font-medium text-zinc-500">
                        {t("branch.txColActions")}
                      </TableHeader>
                    ) : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {incData.items.map((row) => {
                    const totalGelir = Number(row.amount);
                    const cardIncome = Number(row.cardAmount || 0);
                    const netCash = Number(row.cashAmount || 0);
                    const grossCash = totalGelir - cardIncome;
                    const expense = grossCash - netCash;
                    const netGelir = netCash + cardIncome;

                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-sm text-zinc-600">
                          {formatLocaleDate(row.transactionDate, locale)}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-zinc-600">
                          {formatMoneyDash(totalGelir, "—", locale, row.currencyCode)}
                        </TableCell>
                        <TableCell className="font-mono text-sm font-bold text-emerald-800">
                          {formatMoneyDash(netGelir, "—", locale, row.currencyCode)}
                        </TableCell>
                        <TableCell className="align-top min-w-[10.5rem] lg:table-cell">
                          {row.cardAmount != null && row.cashAmount != null ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center justify-between gap-4 text-[11px]">
                                <span className="text-zinc-500">Kazanılan Nakit:</span>
                                <span className="font-medium text-zinc-700 tabular-nums">
                                  {formatMoneyDash(grossCash, "—", locale, row.currencyCode)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-[11px]">
                                <span className="text-zinc-500">POS / Kart:</span>
                                <span className="font-medium text-zinc-700 tabular-nums">
                                  {formatMoneyDash(cardIncome, "—", locale, row.currencyCode)}
                                </span>
                              </div>
                              {Math.abs(expense) > 0.005 && (
                                <div className="flex items-center justify-between gap-4 text-[11px] border-t border-zinc-100 mt-0.5 pt-0.5 text-orange-600">
                                  <span>Kasa Gideri:</span>
                                  <span className="font-bold tabular-nums">
                                    − {formatMoneyDash(expense, "—", locale, row.currencyCode)}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : "—"}
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
                        {canEditRegisterIncomeCashSettlement ? (
                          <TableCell className="p-2 text-center">
                            {isRegisterIncomeCashSettlementRow(row) ? (
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-[44px] min-w-[44px] px-2 text-xs"
                                onClick={() => setCashSettleDialog({ mode: "single", row })}
                              >
                                {t("branch.registerCashSettlementOpenSingle")}
                              </Button>
                            ) : (
                              <span className="text-xs text-zinc-400">—</span>
                            )}
                          </TableCell>
                        ) : null}
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-600">
                {(incPage - 1) * INC_PAGE + 1}–{Math.min(incPage * INC_PAGE, incTotal)} · {t("branch.pagingTotal")}{" "}
                {incTotal}
              </p>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex sm:flex-wrap sm:items-center">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 min-w-[44px] px-3"
                  disabled={incPage <= 1}
                  onClick={() => setIncPage((p) => Math.max(1, p - 1))}
                  aria-label={t("branch.pagingPrev")}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  <span className="sr-only">{t("branch.pagingPrev")}</span>
                </Button>
                <span className="flex min-h-11 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 text-sm tabular-nums text-zinc-700 sm:min-h-0 sm:rounded-none sm:border-0 sm:bg-transparent">
                  {incPage} / {incPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11 min-w-[44px] px-3"
                  disabled={incPage >= incPages}
                  onClick={() => setIncPage((p) => Math.min(incPages, p + 1))}
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
      {cashSettleDialog ? (
        <RegisterIncomeCashSettlementDialog
          open
          onClose={() => setCashSettleDialog(null)}
          branchId={branchId}
          branchStaff={allPersonnel}
          mode={cashSettleDialog.mode}
          singleRow={cashSettleDialog.mode === "single" ? cashSettleDialog.row : null}
          onApplied={() => {
            void refetchInc();
            refetchIncomeSummaryBlocks();
          }}
        />
      ) : null}
    </div>
  );
}
