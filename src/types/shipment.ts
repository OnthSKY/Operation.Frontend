export type ShipmentStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "WAITING_WAREHOUSE"
  | "PREPARING"
  | "READY_FOR_DISPATCH"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "COMPLETED"
  | "COMPLETED_WITH_ISSUE"
  | "CANCELLED";

export type ShipmentItem = {
  id: number;
  productId: number;
  requestedQuantity: number;
  approvedQuantity: number;
  preparedQuantity: number;
  deliveredQuantity: number;
  unitId: number | null;
  note: string | null;
};

export type ShipmentHistory = {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  changedBy: number | null;
  changedAt: string;
  note: string | null;
  metadataJson: string | null;
};

export type ShipmentRequest = {
  id: number;
  shipmentNo: string;
  branchId: number;
  warehouseId: number;
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
