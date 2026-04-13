export type VehicleInsuranceBadge = "NONE" | "OK" | "SOON" | "EXPIRED";

export type VehicleListItem = {
  id: number;
  plateNumber: string;
  brand: string;
  model: string;
  year: number | null;
  status: string;
  assignedPersonnelId: number | null;
  assignedPersonnelName: string | null;
  assignedBranchId: number | null;
  assignedBranchName: string | null;
  createdAt: string;
  hasPhoto: boolean;
  insuranceBadge: VehicleInsuranceBadge;
  nextInsuranceEndDate: string | null;
};

export type VehicleAssignment = {
  id: number;
  personnelId: number | null;
  personnelName: string | null;
  branchId: number | null;
  branchName: string | null;
  assignedAt: string;
  releasedAt: string | null;
};

export type VehicleInsurance = {
  id: number;
  insuranceType: string;
  provider: string | null;
  policyNumber: string | null;
  startDate: string;
  endDate: string;
  amount: number | null;
  createdAt: string;
};

export type VehicleExpense = {
  id: number;
  expenseType: string;
  amount: number;
  currencyCode: string;
  expenseDate: string;
  description: string | null;
  linkedBranchTransactionId?: number | null;
  postedBranchId?: number | null;
  postedBranchName?: string | null;
  createdAt: string;
};

export type VehicleMaintenance = {
  id: number;
  serviceDate: string;
  odometerKm: number | null;
  maintenanceType: string;
  workshop: string | null;
  description: string | null;
  cost: number | null;
  currencyCode: string;
  nextDueDate: string | null;
  nextDueKm: number | null;
  createdAt: string;
};

export type VehicleDetail = VehicleListItem & {
  odometerKm: number | null;
  inspectionValidUntil: string | null;
  notes: string | null;
  driverSrcValidUntil: string | null;
  driverPsychotechnicalValidUntil: string | null;
  serviceIntervalKm?: number | null;
  serviceIntervalMonths?: number | null;
  assignments: VehicleAssignment[];
  insurances: VehicleInsurance[];
  expenses: VehicleExpense[];
  maintenances?: VehicleMaintenance[];
};

export type VehicleExpenseSummaryRow = {
  vehicleId: number;
  plateNumber: string;
  year: number;
  month: number;
  expenseType: string;
  currencyCode: string;
  totalAmount: number;
};

export type VehicleAuditItem = {
  id: number;
  tableName: string;
  recordId: number | null;
  action: string;
  oldDataJson: string | null;
  newDataJson: string | null;
  userId: number | null;
  createdAt: string;
};

export type VehicleAuditPaged = {
  items: VehicleAuditItem[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type VehicleAuditPageParams = {
  page: number;
  pageSize: number;
  scope?:
    | ""
    | "all"
    | "vehicles"
    | "vehicle_insurances"
    | "vehicle_maintenances"
    | "vehicle_expenses";
};
