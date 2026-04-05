export type ProductWarehouseQty = {
  warehouseId: number;
  warehouseName: string;
  quantity: number;
};

export type ProductListItem = {
  id: number;
  name: string;
  unit: string | null;
  totalQuantity: number;
  byWarehouse: ProductWarehouseQty[];
};

export type ProductInventory = {
  productId: number;
  productName: string;
  unit: string | null;
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
};

export type ProductCreated = {
  id: number;
  name: string;
  unit: string | null;
};

export type WarehouseProductStockRow = {
  productId: number;
  productName: string;
  unit: string | null;
  quantity: number;
};
