"use client";

import { useCallback } from "react";
import { useDeletePersonnelInsurancePeriod } from "@/modules/personnel/hooks/usePersonnelQueries";
import { notify } from "@/shared/lib/notify";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { toErrorMessage } from "@/shared/lib/error-message";
import type {
  Personnel,
  PersonnelInsurancePeriod,
} from "@/types/personnel";

/**
 * Personel sigorta dönemi mutation'ları + confirm-toast'lı silme handler'ı.
 * Modal yalnız `personnel` + (silinen düzenleme açıksa kapatmak için) opsiyonel
 * `onAfterDelete(row)` callback'ini verir.
 */
export function usePersonnelInsuranceMutations({
  personnel,
  onAfterDelete,
  t,
}: {
  personnel: Personnel | null;
  /**
   * Silme başarıyla tamamlandıktan sonra çalışır (örn. açık edit dialog'unu kapatmak için).
   */
  onAfterDelete?: (row: PersonnelInsurancePeriod) => void;
  t: (k: string) => string;
}) {
  const deleteMut = useDeletePersonnelInsurancePeriod();

  const askDeletePeriod = useCallback(
    (row: PersonnelInsurancePeriod) => {
      if (!personnel || personnel.isDeleted) return;
      notifyConfirmToast({
        toastId: `personnel-insurance-period-delete-inline-${personnel.id}-${row.id}`,
        title: t("personnel.insurancePeriodDeleteTitle"),
        message: t("personnel.insurancePeriodDeleteAsk"),
        cancelLabel: t("common.cancel"),
        confirmLabel: t("common.delete"),
        onConfirm: async () => {
          try {
            await deleteMut.mutateAsync({
              personnelId: personnel.id,
              periodId: row.id,
            });
            notify.success(t("personnel.insurancePeriodDeleted"));
            onAfterDelete?.(row);
          } catch (err) {
            notify.error(toErrorMessage(err));
          }
        },
      });
    },
    [deleteMut, onAfterDelete, personnel, t],
  );

  return {
    askDeletePeriod,
    deletePending: deleteMut.isPending,
  };
}
