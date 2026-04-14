"use client";

import {
  branchTxGeneralOverheadLine,
  branchTxLinkedExpenseLine,
  branchTxLinkedSupplierInvoiceLine,
  branchTxLinkedVehicleLine,
  cashSettlementPartyLabel,
  expensePaymentSourceLabel,
  expensePaymentSourceLabelShort,
  branchTxUnpaidInvoice,
  txCategoryLine,
  txCodeLabel,
  TX_MAIN_IN,
  TX_MAIN_OUT,
} from "@/modules/branch/lib/branch-transaction-options";
import {
  branchDashboardScopeActive,
  type BranchDashboardStockScope,
} from "@/modules/branch/api/branches-api";
import { branchTransactionReceiptPhotoUrl } from "@/modules/branch/api/branch-transactions-api";
import {
  useBranchAdvancesList,
  useBranchDashboard,
  useBranchPersonnelMoneySummaries,
  useBranchRegisterSummary,
  useBranchTransactions,
  useBranchTransactionsPaged,
  useDeleteBranchTransaction,
} from "@/modules/branch/hooks/useBranchQueries";
import { AdvancePersonnelModal } from "@/modules/personnel/components/AdvancePersonnelModal";
import { PersonnelAdvanceHistory } from "@/modules/personnel/components/PersonnelAdvanceHistory";
import { fetchAdvancesByPersonnel } from "@/modules/personnel/api/advances-api";
import {
  defaultPersonnelListFilters,
  personnelKeys,
  usePersonnelList,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import type { Locale } from "@/i18n/messages";
import type { Branch } from "@/types/branch";
import type { BranchPersonnelMoneySummaryItem } from "@/types/branch-personnel-money";
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

function expensePocketRepaySubline(
  row: BranchTransaction,
  t: (key: string) => string
): string | null {
  if (String(row.mainCategory ?? "").trim().toUpperCase() !== "OUT_PERSONNEL_POCKET_REPAY")
    return null;
  const n = row.expensePocketPersonnelFullName?.trim();
  const who = n || "—";
  const u = String(row.expensePaymentSource ?? "").trim().toUpperCase();
  let via = "";
  if (u === "REGISTER") via = t("branch.expensePocketRepayViaRegister");
  else if (u === "PATRON") via = t("branch.expensePocketRepayViaPatron");
  else if (u) via = expensePaymentSourceLabelShort(row.expensePaymentSource, t);
  return via ? `${who} · ${via}` : who;
}

function branchTxNonPnl(row: BranchTransaction): boolean {
  if (row.excludedFromProfitAndLoss === true) return true;
  return String(row.mainCategory ?? "").trim().toUpperCase() === "OUT_NON_PNL";
}

function patronIncomeToPatronVisible(
  s: { total: number; cash: number; card: number; unspecified: number } | null | undefined
): boolean {
  if (!s) return false;
  const nz = (n: number) => Math.abs(n) > 0.009;
  return nz(s.total) || nz(s.cash) || nz(s.card) || nz(s.unspecified);
}

import { cn } from "@/lib/cn";
import { formatLocaleAmount, formatMoneyDash } from "@/shared/lib/locale-amount";
import { formatLocaleDate } from "@/shared/lib/locale-date";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { toErrorMessage } from "@/shared/lib/error-message";
import { notifyBranchIncomeDeleteConfirm } from "@/shared/lib/notify-branch-income-delete";
import { notify } from "@/shared/lib/notify";
import { CollapsibleMobileFilters } from "@/shared/components/CollapsibleMobileFilters";
import { Button } from "@/shared/ui/Button";
import { TrashIcon, trashIconActionButtonClass } from "@/shared/ui/TrashIcon";
import { DateField } from "@/shared/ui/DateField";
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
import { useQueries } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  WarehouseProductScopeFilters,
} from "@/modules/warehouse/components/WarehouseProductScopeFilters";
import { AddBranchTransactionModal } from "./AddBranchTransactionModal";
import { AssignPersonnelToBranchModal } from "./AssignPersonnelToBranchModal";
import { InvoiceSettleModal } from "./InvoiceSettleModal";
import { BranchTourismSeasonTab } from "./BranchTourismSeasonTab";
import { BranchZReportAccountingTab } from "./BranchZReportAccountingTab";
import { BranchNotesTab } from "./BranchNotesTab";
import { BranchStockInboundPanel } from "./BranchStockInboundPanel";
import {
  resolveBranchDetailTabOnBranchChange,
  type BranchDetailTabId,
} from "@/modules/branch/lib/branch-detail-tab";

type PersonnelSubTabId = "people" | "advances";

