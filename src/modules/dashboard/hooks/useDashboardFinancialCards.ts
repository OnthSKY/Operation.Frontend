"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchFinancialLifetime,
  fetchFinancialSummaryLifetime,
  fetchFinancialSummaryReport,
} from "@/modules/reports/api/reports-api";
import { addDaysToLocalIsoDate, localIsoDate } from "@/shared/lib/local-iso-date";

export type FinancialBucketSums = {
  income: number;
  /** Gelir − net = kasadan çıkan (gider + maaş + avans + tedarikçi nakit). */
  expenseFromRegister: number;
  net: number;
  totalSalaryPaid: number;
  totalAdvanceGiven: number;
  currency: string;
};

function emptyBucket(): FinancialBucketSums {
  return {
    income: 0,
    expenseFromRegister: 0,
    net: 0,
    totalSalaryPaid: 0,
    totalAdvanceGiven: 0,
    currency: "TRY",
  };
}

/** Tek para birimi (TRY önceliği) — dashboard görseli için sade gösterim. */
function pickPrimary(
  buckets: Array<{
    currencyCode: string;
    totalIncome: number;
    totalExpense: number;
    totalSalaryPaid: number;
    totalAdvanceGiven: number;
    totalSupplierRegisterCashPaid?: number;
    netCash: number;
  }>
): FinancialBucketSums {
  if (!buckets.length) return emptyBucket();
  const primary =
    buckets.find((b) => b.currencyCode.toUpperCase() === "TRY") ?? buckets[0];
  return {
    income: Number(primary.totalIncome) || 0,
    expenseFromRegister:
      (Number(primary.totalIncome) || 0) - (Number(primary.netCash) || 0),
    net: Number(primary.netCash) || 0,
    totalSalaryPaid: Number(primary.totalSalaryPaid) || 0,
    totalAdvanceGiven: Number(primary.totalAdvanceGiven) || 0,
    currency: primary.currencyCode,
  };
}

export type CashFlowSums = {
  /** Patron tarafına devredilen toplam (lifetime). */
  toPatron: number;
  /** Şube müdürü / personel tarafına devredilen toplam (lifetime). */
  toPersonnel: number;
  currency: string;
};

export function useDashboardFinancialCards(enabled: boolean) {
  const now = new Date();
  const today = localIsoDate(now);
  const year = now.getFullYear();
  const seasonFrom = `${year}-01-01`;
  // Ay: takvim ayının 1'i → bugün. Hafta: bu haftanın Pazartesi'si → bugün.
  const monthFrom = localIsoDate(new Date(year, now.getMonth(), 1));
  const daysFromMonday = (now.getDay() + 6) % 7; // Pzt=0 … Paz=6
  const weekFrom = addDaysToLocalIsoDate(today, -daysFromMonday);

  // Tek istek — backend'in lifetime endpoint'i 25 yıllık üst limitle chunk'sız döner.
  // Önceki sürüm yıllık parçalara böldüğü için tek başına 7-8 HTTP isteği ediyordu.
  const lifetimeQ = useQuery({
    queryKey: ["dashboard", "financial-summary", "lifetime", today],
    queryFn: () => fetchFinancialSummaryLifetime(today),
    enabled,
    staleTime: 60_000,
  });
  const seasonQ = useQuery({
    queryKey: ["dashboard", "financial-summary", "season", year],
    queryFn: () =>
      fetchFinancialSummaryReport({ dateFrom: seasonFrom, dateTo: today }),
    enabled,
    staleTime: 60_000,
  });
  const monthQ = useQuery({
    queryKey: ["dashboard", "financial-summary", "month", monthFrom, today],
    queryFn: () =>
      fetchFinancialSummaryReport({ dateFrom: monthFrom, dateTo: today }),
    enabled,
    staleTime: 60_000,
  });
  const weekQ = useQuery({
    queryKey: ["dashboard", "financial-summary", "week", weekFrom, today],
    queryFn: () =>
      fetchFinancialSummaryReport({ dateFrom: weekFrom, dateTo: today }),
    enabled,
    staleTime: 60_000,
  });
  const todayQ = useQuery({
    queryKey: ["dashboard", "financial-summary", "today", today],
    queryFn: () =>
      fetchFinancialSummaryReport({ dateFrom: today, dateTo: today }),
    enabled,
    staleTime: 60_000,
  });

  // Cash flow için de lifetime detay endpoint'i — eski sürüm 7 chunk daha atıyordu.
  const cashFlowQ = useQuery({
    queryKey: ["dashboard", "cash-flow", "lifetime", today],
    queryFn: async (): Promise<CashFlowSums> => {
      const r = await fetchFinancialLifetime(today);
      const merged: Record<
        string,
        { toPatron: number; toPersonnel: number; currency: string }
      > = {};
      for (const row of r.incomeRegisterBreakdownByCurrency ?? []) {
        const k = row.currencyCode.toUpperCase();
        const acc = (merged[k] ??= {
          toPatron: 0,
          toPersonnel: 0,
          currency: row.currencyCode,
        });
        acc.toPatron += Number(row.cashPatron) || 0;
        acc.toPersonnel += Number(row.cashBranchManager) || 0;
      }
      const primary = merged["TRY"] ?? Object.values(merged)[0];
      return primary ?? { toPatron: 0, toPersonnel: 0, currency: "TRY" };
    },
    enabled,
    staleTime: 60_000,
  });

  return {
    lifetime: lifetimeQ.data
      ? pickPrimary(lifetimeQ.data.byCurrency)
      : emptyBucket(),
    season: seasonQ.data ? pickPrimary(seasonQ.data.byCurrency) : emptyBucket(),
    month: monthQ.data ? pickPrimary(monthQ.data.byCurrency) : emptyBucket(),
    week: weekQ.data ? pickPrimary(weekQ.data.byCurrency) : emptyBucket(),
    today: todayQ.data ? pickPrimary(todayQ.data.byCurrency) : emptyBucket(),
    cashFlow:
      cashFlowQ.data ?? { toPatron: 0, toPersonnel: 0, currency: "TRY" },
    isLoading:
      lifetimeQ.isPending ||
      seasonQ.isPending ||
      monthQ.isPending ||
      weekQ.isPending ||
      todayQ.isPending,
    isError:
      lifetimeQ.isError ||
      seasonQ.isError ||
      monthQ.isError ||
      weekQ.isError ||
      todayQ.isError,
  };
}
