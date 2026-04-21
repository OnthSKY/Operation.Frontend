"use client";

import { useI18n } from "@/i18n/context";
import { useBranchesList } from "@/modules/branch/hooks/useBranchQueries";
import type { ReportHubRangeLock } from "@/modules/reports/components/ReportHubDateRangeControls";
import {
  useFinancialBranchMonthly,
  useFinancialReport,
  useFinancialSummaryMonthly,
} from "@/modules/reports/hooks/useReportsQueries";
import { addDaysFromIso, startOfMonthIso } from "@/modules/reports/lib/report-period-helpers";
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

export type FinancialReportsContextValue = {
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
  branches: ReturnType<typeof useBranchesList>["data"];
  applyDatePreset: (key: "month" | "d30" | "d7") => void;
  onCalendarYearRange: (from: string, to: string) => void;
  financial: ReturnType<typeof useFinancialReport>;
  summaryMonthly: ReturnType<typeof useFinancialSummaryMonthly>;
  branchMonthly: ReturnType<typeof useFinancialBranchMonthly>;
  finAdvancedActive: boolean;
};

const FinancialReportsContext = createContext<FinancialReportsContextValue | null>(null);

export function useFinancialReports(): FinancialReportsContextValue {
  const v = useContext(FinancialReportsContext);
  if (!v) {
    throw new Error("useFinancialReports must be used within FinancialReportsProvider");
  }
  return v;
}

export function FinancialReportsProvider({ children }: { children: ReactNode }) {
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

  const finParamsCharts = useMemo(
    () => ({
      dateFrom,
      dateTo,
      branchId:
        finBranchId === "" ? undefined : Number.parseInt(finBranchId, 10),
    }),
    [dateFrom, dateTo, finBranchId]
  );

  const allBranchesFinParams = useMemo(() => ({ dateFrom, dateTo }), [dateFrom, dateTo]);

  const financial = useFinancialReport(finParams, true);
  const summaryMonthly = useFinancialSummaryMonthly(finParamsCharts, true);
  const branchMonthly = useFinancialBranchMonthly(
    allBranchesFinParams,
    finBranchId === ""
  );

  useEffect(() => {
    setFinCategory("");
  }, [finMainCategory]);

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

  const onCalendarYearRange = useCallback((from: string, to: string) => {
    setDateRangeLock("calendarYear");
    setDateFrom(from);
    setDateTo(to);
  }, []);

  const finAdvancedActive =
    finCurrency !== "" ||
    finTransactionType !== "" ||
    finMainCategory !== "" ||
    finCategory !== "" ||
    finExpenseSource !== "";

  const value = useMemo(
    (): FinancialReportsContextValue => ({
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
      onCalendarYearRange,
      financial,
      summaryMonthly,
      branchMonthly,
      finAdvancedActive,
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
      onCalendarYearRange,
      financial,
      summaryMonthly,
      branchMonthly,
      finAdvancedActive,
    ]
  );

  return (
    <FinancialReportsContext.Provider value={value}>{children}</FinancialReportsContext.Provider>
  );
}
