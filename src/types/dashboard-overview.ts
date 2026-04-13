export type DashboardTenureHighlight = {
  personnelId: number;
  fullName: string;
  hireDate: string;
  tenureYears: number;
  tenureMonthsRemainder: number;
};

export type DashboardAdvanceLeader = {
  personnelId: number;
  fullName: string;
  currencyCode: string;
  totalAmount: number;
  advanceCount: number;
};

export type DashboardCurrencyTotal = {
  currencyCode: string;
  totalAmount: number;
  recordCount: number;
};

export type DashboardCashHeldCurrencyTotal = {
  currencyCode: string;
  totalAmount: number;
  transactionCount: number;
};

export type DashboardCashHeldByPersonRow = {
  personnelId: number;
  fullName: string;
  jobTitle: string;
  personnelBranchName: string | null;
  /** Branch where the income line was posted (register context). */
  registerBranchName?: string | null;
  currencyCode: string;
  totalAmount: number;
  transactionCount: number;
};

export type DashboardWarehouseStockTopRow = {
  productId: number;
  productName: string;
  unit: string | null;
  quantity: number;
};

export type DashboardWarehouseStockStory = {
  distinctProductCount: number;
  totalUnitsApprox: number;
  topByQuantity: DashboardWarehouseStockTopRow[];
};

export type DashboardOverview = {
  personnel: {
    activePersonnelCount: number;
    longestTenure: DashboardTenureHighlight | null;
    topAdvanceRecipient: DashboardAdvanceLeader | null;
  };
  financeExtras: {
    advanceRecordCount: number;
    advanceTotalsByCurrency: DashboardCurrencyTotal[];
    /** Sum IN − sum economic OUT across active branches (mixed currency = raw sum). */
    allBranchesLifetimeEconomicNet?: number;
    registerCashHeldByPersonnelTotalsByCurrency: DashboardCashHeldCurrencyTotal[];
    registerCashHeldByPersonnelBreakdown: DashboardCashHeldByPersonRow[];
  };
  operations: {
    activeBranchCount: number;
    activeWarehouseCount: number;
    activeSupplierCount: number;
    activeVehicleCount: number;
    activeProductCount: number;
    warehouseStock: DashboardWarehouseStockStory;
  };
};
