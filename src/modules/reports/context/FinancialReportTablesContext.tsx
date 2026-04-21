"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import {
  addDaysFromIso,
  startOfMonthIso,
} from "@/modules/reports/lib/report-period-helpers";
import { useFinancialReport } from "@/modules/reports/hooks/useReportsQueries";
import type { ReportHubRangeLock } from "@/modules/reports/components/ReportHubDateRangeControls";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type FinancialReportTablesContextValue = {
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  dateRangeLock: ReportHubRangeLock;
  setDateRangeLock: (v: ReportHubRangeLock) => void;
  finBranchId: string;
  setFinBranchId: (v: string) => void;
  finCurrency: string;
  setFinCurrency: (v: string) => void;
  finTransactionType: string;
  setFinTransactionType: (v: string) => void;
  finMainCategory: string;
  setFinMainCategory: (v: string) => void;
  finCategory: string;
  setFinCategory: (v: string) => void;
  finExpenseSource: string;
  setFinExpenseSource: (v: string) => void;
  finBranchOptions: { value: string; label: string }[];
  branches: { id: number; name: string }[];
  applyDatePreset: (key: "month" | "d30" | "d7") => void;
  filtersActive: boolean;
  financial: ReturnType<typeof useFinancialReport>;
  branchTrendMap: Map<string, number>;
};

const FinancialReportTablesContext =
  createContext<FinancialReportTablesContextValue | null>(null);

export function FinancialReportTablesProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [dateFrom, setDateFrom] = useState(startOfMonthIso);
  const [dateTo, setDateTo] = useState(() => localIsoDate());
  const [finBranchId, setFinBranchId] = useState("");
  const [finCurrency, setFinCurrency] = useState("");
  const [finTransactionType, setFinTransactionType] = useState("");
  const [finMainCategory, setFinMainCategory] = useState("");
  const [finCategory, setFinCategory] = useState("");
  const [finExpenseSource, setFinExpenseSource] = useState("");
  const [dateRangeLock, setDateRangeLock] = useState<ReportHubRangeLock>("manual");

  const { data: branches = [] } = useBranchesList();

  const finBranchOptions = useMemo(
    () => [
      { value: "", label: t("reports.allBranches") },
      ...branches.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [branches, t]
  );

  const finParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      branchId:
        finBranchId === "" ? undefined : Number.parseInt(finBranchId, 10),
      currencyCode: finCurrency || undefined,
      transactionType: finTransactionType || undefined,
      mainCategory: finMainCategory || undefined,
      category: finCategory || undefined,
      expensePaymentSource: finExpenseSource || undefined,
    }),
    [
      dateFrom,
      dateTo,
      finBranchId,
      finCurrency,
      finTransactionType,
      finMainCategory,
      finCategory,
      finExpenseSource,
    ]
  );

  const financial = useFinancialReport(finParams, true);

  useEffect(() => {
    setFinCategory("");
  }, [finMainCategory]);

  const branchTrendMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const tr of financial.data?.branchTrends ?? []) {
      m.set(`${tr.branchId}:${tr.currencyCode}`, tr.netDelta);
    }
    return m;
  }, [financial.data]);

  const applyDatePreset = useCallback((key: "month" | "d30" | "d7") => {
    const today = localIsoDate();
    if (key === "month") {
      setDateFrom(startOfMonthIso());
      setDateTo(today);
      return;
    }
    if (key === "d30") {
      setDateFrom(addDaysFromIso(today, -29));
      setDateTo(today);
      return;
    }
    setDateFrom(addDaysFromIso(today, -6));
    setDateTo(today);
  }, []);

  const filtersActive =
    finBranchId !== "" ||
    finCurrency !== "" ||
    finTransactionType !== "" ||
    finMainCategory !== "" ||
    finCategory !== "" ||
    finExpenseSource !== "" ||
    dateRangeLock !== "manual";

  const value = useMemo(
    (): FinancialReportTablesContextValue => ({
      dateFrom,
      setDateFrom,
      dateTo,
      setDateTo,
      dateRangeLock,
      setDateRangeLock,
      finBranchId,
      setFinBranchId,
      finCurrency,
      setFinCurrency,
      finTransactionType,
      setFinTransactionType,
      finMainCategory,
      setFinMainCategory,
      finCategory,
      setFinCategory,
      finExpenseSource,
      setFinExpenseSource,
      finBranchOptions,
      branches,
      applyDatePreset,
      filtersActive,
      financial,
      branchTrendMap,
    }),
    [
      dateFrom,
      dateTo,
      dateRangeLock,
      finBranchId,
      finCurrency,
      finTransactionType,
      finMainCategory,
      finCategory,
      finExpenseSource,
      finBranchOptions,
      branches,
      applyDatePreset,
      filtersActive,
      financial,
      branchTrendMap,
    ]
  );

  return (
    <FinancialReportTablesContext.Provider value={value}>
      {children}
    </FinancialReportTablesContext.Provider>
  );
}

export function useFinancialReportTables(): FinancialReportTablesContextValue {
  const v = useContext(FinancialReportTablesContext);
  if (!v) {
    throw new Error("useFinancialReportTables must be used within FinancialReportTablesProvider");
  }
  return v;
}

export type { ReportHubRangeLock };
