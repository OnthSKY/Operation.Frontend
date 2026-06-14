"use client";

import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import type {
  VehicleAssignmentDialogState,
  VehicleAssignmentMode,
} from "@/modules/vehicles/hooks/useVehicleAssignmentDialog";
import type { VehicleListItem } from "@/types/vehicle";

export type VehicleAssignDialogPersonnelOption = {
  id: number;
  fullName: string;
};

export type VehicleAssignDialogBranchOption = {
  id: number;
  name: string;
};

/**
 * Araç atama dialog'u: idle / kişi / şube seçimi.
 * State + mutation `useVehicleAssignmentDialog` hook'undan; opsiyon listeleri prop.
 */
export function VehicleAssignDialog({
  state,
  vehicles,
  personnelOptions,
  branchOptions,
  nested,
  t,
}: {
  state: VehicleAssignmentDialogState;
  /** Plaka göstermek için liste. */
  vehicles: VehicleListItem[];
  personnelOptions: VehicleAssignDialogPersonnelOption[];
  branchOptions: VehicleAssignDialogBranchOption[];
  /** Detay overlay üstüne açılıyorsa nested mod. */
  nested: boolean;
  t: (k: string) => string;
}) {
  const plate =
    state.vehicleId != null
      ? (vehicles.find((r) => r.id === state.vehicleId)?.plateNumber ??
        `#${state.vehicleId}`)
      : null;
  return (
    <Modal
      open={state.open}
      onClose={state.close}
      titleId="vehicle-assign-dialog-title"
      title={t("vehicles.assignmentDialogTitle")}
      narrow
      nested={nested}
      closeButtonLabel={t("common.close")}
    >
      <div className="flex flex-col gap-3 p-1">
        {plate ? (
          <p className="text-sm font-medium text-zinc-800">{plate}</p>
        ) : null}
        <Select
          name="vehicle-assign-dlg-mode"
          label={t("vehicles.assignment")}
          value={state.mode}
          onBlur={() => {}}
          onChange={(e) =>
            state.setMode(e.target.value as VehicleAssignmentMode)
          }
          options={[
            { value: "idle", label: t("vehicles.idle") },
            { value: "personnel", label: t("vehicles.assignedPerson") },
            { value: "branch", label: t("vehicles.assignedBranch") },
          ]}
        />
        {state.mode === "personnel" ? (
          <Select
            name="vehicle-assign-dlg-personnel"
            label={t("vehicles.assignedPerson")}
            value={state.personnelId}
            onBlur={() => {}}
            onChange={(e) => state.setPersonnelId(e.target.value)}
            options={[
              { value: "", label: "—" },
              ...personnelOptions.map((p) => ({
                value: String(p.id),
                label: p.fullName,
              })),
            ]}
          />
        ) : null}
        {state.mode === "branch" ? (
          <Select
            name="vehicle-assign-dlg-branch"
            label={t("vehicles.assignedBranch")}
            value={state.branchId}
            onBlur={() => {}}
            onChange={(e) => state.setBranchId(e.target.value)}
            options={[
              { value: "", label: "—" },
              ...branchOptions.map((b) => ({
                value: String(b.id),
                label: b.name,
              })),
            ]}
          />
        ) : null}
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
            disabled={state.busy || state.vehicleId == null}
          >
            {t("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
