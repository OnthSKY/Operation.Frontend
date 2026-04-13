/** Stored in API as `maintenanceType` (same as expense `fuel` style keys). */
export const VEHICLE_MAINTENANCE_TYPE_IDS = [
  "periodic_service",
  "oil_change",
  "brake",
  "tire",
  "battery",
  "timing_belt",
  "filters",
  "ac_service",
  "gearbox",
  "exhaust_inspection",
  "glass",
  "body_repair",
  "electrical",
  "other",
] as const;

export type VehicleMaintenanceTypeId = (typeof VEHICLE_MAINTENANCE_TYPE_IDS)[number];

export function isKnownVehicleMaintenanceType(v: string): v is VehicleMaintenanceTypeId {
  return (VEHICLE_MAINTENANCE_TYPE_IDS as readonly string[]).includes(v);
}

export function labelVehicleMaintenanceType(raw: string, t: (key: string) => string): string {
  if (isKnownVehicleMaintenanceType(raw)) {
    return t(`vehicles.maintenanceTypes.${raw}`);
  }
  return raw;
}
