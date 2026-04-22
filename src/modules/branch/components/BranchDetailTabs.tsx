"use client";

import {
  useBranchAdvancesList,
  useBranchDashboard,
  useBranchPersonnelMoneySummaries,
  useBranchIncomePeriodSummary,
  useBranchRegisterSummary,
  useBranchTransactions,
  useBranchTransactionsPaged,
  useDeleteBranchTransaction,
} from "@/modules/branch/hooks/useBranchQueries";
import { AdvancePersonnelModal } from "@/modules/personnel/components/AdvancePersonnelModal";
import { fetchAdvancesByPersonnel } from "@/modules/personnel/api/advances-api";
import {
  defaultPersonnelListFilters,
  personnelKeys,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import type { Locale } from "@/i18n/messages";
import type { Branch, BranchRegisterSummary, ExpenseTabPeriodBreakdown } from "@/types/branch";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Personnel } from "@/types/personnel";
import { cn } from "@/lib/cn";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { useI18n } from "@/i18n/context";
import { useQueries } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TX_MAIN_IN, TX_MAIN_OUT } from "@/modules/branch/lib/branch-transaction-options";
import { AddBranchTransactionModal } from "./AddBranchTransactionModal";
import { AssignPersonnelToBranchModal } from "./AssignPersonnelToBranchModal";
import { InvoiceSettleModal } from "./InvoiceSettleModal";
import { BranchTourismSeasonTab } from "./BranchTourismSeasonTab";
import { BranchZReportAccountingTab } from "./BranchZReportAccountingTab";
import { BranchNotesTab } from "./BranchNotesTab";
import { BranchDetailDocumentsTab } from "./BranchDetailDocumentsTab";
import {
  resolveBranchDetailTabOnBranchChange,
  type BranchDetailTabId,
} from "@/modules/branch/lib/branch-detail-tab";
import { parseRegisterDaySearchParam } from "@/modules/branch/lib/register-day-search-param";
import type { BranchDashboardStockScope } from "@/modules/branch/api/branches-api";
import {
  patronIncomeToPatronVisible,
  type ExpenseOverviewCardId,
} from "./BranchDetailTabs.shared";
import { BranchDetailDashboardTab } from "./BranchDetailDashboardTab";
import { BranchDetailPersonnelTab } from "./BranchDetailPersonnelTab";
import { BranchDetailIncomeTab } from "./BranchDetailIncomeTab";
import { BranchDetailExpensesTab } from "./BranchDetailExpensesTab";
import { BranchDetailStockTab } from "./BranchDetailStockTab";
import type { BranchPersonnelMoneySummaryItem } from "@/types/branch-personnel-money";
import {
  isoMonthLocal,
  type PatronIncomePin,
} from "./BranchDetailTabs.shared";

type PersonnelSubTabId = "people" | "advances";

type Props = {
  branch: Branch;
  staff: Personnel[];
  employeeSelfService?: boolean;
  initialTab?: BranchDetailTabId | null;
  initialRegisterDay?: string | null;
};

const EXP_PAGE = 15;
const INC_PAGE = 15;

