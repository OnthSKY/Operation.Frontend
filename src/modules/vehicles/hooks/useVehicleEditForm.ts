"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/messages";
import {
  useCreateVehicle,
  useDeleteVehicle,
  useUpdateVehicle,
  useVehicle,
} from "@/modules/vehicles/hooks/useVehicleQueries";
import {
  formatGroupedIntegerInput,
  parseGroupedIntegerInput,
} from "@/modules/vehicles/lib/vehicle-formatters";
import { useDirtyGuard } from "@/shared/hooks/useDirtyGuard";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { VehicleListItem } from "@/types/vehicle";

export type VehicleEditFormMode = "add" | "edit" | null;
export type VehicleEditAssignMode = "idle" | "personnel" | "branch";

/**
 * Araç ekle/düzenle modal'ı için tam form durumu, detay query'si, dirty-guard'lı
 * kapatma, create/update/delete mutation'ları.
 *
 *  - 15 alan (plate/brand/model/year/status/assignMode/personnelId/branchId/
 *             odometerKmStr/inspectionUntil/notes/driverSrc/driverPsy/
 *             serviceIntervalKm/serviceIntervalMonths)
 *  - "edit" modunda araç detay query'sini açar; geldiğinde detay-only alanları
 *    bir defaya mahsus doldurur (`syncedVehicleFormDetailRef`).
 *  - `isDirty` hesabı add/edit için farklı: add = herhangi bir alan boş değil;
 *    edit = mevcut detayla karşılaştırma.
 *  - `requestClose()` dirty ise kullanıcıdan onay alır (`useDirtyGuard`).
 *  - `save()` add/update'i ayrıştırır.
 *  - `confirmDelete(vehicleId)` confirm-toast + delete; başarıda `onAfterDelete` çağrılır.
 */
