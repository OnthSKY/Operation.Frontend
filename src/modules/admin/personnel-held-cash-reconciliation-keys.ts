export const personnelHeldCashReconciliationKeys = {
  all: ["admin", "personnel-held-cash-reconciliation"] as const,
  drillDown: (personnelId: number, branchId: number, currency: string) =>
    ["admin", "personnel-held-cash-reconciliation", "drill-down", personnelId, branchId, currency] as const,
};
