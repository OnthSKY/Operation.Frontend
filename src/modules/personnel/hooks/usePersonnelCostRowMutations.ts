"use client";

import { useCallback } from "react";
import {
  useDeleteAdvance,
  useHardDeleteAdvance,
  useRestoreAdvance,
} from "@/modules/personnel/hooks/usePersonnelQueries";
import { useDeleteBranchTransaction } from "@/modules/branch/hooks/useBranchQueries";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { toErrorMessage } from "@/shared/lib/error-message";
import type { Personnel } from "@/types/personnel";

export type CostRowMutations = {
  /** Confirm + soft delete advance (`a-<id>` key'i ile optimistic UI). */
  confirmDeleteAdvance: (advanceId: number) => void;
  /** Confirm + restore deleted advance (yalnız sistem yöneticisi). */
  confirmRestoreAdvance: (advanceId: number) => void;
  /** Confirm + hard delete advance (yalnız sistem yöneticisi). */
  confirmHardDeleteAdvance: (advanceId: number) => void;
  /** Confirm + delete personnel expense tx (`e-<id>` key'i ile optimistic UI). */
  confirmDeleteExpenseTx: (transactionId: number) => void;
  /** UI'nin disabled state'i için mutation pending bayrakları. */
  busyDeleteAdvance: boolean;
  busyRestoreAdvance: boolean;
  busyHardDeleteAdvance: boolean;
  busyDeleteExpenseTx: boolean;
};

/**
 * Personel detayında bir avans/gider satırı için onay-toast'lı silme/geri al/kalıcı
 * sil/gider silme aksiyonları. `markRowDeleting`/`unmarkRowDeleting` optimistic UI
 * için costs state hook'undan gelir (key formatı `a-<id>` | `e-<id>`).
 *
 * Modal yalnızca `personnel` + `isSystemAdmin` + mark/unmark callback'leri verir;
 * mutation hook'ları ve confirm-toast şablonu burada gizli (SRP).
 */
export function usePersonnelCostRowMutations({
  personnel,
  isSystemAdmin,
  markRowDeleting,
  unmarkRowDeleting,
  t,
}: {
  personnel: Personnel | null;
  isSystemAdmin: boolean;
  markRowDeleting: (key: string) => void;
  unmarkRowDeleting: (key: string) => void;
  t: (k: string) => string;
}): CostRowMutations {
  const deleteAdvanceMut = useDeleteAdvance();
  const hardDeleteAdvanceMut = useHardDeleteAdvance();
  const restoreAdvanceMut = useRestoreAdvance();
  const deleteTxMut = useDeleteBranchTransaction();

  const confirmDeleteAdvance = useCallback(
    (advanceId: number) => {
      if (!personnel) return;
      const key = `a-${advanceId}`;
      notifyConfirmToast({
        toastId: `personnel-advance-del-${personnel.id}-${advanceId}`,
        message: t("personnel.detailAdvanceDeleteConfirm"),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("branch.txDeleteConfirm"),
        tone: "warning",
        onConfirm: async () => {
          markRowDeleting(key);
          try {
            await deleteAdvanceMut.mutateAsync(advanceId);
            notify.success(t("toast.advanceDeleted"));
          } catch (e) {
            unmarkRowDeleting(key);
            notify.error(toErrorMessage(e));
          }
        },
      });
    },
    [deleteAdvanceMut, markRowDeleting, personnel, t, unmarkRowDeleting],
  );

  const confirmHardDeleteAdvance = useCallback(
    (advanceId: number) => {
      if (!personnel || !isSystemAdmin) return;
      notifyConfirmToast({
        toastId: `personnel-advance-hard-del-${personnel.id}-${advanceId}`,
        title: t("personnel.detailCostsHardDeleteConfirmTitle"),
        message: t("personnel.detailCostsHardDeleteConfirmMessage"),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("personnel.detailCostsHardDeleteButton"),
        tone: "warning",
        onConfirm: async () => {
          try {
            await hardDeleteAdvanceMut.mutateAsync(advanceId);
            notify.success(t("personnel.detailCostsHardDeleteSuccess"));
          } catch (e) {
            notify.error(toErrorMessage(e));
          }
        },
      });
    },
    [hardDeleteAdvanceMut, isSystemAdmin, personnel, t],
  );

  const confirmRestoreAdvance = useCallback(
    (advanceId: number) => {
      if (!personnel || !isSystemAdmin) return;
      notifyConfirmToast({
        toastId: `personnel-advance-restore-${personnel.id}-${advanceId}`,
        title: t("personnel.detailCostsRestoreConfirmTitle"),
        message: t("personnel.detailCostsRestoreConfirmMessage"),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("personnel.detailCostsRestoreButton"),
        onConfirm: async () => {
          try {
            await restoreAdvanceMut.mutateAsync(advanceId);
            notify.success(t("personnel.detailCostsRestoreSuccess"));
          } catch (e) {
            notify.error(toErrorMessage(e));
          }
        },
      });
    },
    [isSystemAdmin, personnel, restoreAdvanceMut, t],
  );

  const confirmDeleteExpenseTx = useCallback(
    (transactionId: number) => {
      if (!personnel) return;
      const key = `e-${transactionId}`;
      notifyConfirmToast({
        toastId: `personnel-tx-del-${personnel.id}-${transactionId}`,
        message: t("branch.txDeleteSure"),
        cancelLabel: t("branch.txDeleteCancel"),
        confirmLabel: t("branch.txDeleteConfirm"),
        tone: "warning",
        onConfirm: async () => {
          markRowDeleting(key);
          try {
            await deleteTxMut.mutateAsync(transactionId);
            notify.success(t("toast.branchTxDeleted"));
          } catch (e) {
            unmarkRowDeleting(key);
            notify.error(toErrorMessage(e));
          }
        },
      });
    },
    [deleteTxMut, markRowDeleting, personnel, t, unmarkRowDeleting],
  );

  return {
    confirmDeleteAdvance,
    confirmRestoreAdvance,
    confirmHardDeleteAdvance,
    confirmDeleteExpenseTx,
    busyDeleteAdvance: deleteAdvanceMut.isPending,
    busyRestoreAdvance: restoreAdvanceMut.isPending,
    busyHardDeleteAdvance: hardDeleteAdvanceMut.isPending,
    busyDeleteExpenseTx: deleteTxMut.isPending,
  };
}
