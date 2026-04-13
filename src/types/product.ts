export type ProductWarehouseQty = {
  warehouseId: number;
  warehouseName: string;
  quantity: number;
};

export type ProductListItem = {
  id: number;
  name: string;
  unit: string | null;
  parentProductId?: number | null;
  categoryId?: number | null;
  categoryName?: string | null;
  hasChildren?: boolean;
  totalQuantity: number;
  byWarehouse: ProductWarehouseQty[];
};

export type ProductInventory = {
  productId: number;
  productName: string;
  unit: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  parentProductId?: number | null;
  parentProductName?: string | null;
  hasChildren?: boolean;
  /** Ana ürün satırının kendi stoku (alt ürünler hariç); backend eskiyse totalQuantity ile aynı kabul edilebilir */
  ownTotalQuantity?: number;
  totalQuantity: number;
  byWarehouse: {
    warehouseId: number;
    warehouseName: string;
    quantity: number;
  }[];
};

export type ProductMovementLine = {
  id: number;
  warehouseId: number;
  warehouseName: string;
  type: "IN" | "OUT";
  quantity: number;
  movementDate: string;
  description: string | null;
  checkedByPersonnelName?: string | null;
  approvedByPersonnelName?: string | null;
  hasInvoicePhoto?: boolean;
  inBatchGroupId?: string | null;
};

export type ProductMovementsPaged = {
  items: ProductMovementLine[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type ProductMovementsPageParams = {
  warehouseId?: number;
  type?: "IN" | "OUT";
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
};

export type ProductCreated = {
  id: number;
  name: string;
  unit: string | null;
  parentProductId?: number | null;
  categoryId?: number | null;
};

export type WarehouseProductStockRow = {
  productId: number;
  productName: string;
  unit: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  parentProductId?: number | null;
  parentProductName?: string | null;
  quantity: number;
  /** Backend: girilmiş maliyetlerden ortalama (bilgi) */
  suggestedAverageUnitCost?: number | null;
  suggestedAverageCurrencyCode?: string | null;
};
