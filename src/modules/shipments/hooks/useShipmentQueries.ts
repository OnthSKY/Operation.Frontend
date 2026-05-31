"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptShipmentRevision,
  createShipmentDraft,
  fetchMyActionableShipments,
  fetchShipmentBranchAssignments,
  fetchShipmentCreatableBranches,
  fetchShipmentRequest,
  fetchShipmentRequests,
  fetchWarehouseReservations,
  regenerateDeliverySlip,
  requestShipmentRevision,
  saveShipmentBranchAssignment,
  transitionShipment,
  type ShipmentListParams,
} from "@/modules/shipments/api/shipment-api";
import type {
  AcceptShipmentRevisionPayload,
  RequestShipmentRevisionPayload,
  ShipmentStatus,
} from "@/types/shipment";

export const shipmentKeys = {
  all: ["shipments"] as const,
  list: (params: ShipmentListParams) => [...shipmentKeys.all, "list", params] as const,
  creatableBranches: () => [...shipmentKeys.all, "creatable-branches"] as const,
  branchAssignments: () => [...shipmentKeys.all, "branch-assignments"] as const,
  detail: (id: number) => [...shipmentKeys.all, "detail", id] as const,
  myActionable: () => [...shipmentKeys.all, "my-actionable"] as const,
  warehouseReservations: (warehouseId: number) =>
    [...shipmentKeys.all, "warehouse-reservations", warehouseId] as const,
};

/**
 * Bir deponun ürün başına rezerve miktarı (PREPARING + ON_THE_WAY sevkiyatlardan).
 * Create ekranı kullanır: effective stock = product.byWarehouse[wh].quantity - reservations[productId]
 */
export function useWarehouseReservations(warehouseId: number | null, enabled = true) {
  return useQuery({
    queryKey: shipmentKeys.warehouseReservations(warehouseId ?? 0),
    queryFn: () => fetchWarehouseReservations(warehouseId as number),
    enabled: enabled && typeof warehouseId === "number" && warehouseId > 0,
    staleTime: 30_000,
  });
}

export function useMyActionableShipmentsQuery(enabled: boolean) {
  return useQuery({
    queryKey: shipmentKeys.myActionable(),
    queryFn: fetchMyActionableShipments,
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useShipmentList(params: ShipmentListParams) {
  return useQuery({
    queryKey: shipmentKeys.list(params),
    queryFn: () => fetchShipmentRequests(params),
  });
}

export function useShipmentDetail(id: number) {
  return useQuery({
    queryKey: shipmentKeys.detail(id),
    queryFn: () => fetchShipmentRequest(id),
    enabled: id > 0,
  });
}

export function useShipmentCreatableBranches() {
  return useQuery({
    queryKey: shipmentKeys.creatableBranches(),
    queryFn: fetchShipmentCreatableBranches,
  });
}

export function useShipmentBranchAssignments() {
  return useQuery({
    queryKey: shipmentKeys.branchAssignments(),
    queryFn: fetchShipmentBranchAssignments,
  });
}

export function useCreateShipmentDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createShipmentDraft,
    onSuccess: () => void qc.invalidateQueries({ queryKey: shipmentKeys.all }),
  });
}

export function useTransitionShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, toStatus, note }: { id: number; toStatus: ShipmentStatus; note?: string }) =>
      transitionShipment(id, { toStatus, note }),
    // Awaited so `isPending` stays true until cache is fresh — prevents the brief window
    // where the button re-enables on stale data and the user can fire DELIVERED→DELIVERED.
    onSuccess: async (data) => {
      qc.setQueryData(shipmentKeys.detail(data.id), data);
      await Promise.all([
        qc.invalidateQueries({ queryKey: shipmentKeys.detail(data.id) }),
        qc.invalidateQueries({ queryKey: shipmentKeys.all }),
      ]);
    },
  });
}

export function useRequestShipmentRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: RequestShipmentRevisionPayload }) =>
      requestShipmentRevision(id, body),
    onSuccess: async (data) => {
      qc.setQueryData(shipmentKeys.detail(data.id), data);
      await Promise.all([
        qc.invalidateQueries({ queryKey: shipmentKeys.detail(data.id) }),
        qc.invalidateQueries({ queryKey: shipmentKeys.all }),
      ]);
    },
  });
}

export function useAcceptShipmentRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: AcceptShipmentRevisionPayload }) =>
      acceptShipmentRevision(id, body),
    onSuccess: async (data) => {
      qc.setQueryData(shipmentKeys.detail(data.id), data);
      await Promise.all([
        qc.invalidateQueries({ queryKey: shipmentKeys.detail(data.id) }),
        qc.invalidateQueries({ queryKey: shipmentKeys.all }),
      ]);
    },
  });
}

/**
 * Admin: teslim irsaliyesi PDF'ini (yeniden) oluştur. Eski DELIVERED kayıtlarda PDF hiç yazılmadıysa
 * ya da generation hata aldıysa kullanılır. Başarıda detayı invalidate eder (download butonu çalışsın).
 */
export function useRegenerateDeliverySlip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => regenerateDeliverySlip(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: shipmentKeys.detail(id) });
    },
  });
}

export function useSaveShipmentBranchAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      branchId,
      body,
    }: {
      branchId: number;
      body: {
        starterUserId?: number | null;
        approverUserId?: number | null;
        warehouseUserId?: number | null;
        driverAssignerUserId?: number | null;
        dispatcherUserId?: number | null;
        completerUserId?: number | null;
      };
    }) => saveShipmentBranchAssignment(branchId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: shipmentKeys.branchAssignments() });
    },
  });
}
