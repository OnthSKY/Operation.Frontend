"use client";

import type { Locale } from "@/i18n/messages";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { Input } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { Select } from "@/shared/ui/Select";
import { formatGroupedIntegerInput } from "@/modules/vehicles/lib/vehicle-formatters";
import type {
  VehicleEditAssignMode,
  VehicleEditFormState,
} from "@/modules/vehicles/hooks/useVehicleEditForm";

export type VehicleEditPersonnelOption = { id: number; fullName: string };
export type VehicleEditBranchOption = { id: number; name: string };

/**
 * Araç ekle/düzenle modal'ı. State + mutation + dirty-guard `useVehicleEditForm`'dan.
 *  - Atama modu personnel/branch'a göre koşullu input'lar
 *  - Sürücü SRC + Psikoteknik tarihleri sadece personnel modunda
 *  - Odometre input'u gruplandırılmış format (1.234.567)
 */
export function VehicleEditModal({
  state,
  personnelOptions,
  branchOptions,
  nested,
  locale,
  t,
}: {
  state: VehicleEditFormState;
  personnelOptions: VehicleEditPersonnelOption[];
  branchOptions: VehicleEditBranchOption[];
  /** Detay overlay açıkken nested. */
  nested: boolean;
  locale: Locale;
  t: (k: string) => string;
}) {
  return (
    <Modal
      open={state.modal != null}
      onClose={state.requestClose}
      titleId="vehicle-form-title"
      title={
        state.modal === "add"
          ? t("vehicles.addVehicle")
          : t("vehicles.editVehicle")
      }
      narrow
      className="lg:!max-w-4xl xl:!max-w-5xl"
      nested={nested}
    >
      <div className="grid grid-cols-1 gap-3 p-1 lg:grid-cols-2">
        <Input
          label={t("vehicles.plate")}
          value={state.plate}
          onChange={(e) => state.setPlate(e.target.value)}
        />
        <Input
          label={t("vehicles.brand")}
          value={state.brand}
          onChange={(e) => state.setBrand(e.target.value)}
        />
        <Input
          label={t("vehicles.model")}
          value={state.model}
          onChange={(e) => state.setModel(e.target.value)}
        />
        <Input
          label={t("vehicles.year")}
          value={state.year}
          onChange={(e) => state.setYear(e.target.value)}
        />
        <Select
          name="vehicle-status"
          label={t("vehicles.status")}
          value={state.status}
          onBlur={() => {}}
          onChange={(e) => state.setStatus(e.target.value)}
          options={[
            { value: "ACTIVE", label: t("vehicles.statusActive") },
            { value: "INACTIVE", label: t("vehicles.statusInactive") },
            { value: "MAINTENANCE", label: t("vehicles.statusMaintenance") },
          ]}
        />
        <Select
          name="vehicle-assign-mode"
          label={t("vehicles.assignment")}
          value={state.assignMode}
          onBlur={() => {}}
          onChange={(e) =>
            state.setAssignMode(e.target.value as VehicleEditAssignMode)
          }
          options={[
            { value: "idle", label: t("vehicles.idle") },
            { value: "personnel", label: t("vehicles.assignedPerson") },
            { value: "branch", label: t("vehicles.assignedBranch") },
          ]}
        />
        {state.assignMode === "personnel" ? (
          <Select
            name="vehicle-personnel"
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
        {state.assignMode === "branch" ? (
          <Select
            name="vehicle-branch"
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
        <Input
          label={t("vehicles.odometerKm")}
          value={state.odometerKmStr}
          onChange={(e) =>
            state.setOdometerKmStr(
              formatGroupedIntegerInput(e.target.value, locale),
            )
          }
          inputMode="numeric"
          placeholder="—"
        />
        <DateField
          label={t("vehicles.inspectionValidUntil")}
          value={state.inspectionUntil}
          onChange={(e) => state.setInspectionUntil(e.target.value)}
        />
        <Input
          label={t("vehicles.serviceIntervalKm")}
          value={state.serviceIntervalKmStr}
          onChange={(e) => state.setServiceIntervalKmStr(e.target.value)}
          inputMode="numeric"
          placeholder="—"
        />
        <Input
          label={t("vehicles.serviceIntervalMonths")}
          value={state.serviceIntervalMonthsStr}
          onChange={(e) => state.setServiceIntervalMonthsStr(e.target.value)}
          inputMode="numeric"
          placeholder="—"
        />
        <div className="flex flex-col gap-1 lg:col-span-2">
          <label
            className="text-sm font-medium text-zinc-700"
            htmlFor="vehicle-notes"
          >
            {t("vehicles.notes")}
          </label>
          <textarea
            id="vehicle-notes"
            name="vehicle-notes"
            value={state.notes}
            onChange={(e) => state.setNotes(e.target.value)}
            rows={3}
            className="min-h-[5.5rem] w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 outline-none ring-zinc-900 focus:border-zinc-900 focus:ring-2"
          />
        </div>
        {state.assignMode === "personnel" ? (
          <>
            <DateField
              label={t("vehicles.driverSrcValidUntil")}
              value={state.driverSrc}
              onChange={(e) => state.setDriverSrc(e.target.value)}
            />
            <DateField
              label={t("vehicles.driverPsychotechnicalValidUntil")}
              value={state.driverPsy}
              onChange={(e) => state.setDriverPsy(e.target.value)}
            />
          </>
        ) : null}
        <div className="mt-2 flex flex-col-reverse gap-2 lg:col-span-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
            onClick={state.requestClose}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="w-full !min-h-12 touch-manipulation sm:!min-h-10 sm:w-auto"
            onClick={() => void state.save()}
            disabled={
              state.saveBusy ||
              (state.modal === "edit" &&
                state.editRow != null &&
                state.editFormDetailPending)
            }
          >
            {t("common.save")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
