"use client";

import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select, type SelectOption } from "@/shared/ui/Select";
import type { VehicleMaintenanceFormState } from "@/modules/vehicles/hooks/useVehicleMaintenanceForm";

/**
 * Bakım ekle/düzenle modal'ı. State + mutation `useVehicleMaintenanceForm`'dan.
 *  - Bakım tipi seçeneklerini caller hesaplar (custom + preset karışımı).
 */
export function VehicleMaintenanceModal({
  state,
  typeOptions,
  t,
}: {
  state: VehicleMaintenanceFormState;
  typeOptions: SelectOption[];
  t: (k: string) => string;
}) {
  return (
    <Modal
      open={state.modal != null}
      onClose={state.close}
      titleId="vehicle-maintenance-form"
      title={
        state.modal === "add"
          ? t("vehicles.addMaintenance")
          : t("vehicles.editMaintenance")
      }
      narrow
      nested
      closeButtonLabel={t("common.close")}
    >
      <div className="flex flex-col gap-3 p-1">
        <DateField
          label={t("vehicles.maintenanceServiceDate")}
          labelRequired
          value={state.serviceDate}
          onChange={(e) => state.setServiceDate(e.target.value)}
        />
        <Input
          label={t("vehicles.odometerKm")}
          labelRequired
          value={state.odometerStr}
          onChange={(e) => state.setOdometerStr(e.target.value)}
          inputMode="numeric"
          placeholder="0"
        />
        <Select
          name="vehicle-maintenance-type"
          label={t("vehicles.maintenanceType")}
          labelRequired
          value={state.type}
          onBlur={() => {}}
          onChange={(e) => state.setType(e.target.value)}
          options={typeOptions}
        />
        <Input
          label={t("vehicles.maintenanceWorkshop")}
          value={state.workshop}
          onChange={(e) => state.setWorkshop(e.target.value)}
        />
        <Input
          label={t("vehicles.amount")}
          labelRequired
          value={state.cost}
          onChange={(e) => state.setCost(e.target.value)}
          placeholder="0"
        />
        <Input
          label={t("vehicles.currency")}
          labelRequired
          value={state.currency}
          onChange={(e) => state.setCurrency(e.target.value.toUpperCase())}
          maxLength={3}
        />
        <DateField
          label={t("vehicles.maintenanceNextDueDate")}
          value={state.nextDate}
          onChange={(e) => state.setNextDate(e.target.value)}
        />
        <Input
          label={t("vehicles.maintenanceNextDueKm")}
          value={state.nextKmStr}
          onChange={(e) => state.setNextKmStr(e.target.value)}
          inputMode="numeric"
          placeholder="—"
        />
        <Input
          label={t("vehicles.description")}
          value={state.desc}
          onChange={(e) => state.setDesc(e.target.value)}
        />
        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
            onClick={state.close}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
            onClick={() => void state.save()}
            disabled={state.saveBusy}
          >
            {t("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
