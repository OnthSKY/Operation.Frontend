"use client";

import { useCallback, useEffect, useState } from "react";
import {
  usePatchVehicleOdometer,
  useVehicle,
} from "@/modules/vehicles/hooks/useVehicleQueries";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";

/**
 * Araç odometre güncelleme modal'ı için state + patch mutation.
 *  - `openFor(vehicleId)`: modal'ı aç ve detay query ile doldur
 *  - mevcut odometer detail'den çekilince input ön doldurulur
 *  - `save()`: patch + close
 *  - `close()`: modal'ı kapat
 */
export function useVehicleOdometerModal({
  t,
}: {
  t: (k: string) => string;
}) {
  const patchMut = usePatchVehicleOdometer();
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [str, setStr] = useState("");

  const enabled = vehicleId != null && vehicleId > 0;
  const { data: vehicle } = useVehicle(vehicleId, enabled);

  // Detay yüklenince mevcut odometre ile inputu doldur
  useEffect(() => {
    if (!enabled || !vehicle) return;
    setStr(vehicle.odometerKm != null ? String(vehicle.odometerKm) : "");
  }, [enabled, vehicle, vehicleId]);

  const openFor = useCallback((vid: number) => {
    setVehicleId(vid);
    setStr("");
  }, []);

  const close = useCallback(() => {
    setVehicleId(null);
  }, []);

  const save = useCallback(async () => {
    if (vehicleId == null) return;
    const raw = str.trim();
    const parsed = raw ? parseInt(raw, 10) : null;
    const odometerKm =
      parsed != null && Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    if (raw !== "" && odometerKm == null) {
      notify.error(t("common.invalid"));
      return;
    }
    try {
      await patchMut.mutateAsync({
        vehicleId,
        odometerKm: raw === "" ? null : odometerKm,
      });
      notify.success(t("common.saved"));
      setVehicleId(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }, [patchMut, str, t, vehicleId]);

  return {
    vehicleId,
    str,
    setStr,
    /** Detay query enabled mı (`vehicleId > 0`). */
    enabled,
    /** Mevcut araç detayı (km input için). */
    vehicle,
    openFor,
    close,
    save,
    busy: patchMut.isPending,
  };
}

export type VehicleOdometerModalState = ReturnType<
  typeof useVehicleOdometerModal
>;
