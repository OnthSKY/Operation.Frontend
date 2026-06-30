import { apiRequest } from "@/shared/api/client";
import type { DashboardOverview } from "@/types/dashboard-overview";

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const data = await apiRequest<DashboardOverview>("/dashboard/overview");
  const fe = data.financeExtras;
  const op = data.operations;
  return {
    ...data,
    financeExtras: {
      advanceRecordCount: fe?.advanceRecordCount ?? 0,
      advanceTotalsByCurrency: fe?.advanceTotalsByCurrency ?? [],
      allBranchesLifetimeEconomicNet:
        Number(fe?.allBranchesLifetimeEconomicNet ?? 0) || 0,
      registerCashHeldByPersonnelTotalsByCurrency:
        fe?.registerCashHeldByPersonnelTotalsByCurrency ?? [],
      registerCashHeldByPersonnelBreakdown:
        fe?.registerCashHeldByPersonnelBreakdown ?? [],
    },
    operations: {
      activeBranchCount: op?.activeBranchCount ?? 0,
      activeWarehouseCount: op?.activeWarehouseCount ?? 0,
      activeSupplierCount: op?.activeSupplierCount ?? 0,
      activeVehicleCount: op?.activeVehicleCount ?? 0,
      activeProductCount: op?.activeProductCount ?? 0,
      warehouseStock: normalizeWarehouseStock(op?.warehouseStock),
    },
  };
}

/** Eski önbellek / kısmi API yanıtları için güvenli varsayılan. */
export function normalizeWarehouseStock(
  raw: DashboardOverview["operations"]["warehouseStock"] | null | undefined
): DashboardOverview["operations"]["warehouseStock"] {
  const mapRows = (
    rows: DashboardOverview["operations"]["warehouseStock"]["topByQuantity"] | null | undefined
  ) =>
    (Array.isArray(rows) ? rows : []).map((r) => ({
      productId: Number(r.productId) || 0,
      productName: typeof r.productName === "string" ? r.productName.trim() : "",
      unit: r.unit != null && String(r.unit).trim() ? String(r.unit).trim() : null,
      quantity: Number(r.quantity) || 0,
    }));
  return {
    distinctProductCount: Number(raw?.distinctProductCount) || 0,
    totalUnitsApprox: Number(raw?.totalUnitsApprox) || 0,
    topByQuantity: mapRows(raw?.topByQuantity),
    topByMainProduct: mapRows(raw?.topByMainProduct),
  };
}
