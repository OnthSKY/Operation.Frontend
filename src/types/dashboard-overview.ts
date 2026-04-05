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

export type DashboardOverview = {
  personnel: {
    activePersonnelCount: number;
    longestTenure: DashboardTenureHighlight | null;
    topAdvanceRecipient: DashboardAdvanceLeader | null;
  };
  financeExtras: {
    advanceRecordCount: number;
    advanceTotalsByCurrency: DashboardCurrencyTotal[];
  };
  operations: {
    activeBranchCount: number;
    activeWarehouseCount: number;
  };
};