export function BranchDetailTabs({
  branch,
  staff,
  employeeSelfService = false,
  initialTab = null,
  initialRegisterDay = null,
}: Props) {
  const { t, locale } = useI18n();
  const deleteTxMut = useDeleteBranchTransaction();
  const { data: personnelListResult } = usePersonnelList(
    defaultPersonnelListFilters,
    !employeeSelfService
  );
  const personnelData = personnelListResult?.items ?? [];
  const activePersonnel = useMemo(
    () => personnelData.filter((p) => !p.isDeleted),
    [personnelData]
  );

  const [tab, setTab] = useState<BranchDetailTabId>(() =>
    resolveBranchDetailTabOnBranchChange(initialTab, employeeSelfService)
  );

  const [dashboardMonth, setDashboardMonth] = useState(() => isoMonthLocal(new Date()));
  const [dashboardStockScope, setDashboardStockScope] = useState<BranchDashboardStockScope>(
    () => ({
      mainCategoryId: null,
      subCategoryId: null,
      parentProductId: null,
      productId: null,
    })
  );
  const [txDay, setTxDay] = useState(() => localIsoDate());
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txModalLaunch, setTxModalLaunch] = useState<{
    defaultType?: "IN" | "OUT";
    defaultMainCategory?: string;
    defaultTransactionDate?: string;
    defaultPocketRepayPersonnelId?: number;
    defaultPocketRepayCurrencyCode?: string;
  }>({});
  const [txDeletePendingId, setTxDeletePendingId] = useState<number | null>(null);
  const [invoiceSettleRow, setInvoiceSettleRow] = useState<BranchTransaction | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceInitialPersonId, setAdvanceInitialPersonId] = useState<number | null>(null);
  const [personnelSubTab, setPersonnelSubTab] = useState<PersonnelSubTabId>("people");
  const [assignPersonnelOpen, setAssignPersonnelOpen] = useState(false);

  const personnelMoneyEnabled = tab === "personnel" && !employeeSelfService;
  const { data: personnelMoneyRows = [], isPending: personnelMoneyPending } =
    useBranchPersonnelMoneySummaries(branch.id, personnelMoneyEnabled);

  const personnelMoneyById = useMemo(() => {
    const m = new Map<number, BranchPersonnelMoneySummaryItem>();
    for (const r of personnelMoneyRows) {
      if (r.personnelId > 0) m.set(r.personnelId, r);
    }
    return m;
  }, [personnelMoneyRows]);

  const [expFrom, setExpFrom] = useState("");
  const [expTo, setExpTo] = useState("");
  const [expPage, setExpPage] = useState(1);
  const [expFilterMain, setExpFilterMain] = useState("");
  const [expFilterPay, setExpFilterPay] = useState("");

  const [incFrom, setIncFrom] = useState("");
  const [incTo, setIncTo] = useState("");
  const [incPage, setIncPage] = useState(1);
  const [incFilterMain, setIncFilterMain] = useState("");
  const [incFilterCash, setIncFilterCash] = useState("");
  const [incomeFiltersOpen, setIncomeFiltersOpen] = useState(false);
  const [expenseFiltersOpen, setExpenseFiltersOpen] = useState(false);
  const [expenseOverviewDetail, setExpenseOverviewDetail] = useState<{
    periodTitle: string;
    breakdown: ExpenseTabPeriodBreakdown;
    card: ExpenseOverviewCardId;
  } | null>(null);

  const registerDayInitial = useMemo(
    () => parseRegisterDaySearchParam(initialRegisterDay ?? null),
    [initialRegisterDay]
  );

  useEffect(() => {
    const today = localIsoDate();
    const regDay = registerDayInitial;
    setTab(resolveBranchDetailTabOnBranchChange(initialTab, employeeSelfService));
    setDashboardMonth(isoMonthLocal(new Date()));
    const day = regDay ?? today;
    setTxDay(day);
    if (regDay) {
      setExpFrom(regDay);
      setExpTo(regDay);
      setIncFrom(regDay);
      setIncTo(regDay);
    } else {
      setExpFrom(today);
      setExpTo(today);
      setIncFrom(today);
      setIncTo(today);
    }
    setExpPage(1);
    setExpFilterMain("");
    setExpFilterPay("");
    setIncPage(1);
    setIncFilterMain("");
    setIncFilterCash("");
    setIncomeFiltersOpen(false);
    setExpenseFiltersOpen(false);
    setExpenseOverviewDetail(null);
    setPersonnelSubTab("people");
    setTxDeletePendingId(null);
  }, [branch.id, employeeSelfService, initialTab, registerDayInitial]);

  useEffect(() => {
    if (!employeeSelfService) return;
    if (
      tab === "personnel" ||
      tab === "tourismSeason" ||
      tab === "zReportAccounting" ||
      tab === "dashboard" ||
      tab === "documents"
    ) {
      setTab("income");
    }
  }, [employeeSelfService, tab]);

  useEffect(() => {
    setTxDeletePendingId(null);
  }, [tab]);

  useEffect(() => {
    if (tab !== "personnel") setPersonnelSubTab("people");
  }, [tab]);

  useEffect(() => {
    if (tab !== "income") setIncomeFiltersOpen(false);
    if (tab !== "expenses") {
      setExpenseFiltersOpen(false);
      setExpenseOverviewDetail(null);
    }
  }, [tab]);

  useEffect(() => {
    if (!expenseOverviewDetail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpenseOverviewDetail(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expenseOverviewDetail]);

  useEffect(() => {
    setExpPage(1);
  }, [expFrom, expTo, expFilterMain, expFilterPay]);

  useEffect(() => {
    setIncPage(1);
  }, [incFrom, incTo, incFilterMain, incFilterCash]);

  const incFiltersActive = useMemo(() => {
    const today = localIsoDate();
    return Boolean(
      incFilterMain.trim() ||
        incFilterCash.trim() ||
        incFrom !== today ||
        incTo !== today ||
        (incFrom === "" && incTo === "")
    );
  }, [incFrom, incTo, incFilterMain, incFilterCash]);

  const expFiltersActive = useMemo(() => {
    const today = localIsoDate();
    return Boolean(
      expFilterMain.trim() ||
        expFilterPay.trim() ||
        expFrom !== today ||
        expTo !== today ||
        (expFrom === "" && expTo === "")
    );
  }, [expFrom, expTo, expFilterMain, expFilterPay]);

  const advanceYear = useMemo(() => {
    const y = Math.trunc(Number(txDay.slice(0, 4)));
    return Number.isFinite(y) && y >= 1900 ? y : new Date().getFullYear();
  }, [txDay]);

  const personnelAdvancesActive = tab === "personnel" && !employeeSelfService;

  const advanceQueries = useQueries({
    queries: staff.map((p) => ({
      queryKey: personnelKeys.advances(p.id),
      queryFn: () => fetchAdvancesByPersonnel(p.id),
      enabled: personnelAdvancesActive,
    })),
  });

  const staffRows = useMemo(() => {
    return staff.map((p, i) => {
      const q = advanceQueries[i];
      const allBranch = (q?.data ?? []).filter((a) => a.branchId === branch.id);
      const rows = allBranch.filter((a) => a.effectiveYear === advanceYear);
      const codes = [
        ...new Set(
          rows.map((a) => String(a.currencyCode || "TRY").trim().toUpperCase())
        ),
      ];
      const advCurrency = codes.length === 1 ? codes[0] : undefined;
      const total = rows.reduce((s, a) => s + a.amount, 0);
      return {
        personnel: p,
        total,
        count: rows.length,
        pending: q?.isPending ?? false,
        failed: q?.isError ?? false,
        advCurrency,
      };
    });
  }, [staff, advanceQueries, branch.id, advanceYear]);

  const { branchAdvanceTotal, branchAdvCurrency } = useMemo(() => {
    const all = staff.flatMap((p, i) => {
      const q = advanceQueries[i];
      return (q?.data ?? []).filter(
        (a) => a.branchId === branch.id && a.effectiveYear === advanceYear
      );
    });
    const codes = [
      ...new Set(
        all.map((a) => String(a.currencyCode || "TRY").trim().toUpperCase())
      ),
    ];
    return {
      branchAdvanceTotal: all.reduce((s, a) => s + a.amount, 0),
      branchAdvCurrency: codes.length === 1 ? codes[0] : undefined,
    };
  }, [staff, advanceQueries, branch.id, advanceYear]);

  const advancesLoading = advanceQueries.some((q) => q.isPending);

  const canDeleteBranchTx = !employeeSelfService;

  const confirmDeleteBranchTx = async (id: number) => {
    try {
      await deleteTxMut.mutateAsync(id);
      setTxDeletePendingId(null);
      notify.success(t("toast.branchTxDeleted"));
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  };

  const incMainFilterOpts = useMemo(
    () => [
      { value: "", label: t("branch.txFilterAny") },
      ...TX_MAIN_IN.map((x) => ({ value: x.value, label: t(x.labelKey) })),
    ],
    [t]
  );
  const incCashFilterOpts = useMemo(
    () => [
      { value: "", label: t("branch.txFilterAny") },
      { value: "PATRON", label: t("branch.cashSettlementPatron") },
      { value: "BRANCH_MANAGER", label: t("branch.cashSettlementBranchManager") },
      { value: "REMAINS_AT_BRANCH", label: t("branch.cashSettlementRemainsAtBranch") },
    ],
    [t]
  );
  const expMainFilterOpts = useMemo(
    () => [
      { value: "", label: t("branch.txFilterAny") },
      ...TX_MAIN_OUT.map((x) => ({ value: x.value, label: t(x.labelKey) })),
    ],
    [t]
  );
  const expPayFilterOpts = useMemo(
    () => [
      { value: "", label: t("branch.txFilterAny") },
      { value: "REGISTER", label: t("branch.expensePayRegister") },
      { value: "PATRON", label: t("branch.expensePayPatron") },
      { value: "PERSONNEL_HELD_REGISTER_CASH", label: t("branch.expensePayPersonnelHeldRegisterCash") },
      { value: "PERSONNEL_POCKET", label: t("branch.expensePayPersonnelPocket") },
    ],
    [t]
  );

  const {
    data: dash,
    isPending: dashLoading,
    isError: dashErr,
    error: dashError,
    refetch: refetchDash,
  } = useBranchDashboard(
    branch.id,
    dashboardMonth,
    tab === "dashboard" && !employeeSelfService,
    dashboardStockScope
  );

  const {
    data: transactions = [],
    isPending: txLoading,
    isError: txError,
    error: txErr,
    refetch: refetchTx,
  } = useBranchTransactions(
    branch.id,
    txDay,
    tab === "dashboard" && !employeeSelfService
  );

  const {
    data: regSum,
    isPending: regSumLoading,
    isError: regSumError,
    error: regSumErr,
    refetch: refetchRegSum,
  } = useBranchRegisterSummary(
    tab === "dashboard" && !employeeSelfService ? branch.id : null,
    txDay
  );

  const expParams = useMemo(
    () => ({
      page: expPage,
      pageSize: EXP_PAGE,
      type: "OUT" as const,
      dateFrom: expFrom.length === 10 ? expFrom : undefined,
      dateTo: expTo.length === 10 ? expTo : undefined,
      mainCategory: expFilterMain.trim() || undefined,
      expensePaymentSource: expFilterPay.trim() || undefined,
      excludeDebtClosureOuts: true,
    }),
    [expPage, expFrom, expTo, expFilterMain, expFilterPay]
  );

  const todayIso = localIsoDate();

  const incomeSummaryEnabled = tab === "income" && !employeeSelfService;
  const expenseSummaryEnabled = tab === "expenses" && !employeeSelfService;

  /** Tek gün özeti: iki tarih de boşsa bugün; ikisi de dolu ve eşitse o gün. */
  const incListDetailSingleDay = useMemo(() => {
    if (incFrom.length === 10 && incTo.length === 10 && incFrom === incTo) return incFrom;
    if (incFrom === "" && incTo === "") return todayIso;
    return null;
  }, [incFrom, incTo, todayIso]);

  const incListDetailRangeActive = useMemo(() => {
    if (!incomeSummaryEnabled) return false;
    if (incFrom.length !== 10 || incTo.length !== 10) return false;
    if (incFrom === incTo) return false;
    return incFrom < incTo;
  }, [incomeSummaryEnabled, incFrom, incTo]);

  const incListDatesPartialInvalid = useMemo(() => {
    const a = incFrom.length;
    const b = incTo.length;
    if (a > 0 && a !== 10) return true;
    if (b > 0 && b !== 10) return true;
    if (a === 10 && b === 0) return true;
    if (a === 0 && b === 10) return true;
    return false;
  }, [incFrom, incTo]);

  const incListDatesRangeInvalid =
    incFrom.length === 10 && incTo.length === 10 && incFrom > incTo;

  const expListDetailSingleDay = useMemo(() => {
    if (expFrom.length === 10 && expTo.length === 10 && expFrom === expTo) return expFrom;
    if (expFrom === "" && expTo === "") return todayIso;
    return null;
  }, [expFrom, expTo, todayIso]);

  const expListDetailRangeActive = useMemo(() => {
    if (!expenseSummaryEnabled) return false;
    if (expFrom.length !== 10 || expTo.length !== 10) return false;
    if (expFrom === expTo) return false;
    return expFrom < expTo;
  }, [expenseSummaryEnabled, expFrom, expTo]);

  const expListDatesPartialInvalid = useMemo(() => {
    const a = expFrom.length;
    const b = expTo.length;
    if (a > 0 && a !== 10) return true;
    if (b > 0 && b !== 10) return true;
    if (a === 10 && b === 0) return true;
    if (a === 0 && b === 10) return true;
    return false;
  }, [expFrom, expTo]);

  const expListDatesRangeInvalid =
    expFrom.length === 10 && expTo.length === 10 && expFrom > expTo;

  const {
    data: incThroughToday,
    isPending: incThroughTodayPending,
    isError: incThroughTodayErr,
    error: incThroughTodayErrorMsg,
    refetch: refetchIncThroughToday,
  } = useBranchRegisterSummary(
    incomeSummaryEnabled ? branch.id : null,
    todayIso,
    incomeSummaryEnabled
  );

  const {
    data: incListDayRegister,
    isPending: incListDayRegisterPending,
    isError: incListDayRegisterErr,
    error: incListDayRegisterErrorMsg,
    refetch: refetchIncListDayRegister,
  } = useBranchRegisterSummary(
    incomeSummaryEnabled && incListDetailSingleDay != null && !incListDetailRangeActive
      ? branch.id
      : null,
    incListDetailSingleDay ?? "",
    incomeSummaryEnabled && incListDetailSingleDay != null && !incListDetailRangeActive
  );

  const {
    data: incListPeriod,
    isPending: incListPeriodPending,
    isError: incListPeriodErr,
    error: incListPeriodErrorMsg,
    refetch: refetchIncListPeriod,
  } = useBranchIncomePeriodSummary(
    incomeSummaryEnabled && incListDetailRangeActive ? branch.id : null,
    incFrom,
    incTo,
    incomeSummaryEnabled && incListDetailRangeActive
  );

  const refetchIncomeSummaryBlocks = () => {
    void refetchIncThroughToday();
    if (incListDetailSingleDay != null && !incListDetailRangeActive) void refetchIncListDayRegister();
    if (incListDetailRangeActive) void refetchIncListPeriod();
  };

  /** Sadece ilk yüklemede iskelet; önbellekte veri varken `isPending` yanıltıcı olabiliyor. */
  const incSummaryShowSkeleton = incThroughTodayPending && incThroughToday == null;
  const incSummaryShowErr = incThroughTodayErr;
  const incSummaryErrFirst = incThroughTodayErrorMsg;

  const incListSummaryUsesDayQuery =
    incomeSummaryEnabled && incListDetailSingleDay != null && !incListDetailRangeActive;
  const incListSummaryUsesPeriodQuery = incomeSummaryEnabled && incListDetailRangeActive;

  const incListSummaryPending =
    (incListSummaryUsesDayQuery && incListDayRegisterPending) ||
    (incListSummaryUsesPeriodQuery && incListPeriodPending);
  const incListSummaryShowErr =
    (incListSummaryUsesDayQuery && incListDayRegisterErr) ||
    (incListSummaryUsesPeriodQuery && incListPeriodErr);
  const incListSummaryErrFirst = incListSummaryUsesDayQuery && incListDayRegisterErr
    ? incListDayRegisterErrorMsg
    : incListSummaryUsesPeriodQuery && incListPeriodErr
      ? incListPeriodErrorMsg
      : null;

  const {
    data: expThroughToday,
    isPending: expThroughTodayPending,
    isError: expThroughTodayErr,
    error: expThroughTodayErrorMsg,
    refetch: refetchExpThroughToday,
  } = useBranchRegisterSummary(
    expenseSummaryEnabled ? branch.id : null,
    todayIso,
    expenseSummaryEnabled
  );

  const {
    data: expListDayRegister,
    isPending: expListDayRegisterPending,
    isError: expListDayRegisterErr,
    error: expListDayRegisterErrorMsg,
    refetch: refetchExpListDayRegister,
  } = useBranchRegisterSummary(
    expenseSummaryEnabled && expListDetailSingleDay != null && !expListDetailRangeActive
      ? branch.id
      : null,
    expListDetailSingleDay ?? "",
    expenseSummaryEnabled && expListDetailSingleDay != null && !expListDetailRangeActive
  );

  const expSummaryShowSkeleton = expThroughTodayPending && expThroughToday == null;
  const expSummaryShowErr = expThroughTodayErr;
  const expSummaryErrFirst = expThroughTodayErrorMsg;

  const expListSummaryUsesDayQuery =
    expenseSummaryEnabled && expListDetailSingleDay != null && !expListDetailRangeActive;
  const expListSummaryUsesPeriodQuery = expenseSummaryEnabled && expListDetailRangeActive;

  const {
    data: expData,
    isPending: expLoading,
    isError: expErr,
    error: expError,
    refetch: refetchExp,
  } = useBranchTransactionsPaged(branch.id, expParams, tab === "expenses");

  const expListSummaryPending =
    (expListSummaryUsesDayQuery && expListDayRegisterPending) ||
    (expListSummaryUsesPeriodQuery && expLoading);
  const expListSummaryShowErr =
    (expListSummaryUsesDayQuery && expListDayRegisterErr) ||
    (expListSummaryUsesPeriodQuery && expErr);
  const expListSummaryErrFirst = expListSummaryUsesDayQuery && expListDayRegisterErr
    ? expListDayRegisterErrorMsg
    : expListSummaryUsesPeriodQuery && expErr
      ? expError
      : null;

  const refetchExpenseSummaryBlocks = () => {
    void refetchExpThroughToday();
    if (expListDetailSingleDay != null && !expListDetailRangeActive) void refetchExpListDayRegister();
  };

  const incParams = useMemo(
    () => ({
      page: incPage,
      pageSize: INC_PAGE,
      type: "IN" as const,
      dateFrom: incFrom.length === 10 ? incFrom : undefined,
      dateTo: incTo.length === 10 ? incTo : undefined,
      mainCategory: incFilterMain.trim() || undefined,
      cashSettlementParty: incFilterCash.trim() || undefined,
    }),
    [incPage, incFrom, incTo, incFilterMain, incFilterCash]
  );

  const {
    data: incData,
    isPending: incLoading,
    isError: incErr,
    error: incError,
    refetch: refetchInc,
  } = useBranchTransactionsPaged(branch.id, incParams, tab === "income");

  const incListPatronOverlay = useMemo((): PatronIncomePin | null => {
    if (tab !== "income") return null;
    if (incFrom.length !== 10 || incTo.length !== 10 || incFrom > incTo) return null;
    const p = incData?.patronIncomeToPatron;
    if (!p || !patronIncomeToPatronVisible(p)) return null;
    return p;
  }, [tab, incFrom, incTo, incData?.patronIncomeToPatron]);

  const {
    data: branchAdvances = [],
    isPending: branchAdvLoading,
    isError: branchAdvError,
    error: branchAdvErr,
    refetch: refetchBranchAdv,
  } = useBranchAdvancesList(
    personnelAdvancesActive ? branch.id : null,
    !employeeSelfService
  );

  const openAdvance = (personnelId?: number) => {
    setAdvanceInitialPersonId(
      personnelId != null && personnelId > 0 ? personnelId : null
    );
    setAdvanceOpen(true);
  };

  const openPocketRepayExpense = useCallback(
    (personnelId: number, currencyCode: string) => {
      const cur = currencyCode.trim().toUpperCase() || "TRY";
      setTab("expenses");
      setTxModalLaunch({
        defaultType: "OUT",
        defaultTransactionDate: txDay,
        defaultPocketRepayPersonnelId: personnelId,
        defaultPocketRepayCurrencyCode: cur,
      });
      setTxModalOpen(true);
    },
    [txDay]
  );

  const closeAdvance = () => {
    setAdvanceOpen(false);
    setAdvanceInitialPersonId(null);
  };

  const expTotal = expData?.totalCount ?? 0;
  const expPages = Math.max(1, Math.ceil(expTotal / EXP_PAGE));
  const incTotal = incData?.totalCount ?? 0;
  const incPages = Math.max(1, Math.ceil(incTotal / INC_PAGE));

  const tabs: { id: BranchDetailTabId; label: string }[] = useMemo(() => {
      const all: { id: BranchDetailTabId; label: string }[] = [
      { id: "dashboard", label: t("branch.tabDashboard") },
      { id: "personnel", label: t("branch.tabPersonnel") },
      { id: "income", label: t("branch.tabIncome") },
      { id: "expenses", label: t("branch.tabExpenses") },
      { id: "stock", label: t("branch.tabStock") },
      { id: "tourismSeason", label: t("branch.tabTourismSeason") },
      { id: "zReportAccounting", label: t("branch.tabZReportAccounting") },
      { id: "documents", label: t("branch.tabDocuments") },
      { id: "notes", label: t("branch.tabNotes") },
    ];
    if (!employeeSelfService) return all;
    return all.filter(
      (x) =>
        x.id !== "personnel" &&
        x.id !== "tourismSeason" &&
        x.id !== "zReportAccounting" &&
        x.id !== "dashboard" &&
        x.id !== "documents"
    );
  }, [t, employeeSelfService]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-w-0 shrink-0 border-b border-zinc-200 bg-white/95 px-2 pt-1 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:px-4">
        <div
          role="tablist"
          aria-orientation="horizontal"
          aria-label={t("branch.detailTabsAria")}
          className="-mx-1 flex w-auto min-w-0 snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain px-1 pb-2 touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]"
        >
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={tab === x.id}
              title={x.label}
              className={cn(
                "min-h-10 shrink-0 snap-start whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold leading-tight transition-all sm:px-4 sm:text-sm",
                tab === x.id
                  ? "bg-zinc-900 text-white shadow-sm shadow-zinc-900/25 ring-1 ring-zinc-800"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              )}
              onClick={() => setTab(x.id)}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 [-webkit-overflow-scrolling:touch] sm:px-5 sm:py-5"
      >

        {tab === "dashboard" && (
          <BranchDetailDashboardTab
            t={t}
            locale={locale as Locale}
            txDay={txDay}
            setTxDay={setTxDay}
            setTxModalLaunch={setTxModalLaunch}
            setTxModalOpen={setTxModalOpen}
            refetchTx={refetchTx}
            refetchRegSum={refetchRegSum}
            regSumError={regSumError}
            regSumErr={regSumErr}
            regSumLoading={regSumLoading}
            regSum={regSum}
            txError={txError}
            txErr={txErr}
            txLoading={txLoading}
            transactions={transactions}
            dashErr={dashErr}
            dashError={dashError}
            dashLoading={dashLoading}
            dash={dash}
            dashboardMonth={dashboardMonth}
            setDashboardMonth={setDashboardMonth}
            dashboardStockScope={dashboardStockScope}
            setDashboardStockScope={setDashboardStockScope}
            refetchDash={refetchDash}
            onOpenStockDetailTab={() => setTab("stock")}
          />
        )}

        {tab === "personnel" && (
          <BranchDetailPersonnelTab
            t={t}
            locale={locale as Locale}
            branch={branch}
            staff={staff}
            personnelSubTab={personnelSubTab}
            setPersonnelSubTab={setPersonnelSubTab}
            setAssignPersonnelOpen={setAssignPersonnelOpen}
            activePersonnel={activePersonnel}
            openAdvance={openAdvance}
            refetchBranchAdv={refetchBranchAdv}
            personnelMoneyById={personnelMoneyById}
            personnelMoneyPending={personnelMoneyPending}
            staffRows={staffRows}
            branchAdvanceTotal={branchAdvanceTotal}
            branchAdvCurrency={branchAdvCurrency}
            advancesLoading={advancesLoading}
            branchAdvances={branchAdvances}
            branchAdvLoading={branchAdvLoading}
            branchAdvError={branchAdvError}
            branchAdvErr={branchAdvErr}
            openPocketRepayExpense={openPocketRepayExpense}
            personnelAdvanceFiscalYear={advanceYear}
          />
        )}

        {tab === "income" && (
          <BranchDetailIncomeTab
            t={t}
            locale={locale as Locale}
            employeeSelfService={employeeSelfService}
            branchIdForTourismLink={branch.id}
            incThroughToday={incThroughToday}
            incSummaryShowErr={incSummaryShowErr}
            incSummaryErrFirst={incSummaryErrFirst}
            incSummaryShowSkeleton={incSummaryShowSkeleton}
            incListSummaryShowErr={incListSummaryShowErr}
            incListSummaryErrFirst={incListSummaryErrFirst}
            incListSummaryPending={incListSummaryPending}
            incListDetailRangeActive={incListDetailRangeActive}
            incListPeriod={incListPeriod}
            incListDetailSingleDay={incListDetailSingleDay}
            incListDayRegister={incListDayRegister}
            incListDatesRangeInvalid={incListDatesRangeInvalid}
            incListDatesPartialInvalid={incListDatesPartialInvalid}
            incListPatronOverlay={incListPatronOverlay}
            setTxModalLaunch={setTxModalLaunch}
            setTxModalOpen={setTxModalOpen}
            incFrom={incFrom}
            incTo={incTo}
            setIncFrom={setIncFrom}
            setIncTo={setIncTo}
            setIncPage={setIncPage}
            incomeFiltersOpen={incomeFiltersOpen}
            setIncomeFiltersOpen={setIncomeFiltersOpen}
            incFiltersActive={incFiltersActive}
            incMainFilterOpts={incMainFilterOpts}
            incCashFilterOpts={incCashFilterOpts}
            incFilterMain={incFilterMain}
            setIncFilterMain={setIncFilterMain}
            incFilterCash={incFilterCash}
            setIncFilterCash={setIncFilterCash}
            refetchInc={refetchInc}
            refetchIncomeSummaryBlocks={refetchIncomeSummaryBlocks}
            incErr={incErr}
            incError={incError}
            incLoading={incLoading}
            incData={incData}
            canDeleteBranchTx={canDeleteBranchTx}
            deleteTxMut={deleteTxMut}
            confirmDeleteBranchTx={confirmDeleteBranchTx}
            incPage={incPage}
            incPages={incPages}
            incTotal={incTotal}
            INC_PAGE={INC_PAGE}
          />
        )}

        {tab === "expenses" && (
          <BranchDetailExpensesTab
            t={t}
            locale={locale as Locale}
            employeeSelfService={employeeSelfService}
            branchIdForTourismLink={branch.id}
            tabIsActive={tab === "expenses"}
            expenseOverviewDetail={expenseOverviewDetail}
            setExpenseOverviewDetail={setExpenseOverviewDetail}
            expSummaryShowErr={expSummaryShowErr}
            expSummaryErrFirst={expSummaryErrFirst}
            expSummaryShowSkeleton={expSummaryShowSkeleton}
            expThroughToday={expThroughToday}
            expListSummaryShowErr={expListSummaryShowErr}
            expListSummaryErrFirst={expListSummaryErrFirst}
            expListSummaryPending={expListSummaryPending}
            expListDetailRangeActive={expListDetailRangeActive}
            expLoading={expLoading}
            expErr={expErr}
            expError={expError}
            expData={expData}
            expListDayRegister={expListDayRegister}
            expListDetailSingleDay={expListDetailSingleDay}
            expListDatesRangeInvalid={expListDatesRangeInvalid}
            expListDatesPartialInvalid={expListDatesPartialInvalid}
            setTxModalLaunch={setTxModalLaunch}
            setTxModalOpen={setTxModalOpen}
            expFrom={expFrom}
            expTo={expTo}
            setExpFrom={setExpFrom}
            setExpTo={setExpTo}
            setExpPage={setExpPage}
            expenseFiltersOpen={expenseFiltersOpen}
            setExpenseFiltersOpen={setExpenseFiltersOpen}
            expFiltersActive={expFiltersActive}
            expMainFilterOpts={expMainFilterOpts}
            expPayFilterOpts={expPayFilterOpts}
            expFilterMain={expFilterMain}
            setExpFilterMain={setExpFilterMain}
            expFilterPay={expFilterPay}
            setExpFilterPay={setExpFilterPay}
            refetchExp={refetchExp}
            refetchExpenseSummaryBlocks={refetchExpenseSummaryBlocks}
            canDeleteBranchTx={canDeleteBranchTx}
            txDeletePendingId={txDeletePendingId}
            setTxDeletePendingId={setTxDeletePendingId}
            confirmDeleteBranchTx={confirmDeleteBranchTx}
            deleteTxMut={deleteTxMut}
            setInvoiceSettleRow={setInvoiceSettleRow}
            expPage={expPage}
            expPages={expPages}
            expTotal={expTotal}
            EXP_PAGE={EXP_PAGE}
          />
        )}

        {tab === "stock" && <BranchDetailStockTab branchId={branch.id} />}

        {tab === "tourismSeason" && !employeeSelfService ? (
          <BranchTourismSeasonTab branchId={branch.id} active={tab === "tourismSeason"} />
        ) : null}

        {tab === "zReportAccounting" && !employeeSelfService ? (
          <BranchZReportAccountingTab branchId={branch.id} active={tab === "zReportAccounting"} />
        ) : null}

        {tab === "documents" && !employeeSelfService ? (
          <BranchDetailDocumentsTab
            branchId={branch.id}
            active={tab === "documents"}
            readOnly={employeeSelfService}
          />
        ) : null}

        {tab === "notes" ? (
          <BranchNotesTab
            branchId={branch.id}
            active={tab === "notes"}
            readOnly={employeeSelfService}
          />
        ) : null}

      </div>

      <AddBranchTransactionModal
        open={txModalOpen}
        onClose={() => {
          setTxModalOpen(false);
          setTxModalLaunch({});
        }}
        branchId={branch.id}
        defaultTransactionDate={txModalLaunch.defaultTransactionDate ?? txDay}
        defaultType={txModalLaunch.defaultType}
        defaultMainCategory={txModalLaunch.defaultMainCategory}
        defaultPocketRepayPersonnelId={txModalLaunch.defaultPocketRepayPersonnelId}
        defaultPocketRepayCurrencyCode={txModalLaunch.defaultPocketRepayCurrencyCode}
      />

      <InvoiceSettleModal
        open={invoiceSettleRow != null}
        onClose={() => setInvoiceSettleRow(null)}
        row={invoiceSettleRow}
        branchStaff={staff}
      />

      {!employeeSelfService ? (
        <AdvancePersonnelModal
          open={advanceOpen}
          onClose={closeAdvance}
          personnel={activePersonnel}
          initialPersonnelId={advanceInitialPersonId}
        />
      ) : null}

      {!employeeSelfService ? (
        <AssignPersonnelToBranchModal
          open={assignPersonnelOpen}
          onClose={() => setAssignPersonnelOpen(false)}
          targetBranch={branch}
          activePersonnel={activePersonnel}
        />
      ) : null}
    </div>
  );
}
