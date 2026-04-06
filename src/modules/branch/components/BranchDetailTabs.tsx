"use client";

import {
  branchTxLinkedExpenseLine,
  cashSettlementPartyLabel,
  expensePaymentSourceLabel,
  txCategoryLine,
  txCodeLabel,
  TX_MAIN_IN,
  TX_MAIN_OUT,
} from "@/modules/branch/lib/branch-transaction-options";
import { branchTransactionReceiptPhotoUrl } from "@/modules/branch/api/branch-transactions-api";
import {
  useBranchAdvancesList,
  useBranchDashboard,
  useBranchRegisterSummary,
  useBranchStockReceiptsPaged,
  useBranchTransactions,
  useBranchTransactionsPaged,
  useDeleteBranchTransaction,
} from "@/modules/branch/hooks/useBranchQueries";
import { AdvancePersonnelModal } from "@/modules/personnel/components/AdvancePersonnelModal";
import { PersonnelAdvanceHistory } from "@/modules/personnel/components/PersonnelAdvanceHistory";
import { fetchAdvancesByPersonnel } from "@/modules/personnel/api/advances-api";
import {
  personnelKeys,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import type { Branch } from "@/types/branch";
import type { BranchTransaction } from "@/types/branch-transaction";
import type { Personnel } from "@/types/personnel";

function registerCashSettlementLabel(
  row: BranchTransaction,
  t: (key: string) => string
): string {
  return cashSettlementPartyLabel(
    row.cashSettlementParty,
    t,
    row.cashSettlementParty === "BRANCH_MANAGER" && row.cashSettlementPersonnelFullName
      ? {
          fullName: row.cashSettlementPersonnelFullName,
          jobTitle: row.cashSettlementPersonnelJobTitle,
        }
      : null
  );
}

function expensePocketSubline(
  row: BranchTransaction,
  t: (key: string) => string
): string | null {
  if (String(row.expensePaymentSource ?? "").trim().toUpperCase() !== "PERSONNEL_POCKET")
    return null;
  const n = row.expensePocketPersonnelFullName?.trim();
  if (!n) return null;
  return `${t("branch.expensePocketPersonLabel")}: ${n}`;
}
import { cn } from "@/lib/cn";
import { formatMoneyDash } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notify } from "@/shared/lib/notify";
import { Button } from "@/shared/ui/Button";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { Input } from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/Table";
import { useI18n } from "@/i18n/context";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AddBranchTransactionModal } from "./AddBranchTransactionModal";
import { BranchTourismSeasonTab } from "./BranchTourismSeasonTab";

type TabId = "dashboard" | "personnel" | "income" | "expenses" | "stock" | "tourismSeason";

type PersonnelSubTabId = "people" | "advances";

type Props = {
  branch: Branch;
  staff: Personnel[];
  employeeSelfService?: boolean;
};

