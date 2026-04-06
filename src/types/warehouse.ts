export type WarehouseListItem = {
  id: number;
  name: string;
  createdAt: string;
  address?: string | null;
  city?: string | null;
  responsibleManagerUserId?: number | null;
  responsibleMasterUserId?: number | null;
  responsibleManagerDisplayName?: string | null;
  responsibleMasterDisplayName?: string | null;
};

export type WarehouseDetail = WarehouseListItem;

export type WarehouseUserOption = {
  id: number;
  displayName: string;
};

export type CreateWarehouseInput = {
  name: string;
  address?: string | null;
  city?: string | null;
  responsibleManagerUserId?: number | null;
  responsibleMasterUserId?: number | null;
};

export type WarehouseMovementItem = {
  id: number;
  productId: number;
  productName: string;
  unit: string | null;
  type: "IN" | "OUT";
  quantity: number;
  movementDate: string;
  description: string | null;
  checkedByPersonnelName?: string | null;
  approvedByPersonnelName?: string | null;
  hasInvoicePhoto?: boolean;
};

export type WarehouseMovementsPaged = {
  items: WarehouseMovementItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type WarehouseMovementsPageParams = {
  page: number;
  pageSize: number;
  type?: "IN" | "OUT" | "";
  productId?: number;
  dateFrom?: string;
  dateTo?: string;
};

export type WarehouseAuditItem = {
  id: number;
  tableName: string;
  recordId: number | null;
  action: string;
  oldDataJson: string | null;
  newDataJson: string | null;
  userId: number | null;
  createdAt: string;
};

export type WarehouseAuditPaged = {
  items: WarehouseAuditItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type WarehouseAuditPageParams = {
  page: number;
  pageSize: number;
  scope?: "" | "all" | "warehouses" | "warehouse_movements";
};
