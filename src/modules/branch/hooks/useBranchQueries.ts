"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBranchNote,
  deleteBranchNote,
  fetchBranchNotes,
  updateBranchNote,
} from "@/modules/branch/api/branch-notes-api";
import {
  createBranchTourismSeasonPeriod,
  deleteBranchTourismSeasonPeriod,
  fetchBranchTourismSeasonPeriods,
  fetchBranchTourismSeasonYearClosureGate,
  updateBranchTourismSeasonPeriod,
} from "@/modules/branch/api/branch-tourism-season-api";
import {
  branchDashboardScopeKey,
  createBranch,
  fetchBranches,
  updateBranch,
  fetchBranchDashboard,
  fetchBranchPersonnelMoneySummaries,
  fetchBranchRegisterSummary,
  fetchBranchStockReceiptsPaged,
  fetchBranchTransactionsPaged,
  fetchBranchZReportAccountingYear,
  type BranchDashboardStockScope,
  type BranchStockPageParams,
  type BranchTxPageParams,
} from "@/modules/branch/api/branches-api";
import { fetchAllAdvances } from "@/modules/personnel/api/advances-api";
import {
  createBranchTransaction,
  deleteBranchTransaction,
  fetchBranchTransactions,
} from "@/modules/branch/api/branch-transactions-api";
import { dashboardSummaryKeys } from "@/modules/dashboard/query-keys";
import { reportsKeys } from "@/modules/reports/query-keys";
import type { CreateBranchInput, UpdateBranchInput } from "@/types/branch";
import type { SaveBranchNoteInput } from "@/types/branch-note";
import type { SaveBranchTourismSeasonPeriodInput } from "@/types/branch-tourism-season";
import type { CreateBranchTransactionInput } from "@/types/branch-transaction";

export const branchKeys = {
  all: ["branches"] as const,
  list: () => [...branchKeys.all, "list"] as const,
  transactions: (branchId: number, date: string) =>
    [...branchKeys.all, "tx", branchId, date] as const,
  registerSummary: (branchId: number, date: string) =>
    [...branchKeys.all, "register-summary", branchId, date] as const,
  advancesForBranch: (branchId: number, limit: number) =>
    [...branchKeys.all, "advances", branchId, limit] as const,
  dashboard: (branchId: number, month: string, scopeKey: string) =>
    [...branchKeys.all, "dashboard", branchId, month, scopeKey] as const,
  txPaged: (branchId: number, p: BranchTxPageParams) =>
    [
      ...branchKeys.all,
      "tx-paged",
      branchId,
      p.page,
      p.pageSize,
      p.type ?? "",
      p.dateFrom ?? "",
      p.dateTo ?? "",
      p.mainCategory ?? "",
      p.cashSettlementParty ?? "",
      p.expensePaymentSource ?? "",
      p.expensePocketPersonnelId ?? 0,
      p.excludeSettledPocketExpenses === true ? 1 : 0,
    ] as const,
  stockReceipts: (branchId: number, p: BranchStockPageParams) =>
    [
      ...branchKeys.all,
      "stock-receipts",
      branchId,
      p.page,
      p.pageSize,
      p.dateFrom ?? "",
      p.dateTo ?? "",
      p.categoryId ?? 0,
      p.parentProductId ?? 0,
      p.productId ?? 0,
    ] as const,
  tourismSeason: (branchId: number, yearKey: number | "all") =>
    [...branchKeys.all, "tourism-season", branchId, yearKey] as const,
  tourismSeasonYearGate: (branchId: number, seasonYear: number) =>
    [...branchKeys.all, "tourism-season-year-gate", branchId, seasonYear] as const,
  zReportAccounting: (branchId: number, year: number) =>
    [...branchKeys.all, "z-report-accounting", branchId, year] as const,
  notes: (branchId: number) => [...branchKeys.all, "notes", branchId] as const,
  personnelMoney: (branchId: number) =>
    [...branchKeys.all, "personnel-money", branchId] as const,
};

