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
  /** Pozitif stok satırlarının miktar toplamı (birimler karışık olabilir). */
  totalOnHandQuantity?: number;
  productCountWithStock?: number;
};

export type WarehouseDetail = WarehouseListItem;

export type WarehouseUserOption = {
  id: number;
  displayName: string;
};

/** Birleşik depo kişi listesi (personel + kullanıcı; bağlı olan tek satır). */
export type WarehousePeopleOption = {
  personnelId: number | null;
  userId: number | null;
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
  parentProductId?: number | null;
  parentProductName?: string | null;
  type: "IN" | "OUT";
  quantity: number;
  movementDate: string;
  description: string | null;
  checkedByPersonnelName?: string | null;
  approvedByPersonnelName?: string | null;
  hasInvoicePhoto?: boolean;
  inBatchGroupId?: string | null;
  /** OUT + depo→şube eşleşmesi varsa hedef şube adı */
  outDestinationBranchName?: string | null;
  /** OUT + depodan şubeye sevkiyat (tek şube stok satırı); tam düzenleme API’si. */
  isDepotToBranchShipment?: boolean;
};

/** Depo→şube sevkiyat OUT satırlarının şube bazlı özeti (API ile uyumlu). */
export type WarehouseMovementOutboundByBranchSummary = {
  branchId: number;
  branchName: string;
  totalQuantity: number;
  movementLineCount: number;
};

export type WarehouseMovementsPaged = {
  items: WarehouseMovementItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  /** Filtrelerle uyumlu toplam giriş miktarı (tüm eşleşen satırlar, yalnızca mevcut sayfa değil). */
  totalInQuantity?: number;
  /** Filtrelerle uyumlu toplam çıkış miktarı. */
  totalOutQuantity?: number;
  /** Aynı parti (movementBatchId) veya tek satır; liste sekmesinden bağımsız, tüm sayfalar. */
  inboundShipmentGroupCount?: number;
  outboundShipmentGroupCount?: number;
  outboundByBranch?: WarehouseMovementOutboundByBranchSummary[];
};

export type WarehouseStockFilters = {
  categoryId?: number;
  parentProductId?: number;
  productId?: number;
};

export type WarehouseMovementsPageParams = {
  page: number;
  pageSize: number;
  type?: "IN" | "OUT" | "";
  categoryId?: number;
  productId?: number;
  dateFrom?: string;
  dateTo?: string;
  /** OUT + şubeye transfer ile eşleşen hareketler */
  branchId?: number;
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
