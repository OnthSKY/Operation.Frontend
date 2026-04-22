"use client";

import { useI18n } from "@/i18n/context";
import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";
import { useCallback, useRef } from "react";
import { toast } from "react-toastify";

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
  const toastIdRef = useRef(`dirty-guard-${Math.random().toString(36).slice(2)}`);

  return useCallback(() => {
    if (isBlocked) return;
    if (isDirty) {
      if (toast.isActive(toastIdRef.current)) return;
      notifyConfirmToast({
        toastId: toastIdRef.current,
        message: confirmMessage,
        cancelLabel: t("common.cancel"),
        confirmLabel: t("common.close"),
        onConfirm: onClose,
        tone: "neutral",
      });
      return;
    }
    onClose();
  }, [confirmMessage, isBlocked, isDirty, onClose, t]);
}