export function useBranchPersonnelMoneySummaries(
  branchId: number | null,
  enabled: boolean
) {
  return useQuery({
    queryKey:
      branchId != null && branchId > 0
        ? branchKeys.personnelMoney(branchId)
        : ([...branchKeys.all, "personnel-money", 0] as const),
    queryFn: () => fetchBranchPersonnelMoneySummaries(branchId!),
    enabled: Boolean(enabled && branchId != null && branchId > 0),
  });
}

export function useBranchesList() {
  return useQuery({
    queryKey: branchKeys.list(),
    queryFn: fetchBranches,
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBranchInput) => createBranch(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: branchKeys.list() });
      void qc.invalidateQueries({ queryKey: reportsKeys.patronFlowPosProfiles });
    },
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateBranchInput }) =>
      updateBranch(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: branchKeys.list() });
    },
  });
}

export function useBranchTransactions(
  branchId: number | null,
  date: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey:
      branchId != null
        ? branchKeys.transactions(branchId, date)
        : [...branchKeys.all, "tx", "none", date],
    queryFn: () => fetchBranchTransactions(branchId!, date),
    enabled:
      enabled && branchId != null && branchId > 0 && date.length >= 10,
  });
}

const BRANCH_ADVANCES_LIMIT = 500;

function isValidBranchQueryId(id: number | null | undefined): id is number {
  return typeof id === "number" && Number.isFinite(id) && id > 0;
}

export function useBranchRegisterSummary(
  branchId: number | null,
  date: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey:
      isValidBranchQueryId(branchId)
        ? branchKeys.registerSummary(branchId, date)
        : [...branchKeys.all, "register-summary", "none", date],
    queryFn: () => fetchBranchRegisterSummary(branchId!, date),
    enabled:
      enabled && isValidBranchQueryId(branchId) && date.trim().length >= 10,
  });
}

export function useBranchDashboard(
  branchId: number | null,
  month: string,
  enabled: boolean,
  stockScope: BranchDashboardStockScope = {
    mainCategoryId: null,
    subCategoryId: null,
    parentProductId: null,
    productId: null,
  }
) {
  const scopeKey = branchDashboardScopeKey(stockScope);
  return useQuery({
    queryKey: branchKeys.dashboard(branchId ?? 0, month, scopeKey),
    queryFn: () => fetchBranchDashboard(branchId!, month, stockScope),
    enabled: enabled && branchId != null && branchId > 0 && month.length === 7,
  });
}

export function useBranchTransactionsPaged(
  branchId: number | null,
  params: BranchTxPageParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: branchKeys.txPaged(branchId ?? 0, params),
    queryFn: () => fetchBranchTransactionsPaged(branchId!, params),
    enabled: enabled && branchId != null && branchId > 0,
  });
}

export function useBranchStockReceiptsPaged(
  branchId: number | null,
  params: BranchStockPageParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: branchKeys.stockReceipts(branchId ?? 0, params),
    queryFn: () => fetchBranchStockReceiptsPaged(branchId!, params),
    enabled: enabled && branchId != null && branchId > 0,
  });
}

export function useBranchAdvancesList(
  branchId: number | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey:
      branchId != null
        ? branchKeys.advancesForBranch(branchId, BRANCH_ADVANCES_LIMIT)
        : [...branchKeys.all, "advances", 0, BRANCH_ADVANCES_LIMIT],
    queryFn: () =>
      fetchAllAdvances({
        branchId: branchId!,
        limit: BRANCH_ADVANCES_LIMIT,
      }),
    enabled: enabled && branchId != null && branchId > 0,
  });
}

export function useBranchTourismSeasonYearClosureGate(
  branchId: number,
  seasonYear: number | null,
  enabled: boolean
) {
  return useQuery({
    queryKey:
      branchId > 0 && seasonYear != null
        ? branchKeys.tourismSeasonYearGate(branchId, seasonYear)
        : ([...branchKeys.all, "tourism-season-year-gate", 0, 0] as const),
    queryFn: () => fetchBranchTourismSeasonYearClosureGate(branchId, seasonYear!),
    enabled:
      enabled &&
      branchId > 0 &&
      seasonYear != null &&
      Number.isFinite(seasonYear) &&
      seasonYear >= 1991 &&
      seasonYear <= 2100,
  });
}