export function useVehicleEditForm({
  locale,
  t,
  onAfterDelete,
}: {
  locale: Locale;
  t: (k: string) => string;
  /** Silme başarıyla tamamlandığında çağrılır (örn. açık detayı kapatmak için). */
  onAfterDelete?: (vehicleId: number) => void;
}) {
  const createMut = useCreateVehicle();
  const updateMut = useUpdateVehicle();
  const deleteMut = useDeleteVehicle();

  const [modal, setModal] = useState<VehicleEditFormMode>(null);
  const [editRow, setEditRow] = useState<VehicleListItem | null>(null);
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [assignMode, setAssignMode] = useState<VehicleEditAssignMode>("idle");
  const [personnelId, setPersonnelId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [odometerKmStr, setOdometerKmStr] = useState("");
  const [inspectionUntil, setInspectionUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [driverSrc, setDriverSrc] = useState("");
  const [driverPsy, setDriverPsy] = useState("");
  const [serviceIntervalKmStr, setServiceIntervalKmStr] = useState("");
  const [serviceIntervalMonthsStr, setServiceIntervalMonthsStr] = useState("");
  const syncedVehicleFormDetail = useRef<number | null>(null);

  const editingFormVehicleId =
    modal === "edit" && editRow ? editRow.id : null;
  const { data: editFormDetail, isPending: editFormDetailPending } = useVehicle(
    editingFormVehicleId,
    editingFormVehicleId != null,
  );

  // Detay geldiğinde detail-only alanları bir defa doldur.
  useEffect(() => {
    if (modal !== "edit" || !editRow || !editFormDetail) return;
    if (editFormDetail.id !== editRow.id) return;
    if (syncedVehicleFormDetail.current === editRow.id) return;
    syncedVehicleFormDetail.current = editRow.id;
    setOdometerKmStr(
      editFormDetail.odometerKm != null
        ? formatGroupedIntegerInput(String(editFormDetail.odometerKm), locale)
        : "",
    );
    setInspectionUntil(editFormDetail.inspectionValidUntil ?? "");
    setNotes(editFormDetail.notes ?? "");
    setDriverSrc(editFormDetail.driverSrcValidUntil ?? "");
    setDriverPsy(editFormDetail.driverPsychotechnicalValidUntil ?? "");
    setServiceIntervalKmStr(
      editFormDetail.serviceIntervalKm != null
        ? String(editFormDetail.serviceIntervalKm)
        : "",
    );
    setServiceIntervalMonthsStr(
      editFormDetail.serviceIntervalMonths != null
        ? String(editFormDetail.serviceIntervalMonths)
        : "",
    );
  }, [modal, editRow, editFormDetail, locale]);

  const openAdd = useCallback(() => {
    setEditRow(null);
    setPlate("");
    setBrand("");
    setModel("");
    setYear("");
    setStatus("ACTIVE");
    setAssignMode("idle");
    setPersonnelId("");
    setBranchId("");
    setOdometerKmStr("");
    setInspectionUntil("");
    setNotes("");
    setDriverSrc("");
    setDriverPsy("");
    setServiceIntervalKmStr("");
    setServiceIntervalMonthsStr("");
    syncedVehicleFormDetail.current = null;
    setModal("add");
  }, []);

  const openEdit = useCallback((r: VehicleListItem) => {
    setEditRow(r);
    setPlate(r.plateNumber);
    setBrand(r.brand);
    setModel(r.model);
    setYear(r.year != null ? String(r.year) : "");
    setStatus(r.status);
    if (r.assignedPersonnelId) {
      setAssignMode("personnel");
      setPersonnelId(String(r.assignedPersonnelId));
      setBranchId("");
    } else if (r.assignedBranchId) {
      setAssignMode("branch");
      setBranchId(String(r.assignedBranchId));
      setPersonnelId("");
    } else {
      setAssignMode("idle");
      setPersonnelId("");
      setBranchId("");
    }
    setOdometerKmStr("");
    setInspectionUntil("");
    setNotes("");
    setDriverSrc("");
    setDriverPsy("");
    setServiceIntervalKmStr("");
    setServiceIntervalMonthsStr("");
    syncedVehicleFormDetail.current = null;
    setModal("edit");
  }, []);

  const isDirty =
    modal === "add"
      ? plate.trim() !== "" ||
        brand.trim() !== "" ||
        model.trim() !== "" ||
        year.trim() !== "" ||
        status !== "ACTIVE" ||
        assignMode !== "idle" ||
        personnelId.trim() !== "" ||
        branchId.trim() !== "" ||
        odometerKmStr.trim() !== "" ||
        inspectionUntil.trim() !== "" ||
        notes.trim() !== "" ||
        driverSrc.trim() !== "" ||
        driverPsy.trim() !== "" ||
        serviceIntervalKmStr.trim() !== "" ||
        serviceIntervalMonthsStr.trim() !== ""
      : editRow != null &&
        (plate !== editRow.plateNumber ||
          brand !== editRow.brand ||
          model !== editRow.model ||
          year !== (editRow.year != null ? String(editRow.year) : "") ||
          status !== editRow.status ||
          (assignMode === "personnel" ? personnelId : "") !==
            (editRow.assignedPersonnelId != null
              ? String(editRow.assignedPersonnelId)
              : "") ||
          (assignMode === "branch" ? branchId : "") !==
            (editRow.assignedBranchId != null
              ? String(editRow.assignedBranchId)
              : "") ||
          (assignMode === "idle" &&
            (editRow.assignedPersonnelId != null ||
              editRow.assignedBranchId != null)) ||
          (editFormDetail != null &&
            (odometerKmStr !==
              (editFormDetail.odometerKm != null
                ? formatGroupedIntegerInput(
                    String(editFormDetail.odometerKm),
                    locale,
                  )
                : "") ||
              inspectionUntil !==
                (editFormDetail.inspectionValidUntil ?? "") ||
              notes !== (editFormDetail.notes ?? "") ||
              driverSrc !== (editFormDetail.driverSrcValidUntil ?? "") ||
              driverPsy !==
                (editFormDetail.driverPsychotechnicalValidUntil ?? "") ||
              serviceIntervalKmStr !==
                (editFormDetail.serviceIntervalKm != null
                  ? String(editFormDetail.serviceIntervalKm)
                  : "") ||
              serviceIntervalMonthsStr !==
                (editFormDetail.serviceIntervalMonths != null
                  ? String(editFormDetail.serviceIntervalMonths)
                  : ""))));

  const close = useCallback(() => setModal(null), []);

  const requestClose = useDirtyGuard({
    isDirty,
    isBlocked:
      createMut.isPending ||
      updateMut.isPending ||
      (modal === "edit" && editRow != null && editFormDetailPending),
    confirmMessage: t("common.unsavedChangesConfirm"),
    onClose: close,
  });

  const save = useCallback(async () => {
    const y = year.trim() ? parseInt(year, 10) : null;
    const ap =
      assignMode === "personnel" && personnelId.trim()
        ? parseInt(personnelId, 10)
        : null;
    const ab =
      assignMode === "branch" && branchId.trim()
        ? parseInt(branchId, 10)
        : null;
    const odomRaw = odometerKmStr.trim();
    const odomParsed = parseGroupedIntegerInput(odomRaw);
    const odometerKm =
      odomParsed != null && Number.isFinite(odomParsed) && odomParsed >= 0
        ? odomParsed
        : null;
    const inspectionIso = inspectionUntil.trim() || null;
    const notesTrim = notes.trim() || null;
    const srcIso = ap != null && driverSrc.trim() ? driverSrc.trim() : null;
    const psyIso = ap != null && driverPsy.trim() ? driverPsy.trim() : null;
    const siKmRaw = serviceIntervalKmStr.trim();
    const siKmParsed = siKmRaw ? parseInt(siKmRaw, 10) : null;
    const serviceIntervalKm =
      siKmParsed != null && Number.isFinite(siKmParsed) && siKmParsed > 0
        ? siKmParsed
        : null;
    const siMoRaw = serviceIntervalMonthsStr.trim();
    const siMoParsed = siMoRaw ? parseInt(siMoRaw, 10) : null;
    const serviceIntervalMonths =
      siMoParsed != null && Number.isFinite(siMoParsed) && siMoParsed > 0
        ? siMoParsed
        : null;
    try {
      if (modal === "add") {
        await createMut.mutateAsync({
          plateNumber: plate.trim(),
          brand: brand.trim(),
          model: model.trim(),
          year: y != null && Number.isFinite(y) ? y : null,
          status,
          assignedPersonnelId: ap,
          assignedBranchId: ab,
          odometerKm,
          inspectionValidUntil: inspectionIso,
          notes: notesTrim,
          driverSrcValidUntil: srcIso,
          driverPsychotechnicalValidUntil: psyIso,
          serviceIntervalKm,
          serviceIntervalMonths,
        });
        notify.success(t("common.saved"));
      } else if (editRow) {
        await updateMut.mutateAsync({
          id: editRow.id,
          plateNumber: plate.trim(),
          brand: brand.trim(),
          model: model.trim(),
          year: y != null && Number.isFinite(y) ? y : null,
          status,
          assignedPersonnelId: ap,
          assignedBranchId: ab,
          odometerKm,
          inspectionValidUntil: inspectionIso,
          notes: notesTrim,
          driverSrcValidUntil: srcIso,
          driverPsychotechnicalValidUntil: psyIso,
          serviceIntervalKm,
          serviceIntervalMonths,
        });
        notify.success(t("common.saved"));
      }
      setModal(null);
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }, [
    assignMode,
    branchId,
    brand,
    createMut,
    driverPsy,
    driverSrc,
    editRow,
    inspectionUntil,
    modal,
    model,
    notes,
    odometerKmStr,
    personnelId,
    plate,
    serviceIntervalKmStr,
    serviceIntervalMonthsStr,
    status,
    t,
    updateMut,
    year,
  ]);

  /** Confirm-toast'lı silme; başarıda `onAfterDelete` + edit'i kapatma. */
  const confirmDelete = useCallback(
    (vehicleId: number) => {
      void notifyConfirmToast({
        toastId: `vehicle-delete-${vehicleId}`,
        message: t("vehicles.confirmDeleteVehicle"),
        confirmLabel: t("vehicles.deleteVehicle"),
        cancelLabel: t("common.cancel"),
        onConfirm: async () => {
          try {
            await deleteMut.mutateAsync(vehicleId);
            onAfterDelete?.(vehicleId);
            if (modal === "edit" && editRow?.id === vehicleId) {
              setModal(null);
            }
            notify.success(t("common.saved"));
          } catch (err) {
            notify.error(toErrorMessage(err));
          }
        },
      });
    },
    [deleteMut, editRow, modal, onAfterDelete, t],
  );

  return {
    // modal state
    modal,
    setModal,
    editRow,
    editFormDetail,
    editFormDetailPending,
    isDirty,
    // field state + setters
    plate,
    setPlate,
    brand,
    setBrand,
    model,
    setModel,
    year,
    setYear,
    status,
    setStatus,
    assignMode,
    setAssignMode,
    personnelId,
    setPersonnelId,
    branchId,
    setBranchId,
    odometerKmStr,
    setOdometerKmStr,
    inspectionUntil,
    setInspectionUntil,
    notes,
    setNotes,
    driverSrc,
    setDriverSrc,
    driverPsy,
    setDriverPsy,
    serviceIntervalKmStr,
    setServiceIntervalKmStr,
    serviceIntervalMonthsStr,
    setServiceIntervalMonthsStr,
    // actions
    openAdd,
    openEdit,
    close,
    requestClose,
    save,
    confirmDelete,
    // mutation flags
    saveBusy: createMut.isPending || updateMut.isPending,
    deleteBusy: deleteMut.isPending,
  };
}

export type VehicleEditFormState = ReturnType<typeof useVehicleEditForm>;
