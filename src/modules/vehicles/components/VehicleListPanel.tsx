"use client";

import type { Locale } from "@/i18n/messages";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Tooltip } from "@/shared/ui/Tooltip";
import { PlusIcon } from "@/shared/ui/EyeIcon";
import {
  TABLE_TOOLBAR_ICON_BTN,
  TableToolbarSplit,
} from "@/shared/components/TableToolbar";
import { VehicleFleetCard } from "@/modules/vehicles/components/VehicleFleetCard";
import { buildVehicleRowMenuSections } from "@/modules/vehicles/lib/vehicle-row-menu";
import type {
  VehicleInsuranceBadge,
  VehicleListItem,
} from "@/types/vehicle";

/**
 * Liste paneli: arama input + (yetkiliyse) yeni araç butonu + filtreli kart grid'i.
 * Tüm aksiyonlar callback'lerle dışarıdan; parent state'i bilmez.
 */
export function VehicleListPanel({
  vehicles,
  search,
  onSearchChange,
  canEdit,
  isPending,
  isError,
  deletePending,
  locale,
  vehicleStatusLabel,
  insuranceBadgeLabel,
  onAddVehicle,
  onOpenDetail,
  onEdit,
  onDelete,
  onAddMaintenance,
  onEditOdometer,
  onChangeAssignment,
  onAddExpense,
  onAddInsurance,
  t,
}: {
  vehicles: VehicleListItem[];
  search: string;
  onSearchChange: (v: string) => void;
  canEdit: boolean;
  isPending: boolean;
  isError: boolean;
  /** Satır silme mutation pending → silinen satırın UI'da gri gösterimi için. */
  deletePending: boolean;
  locale: Locale;
  vehicleStatusLabel: (t: (k: string) => string, status: string) => string;
  insuranceBadgeLabel: (b: VehicleInsuranceBadge) => string;
  onAddVehicle: () => void;
  onOpenDetail: (vehicle: VehicleListItem) => void;
  onEdit: (vehicle: VehicleListItem) => void;
  onDelete: (vehicleId: number) => void;
  onAddMaintenance: (vehicleId: number) => void;
  onEditOdometer: (vehicleId: number) => void;
  onChangeAssignment: (vehicle: VehicleListItem) => void;
  onAddExpense: (vehicleId: number) => void;
  onAddInsurance: (vehicleId: number) => void;
  t: (k: string) => string;
}) {
  return (
    <>
      <TableToolbarSplit
        className="mb-1 sm:mb-2"
        lead={
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("vehicles.listFilterPlaceholder")}
            className="w-full text-base sm:text-sm"
            name="vehicles-list-search"
            autoComplete="off"
            aria-label={t("vehicles.listFilterPlaceholder")}
          />
        }
        trailing={
          canEdit ? (
            <Tooltip content={t("vehicles.addVehicle")} delayMs={200}>
              <Button
                type="button"
                variant="primary"
                onClick={onAddVehicle}
                className={TABLE_TOOLBAR_ICON_BTN}
                aria-label={t("vehicles.addVehicle")}
              >
                <PlusIcon />
              </Button>
            </Tooltip>
          ) : null
        }
      />
      {isError ? (
        <p className="mt-3 text-sm text-zinc-600">{t("toast.loadFailed")}</p>
      ) : isPending ? (
        <p className="mt-3 text-sm text-zinc-500">{t("common.loading")}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {vehicles.map((r) => {
            const extrasSections = buildVehicleRowMenuSections({
              canEdit,
              t,
              onView: () => onOpenDetail(r),
              onEdit: () => onEdit(r),
              onDelete: () => onDelete(r.id),
              onAddMaintenance: () => onAddMaintenance(r.id),
              onEditKm: () => onEditOdometer(r.id),
              onChangeAssignment: () => onChangeAssignment(r),
              onAddExpense: () => onAddExpense(r.id),
              onAddInsurance: () => onAddInsurance(r.id),
              menuMode: "extras",
            });
            const assignmentShown =
              r.assignedPersonnelName ??
              r.assignedBranchName ??
              t("vehicles.idle");
            return (
              <VehicleFleetCard
                key={r.id}
                vehicle={r}
                locale={locale}
                canEdit={canEdit}
                deletePending={deletePending}
                extrasSections={extrasSections}
                statusDescription={vehicleStatusLabel(t, r.status)}
                insuranceDescription={insuranceBadgeLabel(r.insuranceBadge)}
                assignmentDescription={assignmentShown}
                onOpenDetail={() => onOpenDetail(r)}
                onEdit={() => onEdit(r)}
                onDelete={() => onDelete(r.id)}
                openDetailsLabel={t("common.openDetails")}
                editLabel={t("common.edit")}
                deleteLabel={t("vehicles.deleteVehicle")}
                menuExtrasLabel={t("vehicles.rowMenuExtras")}
              />
            );
          })}
        </ul>
      )}
    </>
  );
}
