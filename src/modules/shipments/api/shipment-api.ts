import { apiRequest } from "@/shared/api/client";
import type {
  AcceptShipmentRevisionPayload,
  RequestShipmentRevisionPayload,
  ShipmentActionable,
  ShipmentAssignmentCatalog,
  ShipmentBranchAssignment,
  ShipmentCreatableBranch,
  ShipmentPagedResponse,
  ShipmentRequest,
  ShipmentStatus,
} from "@/types/shipment";

export type ShipmentListParams = {
  status?: ShipmentStatus | "";
  branchId?: number;
  warehouseId?: number;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchShipmentRequests(params: ShipmentListParams = {}): Promise<ShipmentPagedResponse> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.branchId != null && params.branchId > 0) q.set("branchId", String(params.branchId));
  if (params.warehouseId != null && params.warehouseId > 0) q.set("warehouseId", String(params.warehouseId));
  if (params.priority?.trim()) q.set("priority", params.priority.trim());
  if (params.dateFrom) q.set("dateFrom", params.dateFrom);
  if (params.dateTo) q.set("dateTo", params.dateTo);
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return apiRequest<ShipmentPagedResponse>(`/shipment-requests${suffix}`);
}

export async function fetchShipmentRequest(id: number): Promise<ShipmentRequest> {
  return apiRequest<ShipmentRequest>(`/shipment-requests/${id}`);
}

export async function fetchShipmentCreatableBranches(): Promise<ShipmentCreatableBranch[]> {
  return apiRequest<ShipmentCreatableBranch[]>("/shipment-requests/creatable-branches");
}

export async function fetchShipmentBranchAssignments(): Promise<ShipmentAssignmentCatalog> {
  return apiRequest<ShipmentAssignmentCatalog>("/shipment-requests/branch-assignments");
}

export async function fetchMyActionableShipments(): Promise<ShipmentActionable[]> {
  return apiRequest<ShipmentActionable[]>("/shipment-requests/my-actionable");
}

export async function saveShipmentBranchAssignment(
  branchId: number,
  body: {
    starterUserId?: number | null;
    approverUserId?: number | null;
    warehouseUserId?: number | null;
    driverAssignerUserId?: number | null;
    dispatcherUserId?: number | null;
    completerUserId?: number | null;
  }
): Promise<ShipmentBranchAssignment> {
  return apiRequest<ShipmentBranchAssignment>(`/shipment-requests/branch-assignments/${branchId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function createShipmentDraft(body: {
  branchId: number;
  warehouseId: number;
  priority: string;
  requestedDeliveryDate?: string | null;
  notes?: string | null;
  items: Array<{ productId: number; requestedQuantity: number; unitId?: number | null; note?: string | null }>;
}): Promise<ShipmentRequest> {
  return apiRequest<ShipmentRequest>("/shipment-requests", { method: "POST", body: JSON.stringify(body) });
}

export async function transitionShipment(
  id: number,
  body: { toStatus: ShipmentStatus; note?: string | null; metadataJson?: string | null }
): Promise<ShipmentRequest> {
  return apiRequest<ShipmentRequest>(`/shipment-requests/${id}/transitions`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Onaylayıcı: "değişiklik iste" — PENDING_APPROVAL → REVISION_REQUESTED. */
export async function requestShipmentRevision(
  id: number,
  body: RequestShipmentRevisionPayload
): Promise<ShipmentRequest> {
  return apiRequest<ShipmentRequest>(`/shipment-requests/${id}/request-revision`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Talep eden: "öneriyi kabul et" — REVISION_REQUESTED → PENDING_APPROVAL. */
export async function acceptShipmentRevision(
  id: number,
  body: AcceptShipmentRevisionPayload
): Promise<ShipmentRequest> {
  return apiRequest<ShipmentRequest>(`/shipment-requests/${id}/accept-revision`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Bir deponun ürün başına rezerve miktarı (productId → reserved). PREPARING+ON_THE_WAY. */
export async function fetchWarehouseReservations(
  warehouseId: number
): Promise<Record<number, number>> {
  return apiRequest<Record<number, number>>(
    `/shipment-requests/warehouse-reservations/${warehouseId}`,
  );
}
