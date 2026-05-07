"use client";

import { useI18n } from "@/i18n/context";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { notify } from "@/shared/lib/notify";
import { toastifyConfirmContainerId } from "@/shared/lib/toast-theme";
import { useCallback, useId, useRef } from "react";

type UseDirtyGuardArgs = {
  isDirty: boolean;
  isBlocked?: boolean;
  confirmMessage: string;
  onClose: () => void;
};

export function useDirtyGuard({
  isDirty,
  isBlocked = false,
  confirmMessage,
  onClose,
}: UseDirtyGuardArgs) {
  const { t } = useI18n();
  const toastId = useId();
  const toastIdRef = useRef(`dirty-guard-${toastId}`);

  return useCallback(() => {
    if (isBlocked) return;
    if (isDirty) {
      if (notify.isActive(toastIdRef.current, toastifyConfirmContainerId)) return;
      notifyConfirmToast({
        toastId: toastIdRef.current,
        message: confirmMessage,
        cancelLabel: t("common.modalBackdropCloseStay"),
        confirmLabel: t("common.modalConfirmOutsideCloseLeave"),
        onConfirm: onClose,
        tone: "neutral",
      });
      return;
    }
    onClose();
  }, [confirmMessage, isBlocked, isDirty, onClose, t]);
}
