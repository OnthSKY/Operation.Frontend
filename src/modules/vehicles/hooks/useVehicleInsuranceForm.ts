"use client";

import { useCallback, useState } from "react";
import type { Locale } from "@/i18n/messages";
import {
  useCreateVehicleInsurance,
  useDeleteVehicleInsurance,
  useUpdateVehicleInsurance,
} from "@/modules/vehicles/hooks/useVehicleQueries";
import {
  VEHICLE_INSURANCE_COMPANY_ALIASES,
  VEHICLE_INSURANCE_COMPANY_SLUGS,
  VEHICLE_INSURANCE_OTHER_SLUG,
  VEHICLE_INSURANCE_TYPE_ALIASES,
  VEHICLE_INSURANCE_TYPE_SLUGS,
  matchInsurancePresetSlug,
} from "@/modules/vehicles/lib/vehicle-insurance-presets";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import {
  formatLocaleAmountInput,
  parseLocaleAmount,
} from "@/shared/lib/locale-amount";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { VehicleInsurance } from "@/types/vehicle";

export type VehicleInsuranceFormMode = "add" | "edit" | null;

/**
 * Araç sigorta CRUD modal'ı için tam durum + mutation yönetimi.
 *  - 9 form alanı (type preset/custom, provider preset/custom, policy, start, end, amount)
 *  - 3 mutation (create/update/delete)
 *  - openAdd/openEdit/close + save + askDelete handler'ları
 *
 * Caller modal'ı `modal != null` ile gösterir; form alanlarını destructure ile bağlar.
 */
export function useVehicleInsuranceForm({
  defaultVehicleId,
  locale,
  t,
}: {
  /** Detay overlay açıkken default vehicleId (yoksa caller `openAddFor(id)` ile verir). */
  defaultVehicleId: number | null;
  locale: Locale;
  t: (k: string) => string;
}) {
  const createMut = useCreateVehicleInsurance();
  const updateMut = useUpdateVehicleInsurance();
  const deleteMut = useDeleteVehicleInsurance();

  const [modal, setModal] = useState<VehicleInsuranceFormMode>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [typeSlug, setTypeSlug] = useState("");
  const [typeCustom, setTypeCustom] = useState("");
  const [provSlug, setProvSlug] = useState("");
  const [provCustom, setProvCustom] = useState("");
  const [policy, setPolicy] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [amount, setAmount] = useState("");

  const openAddFor = useCallback((vid: number) => {
    setVehicleId(vid);
    setEditId(null);
    setTypeSlug("");
    setTypeCustom("");
    setProvSlug("");
    setProvCustom("");
    setPolicy("");
    setStart(localIsoDate());
    setEnd(localIsoDate());
    setAmount("");
    setModal("add");
  }, []);

  const openAdd = useCallback(() => {
    if (defaultVehicleId == null) return;
    openAddFor(defaultVehicleId);
  }, [defaultVehicleId, openAddFor]);

  const openEdit = useCallback(
    (x: VehicleInsurance) => {
      if (defaultVehicleId != null) setVehicleId(defaultVehicleId);
      setEditId(x.id);
      const tm = matchInsurancePresetSlug(
        x.insuranceType,
        [...VEHICLE_INSURANCE_TYPE_SLUGS],
        VEHICLE_INSURANCE_OTHER_SLUG,
        t,
        "vehicles.insuranceTypeOptions",
        VEHICLE_INSURANCE_TYPE_ALIASES,
      );
      setTypeSlug(tm.slug);
      setTypeCustom(tm.custom);
      const pm = matchInsurancePresetSlug(
        x.provider ?? "",
        [...VEHICLE_INSURANCE_COMPANY_SLUGS],
        VEHICLE_INSURANCE_OTHER_SLUG,
        t,
        "vehicles.insuranceCompanyOptions",
        VEHICLE_INSURANCE_COMPANY_ALIASES,
      );
      setProvSlug(pm.slug);
      setProvCustom(pm.custom);
      setPolicy(x.policyNumber ?? "");
      setStart(x.startDate.slice(0, 10));
      setEnd(x.endDate.slice(0, 10));
      setAmount(
        x.amount != null && Number.isFinite(x.amount)
          ? formatLocaleAmountInput(x.amount, locale)
          : "",
      );
      setModal("edit");
    },
    [defaultVehicleId, locale, t],
  );

  const close = useCallback(() => {
    setModal(null);
    setVehicleId(null);
  }, []);

  const save = useCallback(async () => {
    const vid = vehicleId ?? defaultVehicleId;
    if (!vid) return;
    const resolvedType =
      typeSlug === VEHICLE_INSURANCE_OTHER_SLUG
        ? typeCustom.trim()
        : typeSlug
          ? t(`vehicles.insuranceTypeOptions.${typeSlug}`)
          : "";
    const resolvedProvider =
      provSlug === VEHICLE_INSURANCE_OTHER_SLUG
        ? provCustom.trim()
        : provSlug
          ? t(`vehicles.insuranceCompanyOptions.${provSlug}`)
          : "";
    const sd = start.trim();
    const ed = end.trim();
    if (
      !resolvedType ||
      !resolvedProvider ||
      !/^\d{4}-\d{2}-\d{2}$/.test(sd) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(ed)
    ) {
      notify.error(t("vehicles.insuranceFillRequired"));
      return;
    }
    const amtParsed = parseLocaleAmount(amount.trim(), locale);
    const amt =
      amount.trim() === "" || !Number.isFinite(amtParsed) ? null : amtParsed;
    try {
      if (modal === "add") {
        await createMut.mutateAsync({
          vehicleId: vid,
          insuranceType: resolvedType,
          provider: resolvedProvider || null,
          policyNumber: policy.trim() || null,
          startDate: sd,
          endDate: ed,
          amount: amt,
        });
      } else if (editId) {
        await updateMut.mutateAsync({
          vehicleId: vid,
          insuranceId: editId,
          insuranceType: resolvedType,
          provider: resolvedProvider || null,
          policyNumber: policy.trim() || null,
          startDate: sd,
          endDate: ed,
          amount: amt,
        });
      }
      notify.success(t("common.saved"));
      close();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }, [
    amount,
    close,
    createMut,
    defaultVehicleId,
    editId,
    end,
    locale,
    modal,
    policy,
    provCustom,
    provSlug,
    start,
    t,
    typeCustom,
    typeSlug,
    updateMut,
    vehicleId,
  ]);

  /** Sigorta satırı için confirm-toast'lı silme. */
  const askDelete = useCallback(
    (insuranceId: number, vid: number) => {
      notifyConfirmToast({
        toastId: `vi-del-${insuranceId}`,
        title: t("vehicles.delete"),
        message: t("vehicles.confirmDeleteInsurance"),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("vehicles.delete"),
        onConfirm: async () => {
          try {
            await deleteMut.mutateAsync({
              vehicleId: vid,
              insuranceId,
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
    // modal state
    modal,
    setModal,
    editId,
    vehicleId,
    // field state + setters
    typeSlug,
    setTypeSlug,
    typeCustom,
    setTypeCustom,
    provSlug,
    setProvSlug,
    provCustom,
    setProvCustom,
    policy,
    setPolicy,
    start,
    setStart,
    end,
    setEnd,
    amount,
    setAmount,
    // actions
    openAdd,
    openAddFor,
    openEdit,
    close,
    save,
    askDelete,
    // busy
    saveBusy: createMut.isPending || updateMut.isPending,
    deleteBusy: deleteMut.isPending,
  };
}

export type VehicleInsuranceFormState = ReturnType<
  typeof useVehicleInsuranceForm
>;
