"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createIdempotencyKey } from "@/lib/api/base-api";
import {
  fetchBranchConsumedTotals,
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
import {
  returnBranchToWarehouse,
  type ReturnBranchToWarehouseLineInput,
} from "@/modules/branch/api/branch-stock-return-api";

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
  consumedTotals: (branchId: number, dateFrom: string, dateTo: string) =>
    [...branchStockConsumptionKeys.all, "consumed-totals", branchId, dateFrom, dateTo] as const,
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

export function useBranchConsumedTotals(
  branchId: number,
  params?: { dateFrom?: string; dateTo?: string },
  enabled: boolean = true
) {
  return useQuery({
    queryKey: branchStockConsumptionKeys.consumedTotals(
      branchId,
      params?.dateFrom ?? "",
      params?.dateTo ?? ""
    ),
    queryFn: () => fetchBranchConsumedTotals(branchId, params),
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

type ReturnBranchToWarehouseVariables = {
  warehouseId: number;
  lines: ReturnBranchToWarehouseLineInput[];
  description?: string | null;
};

/** Mantıksal iade kimliği: material payload'ın stabil imzası (branch hook'a bağlı, sabit). */
function returnOperationSignature(input: ReturnBranchToWarehouseVariables): string {
  const lines = input.lines
    .map((l) => `${l.productId}:${l.quantity}:${l.unitName ?? ""}`)
    .join(",");
  return `${input.warehouseId}|${lines}|${input.description ?? ""}`;
}

/**
 * Doğrudan Şube → Depo iade. Bu hook, işlem çağıranından (modal) BAĞIMSIZ olarak mantıksal-işlem
 * idempotency yaşam döngüsünün TEK sahibidir:
 *   - Anahtar, mutation değişkenlerinin imzasından türetilir ve <c>keyRef</c>'te tutulur.
 *   - Aynı imza (rerender, RQ/network retry, kullanıcı aynı işlemi tekrar) → AYNI anahtar.
 *   - Material payload değişti (depo/ürün/miktar) → yeni imza → YENİ anahtar (aynı-key+farklı-body 409'unu önler).
 *   - Başarı → anahtar sıfırlanır → sonraki GERÇEK iade (aynı değerlerde bile) yeni anahtar alır.
 * Anahtar mutationFn içinde imzaya göre türetildiği için React Query retry'ı (aynı değişkenler → aynı imza)
 * aynı anahtarı yeniden kullanır; retry ASLA yeni anahtar üretmez.
 */
export function useReturnBranchToWarehouse(branchId: number) {
  const qc = useQueryClient();
  const keyRef = useRef<{ sig: string; key: string } | null>(null);

  return useMutation({
    mutationFn: (input: ReturnBranchToWarehouseVariables) => {
      const sig = returnOperationSignature(input);
      if (!keyRef.current || keyRef.current.sig !== sig) {
        keyRef.current = { sig, key: createIdempotencyKey() };
      }
      return returnBranchToWarehouse(
        {
          branchId,
          warehouseId: input.warehouseId,
          lines: input.lines,
          description: input.description ?? null,
        },
        keyRef.current.key
      );
    },
    onSuccess: () => {
      keyRef.current = null; // rotate: sonraki gerçek iade yeni anahtar alsın
      invalidateBranchStockState(qc, branchId);
    },
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
