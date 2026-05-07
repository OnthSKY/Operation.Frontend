"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createShipmentDraft,
  fetchShipmentBranchAssignments,
  fetchShipmentCreatableBranches,
  fetchShipmentRequest,
  fetchShipmentRequests,
  saveShipmentBranchAssignment,
  transitionShipment,
  type ShipmentListParams,
} from "@/modules/shipments/api/shipment-api";
import type { ShipmentStatus } from "@/types/shipment";

export const shipmentKeys = {
  all: ["shipments"] as const,
  list: (params: ShipmentListParams) => [...shipmentKeys.all, "list", params] as const,
  creatableBranches: () => [...shipmentKeys.all, "creatable-branches"] as const,
  branchAssignments: () => [...shipmentKeys.all, "branch-assignments"] as const,
  detail: (id: number) => [...shipmentKeys.all, "detail", id] as const,
};

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
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: shipmentKeys.all });
      void qc.invalidateQueries({ queryKey: shipmentKeys.detail(data.id) });
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
