"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchFinancialReport,
  fetchFinancialSummaryReport,
} from "@/modules/reports/api/reports-api";
import { localIsoDate } from "@/shared/lib/local-iso-date";

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

/** Backend 400 gün üst sınırı var; lifetime için yıllık parçalar halinde çekip topluyoruz. */
const LIFETIME_FROM_YEAR = 2020;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildLifetimeChunks(today: string): Array<{ from: string; to: string }> {
  const todayDate = new Date(today);
  const chunks: Array<{ from: string; to: string }> = [];
  let cursor = new Date(LIFETIME_FROM_YEAR, 0, 1);
  while (cursor <= todayDate) {
    const end = new Date(cursor);
    end.setDate(end.getDate() + 364);
    const cappedEnd = end > todayDate ? todayDate : end;
    chunks.push({ from: isoDate(cursor), to: isoDate(cappedEnd) });
    cursor = new Date(cappedEnd);
    cursor.setDate(cursor.getDate() + 1);
  }
  return chunks;
}

async function fetchLifetime(today: string) {
  const chunks = buildLifetimeChunks(today);
  const parts = await Promise.all(
    chunks.map((c) =>
      fetchFinancialSummaryReport({ dateFrom: c.from, dateTo: c.to })
    )
  );
  const merged: Record<
    string,
    {
      currencyCode: string;
      totalIncome: number;
      totalExpense: number;
      totalSalaryPaid: number;
      totalAdvanceGiven: number;
      totalSupplierRegisterCashPaid: number;
      netCash: number;
    }
  > = {};
  for (const p of parts) {
    for (const b of p.byCurrency) {
      const k = b.currencyCode.toUpperCase();
      const acc = (merged[k] ??= {
        currencyCode: b.currencyCode,
        totalIncome: 0,
        totalExpense: 0,
        totalSalaryPaid: 0,
        totalAdvanceGiven: 0,
        totalSupplierRegisterCashPaid: 0,
        netCash: 0,
      });
      acc.totalIncome += Number(b.totalIncome) || 0;
      acc.totalExpense += Number(b.totalExpense) || 0;
      acc.totalSalaryPaid += Number(b.totalSalaryPaid) || 0;
      acc.totalAdvanceGiven += Number(b.totalAdvanceGiven) || 0;
      acc.totalSupplierRegisterCashPaid +=
        Number(b.totalSupplierRegisterCashPaid ?? 0) || 0;
      acc.netCash += Number(b.netCash) || 0;
    }
  }
  return { byCurrency: Object.values(merged) };
}

export type CashFlowSums = {
  /** Patron tarafına devredilen toplam (lifetime). */
  toPatron: number;
  /** Şube müdürü / personel tarafına devredilen toplam (lifetime). */
  toPersonnel: number;
  currency: string;
};

async function fetchLifetimeCashFlow(today: string): Promise<CashFlowSums> {
  const chunks = buildLifetimeChunks(today);
  const parts = await Promise.all(
    chunks.map((c) =>
      fetchFinancialReport({ dateFrom: c.from, dateTo: c.to })
    )
  );
  const merged: Record<string, { toPatron: number; toPersonnel: number; currency: string }> = {};
  for (const p of parts) {
    for (const r of p.incomeRegisterBreakdownByCurrency ?? []) {
      const k = r.currencyCode.toUpperCase();
      const acc = (merged[k] ??= {
        toPatron: 0,
        toPersonnel: 0,
        currency: r.currencyCode,
      });
      acc.toPatron += Number(r.cashPatron) || 0;
      acc.toPersonnel += Number(r.cashBranchManager) || 0;
    }
  }
  const primary = merged["TRY"] ?? Object.values(merged)[0];
  return primary ?? { toPatron: 0, toPersonnel: 0, currency: "TRY" };
}

export function useDashboardFinancialCards(enabled: boolean) {
  const today = localIsoDate();
  const year = new Date().getFullYear();
  const seasonFrom = `${year}-01-01`;

  const lifetimeQ = useQuery({
    queryKey: ["dashboard", "financial-summary", "lifetime", today],
    queryFn: () => fetchLifetime(today),
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
  const todayQ = useQuery({
    queryKey: ["dashboard", "financial-summary", "today", today],
    queryFn: () =>
      fetchFinancialSummaryReport({ dateFrom: today, dateTo: today }),
    enabled,
    staleTime: 60_000,
  });

  const cashFlowQ = useQuery({
    queryKey: ["dashboard", "cash-flow", "lifetime", today],
    queryFn: () => fetchLifetimeCashFlow(today),
    enabled,
    staleTime: 60_000,
  });

  return {
    lifetime: lifetimeQ.data
      ? pickPrimary(lifetimeQ.data.byCurrency)
      : emptyBucket(),
    season: seasonQ.data ? pickPrimary(seasonQ.data.byCurrency) : emptyBucket(),
    today: todayQ.data ? pickPrimary(todayQ.data.byCurrency) : emptyBucket(),
    cashFlow:
      cashFlowQ.data ?? { toPatron: 0, toPersonnel: 0, currency: "TRY" },
    isLoading:
      lifetimeQ.isPending || seasonQ.isPending || todayQ.isPending,
    isError: lifetimeQ.isError || seasonQ.isError || todayQ.isError,
  };
}
