export type ShipmentStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "REVISION_REQUESTED"
  | "PREPARING"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELLED";

export type ShipmentNextActorRole =
  /** Talep eden (dinamik: shipment.requestedBy). DRAFT submit, REVISION accept, DELIVERED confirm. */
  | "REQUESTER"
  | "APPROVER"
  | "WAREHOUSE"
  // Legacy — backend artık döndürmüyor ama eski state lar veya admin tools için tutulur:
  | "STARTER"
  | "COMPLETER";

export type ShipmentItem = {
  id: number;
  productId: number;
  requestedQuantity: number;
  approvedQuantity: number;
  preparedQuantity: number;
  deliveredQuantity: number;
  unitId: number | null;
  note: string | null;
  /** Onaylayıcının önerdiği miktar (REVISION_REQUESTED iken). null = bu satırda değişiklik istenmemiş. */
  proposedQuantity: number | null;
};

export type ShipmentHistory = {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  changedBy: number | null;
  changedByFullName: string | null;
  changedAt: string;
  note: string | null;
  metadataJson: string | null;
};

export type ShipmentRequest = {
  id: number;
  shipmentNo: string;
  branchId: number;
  branchName: string;
  warehouseId: number;
  warehouseName: string;
  requestedBy: number;
  approvedBy: number | null;
  driverId: number | null;
  vehicleId: number | null;
  status: ShipmentStatus;
  priority: string;
  requestedDeliveryDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: ShipmentItem[];
  timeline: ShipmentHistory[];
  nextActorRole: ShipmentNextActorRole | null;
  nextActorUserId: number | null;
  nextActorFullName: string | null;
  stepAssignees: ShipmentStepAssignees | null;
  /** REVISION_REQUESTED iken onaylayıcının notu (UI'da amber paneldedyösterilir). */
  revisionNote: string | null;
  revisionRequestedAt: string | null;
  revisionRequestedBy: number | null;
  revisionRequestedByFullName: string | null;
};

/** Onaylayıcı "değişiklik iste" body'si. */
export type RequestShipmentRevisionPayload = {
  proposedLines: Array<{ itemId: number; proposedQuantity: number }>;
  note?: string | null;
};

/** Talep eden "öneriyi kabul et" body'si. */
export type AcceptShipmentRevisionPayload = {
  note?: string | null;
};

export type ShipmentStepAssignees = {
  starterFullName: string | null;
  approverFullName: string | null;
  warehouseFullName: string | null;
  completerFullName: string | null;
};

export type ShipmentPagedResponse = {
  items: ShipmentRequest[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type ShipmentCreatableBranch = {
  id: number;
  name: string;
};

export type ShipmentAssignableUser = {
  userId: number;
  username: string;
  fullName: string | null;
};

export type ShipmentBranchAssignment = {
  branchId: number;
  branchName: string;
  starterUserId: number | null;
  approverUserId: number | null;
  warehouseUserId: number | null;
  driverAssignerUserId: number | null;
  dispatcherUserId: number | null;
  completerUserId: number | null;
};

export type ShipmentAssignmentCatalog = {
  assignments: ShipmentBranchAssignment[];
  users: ShipmentAssignableUser[];
};

export type ShipmentActionable = {
  shipmentId: number;
  shipmentNo: string;
  branchId: number;
  branchName: string;
  status: ShipmentStatus;
  actorRole: "STARTER" | "APPROVER" | "WAREHOUSE" | "DRIVER_ASSIGNER" | "DISPATCHER" | "COMPLETER";
  createdAt: string;
  requestedDeliveryDate: string | null;
};