export function useBranchTourismSeasonPeriods(
  branchId: number | null,
  seasonYear: number | undefined,
  enabled: boolean
) {
  const yearKey =
    seasonYear != null && Number.isFinite(seasonYear) ? Math.trunc(seasonYear) : ("all" as const);
  return useQuery({
    queryKey: branchKeys.tourismSeason(branchId ?? 0, yearKey),
    queryFn: () =>
      fetchBranchTourismSeasonPeriods(
        branchId!,
        seasonYear != null && Number.isFinite(seasonYear) ? Math.trunc(seasonYear) : undefined
      ),
    enabled: enabled && branchId != null && branchId > 0,
  });
}

export function useBranchZReportAccountingYear(
  branchId: number,
  year: number,
  enabled: boolean
) {
  return useQuery({
    queryKey: branchKeys.zReportAccounting(branchId, year),
    queryFn: () => fetchBranchZReportAccountingYear(branchId, year),
    enabled: enabled && branchId > 0 && year >= 2000 && year <= 2100,
  });
}

export function useCreateBranchTourismSeasonPeriod(branchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveBranchTourismSeasonPeriodInput) =>
      createBranchTourismSeasonPeriod(branchId, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...branchKeys.all, "tourism-season", branchId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...branchKeys.all, "tourism-season-year-gate", branchId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...branchKeys.all, "z-report-accounting", branchId],
        exact: false,
      });
    },
  });
}

export function useUpdateBranchTourismSeasonPeriod(branchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      periodId,
      body,
    }: {
      periodId: number;
      body: SaveBranchTourismSeasonPeriodInput;
    }) => updateBranchTourismSeasonPeriod(branchId, periodId, body),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...branchKeys.all, "tourism-season", branchId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...branchKeys.all, "z-report-accounting", branchId],
        exact: false,
      });
    },
  });
}

export function useDeleteBranchTourismSeasonPeriod(branchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (periodId: number) => deleteBranchTourismSeasonPeriod(branchId, periodId),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: [...branchKeys.all, "tourism-season", branchId],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: [...branchKeys.all, "z-report-accounting", branchId],
        exact: false,
      });
    },
  });
}

export function useBranchNotes(branchId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: branchId != null && branchId > 0 ? branchKeys.notes(branchId) : ([...branchKeys.all, "notes", 0] as const),
    queryFn: () => fetchBranchNotes(branchId!),
    enabled: Boolean(enabled && branchId != null && branchId > 0),
  });
}

export function useCreateBranchNote(branchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveBranchNoteInput) => createBranchNote(branchId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: branchKeys.notes(branchId) });
    },
  });
}

export function useUpdateBranchNote(branchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, body }: { noteId: number; body: SaveBranchNoteInput }) =>
      updateBranchNote(branchId, noteId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: branchKeys.notes(branchId) });
    },
  });
}

export function useDeleteBranchNote(branchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: number) => deleteBranchNote(branchId, noteId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: branchKeys.notes(branchId) });
    },
  });
}

export function useCreateBranchTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBranchTransactionInput) =>
      createBranchTransaction(input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: branchKeys.all });
      void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
      if (variables.branchId != null && variables.branchId > 0) {
        void qc.invalidateQueries({
          queryKey: branchKeys.registerSummary(
            variables.branchId,
            variables.transactionDate.slice(0, 10)
          ),
        });
      }
      void qc.invalidateQueries({
        queryKey: ["personnel", "management-snapshot"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: ["personnel", "attributed-expenses"],
        exact: false,
      });
      void qc.invalidateQueries({ queryKey: reportsKeys.all });
    },
  });
}

export function useDeleteBranchTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: number) => deleteBranchTransaction(transactionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: branchKeys.all });
      void qc.invalidateQueries({ queryKey: dashboardSummaryKeys.all });
      void qc.invalidateQueries({
        queryKey: ["personnel", "management-snapshot"],
        exact: false,
      });
      void qc.invalidateQueries({
        queryKey: ["personnel", "attributed-expenses"],
        exact: false,
      });
      void qc.invalidateQueries({ queryKey: reportsKeys.all });
    },
  });
}