function isoMonthLocal(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function advanceSourceLabel(code: string, t: (key: string) => string): string {
  const u = String(code ?? "").trim().toUpperCase();
  if (u === "CASH") return t("personnel.sourceCash");
  if (u === "BANK") return t("personnel.sourceBank");
  if (u === "PATRON") return t("personnel.sourcePatron");
  return u ? code : t("personnel.dash");
}

function BranchTxDeleteRow({
  transactionId,
  pendingId,
  onSetPending,
  onConfirm,
  busy,
  show,
  t,
}: {
  transactionId: number;
  pendingId: number | null;
  onSetPending: (id: number | null) => void;
  onConfirm: (id: number) => void | Promise<void>;
  busy: boolean;
  show: boolean;
  t: (key: string) => string;
}) {
  if (!show) return null;
  if (pendingId === transactionId) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <p className="text-xs leading-snug text-zinc-600">{t("branch.txDeleteSure")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-9 text-xs"
            disabled={busy}
            onClick={() => onSetPending(null)}
          >
            {t("branch.txDeleteCancel")}
          </Button>
          <Button
            type="button"
            className="min-h-9 bg-red-600 text-xs text-white hover:bg-red-700"
            disabled={busy}
            onClick={() => void onConfirm(transactionId)}
          >
            {t("branch.txDeleteConfirm")}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <button
      type="button"
      className={trashIconActionButtonClass}
      aria-label={t("branch.txDeleteAria")}
      disabled={busy}
      onClick={() => onSetPending(transactionId)}
    >
      <TrashIcon className="h-5 w-5" />
    </button>
  );
}

const EXP_PAGE = 15;
const INC_PAGE = 15;
const STOCK_PAGE = 15;

export function BranchDetailTabs({
  branch,
  staff,
  employeeSelfService = false,
}: Props) {
  const { t, locale } = useI18n();
  const deleteTxMut = useDeleteBranchTransaction();
  const { data: personnelData = [] } = usePersonnelList(!employeeSelfService);
  const activePersonnel = useMemo(
    () => personnelData.filter((p) => !p.isDeleted),
    [personnelData]
  );

  const [tab, setTab] = useState<TabId>("dashboard");
  const [dashboardMonth, setDashboardMonth] = useState(() => isoMonthLocal(new Date()));
  const [txDay, setTxDay] = useState(() => localIsoDate());
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txModalLaunch, setTxModalLaunch] = useState<{
    defaultType?: "IN" | "OUT";
    defaultTransactionDate?: string;
  }>({});
  const [txDeletePendingId, setTxDeletePendingId] = useState<number | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advanceInitialPersonId, setAdvanceInitialPersonId] = useState<number | null>(null);
  const [personnelSubTab, setPersonnelSubTab] = useState<PersonnelSubTabId>("people");

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

  const [stFrom, setStFrom] = useState("");
  const [stTo, setStTo] = useState("");
  const [stPage, setStPage] = useState(1);

  useEffect(() => {
    const today = localIsoDate();
    setTab(employeeSelfService ? "income" : "dashboard");
    setDashboardMonth(isoMonthLocal(new Date()));
    setTxDay(today);
    setExpFrom(today);
    setExpTo(today);
    setExpPage(1);
    setExpFilterMain("");
    setExpFilterPay("");
    setIncFrom(today);
    setIncTo(today);
    setIncPage(1);
    setIncFilterMain("");
    setIncFilterCash("");
    setStFrom(today);
    setStTo(today);
    setStPage(1);
    setPersonnelSubTab("people");
    setTxDeletePendingId(null);
  }, [branch.id, employeeSelfService]);

  useEffect(() => {
    if (!employeeSelfService) return;
    if (
      tab === "personnel" ||
      tab === "tourismSeason" ||
      tab === "dashboard"
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
    setExpPage(1);
  }, [expFrom, expTo, expFilterMain, expFilterPay]);

  useEffect(() => {
    setIncPage(1);
  }, [incFrom, incTo, incFilterMain, incFilterCash]);

  useEffect(() => {
    setStPage(1);
  }, [stFrom, stTo]);

  const advanceYear = useMemo(() => {
    const y = Math.trunc(Number(txDay.slice(0, 4)));
    return Number.isFinite(y) && y >= 1900 ? y : new Date().getFullYear();
  }, [txDay]);

  const personnelAdvancesActive =
    tab === "personnel" && personnelSubTab === "advances";

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
    tab === "dashboard" && !employeeSelfService
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
    }),
    [expPage, expFrom, expTo, expFilterMain, expFilterPay]
  );

  const expenseCloseDay =
    tab === "expenses" && expFrom.length === 10 && expFrom === expTo ? expFrom : null;

  const incomeCloseDay =
    tab === "income" && incFrom.length === 10 && incFrom === incTo ? incFrom : null;

  const {
    data: incCloseSum,
    isPending: incCloseLoading,
    isError: incCloseErr,
    error: incCloseErrorMsg,
    refetch: refetchIncClose,
  } = useBranchRegisterSummary(
    incomeCloseDay && !employeeSelfService ? branch.id : null,
    incomeCloseDay ?? "2000-01-01"
  );

  const {
    data: expCloseSum,
    isPending: expCloseLoading,
    isError: expCloseErr,
    error: expCloseErrorMsg,
    refetch: refetchExpClose,
  } = useBranchRegisterSummary(
    expenseCloseDay && !employeeSelfService ? branch.id : null,
    expenseCloseDay ?? "2000-01-01"
  );

  const {
    data: expData,
    isPending: expLoading,
    isError: expErr,
    error: expError,
    refetch: refetchExp,
  } = useBranchTransactionsPaged(branch.id, expParams, tab === "expenses");

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

  const stParams = useMemo(
    () => ({
      page: stPage,
      pageSize: STOCK_PAGE,
      dateFrom: stFrom.length === 10 ? stFrom : undefined,
      dateTo: stTo.length === 10 ? stTo : undefined,
    }),
    [stPage, stFrom, stTo]
  );

  const {
    data: stData,
    isPending: stLoading,
    isError: stErr,
    error: stError,
    refetch: refetchSt,
  } = useBranchStockReceiptsPaged(branch.id, stParams, tab === "stock");

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

  const closeAdvance = () => {
    setAdvanceOpen(false);
    setAdvanceInitialPersonId(null);
  };

  const expTotal = expData?.totalCount ?? 0;
  const expPages = Math.max(1, Math.ceil(expTotal / EXP_PAGE));
  const incTotal = incData?.totalCount ?? 0;
  const incPages = Math.max(1, Math.ceil(incTotal / INC_PAGE));
  const stTotal = stData?.totalCount ?? 0;
  const stPages = Math.max(1, Math.ceil(stTotal / STOCK_PAGE));

  const tabs: { id: TabId; label: string }[] = useMemo(() => {
    const all: { id: TabId; label: string }[] = [
      { id: "dashboard", label: t("branch.tabDashboard") },
      { id: "personnel", label: t("branch.tabPersonnel") },
      { id: "income", label: t("branch.tabIncome") },
      { id: "expenses", label: t("branch.tabExpenses") },
      { id: "stock", label: t("branch.tabStock") },
      { id: "tourismSeason", label: t("branch.tabTourismSeason") },
    ];
    if (!employeeSelfService) return all;
    return all.filter(
      (x) =>
        x.id !== "personnel" &&
        x.id !== "tourismSeason" &&
        x.id !== "dashboard"
    );
  }, [t, employeeSelfService]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-zinc-200 bg-white px-2 pt-1 sm:px-4">
        <div
          role="tablist"
          aria-label={t("branch.detailTabsAria")}
          className="flex gap-1 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={tab === x.id}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors sm:px-4",
                tab === x.id
                  ? "bg-zinc-900 text-white"
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
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-5 sm:py-5"
      >
        {tab === "dashboard" && (
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 p-3 sm:p-4">
              <p className="text-sm font-semibold text-zinc-900">{t("branch.dashStoryTitle")}</p>
              <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-zinc-600">
                <li>{t("branch.dashStory1")}</li>
                <li>{t("branch.dashStory2")}</li>
                <li>{t("branch.dashStory3")}</li>
              </ol>
            </div>

            <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex flex-col gap-3 border-b border-zinc-100 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">{t("branch.dashSectionDay")}</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">{t("branch.dashSectionDayHint")}</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                  <div className="w-full min-w-0 sm:w-auto sm:min-w-[11rem]">
                    <Input
                      type="date"
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
                <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
                  <DashCard
                    label={t("branch.dayIncome")}
                    value={formatMoneyDash(regSum.dayTotalIncome, t("personnel.dash"), locale, "TRY")}
                    valueClass="text-emerald-800"
                    compact
                  />
                  <DashCard
                    label={t("branch.dayExpenseAccounting")}
                    value={formatMoneyDash(regSum.dayAccountingExpense, t("personnel.dash"), locale, "TRY")}
                    valueClass="text-red-800"
                    compact
                  />
                  <DashCard
                    label={t("branch.dayNet")}
                    value={formatMoneyDash(regSum.dayNetAccounting, t("personnel.dash"), locale, "TRY")}
                    hint={t("branch.dayNetAccountingHint")}
                    compact
                  />
                  <DashCard
                    label={t("branch.dayNetAfterAllRegisterOut")}
                    value={formatMoneyDash(
                      regSum.dayNetAfterAllRegisterOut ?? 0,
                      t("personnel.dash"),
                      locale,
                      "TRY"
                    )}
                    hint={t("branch.dayNetAfterAllRegisterOutHint")}
                    compact
                  />
                  <DashCard
                    label={t("branch.dayRegisterOwesPatron")}
                    value={formatMoneyDash(
                      regSum.dayRegisterOwesPatron ?? 0,
                      t("personnel.dash"),
                      locale,
                      "TRY"
                    )}
                    hint={t("branch.dayRegisterOwesPatronHint")}
                    compact
                  />
                  <DashCard
                    label={t("branch.dayRegisterOwesPersonnel")}
                    value={formatMoneyDash(
                      regSum.dayRegisterOwesPersonnel ?? 0,
                      t("personnel.dash"),
                      locale,
                      "TRY"
                    )}
                    hint={t("branch.dayRegisterOwesPersonnelHint")}
                    compact
                  />
                  <DashCard
                    label={t("branch.cashBalanceThrough")}
                    value={formatMoneyDash(regSum.cumulativeCashBalance, t("personnel.dash"), locale, "TRY")}
                    hint={t("branch.cashBalanceThroughHint")}
                    compact
                  />
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
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("branch.registerDayBookTitle")}
                  </h4>
                  <div className="space-y-2 md:hidden">
                    {transactions.map((row) => {
                      const expenseLinkLine = branchTxLinkedExpenseLine(row, t);
                      const pocketLine = expensePocketSubline(row, t);
                      return (
                      <div
                        key={row.id}
                        className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-zinc-900">
                            {row.type.toUpperCase() === "IN"
                              ? t("branch.txTypeIn")
                              : t("branch.txTypeOut")}
                          </span>
                          <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-zinc-900">
                            {formatMoneyDash(
                              row.amount,
                              t("personnel.dash"),
                              locale,
                              row.currencyCode
                            )}
                          </span>
                        </div>
                        {row.cashAmount != null && row.cardAmount != null ? (
                          <p className="mt-1.5 text-xs text-zinc-600">
                            {t("branch.txColCashCard")}:{" "}
                            {formatMoneyDash(row.cashAmount, t("personnel.dash"), locale, row.currencyCode)}{" "}
                            /{" "}
                            {formatMoneyDash(row.cardAmount, t("personnel.dash"), locale, row.currencyCode)}
                          </p>
                        ) : null}
                        {registerCashSettlementLabel(row, t) ? (
                          <p className="mt-1 text-xs text-zinc-600">
                            {t("branch.txColCashSettlement")}:{" "}
                            {registerCashSettlementLabel(row, t)}
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-xs text-zinc-600">
                          {txCategoryLine(row.mainCategory, row.category, t) || "—"}
                        </p>
                        {expenseLinkLine ? (
                          <p className="mt-1 text-xs text-zinc-500">{expenseLinkLine}</p>
                        ) : null}
                        {row.type.toUpperCase() === "OUT" &&
                        expensePaymentSourceLabel(row.expensePaymentSource, t) ? (
                          <p className="mt-1 text-xs text-zinc-600">
                            {t("branch.txColExpensePayment")}:{" "}
                            {expensePaymentSourceLabel(row.expensePaymentSource, t)}
                          </p>
                        ) : null}
                        {pocketLine ? (
                          <p className="mt-0.5 text-xs text-zinc-500">{pocketLine}</p>
                        ) : null}
                        {row.type.toUpperCase() === "OUT" && row.hasReceiptPhoto ? (
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
                      </div>
                    );})}
                  </div>
                  <div className="hidden max-h-[min(50vh,16rem)] overflow-auto rounded-lg border border-zinc-200 md:block md:max-h-[min(55vh,22rem)] lg:max-h-[min(60vh,26rem)]">
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
                        const pocketLine = expensePocketSubline(row, t);
                        return (
                        <TableRow key={row.id}>
                          <TableCell className="text-sm">
                            {row.type.toUpperCase() === "IN"
                              ? t("branch.txTypeIn")
                              : t("branch.txTypeOut")}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatMoneyDash(
                              row.amount,
                              t("personnel.dash"),
                              locale,
                              row.currencyCode
                            )}
                          </TableCell>
                          <TableCell className="hidden font-mono text-xs text-zinc-600 lg:table-cell">
                            {row.cashAmount != null && row.cardAmount != null
                              ? `${formatMoneyDash(row.cashAmount, t("personnel.dash"), locale, row.currencyCode)} / ${formatMoneyDash(row.cardAmount, t("personnel.dash"), locale, row.currencyCode)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="hidden text-xs text-zinc-600 lg:table-cell">
                            {registerCashSettlementLabel(row, t) || "—"}
                          </TableCell>
                          <TableCell className="hidden text-sm text-zinc-600 sm:table-cell">
                            <div>
                              {txCategoryLine(row.mainCategory, row.category, t) || t("personnel.dash")}
                            </div>
                            {expenseLinkLine ? (
                              <p className="mt-0.5 text-xs text-zinc-500">{expenseLinkLine}</p>
                            ) : null}
                            {row.type.toUpperCase() === "OUT" &&
                            expensePaymentSourceLabel(row.expensePaymentSource, t) ? (
                              <p className="mt-0.5 text-xs text-zinc-600">
                                {t("branch.txColExpensePayment")}:{" "}
                                {expensePaymentSourceLabel(row.expensePaymentSource, t)}
                              </p>
                            ) : null}
                            {pocketLine ? (
                              <p className="mt-0.5 text-xs text-zinc-500">{pocketLine}</p>
                            ) : null}
                          </TableCell>
                          <TableCell className="hidden text-sm text-zinc-600 md:table-cell">
                            {row.category
                              ? txCodeLabel(row.category, t) || t("personnel.dash")
                              : "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {row.type.toUpperCase() === "OUT" && row.hasReceiptPhoto ? (
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
                      );})}
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
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <DashCard
                    label={t("branch.dashMonthIncome")}
                    value={formatMoneyDash(dash.monthIncomeTotal, t("personnel.dash"), locale, "TRY")}
                    valueClass="text-emerald-800"
                  />
                  <DashCard
                    label={t("branch.dashMonthExpense")}
                    value={formatMoneyDash(dash.monthExpenseTotal, t("personnel.dash"), locale, "TRY")}
                    valueClass="text-red-800"
                  />
                </div>
              ) : null}
            </section>
          </div>
        )}

        {tab === "personnel" && (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/personnel"
                className="inline-flex min-h-11 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                {t("branch.openPersonnel")}
              </Link>
              <Button
                type="button"
                className="min-h-11"
                disabled={activePersonnel.length === 0}
                onClick={() => openAdvance()}
              >
                {t("branch.giveAdvance")}
              </Button>
              {personnelSubTab === "advances" ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => void refetchBranchAdv()}
                >
                  {t("branch.refreshTx")}
                </Button>
              ) : null}
            </div>

            <div
              role="tablist"
              aria-label={t("branch.personnelSubTabsAria")}
              className="flex shrink-0 gap-1 border-b border-zinc-200 pb-2"
            >
              <button
                type="button"
                role="tab"
                aria-selected={personnelSubTab === "people"}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  personnelSubTab === "people"
                    ? "bg-zinc-200 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100"
                )}
                onClick={() => setPersonnelSubTab("people")}
              >
                {t("branch.personnelSubTabPeople")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={personnelSubTab === "advances"}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  personnelSubTab === "advances"
                    ? "bg-zinc-200 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-100"
                )}
                onClick={() => setPersonnelSubTab("advances")}
              >
                {t("branch.personnelSubTabAdvances")}
              </button>
            </div>

            {personnelSubTab === "people" ? (
              <section className="min-h-0">
                <h3 className="text-sm font-semibold text-zinc-900">{t("branch.staffTitle")}</h3>
                {staff.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">{t("branch.staffNone")}</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeader>{t("branch.staffName")}</TableHeader>
                          <TableHeader className="min-w-[9rem]">{t("branch.staffGiveAdvanceRow")}</TableHeader>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {staff.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium text-zinc-900">{p.fullName}</TableCell>
                            <TableCell>
                              {!p.isDeleted ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="min-h-9 px-2 py-1 text-xs"
                                  onClick={() => openAdvance(p.id)}
                                >
                                  {t("branch.staffGiveAdvanceRow")}
                                </Button>
                              ) : (
                                <span className="text-sm text-zinc-400">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-6">
                <section>
                  <h3 className="text-sm font-semibold text-zinc-900">{t("branch.branchAdvancesTitle")}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{t("branch.branchAdvancesHint")}</p>
                  {branchAdvError && (
                    <p className="mt-2 text-sm text-red-600">{toErrorMessage(branchAdvErr)}</p>
                  )}
                  {branchAdvLoading ? (
                    <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
                  ) : branchAdvances.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">{t("branch.noBranchAdvances")}</p>
                  ) : (
                    <div className="mt-2 overflow-x-auto">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableHeader>{t("branch.advColDate")}</TableHeader>
                            <TableHeader>{t("branch.advColPerson")}</TableHeader>
                            <TableHeader>{t("branch.advColAmount")}</TableHeader>
                            <TableHeader className="hidden sm:table-cell">{t("branch.advColSource")}</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {branchAdvances.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell className="whitespace-nowrap text-sm">
                                {formatLocaleDate(String(a.advanceDate), locale)}
                              </TableCell>
                              <TableCell className="text-sm font-medium">{a.personnelFullName}</TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatMoneyDash(a.amount, t("personnel.dash"), locale, a.currencyCode)}
                              </TableCell>
                              <TableCell className="hidden text-sm text-zinc-600 sm:table-cell">
                                {advanceSourceLabel(a.sourceType, t)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-zinc-900">{t("branch.staffTitle")}</h3>
                  {staff.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">{t("branch.staffNone")}</p>
                  ) : (
                    <>
                      <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <p className="text-xs text-zinc-500">{t("branch.totalAdvancesBranchPeriod")}</p>
                        <p className="text-base font-semibold text-zinc-900">
                          {advancesLoading
                            ? t("common.loading")
                            : formatMoneyDash(
                                branchAdvanceTotal,
                                t("personnel.dash"),
                                locale,
                                branchAdvCurrency
                              )}
                        </p>
                      </div>
                      <div className="mt-3 overflow-x-auto">
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableHeader>{t("branch.staffName")}</TableHeader>
                              <TableHeader>{t("branch.staffAdvTotal")}</TableHeader>
                              <TableHeader className="hidden sm:table-cell">{t("branch.staffAdvCount")}</TableHeader>
                              <TableHeader className="min-w-[10rem]">{t("branch.staffGiveAdvanceRow")}</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {staffRows.map((r) => (
                              <TableRow key={r.personnel.id}>
                                <TableCell className="font-medium text-zinc-900">{r.personnel.fullName}</TableCell>
                                <TableCell className="font-mono text-sm">
                                  {r.pending
                                    ? t("common.loading")
                                    : r.failed
                                      ? "—"
                                      : formatMoneyDash(
                                          r.total,
                                          t("personnel.dash"),
                                          locale,
                                          r.advCurrency
                                        )}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  {r.pending ? t("common.loading") : r.failed ? "—" : r.count}
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="flex flex-col gap-2">
                                    {!r.personnel.isDeleted ? (
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        className="min-h-9 px-2 py-1 text-xs"
                                        onClick={() => openAdvance(r.personnel.id)}
                                      >
                                        {t("branch.staffGiveAdvanceRow")}
                                      </Button>
                                    ) : null}
                                    <PersonnelAdvanceHistory
                                      personnelId={r.personnel.id}
                                      branchIdFilter={branch.id}
                                      variant="inline"
                                      maxDetailRows={4}
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}
          </div>
        )}

        {tab === "income" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">{t("branch.incomeHint")}</p>

            {incomeCloseDay && !employeeSelfService ? (
              <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-zinc-900">{t("branch.incomeCloseTitle")}</h3>
                <p className="mt-1 text-xs text-zinc-600">{t("branch.incomeCloseHint")}</p>
                {incCloseErr && (
                  <p className="mt-2 text-sm text-red-600">{toErrorMessage(incCloseErrorMsg)}</p>
                )}
                {incCloseLoading ? (
                  <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
                ) : incCloseSum ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {t("branch.incomeCloseTotal")}
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-emerald-800 sm:text-base">
                        {formatMoneyDash(incCloseSum.dayTotalIncome, t("personnel.dash"), locale, "TRY")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {t("branch.incomeCloseCash")}
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-zinc-900 sm:text-base">
                        {formatMoneyDash(incCloseSum.dayIncomeCash, t("personnel.dash"), locale, "TRY")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:col-span-2 sm:p-3 lg:col-span-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {t("branch.incomeCloseCard")}
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-zinc-900 sm:text-base">
                        {formatMoneyDash(incCloseSum.dayIncomeCard, t("personnel.dash"), locale, "TRY")}
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : !incomeCloseDay && !employeeSelfService ? (
              <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                {t("branch.incomeClosePickSingleDay")}
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-zinc-500">{t("branch.incomeListSection")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="date"
                  label={t("branch.filterDateFrom")}
                  value={incFrom}
                  onChange={(e) => setIncFrom(e.target.value)}
                  className="min-w-0"
                />
                <Input
                  type="date"
                  label={t("branch.filterDateTo")}
                  value={incTo}
                  onChange={(e) => setIncTo(e.target.value)}
                  className="min-w-0"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Select
                  name="incFilterMain"
                  label={t("branch.txFilterMainCategory")}
                  options={incMainFilterOpts}
                  value={incFilterMain}
                  onChange={(e) => setIncFilterMain(e.target.value)}
                  onBlur={() => {}}
                />
                <Select
                  name="incFilterCash"
                  label={t("branch.txFilterCashSettlement")}
                  options={incCashFilterOpts}
                  value={incFilterCash}
                  onChange={(e) => setIncFilterCash(e.target.value)}
                  onBlur={() => {}}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="min-h-11"
                  onClick={() => {
                    const d =
                      incFrom.length === 10 && incFrom === incTo ? incFrom : localIsoDate();
                    setTxModalLaunch({ defaultType: "IN", defaultTransactionDate: d });
                    setTxModalOpen(true);
                  }}
                >
                  {t("branch.addIncomeTx")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => {
                    const d = localIsoDate();
                    setIncFrom(d);
                    setIncTo(d);
                    setIncPage(1);
                  }}
                >
                  {t("branch.filterToday")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => {
                    setIncFrom("");
                    setIncTo("");
                    setIncFilterMain("");
                    setIncFilterCash("");
                    setIncPage(1);
                  }}
                >
                  {t("branch.filterAllDates")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => {
                    void refetchInc();
                    void refetchIncClose();
                  }}
                >
                  {t("branch.filterApplyRefresh")}
                </Button>
              </div>
            </div>
            {incErr && <p className="text-sm text-red-600">{toErrorMessage(incError)}</p>}
            {incLoading ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : !incData?.items.length ? (
              <p className="text-sm text-zinc-600">{t("branch.noIncome")}</p>
            ) : (
              <>
                <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white sm:hidden">
                  {incData.items.map((row) => (
                    <li key={row.id} className="px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-zinc-500">
                          {formatLocaleDate(row.transactionDate, locale)}
                        </span>
                        <span className="shrink-0 font-mono text-sm font-semibold text-emerald-800">
                          {formatMoneyDash(row.amount, t("personnel.dash"), locale, row.currencyCode)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-800">
                        {txCategoryLine(row.mainCategory, row.category, t) || t("personnel.dash")}
                      </p>
                      {row.cashAmount != null && row.cardAmount != null ? (
                        <p className="mt-1 text-xs text-zinc-500">
                          {t("branch.txColCashCard")}:{" "}
                          {formatMoneyDash(row.cashAmount, t("personnel.dash"), locale, row.currencyCode)} /{" "}
                          {formatMoneyDash(row.cardAmount, t("personnel.dash"), locale, row.currencyCode)}
                        </p>
                      ) : null}
                      {registerCashSettlementLabel(row, t) ? (
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {t("branch.txColCashSettlement")}:{" "}
                          {registerCashSettlementLabel(row, t)}
                        </p>
                      ) : null}
                      {row.description ? (
                        <p className="mt-1 text-xs text-zinc-500">{row.description}</p>
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
                  ))}
                </ul>
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
                          <TableCell className="hidden font-mono text-xs text-zinc-600 lg:table-cell">
                            {row.cashAmount != null && row.cardAmount != null
                              ? `${formatMoneyDash(row.cashAmount, t("personnel.dash"), locale, row.currencyCode)} / ${formatMoneyDash(row.cardAmount, t("personnel.dash"), locale, row.currencyCode)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="hidden text-xs text-zinc-600 lg:table-cell">
                            {registerCashSettlementLabel(row, t) || "—"}
                          </TableCell>
                          <TableCell className="hidden text-sm text-zinc-600 sm:table-cell">
                            {txCategoryLine(row.mainCategory, row.category, t) || t("personnel.dash")}
                          </TableCell>
                          <TableCell className="hidden max-w-[14rem] truncate text-sm text-zinc-600 md:table-cell">
                            {row.description ?? "—"}
                          </TableCell>
                          {canDeleteBranchTx ? (
                            <TableCell className="align-top p-2">
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-zinc-600">
                    {(incPage - 1) * INC_PAGE + 1}–{Math.min(incPage * INC_PAGE, incTotal)} · {t("branch.pagingTotal")}{" "}
                    {incTotal}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11"
                      disabled={incPage <= 1}
                      onClick={() => setIncPage((p) => Math.max(1, p - 1))}
                    >
                      {t("branch.pagingPrev")}
                    </Button>
                    <span className="flex items-center text-sm tabular-nums text-zinc-700">
                      {incPage} / {incPages}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11"
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
        )}

        {tab === "expenses" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">{t("branch.expensesHint")}</p>

            {expenseCloseDay && !employeeSelfService ? (
              <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-zinc-900">{t("branch.expensesCloseTitle")}</h3>
                <p className="mt-1 text-xs text-zinc-600">{t("branch.expensesCloseHint")}</p>
                {expCloseErr && (
                  <p className="mt-2 text-sm text-red-600">{toErrorMessage(expCloseErrorMsg)}</p>
                )}
                {expCloseLoading ? (
                  <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
                ) : expCloseSum ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {t("branch.expensesCloseIncome")}
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-emerald-800 sm:text-base">
                        {formatMoneyDash(expCloseSum.dayTotalIncome, t("personnel.dash"), locale, "TRY")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {t("branch.expensesCloseExpense")}
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-red-800 sm:text-base">
                        {formatMoneyDash(expCloseSum.dayAccountingExpense, t("personnel.dash"), locale, "TRY")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {t("branch.expensesCloseNet")}
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-zinc-900 sm:text-base">
                        {formatMoneyDash(expCloseSum.dayNetAccounting, t("personnel.dash"), locale, "TRY")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {t("branch.expensesCloseCashOut")}
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-zinc-900 sm:text-base">
                        {formatMoneyDash(expCloseSum.dayCashOutFromRegister, t("personnel.dash"), locale, "TRY")}
                      </p>
                    </div>
                    <div className="col-span-2 rounded-lg border border-white bg-white p-2.5 shadow-sm sm:col-span-1 sm:p-3 lg:col-span-1">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {t("branch.expensesCloseNonRegister")}
                      </p>
                      <p className="mt-0.5 font-mono text-sm font-semibold text-amber-900 sm:text-base">
                        {formatMoneyDash(
                          expCloseSum.dayNonRegisterAdvanceExpense,
                          t("personnel.dash"),
                          locale,
                          "TRY"
                        )}
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : !expenseCloseDay && !employeeSelfService ? (
              <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                {t("branch.expensesClosePickSingleDay")}
              </p>
            ) : null}

            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-zinc-500">{t("branch.expensesListSection")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="date"
                  label={t("branch.filterDateFrom")}
                  value={expFrom}
                  onChange={(e) => setExpFrom(e.target.value)}
                  className="min-w-0"
                />
                <Input
                  type="date"
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
                  onChange={(e) => setExpFilterMain(e.target.value)}
                  onBlur={() => {}}
                />
                <Select
                  name="expFilterPay"
                  label={t("branch.txFilterExpensePayment")}
                  options={expPayFilterOpts}
                  value={expFilterPay}
                  onChange={(e) => setExpFilterPay(e.target.value)}
                  onBlur={() => {}}
                />
              </div>
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
                    void refetchExpClose();
                  }}
                >
                  {t("branch.filterApplyRefresh")}
                </Button>
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
                    const pocketLine = expensePocketSubline(row, t);
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
                      {expenseLinkLine ? (
                        <p className="mt-0.5 text-xs text-zinc-500">{expenseLinkLine}</p>
                      ) : null}
                      {expensePaymentSourceLabel(row.expensePaymentSource, t) ? (
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {t("branch.txColExpensePayment")}:{" "}
                          {expensePaymentSourceLabel(row.expensePaymentSource, t)}
                        </p>
                      ) : null}
                      {pocketLine ? (
                        <p className="mt-0.5 text-xs text-zinc-500">{pocketLine}</p>
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
                        const pocketLine = expensePocketSubline(row, t);
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
                          <TableCell className="hidden text-sm text-zinc-600 sm:table-cell">
                            <div>
                              {txCategoryLine(row.mainCategory, row.category, t) || t("personnel.dash")}
                            </div>
                            {expenseLinkLine ? (
                              <p className="mt-0.5 text-xs text-zinc-500">{expenseLinkLine}</p>
                            ) : null}
                          </TableCell>
                          <TableCell className="hidden text-xs text-zinc-600 lg:table-cell">
                            <div>{expensePaymentSourceLabel(row.expensePaymentSource, t) || "—"}</div>
                            {pocketLine ? (
                              <p className="mt-0.5 text-[11px] text-zinc-500">{pocketLine}</p>
                            ) : null}
                          </TableCell>
                          <TableCell className="hidden max-w-[14rem] truncate text-sm text-zinc-600 md:table-cell">
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
        )}

        {tab === "stock" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">{t("branch.stockHint")}</p>
            {stFrom.length === 10 && stFrom === stTo ? (
              <p className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-950">
                {t("branch.stockSingleDayBanner").replace("{date}", stFrom)}
              </p>
            ) : null}
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  type="date"
                  label={t("branch.filterDateFrom")}
                  value={stFrom}
                  onChange={(e) => setStFrom(e.target.value)}
                  className="min-w-0"
                />
                <Input
                  type="date"
                  label={t("branch.filterDateTo")}
                  value={stTo}
                  onChange={(e) => setStTo(e.target.value)}
                  className="min-w-0"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => {
                    const d = localIsoDate();
                    setStFrom(d);
                    setStTo(d);
                    setStPage(1);
                  }}
                >
                  {t("branch.filterToday")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => {
                    setStFrom("");
                    setStTo("");
                    setStPage(1);
                  }}
                >
                  {t("branch.filterAllDates")}
                </Button>
                <Button type="button" variant="secondary" className="min-h-11" onClick={() => void refetchSt()}>
                  {t("branch.filterApplyRefresh")}
                </Button>
              </div>
            </div>
            {stErr && <p className="text-sm text-red-600">{toErrorMessage(stError)}</p>}
            {stLoading ? (
              <p className="text-sm text-zinc-500">{t("common.loading")}</p>
            ) : !stData?.items.length ? (
              <p className="text-sm text-zinc-600">{t("branch.noStockReceipts")}</p>
            ) : (
              <>
                <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white sm:hidden">
                  {stData.items.map((row) => (
                    <li key={row.id} className="px-3 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-zinc-500">
                          {formatLocaleDate(row.movementDate, locale)}
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                          {row.quantity}
                          {row.unit ? (
                            <span className="ml-1 font-normal text-zinc-500">{row.unit}</span>
                          ) : null}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-zinc-900">{row.productName}</p>
                      {row.warehouseName ? (
                        <p className="mt-0.5 text-xs text-zinc-500">{row.warehouseName}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 sm:block">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeader>{t("branch.stockColDate")}</TableHeader>
                        <TableHeader>{t("branch.stockColProduct")}</TableHeader>
                        <TableHeader className="text-right">{t("branch.stockColQty")}</TableHeader>
                        <TableHeader className="hidden sm:table-cell">{t("branch.stockColWarehouse")}</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stData.items.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatLocaleDate(row.movementDate, locale)}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-zinc-900">
                            {row.productName}
                            {row.unit ? (
                              <span className="font-normal text-zinc-500"> ({row.unit})</span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{row.quantity}</TableCell>
                          <TableCell className="hidden text-sm text-zinc-600 sm:table-cell">
                            {row.warehouseName ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-zinc-600">
                    {(stPage - 1) * STOCK_PAGE + 1}–{Math.min(stPage * STOCK_PAGE, stTotal)} · {t("branch.pagingTotal")}{" "}
                    {stTotal}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11"
                      disabled={stPage <= 1}
                      onClick={() => setStPage((p) => Math.max(1, p - 1))}
                    >
                      {t("branch.pagingPrev")}
                    </Button>
                    <span className="flex items-center text-sm tabular-nums text-zinc-700">
                      {stPage} / {stPages}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11"
                      disabled={stPage >= stPages}
                      onClick={() => setStPage((p) => Math.min(stPages, p + 1))}
                    >
                      {t("branch.pagingNext")}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "tourismSeason" && (
          <BranchTourismSeasonTab branchId={branch.id} active={tab === "tourismSeason"} />
        )}
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
      />

      {!employeeSelfService ? (
        <AdvancePersonnelModal
          open={advanceOpen}
          onClose={closeAdvance}
          personnel={activePersonnel}
          initialPersonnelId={advanceInitialPersonId}
        />
      ) : null}
    </div>
  );
}

function DashCard({
  label,
  value,
  valueClass,
  hint,
  compact,
}: {
  label: string;
  value: string;
  valueClass?: string;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={cn(
          "mt-1 font-semibold text-zinc-900",
          compact ? "text-base sm:text-lg" : "text-lg sm:text-xl",
          valueClass
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-zinc-500">{hint}</p> : null}
    </div>
  );
}
