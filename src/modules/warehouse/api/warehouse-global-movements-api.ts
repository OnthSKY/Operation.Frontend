import { fetchWarehouseMovementsPage } from "@/modules/warehouse/api/warehouse-stock-api";
import { fetchWarehouses } from "@/modules/warehouse/api/warehouses-api";
import { warehouseScopeEffectiveCategoryId, type WarehouseScopeFiltersValue } from "@/modules/warehouse/lib/warehouse-scope-filters";
import type { WarehouseMovementItem, WarehouseMovementsPageParams } from "@/types/warehouse";

const FETCH_PAGE_SIZE = 200;
const MAX_PAGES_PER_WAREHOUSE = 100;

export type WarehouseGlobalMovementsFilters = {
  warehouseId?: number;
  type?: "IN" | "OUT" | "";
  branchId?: number;
  dateFrom?: string;
  dateTo?: string;
  scope: WarehouseScopeFiltersValue;
};

export type WarehouseGlobalMovementRow = WarehouseMovementItem & {
  warehouseId: number;
  warehouseName: string;
};

export async function fetchWarehouseGlobalMovements(
  filters: WarehouseGlobalMovementsFilters
): Promise<WarehouseGlobalMovementRow[]> {
  const warehouses = await fetchWarehouses();
  const selectedWarehouses =
    filters.warehouseId != null && filters.warehouseId > 0
      ? warehouses.filter((w) => w.id === filters.warehouseId)
      : warehouses;
  if (selectedWarehouses.length === 0) return [];

  const productId =
    filters.scope.productId != null && filters.scope.productId > 0
      ? filters.scope.productId
      : filters.scope.parentProductId != null && filters.scope.parentProductId > 0
        ? filters.scope.parentProductId
        : undefined;

  const baseParams: WarehouseMovementsPageParams = {
    page: 1,
    pageSize: FETCH_PAGE_SIZE,
    categoryId: warehouseScopeEffectiveCategoryId(filters.scope) ?? undefined,
    productId,
    type: filters.type === "IN" || filters.type === "OUT" ? filters.type : "",
    branchId: filters.branchId,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  };

  const byWarehouse = await Promise.all(
    selectedWarehouses.map(async (warehouse) => {
      const rows: WarehouseGlobalMovementRow[] = [];
      let pageNo = 1;
      let totalCount = 0;
      do {
        const page = await fetchWarehouseMovementsPage(warehouse.id, {
          ...baseParams,
          page: pageNo,
          pageSize: FETCH_PAGE_SIZE,
        });
        totalCount = page.totalCount ?? 0;
        rows.push(
          ...page.items.map((item) => ({
            ...item,
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
          }))
        );
        if (page.items.length === 0) break;
        pageNo += 1;
      } while (rows.length < totalCount && pageNo <= MAX_PAGES_PER_WAREHOUSE);
      return rows;
    })
  );

  return byWarehouse
    .flat()
    .sort((a, b) => b.movementDate.localeCompare(a.movementDate) || b.id - a.id);
}
