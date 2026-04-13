import type { StatusBadgeTone } from "@/shared/components/StatusBadge";

/** Liste / tablo (açık zemin) için araç durum tonu */
export function vehicleListStatusTone(status: string): StatusBadgeTone {
  const u = status.toUpperCase();
  if (u === "ACTIVE") return "active";
  if (u === "INACTIVE") return "inactive";
  if (u === "SOLD") return "warning";
  if (u === "SCRAPPED") return "danger";
  return "warning";
}

/** Detay başlığı (koyu zemin) — eski vehicleDetailStatusPillClass ile uyumlu */
export function vehicleHeaderStatusTone(status: string): StatusBadgeTone {
  const u = status.toUpperCase();
  if (u === "ACTIVE") return "active";
  if (u === "INACTIVE" || u === "SOLD" || u === "SCRAPPED") return "inactive";
  return "warning";
}

export function vehicleStatusLabel(t: (k: string) => string, status: string): string {
  const u = status.toUpperCase();
  if (u === "ACTIVE") return t("vehicles.statusActive");
  if (u === "INACTIVE") return t("vehicles.statusInactive");
  if (u === "MAINTENANCE" || u === "IN_MAINTENANCE" || u === "UNDER_MAINTENANCE") {
    return t("vehicles.statusMaintenance");
  }
  if (u === "SOLD") return t("vehicles.statusSold");
  if (u === "SCRAPPED") return t("vehicles.statusScrapped");
  return status;
}
