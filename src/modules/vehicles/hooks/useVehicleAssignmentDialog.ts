"use client";

import { useCallback, useState } from "react";
import { usePatchVehicleAssignment } from "@/modules/vehicles/hooks/useVehicleQueries";
import { notify } from "@/shared/lib/notify";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { VehicleListItem } from "@/types/vehicle";

export type VehicleAssignmentMode = "idle" | "personnel" | "branch";

export type VehicleAssignmentSubject = Pick<
  VehicleListItem,
  "id" | "assignedPersonnelId" | "assignedBranchId"
>;

/**
 * Araç atama dialog'u: kişi mi şube mi seçimi + patch mutation.
 *  - `openFor(subject)`: detaydan veya liste satırından açar; mevcut atama önce yazılır
 *  - `save()`: patch + close
 */
export function useVehicleAssignmentDialog({
  t,
}: {
  t: (k: string) => string;
}) {
  const patchMut = usePatchVehicleAssignment();

  const [open, setOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [mode, setMode] = useState<VehicleAssignmentMode>("idle");
  const [personnelId, setPersonnelId] = useState("");
  const [branchId, setBranchId] = useState("");

  const openFor = useCallback((subject: VehicleAssignmentSubject) => {
    setVehicleId(subject.id);
    if (subject.assignedPersonnelId) {
      setMode("personnel");
      setPersonnelId(String(subject.assignedPersonnelId));
      setBranchId("");
    } else if (subject.assignedBranchId) {
      setMode("branch");
      setBranchId(String(subject.assignedBranchId));
      setPersonnelId("");
    } else {
      setMode("idle");
      setPersonnelId("");
      setBranchId("");
    }
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setVehicleId(null);
  }, []);

  const save = useCallback(async () => {
    if (vehicleId == null) return;
    let assignedPersonnelId: number | null = null;
    let assignedBranchId: number | null = null;
    if (mode === "personnel") {
      const raw = personnelId.trim();
      if (!raw) {
        notify.error(t("vehicles.assignmentIncomplete"));
        return;
      }
      const id = parseInt(raw, 10);
      if (!Number.isFinite(id)) {
        notify.error(t("common.invalid"));
        return;
      }
      assignedPersonnelId = id;
    } else if (mode === "branch") {
      const raw = branchId.trim();
      if (!raw) {
        notify.error(t("vehicles.assignmentIncomplete"));
        return;
      }
      const id = parseInt(raw, 10);
      if (!Number.isFinite(id)) {
        notify.error(t("common.invalid"));
        return;
      }
      assignedBranchId = id;
    }
    try {
      await patchMut.mutateAsync({
        vehicleId,
        assignedPersonnelId,
        assignedBranchId,
      });
      notify.success(t("common.saved"));
      close();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }, [branchId, close, mode, patchMut, personnelId, t, vehicleId]);

  return {
    open,
    setOpen,
    vehicleId,
    mode,
    setMode,
    personnelId,
    setPersonnelId,
    branchId,
    setBranchId,
    openFor,
    close,
    save,
    busy: patchMut.isPending,
  };
}

export type VehicleAssignmentDialogState = ReturnType<
  typeof useVehicleAssignmentDialog
>;
