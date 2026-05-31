"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchBranchProductBalances,
  fetchBranchStockConsumptions,
  recordBranchStockAdjustment,
  recordBranchStockConsumption,
  recordBranchStockSnapshot,
  restoreBranchStockConsumption,
  softDeleteBranchStockConsumption,
  type AdjustInput,
  type ConsumeInput,
  type SnapshotInput,
} from "@/modules/branch/api/branch-stock-consumptions-api";

export const branchStockConsumptionKeys = {
  all: ["branch-stock-consumptions"] as const,
  list: (
    branchId: number,
    dateFrom: string,
    dateTo: string,
    includeDeleted: boolean,
    page: number,
    pageSize: number
  ) =>
    [
      ...branchStockConsumptionKeys.all,
      "list",
      branchId,
      dateFrom,
      dateTo,
      includeDeleted ? 1 : 0,
      page,
      pageSize,
    ] as const,
  balances: (branchId: number, productIdsKey: string) =>
    [...branchStockConsumptionKeys.all, "balances", branchId, productIdsKey] as const,
};

function productIdsKey(ids?: number[]): string {
  if (!ids || ids.length === 0) return "all";
  return [...ids].sort((a, b) => a - b).join(",");
}

export function useBranchStockConsumptions(
  branchId: number,
  params: {
    dateFrom: string;
    dateTo: string;
    includeDeleted: boolean;
    page: number;
    pageSize: number;
  },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: branchStockConsumptionKeys.list(
      branchId,
      params.dateFrom,
      params.dateTo,
      params.includeDeleted,
      params.page,
      params.pageSize
    ),
    queryFn: () =>
      fetchBranchStockConsumptions(branchId, {
        dateFrom: params.dateFrom || undefined,
        dateTo: params.dateTo || undefined,
        includeDeleted: params.includeDeleted,
        page: params.page,
        pageSize: params.pageSize,
      }),
    enabled: enabled && branchId > 0,
  });
}

export function useBranchProductBalances(
  branchId: number,
  productIds?: number[],
  enabled: boolean = true
) {
  return useQuery({
    queryKey: branchStockConsumptionKeys.balances(branchId, productIdsKey(productIds)),
    queryFn: () => fetchBranchProductBalances(branchId, productIds),
    enabled: enabled && branchId > 0,
  });
}

function invalidateBranchStockState(qc: ReturnType<typeof useQueryClient>, branchId: number) {
  void qc.invalidateQueries({ queryKey: branchStockConsumptionKeys.all, exact: false });
  // Mevcut inbound panel ve dashboard stok scope da bakiyeyi tüketebilir:
  void qc.invalidateQueries({ queryKey: ["branches", "dashboard", branchId], exact: false });
}

export function useRecordBranchStockConsumption(branchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ConsumeInput) => recordBranchStockConsumption(branchId, input),
    onSuccess: () => invalidateBranchStockState(qc, branchId),
  });
}

export function useRecordBranchStockSnapshot(branchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SnapshotInput) => recordBranchStockSnapshot(branchId, input),
    onSuccess: () => invalidateBranchStockState(qc, branchId),
  });
}

export function useRecordBranchStockAdjustment(branchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustInput) => recordBranchStockAdjustment(branchId, input),
    onSuccess: () => invalidateBranchStockState(qc, branchId),
  });
}

export function useSoftDeleteBranchStockConsumption(branchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => softDeleteBranchStockConsumption(branchId, id),
    onSuccess: () => invalidateBranchStockState(qc, branchId),
  });
}

export function useRestoreBranchStockConsumption(branchId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => restoreBranchStockConsumption(branchId, id),
    onSuccess: () => invalidateBranchStockState(qc, branchId),
  });
}