type Props = {
  branch: Branch;
  staff: Personnel[];
  employeeSelfService?: boolean;
  /** URL veya hata yönlendirmesi ile açılış sekmesi (örn. turizm sezonu). */
  initialTab?: BranchDetailTabId | null;
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

function branchPersonnelMoneyAdvancesCell(
  row: BranchPersonnelMoneySummaryItem | undefined,
  loading: boolean,
  t: (key: string) => string,
  locale: Locale
): ReactNode {
  if (loading) return t("common.loading");
  if (!row) return "—";
  if (row.advancesMixedCurrencies) return t("branch.personnelMoneyMixedCurrency");
  if (
    row.totalAdvances != null &&
    row.totalAdvances > 0 &&
    row.advancesCurrencyCode
  ) {
    return formatMoneyDash(
      row.totalAdvances,
      t("personnel.dash"),
      locale,
      row.advancesCurrencyCode
    );
  }
  return "—";
}

function branchPersonnelMoneyRegisterOwesCell(
  row: BranchPersonnelMoneySummaryItem | undefined,
  loading: boolean,
  t: (key: string) => string,
  locale: Locale
): ReactNode {
  if (loading) return t("common.loading");
  if (!row) return "—";
  if (row.pocketMixedCurrencies) return t("branch.personnelMoneyMixedCurrency");
  if (row.netRegisterOwesPocket > 0.009) {
    const cur = row.pocketCurrencyCode ?? "TRY";
    return formatMoneyDash(
      row.netRegisterOwesPocket,
      t("personnel.dash"),
      locale,
      cur
    );
  }
  return "—";
}

function branchPersonnelMoneyPocketCell(
  row: BranchPersonnelMoneySummaryItem | undefined,
  loading: boolean,
  t: (key: string) => string,
  locale: Locale
): ReactNode {
  if (loading) return t("common.loading");
  if (!row) return "—";
  if (row.pocketMixedCurrencies) return t("branch.personnelMoneyMixedCurrency");
  const cur = row.pocketCurrencyCode ?? "TRY";
  const parts: ReactNode[] = [];
  if (row.grossPocketExpense > 0.009) {
    parts.push(
      <span key="g" className="block">
        {t("branch.personnelMoneyPocketOutShort")}:{" "}
        {formatMoneyDash(row.grossPocketExpense, t("personnel.dash"), locale, cur)}
      </span>
    );
  }
  const rep = row.pocketRepaidFromRegister + row.pocketRepaidFromPatron;
  if (rep > 0.009) {
    parts.push(
      <span key="r" className="block">
        {t("branch.personnelMoneyPocketRepaidShort")}:{" "}
        {formatMoneyDash(rep, t("personnel.dash"), locale, cur)}
      </span>
    );
  }
  if (row.netRegisterOwesPocket < -0.009) {
    parts.push(
      <span key="a" className="block text-emerald-800">
        {t("branch.personnelMoneyPocketAheadShort")}:{" "}
        {formatMoneyDash(-row.netRegisterOwesPocket, t("personnel.dash"), locale, cur)}
      </span>
    );
  }
  if (parts.length === 0) return "—";
  return <div className="space-y-0.5 text-xs leading-snug">{parts}</div>;
}

function PersonnelPocketRepayCta({
  personnelId,
  moneyRow,
  loading,
  onPay,
  t,
  buttonClassName,
}: {
  personnelId: number;
  moneyRow?: BranchPersonnelMoneySummaryItem;
  loading: boolean;
  onPay: (pid: number, currencyCode: string) => void;
  t: (key: string) => string;
  buttonClassName?: string;
}) {
  const show =
    !loading &&
    moneyRow &&
    !moneyRow.pocketMixedCurrencies &&
    moneyRow.netRegisterOwesPocket > 0.009;
  if (!show) return null;
  const cur = moneyRow.pocketCurrencyCode ?? "TRY";
  return (
    <Button
      type="button"
      title={t("branch.personnelPayPocketDebtHint")}
      className={cn("min-h-10", buttonClassName)}
      onClick={() => onPay(personnelId, cur)}
    >
      {t("branch.personnelPayPocketDebt")}
    </Button>
  );
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

function BranchTxIncomeDeleteRow({
  transactionId,
  busy,
  show,
  t,
  onConfirm,
}: {
  transactionId: number;
  busy: boolean;
  show: boolean;
  t: (key: string) => string;
  onConfirm: (id: number) => void | Promise<void>;
}) {
  if (!show) return null;
  return (
    <button
      type="button"
      className={trashIconActionButtonClass}
      aria-label={t("branch.txDeleteAria")}
      disabled={busy}
      onClick={() =>
        notifyBranchIncomeDeleteConfirm({
          message: t("branch.txDeleteIncomeToastMessage"),
          cancelLabel: t("branch.txDeleteCancel"),
          confirmLabel: t("branch.txDeleteConfirm"),
          onConfirm: () => onConfirm(transactionId),
        })
      }
    >
      <TrashIcon className="h-5 w-5" />
    </button>
  );
}

const EXP_PAGE = 15;
const INC_PAGE = 15;

export function BranchDetailTabs({
  branch,
  staff,
  employeeSelfService = false,
  initialTab = null,
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

  useEffect(() => {
    const today = localIsoDate();
    setTab(resolveBranchDetailTabOnBranchChange(initialTab, employeeSelfService));
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
    setPersonnelSubTab("people");
    setTxDeletePendingId(null);
  }, [branch.id, employeeSelfService, initialTab]);

  useEffect(() => {
    if (!employeeSelfService) return;
    if (
      tab === "personnel" ||
      tab === "tourismSeason" ||
      tab === "zReportAccounting" ||
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
    incomeCloseDay ?? ""
  );

  const {
    data: expCloseSum,
    isPending: expCloseLoading,
    isError: expCloseErr,
    error: expCloseErrorMsg,
    refetch: refetchExpClose,
  } = useBranchRegisterSummary(
    expenseCloseDay && !employeeSelfService ? branch.id : null,
    expenseCloseDay ?? ""
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
      { id: "notes", label: t("branch.tabNotes") },
    ];
    if (!employeeSelfService) return all;
    return all.filter(
      (x) =>
        x.id !== "personnel" &&
        x.id !== "tourismSeason" &&
        x.id !== "zReportAccounting" &&
        x.id !== "dashboard"
    );
  }, [t, employeeSelfService]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="min-w-0 shrink-0 border-b border-zinc-200 bg-white px-2 pt-1 sm:px-4">
        <div
          role="tablist"
          aria-label={t("branch.detailTabsAria")}
          className="flex w-full min-w-0 gap-1 overflow-x-auto overscroll-x-contain pb-2 touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]"
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
        className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-3 py-4 [-webkit-overflow-scrolling:touch] sm:px-5 sm:py-5"
      >
        {tab === "dashboard" && (
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
                    <div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
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
                    <div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 xl:grid-cols-3">
                      <DashCard
                        label={t("branch.registerTodayIncome")}
                        value={formatMoneyDash(regSum.dayTotalIncome, t("personnel.dash"), locale, "TRY")}
                        valueClass="text-emerald-800"
                        compact
                      />
                      <DashCard
                        label={t("branch.registerTodayExpenseAccounting")}
                        value={formatMoneyDash(regSum.dayAccountingExpense, t("personnel.dash"), locale, "TRY")}
                        valueClass="text-red-800"
                        compact
                        hint={t("branch.registerTodayExpenseAccountingHint")}
                      />
                      <DashCard
                        badge={t("branch.registerSummaryBadgePriority")}
                        label={t("branch.registerTodayNet")}
                        value={formatMoneyDash(regSum.dayNetAccounting, t("personnel.dash"), locale, "TRY")}
                        hint={t("branch.registerTodayNetHint")}
                        compact
                        highlight
                      />
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
                      const supplierLine = branchTxLinkedSupplierInvoiceLine(row, t);
                      const pocketLine = expensePocketSubline(row, t);
                      const repayLine = expensePocketRepaySubline(row, t);
                      const pocketRepayMain =
                        String(row.mainCategory ?? "").trim().toUpperCase() ===
                        "OUT_PERSONNEL_POCKET_REPAY";
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
                        {branchTxNonPnl(row) ? (
                          <p className="mt-1 text-[11px] font-medium text-sky-800">
                            {t("branch.txNonPnlBadge")}
                          </p>
                        ) : null}
                        {expenseLinkLine ? (
                          <p className="mt-1 text-xs text-zinc-500">{expenseLinkLine}</p>
                        ) : null}
                        {supplierLine ? (
                          <p className="mt-0.5 text-xs text-zinc-500">{supplierLine}</p>
                        ) : null}
                        {row.type.toUpperCase() === "OUT" &&
                        !pocketRepayMain &&
                        !branchTxNonPnl(row) &&
                        expensePaymentSourceLabel(row.expensePaymentSource, t) ? (
                          <p className="mt-1 text-xs text-zinc-600">
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
                        const supplierLine = branchTxLinkedSupplierInvoiceLine(row, t);
                        const pocketLine = expensePocketSubline(row, t);
                        const repayLine = expensePocketRepaySubline(row, t);
                        const pocketRepayMain =
                          String(row.mainCategory ?? "").trim().toUpperCase() ===
                          "OUT_PERSONNEL_POCKET_REPAY";
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
                          <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 font-mono text-xs text-zinc-600 md:hidden lg:table-cell">
                            {row.cashAmount != null && row.cardAmount != null
                              ? `${formatMoneyDash(row.cashAmount, t("personnel.dash"), locale, row.currencyCode)} / ${formatMoneyDash(row.cardAmount, t("personnel.dash"), locale, row.currencyCode)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 text-xs text-zinc-600 md:hidden lg:table-cell">
                            {registerCashSettlementLabel(row, t) || "—"}
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
                            {row.type.toUpperCase() === "OUT" &&
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
                          <TableCell className="max-md:flex max-md:w-full max-md:min-w-0 max-md:items-start max-md:justify-between max-md:gap-3 text-sm text-zinc-600 md:table-cell">
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

            <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
              <h3 className="text-sm font-semibold text-zinc-900">
                {t("branch.dashStockInboundSection")}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                {t("branch.dashStockInboundSectionHint")}
              </p>
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
          <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="secondary"
                className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto"
                onClick={() => setAssignPersonnelOpen(true)}
              >
                {t("branch.assignPersonnelOpen")}
              </Button>
              <Button
                type="button"
                className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto"
                disabled={activePersonnel.length === 0}
                onClick={() => openAdvance()}
              >
                {t("branch.giveAdvance")}
              </Button>
              {personnelSubTab === "advances" ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-12 w-full touch-manipulation sm:min-h-11 sm:w-auto"
                  onClick={() => void refetchBranchAdv()}
                >
                  {t("branch.refreshTx")}
                </Button>
              ) : null}
            </div>

            <div
              role="tablist"
              aria-label={t("branch.personnelSubTabsAria")}
              className="-mx-1 flex min-w-0 shrink-0 gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain border-b border-zinc-200 px-1 pb-2 touch-pan-x [-webkit-overflow-scrolling:touch]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={personnelSubTab === "people"}
                className={cn(
                  "shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors min-h-11 touch-manipulation sm:min-h-0 sm:px-3 sm:py-2",
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
                  "shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors min-h-11 touch-manipulation sm:min-h-0 sm:px-3 sm:py-2",
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
                  <>
                    <div className="mt-3 space-y-2 md:hidden">
                      {staff.map((p) => {
                        const pm = personnelMoneyById.get(p.id);
                        return (
                          <div
                            key={p.id}
                            className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
                          >
                            <p className="text-sm font-semibold text-zinc-900">{p.fullName}</p>
                            <dl className="mt-2 space-y-2 border-t border-zinc-100 pt-2 text-xs">
                              <div className="flex justify-between gap-3">
                                <dt className="max-w-[45%] shrink-0 text-zinc-500">
                                  {t("branch.personnelMoneyColAdvances")}
                                </dt>
                                <dd className="min-w-0 text-right font-medium text-zinc-800">
                                  {branchPersonnelMoneyAdvancesCell(
                                    pm,
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="max-w-[45%] shrink-0 text-zinc-500">
                                  {t("branch.personnelMoneyColRegisterOwes")}
                                </dt>
                                <dd className="min-w-0 text-right font-medium text-zinc-800">
                                  {branchPersonnelMoneyRegisterOwesCell(
                                    pm,
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </dd>
                              </div>
                              <div className="flex flex-col gap-1">
                                <dt className="text-zinc-500">{t("branch.personnelMoneyColPocket")}</dt>
                                <dd className="text-zinc-800">
                                  {branchPersonnelMoneyPocketCell(
                                    pm,
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </dd>
                              </div>
                            </dl>
                            <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3">
                              <PersonnelPocketRepayCta
                                personnelId={p.id}
                                moneyRow={pm}
                                loading={personnelMoneyPending}
                                onPay={openPocketRepayExpense}
                                t={t}
                                buttonClassName="w-full text-sm"
                              />
                              {!p.isDeleted ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="min-h-10 w-full text-sm"
                                  onClick={() => openAdvance(p.id)}
                                >
                                  {t("branch.staffGiveAdvanceRow")}
                                </Button>
                              ) : (
                                <span className="text-sm text-zinc-400">—</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 hidden overflow-x-auto md:block">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableHeader>{t("branch.staffName")}</TableHeader>
                            <TableHeader className="min-w-[7rem]">
                              {t("branch.personnelMoneyColAdvances")}
                            </TableHeader>
                            <TableHeader className="min-w-[7rem]">
                              {t("branch.personnelMoneyColRegisterOwes")}
                            </TableHeader>
                            <TableHeader className="min-w-[10rem]">
                              {t("branch.personnelMoneyColPocket")}
                            </TableHeader>
                            <TableHeader className="min-w-[9rem]">{t("branch.staffGiveAdvanceRow")}</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {staff.map((p) => {
                            const pm = personnelMoneyById.get(p.id);
                            return (
                              <TableRow key={p.id}>
                                <TableCell className="font-medium text-zinc-900">{p.fullName}</TableCell>
                                <TableCell className="text-sm text-zinc-800">
                                  {branchPersonnelMoneyAdvancesCell(
                                    pm,
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-zinc-800">
                                  {branchPersonnelMoneyRegisterOwesCell(
                                    pm,
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </TableCell>
                                <TableCell className="text-zinc-800">
                                  {branchPersonnelMoneyPocketCell(
                                    pm,
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex min-w-[8rem] flex-col gap-2">
                                    <PersonnelPocketRepayCta
                                      personnelId={p.id}
                                      moneyRow={pm}
                                      loading={personnelMoneyPending}
                                      onPay={openPocketRepayExpense}
                                      t={t}
                                      buttonClassName="w-full px-2 py-1 text-xs"
                                    />
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
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
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
                    <>
                      <div className="mt-2 space-y-2 md:hidden">
                        {branchAdvances.map((a) => (
                          <div
                            key={a.id}
                            className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-zinc-900">{a.personnelFullName}</p>
                              <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-zinc-900">
                                {formatMoneyDash(a.amount, t("personnel.dash"), locale, a.currencyCode)}
                              </p>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                              {formatLocaleDate(String(a.advanceDate), locale)}
                            </p>
                            <p className="mt-1 text-xs text-zinc-600">
                              {t("branch.advColSource")}: {advanceSourceLabel(a.sourceType, t)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 hidden overflow-x-auto md:block">
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
                                <TableCell className="max-sm:hidden sm:max-md:flex sm:max-md:w-full sm:max-md:min-w-0 sm:max-md:items-start sm:max-md:justify-between sm:max-md:gap-3 text-sm text-zinc-600 md:table-cell">
                                  {advanceSourceLabel(a.sourceType, t)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
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
                      <div className="mt-3 space-y-2 md:hidden">
                        {staffRows.map((r) => (
                          <div
                            key={r.personnel.id}
                            className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
                          >
                            <p className="text-sm font-semibold text-zinc-900">{r.personnel.fullName}</p>
                            <dl className="mt-2 space-y-2 border-t border-zinc-100 pt-2 text-xs">
                              <div className="flex justify-between gap-3">
                                <dt className="max-w-[45%] shrink-0 text-zinc-500">
                                  {t("branch.personnelMoneyColAdvances")}
                                </dt>
                                <dd className="min-w-0 text-right font-medium text-zinc-800">
                                  {branchPersonnelMoneyAdvancesCell(
                                    personnelMoneyById.get(r.personnel.id),
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="max-w-[45%] shrink-0 text-zinc-500">
                                  {t("branch.personnelMoneyColRegisterOwes")}
                                </dt>
                                <dd className="min-w-0 text-right font-medium text-zinc-800">
                                  {branchPersonnelMoneyRegisterOwesCell(
                                    personnelMoneyById.get(r.personnel.id),
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </dd>
                              </div>
                              <div className="flex flex-col gap-1">
                                <dt className="text-zinc-500">{t("branch.personnelMoneyColPocket")}</dt>
                                <dd className="text-zinc-800">
                                  {branchPersonnelMoneyPocketCell(
                                    personnelMoneyById.get(r.personnel.id),
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-zinc-500">{t("branch.staffAdvTotal")}</dt>
                                <dd className="font-mono text-sm font-medium text-zinc-800">
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
                                </dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-zinc-500">{t("branch.staffAdvCount")}</dt>
                                <dd className="font-medium text-zinc-800">
                                  {r.pending ? t("common.loading") : r.failed ? "—" : r.count}
                                </dd>
                              </div>
                            </dl>
                            <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
                              <PersonnelPocketRepayCta
                                personnelId={r.personnel.id}
                                moneyRow={personnelMoneyById.get(r.personnel.id)}
                                loading={personnelMoneyPending}
                                onPay={openPocketRepayExpense}
                                t={t}
                                buttonClassName="w-full text-sm"
                              />
                              {!r.personnel.isDeleted ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="min-h-10 w-full text-sm"
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
                                showAttributedExpenses={false}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 hidden overflow-x-auto md:block">
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableHeader>{t("branch.staffName")}</TableHeader>
                              <TableHeader className="min-w-[7rem]">
                                {t("branch.personnelMoneyColAdvances")}
                              </TableHeader>
                              <TableHeader className="min-w-[7rem]">
                                {t("branch.personnelMoneyColRegisterOwes")}
                              </TableHeader>
                              <TableHeader className="min-w-[10rem]">
                                {t("branch.personnelMoneyColPocket")}
                              </TableHeader>
                              <TableHeader>{t("branch.staffAdvTotal")}</TableHeader>
                              <TableHeader className="hidden sm:table-cell">{t("branch.staffAdvCount")}</TableHeader>
                              <TableHeader className="min-w-[10rem]">{t("branch.staffGiveAdvanceRow")}</TableHeader>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {staffRows.map((r) => (
                              <TableRow key={r.personnel.id}>
                                <TableCell className="font-medium text-zinc-900">{r.personnel.fullName}</TableCell>
                                <TableCell className="text-sm text-zinc-800">
                                  {branchPersonnelMoneyAdvancesCell(
                                    personnelMoneyById.get(r.personnel.id),
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-zinc-800">
                                  {branchPersonnelMoneyRegisterOwesCell(
                                    personnelMoneyById.get(r.personnel.id),
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </TableCell>
                                <TableCell className="text-zinc-800">
                                  {branchPersonnelMoneyPocketCell(
                                    personnelMoneyById.get(r.personnel.id),
                                    personnelMoneyPending,
                                    t,
                                    locale
                                  )}
                                </TableCell>
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
                                <TableCell className="max-sm:hidden sm:max-md:flex sm:max-md:w-full sm:max-md:min-w-0 sm:max-md:items-start sm:max-md:justify-between sm:max-md:gap-3 sm:table-cell">
                                  {r.pending ? t("common.loading") : r.failed ? "—" : r.count}
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="flex min-w-[8rem] flex-col gap-2">
                                    <PersonnelPocketRepayCta
                                      personnelId={r.personnel.id}
                                      moneyRow={personnelMoneyById.get(r.personnel.id)}
                                      loading={personnelMoneyPending}
                                      onPay={openPocketRepayExpense}
                                      t={t}
                                      buttonClassName="w-full px-2 py-1 text-xs"
                                    />
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
                                      showAttributedExpenses={false}
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
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/90 px-3 py-2.5">
              <p className="text-xs font-semibold text-zinc-800">
                {t("branch.incomeDateScopeTitle")}
              </p>
              <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-zinc-600">
                <li>{t("branch.incomeDateScopeDaySummary")}</li>
                <li>{t("branch.incomeDateScopeCumulative")}</li>
                <li>{t("branch.incomeDateScopeListPatron")}</li>
              </ul>
            </div>

            {incomeCloseDay && !employeeSelfService ? (
              <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-zinc-900">{t("branch.incomeSummarySectionTitle")}</h3>
                <p className="mt-1 text-xs text-zinc-600">{t("branch.incomeSummarySectionLead")}</p>
                {incCloseErr && (
                  <p className="mt-2 text-sm text-red-600">{toErrorMessage(incCloseErrorMsg)}</p>
                )}
                {incCloseLoading ? (
                  <p className="mt-2 text-sm text-zinc-500">{t("common.loading")}</p>
                ) : incCloseSum ? (
                  <>
                    <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-emerald-900/80">
                      {t("branch.incomeCumulativeTitle")}
                    </h4>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
                      {t("branch.incomeCumulativeHint")}
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-3">
                      <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                          {t("branch.incomeCumulativeCash")}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
                          {formatMoneyDash(
                            incCloseSum.cumulativeIncomeCashThroughAsOf ?? 0,
                            t("personnel.dash"),
                            locale,
                            "TRY"
                          )}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                          {t("branch.incomeCumulativeCard")}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
                          {formatMoneyDash(
                            incCloseSum.cumulativeIncomeCardThroughAsOf ?? 0,
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
                            incCloseSum.cumulativeIncomeTotalThroughAsOf ?? 0,
                            t("personnel.dash"),
                            locale,
                            "TRY"
                          )}
                        </p>
                      </div>
                    </div>

                    <h4 className="mt-5 text-xs font-semibold uppercase tracking-wide text-emerald-900/80">
                      {t("branch.incomeCloseTitle")}
                    </h4>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">{t("branch.incomeCloseHint")}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                          {t("branch.incomeCloseTotal")}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-emerald-800 sm:text-base">
                          {formatMoneyDash(incCloseSum.dayTotalIncome, t("personnel.dash"), locale, "TRY")}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                          {t("branch.incomeCloseCash")}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
                          {formatMoneyDash(incCloseSum.dayIncomeCash, t("personnel.dash"), locale, "TRY")}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:col-span-2 sm:p-3 lg:col-span-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                          {t("branch.incomeCloseCard")}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
                          {formatMoneyDash(incCloseSum.dayIncomeCard, t("personnel.dash"), locale, "TRY")}
                        </p>
                      </div>
                    </div>
                  </>
                ) : null}
              </section>
            ) : !incomeCloseDay && !employeeSelfService ? (
              <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                {t("branch.incomeClosePickSingleDay")}
              </p>
            ) : null}

            {!employeeSelfService &&
            !incLoading &&
            patronIncomeToPatronVisible(incData?.patronIncomeToPatron) &&
            incData?.patronIncomeToPatron ? (
              <section className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-zinc-900">{t("branch.patronFlowIncomeTitle")}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">{t("branch.patronFlowIncomeHint")}</p>
                <div
                  className="mt-3 rounded-xl border border-amber-300/70 bg-amber-100/35 p-3 sm:p-4"
                  role="note"
                  aria-label={t("branch.patronFlowIncomeStoryTitle")}
                >
                  <p className="text-sm font-semibold text-zinc-900">
                    {t("branch.patronFlowIncomeStoryTitle")}
                  </p>
                  <ol className="mt-2 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-zinc-700">
                    <li>{t("branch.patronFlowIncomeStory1")}</li>
                    <li>{t("branch.patronFlowIncomeStory2")}</li>
                    <li>{t("branch.patronFlowIncomeStory3")}</li>
                  </ol>
                </div>
                <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-amber-950/80">
                  {t("branch.patronFlowIncomeCardsSection")}
                </h4>
                <div className="mt-2 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 xl:grid-cols-4">
                  <DashCard
                    tone="amber"
                    highlight
                    badge={t("branch.registerSummaryBadgePriority")}
                    label={t("branch.patronFlowIncomeTotal")}
                    value={formatMoneyDash(
                      incData.patronIncomeToPatron.total,
                      t("personnel.dash"),
                      locale,
                      "TRY"
                    )}
                    valueClass="text-amber-950"
                    compact
                  />
                  {incData.patronIncomeToPatron.cash > 0.009 ? (
                    <DashCard
                      tone="amber"
                      label={t("branch.patronFlowIncomeCash")}
                      value={formatMoneyDash(
                        incData.patronIncomeToPatron.cash,
                        t("personnel.dash"),
                        locale,
                        "TRY"
                      )}
                      compact
                    />
                  ) : null}
                  {incData.patronIncomeToPatron.card > 0.009 ? (
                    <DashCard
                      tone="amber"
                      label={t("branch.patronFlowIncomeCard")}
                      value={formatMoneyDash(
                        incData.patronIncomeToPatron.card,
                        t("personnel.dash"),
                        locale,
                        "TRY"
                      )}
                      compact
                    />
                  ) : null}
                  {incData.patronIncomeToPatron.unspecified > 0.009 ? (
                    <DashCard
                      tone="amber"
                      label={t("branch.patronFlowIncomeUnspecified")}
                      value={formatMoneyDash(
                        incData.patronIncomeToPatron.unspecified,
                        t("personnel.dash"),
                        locale,
                        "TRY"
                      )}
                      valueClass="text-zinc-700"
                      compact
                    />
                  ) : null}
                </div>
              </section>
            ) : null}

            <div className="flex flex-col gap-4">
              <section
                className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"
                aria-label={t("branch.incomeActionsTitle")}
              >
                <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                  {t("branch.incomeActionsTitle")}
                </h3>
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
                  {!employeeSelfService ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11"
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
                <CollapsibleMobileFilters
                  title={t("branch.incomeListSection")}
                  toggleAriaLabel={t("common.filters")}
                  active={incFiltersActive}
                  resetKey={`${branch.id}-${tab}`}
                  expandLabel={t("common.filtersShow")}
                  collapseLabel={t("common.filtersHide")}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DateField
                      label={t("branch.filterDateFrom")}
                      value={incFrom}
                      onChange={(e) => setIncFrom(e.target.value)}
                      className="min-w-0"
                    />
                    <DateField
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
                </CollapsibleMobileFilters>
                <div className="flex flex-wrap gap-2">
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
                          <BranchTxIncomeDeleteRow
                            transactionId={row.id}
                            busy={deleteTxMut.isPending}
                            show
                            t={t}
                            onConfirm={confirmDeleteBranchTx}
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

            {!employeeSelfService &&
            !expLoading &&
            (expData?.patronExpenseTotal ?? 0) > 0.009 &&
            expData ? (
              <section className="rounded-xl border border-violet-200/80 bg-violet-50/50 p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-zinc-900">{t("branch.patronFlowExpenseTitle")}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-600">{t("branch.patronFlowExpenseHint")}</p>
                <p className="mt-2 text-base font-semibold tabular-nums text-violet-950 sm:text-lg">
                  {formatMoneyDash(
                    expData.patronExpenseTotal ?? 0,
                    t("personnel.dash"),
                    locale,
                    "TRY"
                  )}
                </p>
              </section>
            ) : null}

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
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
                    <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {t("branch.expensesCloseIncome")}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-emerald-800 sm:text-base">
                        {formatMoneyDash(expCloseSum.dayTotalIncome, t("personnel.dash"), locale, "TRY")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {t("branch.expensesCloseExpense")}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-red-800 sm:text-base">
                        {formatMoneyDash(expCloseSum.dayAccountingExpense, t("personnel.dash"), locale, "TRY")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {t("branch.expensesCloseNet")}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
                        {formatMoneyDash(expCloseSum.dayNetAccounting, t("personnel.dash"), locale, "TRY")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {t("branch.expensesCloseCashOut")}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-zinc-900 sm:text-base">
                        {formatMoneyDash(expCloseSum.dayCashOutFromRegister, t("personnel.dash"), locale, "TRY")}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {t("branch.registerTodayNetPatron")}
                      </p>
                      <p
                        className={`mt-0.5 text-sm font-semibold tabular-nums tracking-tight sm:text-base ${
                          (expCloseSum.dayNetRegisterOwesPatron ?? 0) > 0
                            ? "text-amber-900"
                            : (expCloseSum.dayNetRegisterOwesPatron ?? 0) < 0
                              ? "text-emerald-800"
                              : "text-zinc-900"
                        }`}
                      >
                        {formatMoneyDash(
                          expCloseSum.dayNetRegisterOwesPatron ?? 0,
                          t("personnel.dash"),
                          locale,
                          "TRY"
                        )}
                      </p>
                      <p className="mt-1 text-[10px] leading-snug text-zinc-500">
                        {t("branch.registerTodayNetPatronHint")}
                      </p>
                      {(expCloseSum.dayNetRegisterOwesPatron ?? 0) < 0 ? (
                        <p className="mt-1 text-[10px] font-medium leading-snug text-emerald-800">
                          {t("branch.registerPatronNetNegativeMeansBranchReceivable")}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-lg border border-white bg-white p-2.5 shadow-sm sm:p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                        {t("branch.expensesCloseNonRegister")}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-amber-900 sm:text-base">
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
              <div className="flex flex-wrap">
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
              <CollapsibleMobileFilters
                title={t("branch.expensesListSection")}
                toggleAriaLabel={t("common.filters")}
                active={expFiltersActive}
                resetKey={`${branch.id}-${tab}`}
                expandLabel={t("common.filtersShow")}
                collapseLabel={t("common.filtersHide")}
              >
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
              </CollapsibleMobileFilters>
              <div className="flex flex-wrap gap-2">
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
                    const supplierLine = branchTxLinkedSupplierInvoiceLine(row, t);
                    const vehicleLinkLine = branchTxLinkedVehicleLine(row, t);
                    const overheadLine = branchTxGeneralOverheadLine(row, t);
                    const pocketLine = expensePocketSubline(row, t);
                    const repayLine = expensePocketRepaySubline(row, t);
                    const pocketRepayMain =
                      String(row.mainCategory ?? "").trim().toUpperCase() ===
                      "OUT_PERSONNEL_POCKET_REPAY";
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
                        const pocketRepayMain =
                          String(row.mainCategory ?? "").trim().toUpperCase() ===
                          "OUT_PERSONNEL_POCKET_REPAY";
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
        )}

        {tab === "stock" && <BranchStockInboundPanel branchId={branch.id} />}

        {tab === "tourismSeason" && (
          <BranchTourismSeasonTab branchId={branch.id} active={tab === "tourismSeason"} />
        )}

        {tab === "zReportAccounting" && (
          <BranchZReportAccountingTab branchId={branch.id} active={tab === "zReportAccounting"} />
        )}

        {tab === "notes" && (
          <BranchNotesTab
            branchId={branch.id}
            active={tab === "notes"}
            readOnly={employeeSelfService}
          />
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

function DashCard({
  badge,
  label,
  value,
  valueClass,
  hint,
  compact,
  highlight,
  tone = "violet",
}: {
  badge?: string;
  label: string;
  value: string;
  valueClass?: string;
  hint?: ReactNode;
  compact?: boolean;
  highlight?: boolean;
  tone?: "violet" | "amber";
}) {
  const surface =
    highlight && tone === "amber"
      ? "border-amber-300/90 bg-amber-50/80 ring-2 ring-amber-200/70 shadow-md"
      : highlight && tone === "violet"
        ? "border-violet-200/90 bg-violet-50/40 ring-1 ring-violet-100/80"
        : tone === "amber"
          ? "border-amber-200/85 bg-white shadow-sm"
          : "border-zinc-200 bg-zinc-50/90";

  const badgeTone = tone === "amber" ? "text-amber-900" : "text-violet-700";

  return (
    <div className={cn("rounded-xl border p-3 sm:p-4", surface)}>
      {badge ? (
        <p
          className={cn(
            "mb-1.5 text-[10px] font-bold uppercase tracking-wider",
            badgeTone
          )}
        >
          {badge}
        </p>
      ) : null}
      <p className="text-xs font-semibold leading-snug text-zinc-700">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-semibold tabular-nums tracking-tight text-zinc-900",
          compact ? "text-base sm:text-lg" : "text-lg sm:text-xl",
          valueClass
        )}
      >
        {value}
      </p>
      {hint ? (
        <div className="mt-1.5 text-[11px] leading-snug text-zinc-500 [&_span]:text-inherit">{hint}</div>
      ) : null}
    </div>
  );
}
