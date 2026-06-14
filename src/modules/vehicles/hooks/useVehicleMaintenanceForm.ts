"use client";

import { useCallback, useState } from "react";
import {
  useCreateVehicleMaintenance,
  useDeleteVehicleMaintenance,
  useUpdateVehicleMaintenance,
} from "@/modules/vehicles/hooks/useVehicleQueries";
import { VEHICLE_MAINTENANCE_TYPE_IDS } from "@/modules/vehicles/lib/vehicle-maintenance-types";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { VehicleMaintenance } from "@/types/vehicle";

export type VehicleMaintenanceFormMode = "add" | "edit" | null;

/**
 * Araç bakım CRUD modal'ı için form durumu + 3 mutation + handler'lar.
 *  - 10 alan (serviceDate/odometer/type/workshop/desc/cost/currency/nextDate/nextKm)
 *  - validation: tarih, type, currency, odometer ve cost zorunlu
 *  - askDelete: confirm-toast'lı silme
 */
export function useVehicleMaintenanceForm({
  t,
}: {
  t: (k: string) => string;
}) {
  const createMut = useCreateVehicleMaintenance();
  const updateMut = useUpdateVehicleMaintenance();
  const deleteMut = useDeleteVehicleMaintenance();

  const [modal, setModal] = useState<VehicleMaintenanceFormMode>(null);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [serviceDate, setServiceDate] = useState("");
  const [odometerStr, setOdometerStr] = useState("");
  const [type, setType] = useState("");
  const [workshop, setWorkshop] = useState("");
  const [desc, setDesc] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [nextDate, setNextDate] = useState("");
  const [nextKmStr, setNextKmStr] = useState("");

  const openAddFor = useCallback((vid: number) => {
    setVehicleId(vid);
    setEditId(null);
    setServiceDate(localIsoDate());
    setOdometerStr("");
    setType(VEHICLE_MAINTENANCE_TYPE_IDS[0]);
    setWorkshop("");
    setDesc("");
    setCost("");
    setCurrency("TRY");
    setNextDate("");
    setNextKmStr("");
    setModal("add");
  }, []);

  const openEdit = useCallback((vid: number, x: VehicleMaintenance) => {
    setVehicleId(vid);
    setEditId(x.id);
    setServiceDate(x.serviceDate.slice(0, 10));
    setOdometerStr(x.odometerKm != null ? String(x.odometerKm) : "");
    setType(x.maintenanceType);
    setWorkshop(x.workshop ?? "");
    setDesc(x.description ?? "");
    setCost(x.cost != null ? String(x.cost) : "");
    setCurrency(x.currencyCode);
    setNextDate(x.nextDueDate?.slice(0, 10) ?? "");
    setNextKmStr(x.nextDueKm != null ? String(x.nextDueKm) : "");
    setModal("edit");
  }, []);

  const close = useCallback(() => {
    setModal(null);
    setVehicleId(null);
  }, []);

  const save = useCallback(async () => {
    if (vehicleId == null) return;
    const sd = serviceDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sd) || !type.trim()) {
      notify.error(t("vehicles.maintenanceFillRequired"));
      return;
    }
    const curNorm = (currency.trim() || "TRY").toUpperCase();
    if (curNorm.length !== 3) {
      notify.error(t("vehicles.maintenanceFillRequired"));
      return;
    }
    const odomRaw = odometerStr.trim();
    const odomParsed = odomRaw ? parseInt(odomRaw, 10) : NaN;
    const odometerKm =
      Number.isFinite(odomParsed) && odomParsed >= 0 ? odomParsed : null;
    if (odometerKm == null) {
      notify.error(t("vehicles.maintenanceCostOdometerRequired"));
      return;
    }
    const nextKmRaw = nextKmStr.trim();
    const nextKmParsed = nextKmRaw ? parseInt(nextKmRaw, 10) : null;
    const nextDueKm =
      nextKmParsed != null &&
      Number.isFinite(nextKmParsed) &&
      nextKmParsed >= 0
        ? nextKmParsed
        : null;
    const costRaw = cost.trim();
    const costParsed = costRaw ? parseFloat(costRaw.replace(",", ".")) : NaN;
    const costNum =
      Number.isFinite(costParsed) && costParsed >= 0 ? costParsed : null;
    if (costNum == null) {
      notify.error(t("vehicles.maintenanceCostOdometerRequired"));
      return;
    }
    const nextDateIso = nextDate.trim() || null;
    try {
      if (modal === "add") {
        await createMut.mutateAsync({
          vehicleId,
          serviceDate: sd,
          odometerKm,
          maintenanceType: type.trim(),
          workshop: workshop.trim() || null,
          description: desc.trim() || null,
          cost: costNum,
          currencyCode: curNorm,
          nextDueDate: nextDateIso,
          nextDueKm: nextKmRaw === "" ? null : nextDueKm,
        });
      } else if (editId != null) {
        await updateMut.mutateAsync({
          vehicleId,
          maintenanceId: editId,
          serviceDate: sd,
          odometerKm,
          maintenanceType: type.trim(),
          workshop: workshop.trim() || null,
          description: desc.trim() || null,
          cost: costNum,
          currencyCode: curNorm,
          nextDueDate: nextDateIso,
          nextDueKm: nextKmRaw === "" ? null : nextDueKm,
        });
      }
      notify.success(t("common.saved"));
      close();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }, [
    close,
    cost,
    createMut,
    currency,
    desc,
    editId,
    modal,
    nextDate,
    nextKmStr,
    odometerStr,
    serviceDate,
    t,
    type,
    updateMut,
    vehicleId,
    workshop,
  ]);

  const askDelete = useCallback(
    (maintenanceId: number, vid: number) => {
      notifyConfirmToast({
        toastId: `vm-del-${maintenanceId}`,
        title: t("vehicles.delete"),
        message: t("vehicles.confirmDeleteMaintenance"),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("vehicles.delete"),
        onConfirm: async () => {
          try {
            await deleteMut.mutateAsync({
              vehicleId: vid,
              maintenanceId,
            });
            notify.success(t("common.saved"));
          } catch (e) {
            notify.error(toErrorMessage(e));
          }
        },
      });
    },
    [deleteMut, t],
  );

  return {
    modal,
    setModal,
    vehicleId,
    editId,
    serviceDate,
    setServiceDate,
    odometerStr,
    setOdometerStr,
    type,
    setType,
    workshop,
    setWorkshop,
    desc,
    setDesc,
    cost,
    setCost,
    currency,
    setCurrency,
    nextDate,
    setNextDate,
    nextKmStr,
    setNextKmStr,
    openAddFor,
    openEdit,
    close,
    save,
    askDelete,
    saveBusy: createMut.isPending || updateMut.isPending,
    deleteBusy: deleteMut.isPending,
  };
}

export type VehicleMaintenanceFormState = ReturnType<
  typeof useVehicleMaintenanceForm
>;
