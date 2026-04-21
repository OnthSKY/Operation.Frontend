import { apiRequest, apiUrl } from "@/shared/api/client";
import type {
  VehicleAuditPageParams,
  VehicleAuditPaged,
  VehicleDetail,
  VehicleExpenseSummaryRow,
  VehicleListItem,
  VehicleExpense,
  VehicleInsurance,
  VehicleMaintenance,
} from "@/types/vehicle";

export function vehiclePhotoUrl(vehicleId: number, cacheBust?: number): string {
  const q = cacheBust != null ? `?t=${cacheBust}` : "";
  return `${apiUrl(`/vehicles/${vehicleId}/photo`)}${q}`;
}

export async function fetchVehicles(): Promise<VehicleListItem[]> {
  return apiRequest<VehicleListItem[]>("/vehicles");
}

export async function fetchVehicle(id: number): Promise<VehicleDetail> {
  return apiRequest<VehicleDetail>(`/vehicles/${id}`);
}

export async function createVehicle(body: {
  plateNumber: string;
  brand: string;
  model: string;
  year?: number | null;
  status: string;
  assignedPersonnelId?: number | null;
  assignedBranchId?: number | null;
  odometerKm?: number | null;
  inspectionValidUntil?: string | null;
  notes?: string | null;
  driverSrcValidUntil?: string | null;
  driverPsychotechnicalValidUntil?: string | null;
  serviceIntervalKm?: number | null;
  serviceIntervalMonths?: number | null;
}): Promise<VehicleDetail> {
  return apiRequest<VehicleDetail>("/vehicles", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteVehicle(id: number): Promise<void> {
  await apiRequest<null>(`/vehicles/${id}`, { method: "DELETE" });
}

export async function updateVehicle(
  id: number,
  body: {
    plateNumber: string;
    brand: string;
    model: string;
    year?: number | null;
    status: string;
    assignedPersonnelId?: number | null;
    assignedBranchId?: number | null;
    odometerKm?: number | null;
    inspectionValidUntil?: string | null;
    notes?: string | null;
    driverSrcValidUntil?: string | null;
    driverPsychotechnicalValidUntil?: string | null;
    serviceIntervalKm?: number | null;
    serviceIntervalMonths?: number | null;
  }
): Promise<VehicleDetail> {
  return apiRequest<VehicleDetail>(`/vehicles/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function patchVehicleOdometer(
  id: number,
  body: { odometerKm?: number | null }
): Promise<VehicleDetail> {
  return apiRequest<VehicleDetail>(`/vehicles/${id}/odometer`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function patchVehicleAssignment(
  id: number,
  body: { assignedPersonnelId?: number | null; assignedBranchId?: number | null }
): Promise<VehicleDetail> {
  return apiRequest<VehicleDetail>(`/vehicles/${id}/assignment`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function uploadVehiclePhoto(vehicleId: number, file: File): Promise<VehicleDetail> {
  const fd = new FormData();
  fd.append("photo", file);
  return apiRequest<VehicleDetail>(`/vehicles/${vehicleId}/photo`, {
    method: "POST",
    body: fd,
  });
}

export async function deleteVehiclePhoto(vehicleId: number): Promise<VehicleDetail> {
  return apiRequest<VehicleDetail>(`/vehicles/${vehicleId}/photo`, {
    method: "DELETE",
  });
}

export async function createVehicleInsurance(
  vehicleId: number,
  body: {
    insuranceType: string;
    provider?: string | null;
    policyNumber?: string | null;
    startDate: string;
    endDate: string;
    amount?: number | null;
  }
): Promise<VehicleInsurance> {
  return apiRequest<VehicleInsurance>(`/vehicles/${vehicleId}/insurances`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateVehicleInsurance(
  vehicleId: number,
  insuranceId: number,
  body: {
    insuranceType: string;
    provider?: string | null;
    policyNumber?: string | null;
    startDate: string;
    endDate: string;
    amount?: number | null;
  }
): Promise<VehicleInsurance> {
  return apiRequest<VehicleInsurance>(`/vehicles/${vehicleId}/insurances/${insuranceId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteVehicleInsurance(vehicleId: number, insuranceId: number): Promise<void> {
  await apiRequest<null>(`/vehicles/${vehicleId}/insurances/${insuranceId}`, { method: "DELETE" });
}

export async function createVehicleExpense(
  vehicleId: number,
  body: {
    expenseType: string;
    amount: number;
    currencyCode: string;
    expenseDate: string;
    description?: string | null;
    branchId?: number | null;
    branchExpensePaymentSource?: string | null;
    patronPaymentMethod?: string | null;
  }
): Promise<VehicleExpense> {
  return apiRequest<VehicleExpense>(`/vehicles/${vehicleId}/expenses`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateVehicleExpense(
  vehicleId: number,
  expenseId: number,
  body: {
    expenseType: string;
    amount: number;
    currencyCode: string;
    expenseDate: string;
    description?: string | null;
    branchId?: number | null;
    branchExpensePaymentSource?: string | null;
    patronPaymentMethod?: string | null;
  }
): Promise<VehicleExpense> {
  return apiRequest<VehicleExpense>(`/vehicles/${vehicleId}/expenses/${expenseId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteVehicleExpense(vehicleId: number, expenseId: number): Promise<void> {
  await apiRequest<null>(`/vehicles/${vehicleId}/expenses/${expenseId}`, { method: "DELETE" });
}

export async function createVehicleMaintenance(
  vehicleId: number,
  body: {
    serviceDate: string;
    odometerKm?: number | null;
    maintenanceType: string;
    workshop?: string | null;
    description?: string | null;
    cost?: number | null;
    currencyCode: string;
    nextDueDate?: string | null;
    nextDueKm?: number | null;
  }
): Promise<VehicleMaintenance> {
  return apiRequest<VehicleMaintenance>(`/vehicles/${vehicleId}/maintenances`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateVehicleMaintenance(
  vehicleId: number,
  maintenanceId: number,
  body: {
    serviceDate: string;
    odometerKm?: number | null;
    maintenanceType: string;
    workshop?: string | null;
    description?: string | null;
    cost?: number | null;
    currencyCode: string;
    nextDueDate?: string | null;
    nextDueKm?: number | null;
  }
): Promise<VehicleMaintenance> {
  return apiRequest<VehicleMaintenance>(`/vehicles/${vehicleId}/maintenances/${maintenanceId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteVehicleMaintenance(vehicleId: number, maintenanceId: number): Promise<void> {
  await apiRequest<null>(`/vehicles/${vehicleId}/maintenances/${maintenanceId}`, { method: "DELETE" });
}

export async function fetchVehicleExpenseSummary(params: {
  year?: number;
  month?: number;
  vehicleId?: number;
  branchId?: number;
}): Promise<VehicleExpenseSummaryRow[]> {
  const sp = new URLSearchParams();
  if (params.year != null) sp.set("year", String(params.year));
  if (params.month != null) sp.set("month", String(params.month));
  if (params.vehicleId != null) sp.set("vehicleId", String(params.vehicleId));
  if (params.branchId != null) sp.set("branchId", String(params.branchId));
  const q = sp.toString();
  return apiRequest<VehicleExpenseSummaryRow[]>(`/vehicles/expenses/summary${q ? `?${q}` : ""}`);
}

export async function fetchVehicleAuditPage(
  vehicleId: number,
  params: VehicleAuditPageParams
): Promise<VehicleAuditPaged> {
  const q = new URLSearchParams();
  q.set("page", String(params.page));
  q.set("pageSize", String(params.pageSize));
  if (
    params.scope === "vehicles" ||
    params.scope === "vehicle_insurances" ||
    params.scope === "vehicle_maintenances" ||
    params.scope === "vehicle_expenses"
  ) {
    q.set("scope", params.scope);
  }
  return apiRequest<VehicleAuditPaged>(`/vehicles/${vehicleId}/audit?${q.toString()}`);
}
