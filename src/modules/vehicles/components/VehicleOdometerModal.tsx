"use client";

import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import type { VehicleOdometerModalState } from "@/modules/vehicles/hooks/useVehicleOdometerModal";

/**
 * Araç odometre (KM) güncelleme modal'ı.
 * State + mutation `useVehicleOdometerModal` hook'undan gelir.
 */
export function VehicleOdometerModal({
  state,
  nested,
  t,
}: {
  state: VehicleOdometerModalState;
  /** Detay overlay açıkken nested mod (modal-over-modal). */
  nested: boolean;
  t: (k: string) => string;
}) {
  return (
    <Modal
      open={state.vehicleId != null}
      onClose={state.close}
      titleId="vehicle-odometer-form"
      title={t("vehicles.editOdometerTitle")}
      narrow
      nested={nested}
      closeButtonLabel={t("common.close")}
    >
      <div className="flex flex-col gap-3 p-1">
        <Input
          label={t("vehicles.odometerKm")}
          value={state.str}
          onChange={(e) => state.setStr(e.target.value)}
          inputMode="numeric"
          placeholder="—"
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
            disabled={state.busy || (state.enabled && !state.vehicle)}
          >
            {t("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
