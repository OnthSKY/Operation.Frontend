"use client";

import { useCallback, useState } from "react";
import {
  useCreateVehicleExpense,
  useDeleteVehicleExpense,
  useUpdateVehicleExpense,
} from "@/modules/vehicles/hooks/useVehicleQueries";
import { localIsoDate } from "@/shared/lib/local-iso-date";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { VehicleExpense } from "@/types/vehicle";

export type VehicleExpenseFormMode = "add" | "edit" | null;
export type VehicleExpenseBranchPaySource = "REGISTER" | "PATRON";
export type VehicleExpensePatronPay = "CASH" | "CARD";

/**
 * Araç gider CRUD modal'ı için tam form durumu + mutation yönetimi.
 *  - 10 alan (type/amount/currency/date/desc/branchId/paySource/patronPay)
 *  - 3 mutation (create/update/delete)
 *  - open/close/save/askDelete handler'ları
 */
export function useVehicleExpenseForm({
  defaultVehicleId,
  t,
}: {
  defaultVehicleId: number | null;
  t: (k: string) => string;
}) {
  const createMut = useCreateVehicleExpense();
  const updateMut = useUpdateVehicleExpense();
  const deleteMut = useDeleteVehicleExpense();

  const [modal, setModal] = useState<VehicleExpenseFormMode>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [type, setType] = useState("fuel");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("TRY");
  const [date, setDate] = useState(localIsoDate());
  const [desc, setDesc] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branchPaySource, setBranchPaySource] =
    useState<VehicleExpenseBranchPaySource>("REGISTER");
  const [patronPay, setPatronPay] = useState<VehicleExpensePatronPay>("CASH");

  const openAddFor = useCallback((vid: number) => {
    setVehicleId(vid);
    setEditId(null);
    setType("fuel");
    setAmount("");
    setCurrency("TRY");
    setDate(localIsoDate());
    setDesc("");
    setBranchId("");
    setBranchPaySource("REGISTER");
    setPatronPay("CASH");
    setModal("add");
  }, []);

  const openAdd = useCallback(() => {
    if (defaultVehicleId == null) return;
    openAddFor(defaultVehicleId);
  }, [defaultVehicleId, openAddFor]);

  const openEdit = useCallback(
    (x: VehicleExpense) => {
      if (defaultVehicleId != null) setVehicleId(defaultVehicleId);
      setEditId(x.id);
      setType(x.expenseType);
      setAmount(String(x.amount));
      setCurrency(x.currencyCode);
      setDate(x.expenseDate.slice(0, 10));
      setDesc(x.description ?? "");
      setBranchId(
        x.postedBranchId != null && x.postedBranchId > 0
          ? String(x.postedBranchId)
          : "",
      );
      const src = (x.postedExpensePaymentSource ?? "REGISTER").toUpperCase();
      setBranchPaySource(src === "PATRON" ? "PATRON" : "REGISTER");
      const card = x.postedRegisterCardAmount ?? 0;
      const cash = x.postedRegisterCashAmount ?? 0;
      setPatronPay(card > 0 && cash <= 0 ? "CARD" : "CASH");
      setModal("edit");
    },
    [defaultVehicleId],
  );

  const close = useCallback(() => {
    setModal(null);
    setVehicleId(null);
  }, []);

  const save = useCallback(async () => {
    const vid = vehicleId ?? defaultVehicleId;
    if (!vid) return;
    const amt = parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(amt)) {
      notify.error(t("common.invalid"));
      return;
    }
    const brRaw = branchId.trim();
    const branchIdParsed = brRaw ? parseInt(brRaw, 10) : null;
    const resolvedBranchId =
      branchIdParsed != null &&
      Number.isFinite(branchIdParsed) &&
      branchIdParsed > 0
        ? branchIdParsed
        : null;
    const branchExpensePaymentSource =
      resolvedBranchId != null ? branchPaySource : undefined;
    const patronPaymentMethod =
      resolvedBranchId != null && branchPaySource === "PATRON"
        ? patronPay
        : undefined;
    try {
      if (modal === "add") {
        await createMut.mutateAsync({
          vehicleId: vid,
          expenseType: type.trim(),
          amount: amt,
          currencyCode: currency.trim() || "TRY",
          expenseDate: date,
          description: desc.trim() || null,
          branchId: resolvedBranchId,
          branchExpensePaymentSource,
          patronPaymentMethod,
        });
      } else if (editId) {
        await updateMut.mutateAsync({
          vehicleId: vid,
          expenseId: editId,
          expenseType: type.trim(),
          amount: amt,
          currencyCode: currency.trim() || "TRY",
          expenseDate: date,
          description: desc.trim() || null,
          branchId: resolvedBranchId,
          branchExpensePaymentSource,
          patronPaymentMethod,
        });
      }
      notify.success(t("common.saved"));
      close();
    } catch (e) {
      notify.error(toErrorMessage(e));
    }
  }, [
    amount,
    branchId,
    branchPaySource,
    close,
    createMut,
    currency,
    date,
    defaultVehicleId,
    desc,
    editId,
    modal,
    patronPay,
    t,
    type,
    updateMut,
    vehicleId,
  ]);

  /** Confirm-toast'lı silme. Caller `vid`'i sağlar (detail.id vb.). */
  const askDelete = useCallback(
    (expenseId: number, vid: number) => {
      notifyConfirmToast({
        toastId: `ve-del-${expenseId}`,
        title: t("vehicles.delete"),
        message: t("vehicles.confirmDeleteExpense"),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("vehicles.delete"),
        onConfirm: async () => {
          try {
            await deleteMut.mutateAsync({
              vehicleId: vid,
              expenseId,
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
    editId,
    vehicleId,
    type,
    setType,
    amount,
    setAmount,
    currency,
    setCurrency,
    date,
    setDate,
    desc,
    setDesc,
    branchId,
    setBranchId,
    branchPaySource,
    setBranchPaySource,
    patronPay,
    setPatronPay,
    openAdd,
    openAddFor,
    openEdit,
    close,
    save,
    askDelete,
    saveBusy: createMut.isPending || updateMut.isPending,
    deleteBusy: deleteMut.isPending,
  };
}

export type VehicleExpenseFormState = ReturnType<typeof useVehicleExpenseForm>;
