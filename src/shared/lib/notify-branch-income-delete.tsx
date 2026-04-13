"use client";

import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";

const TOAST_ID = "branch-income-delete-confirm";

export function notifyBranchIncomeDeleteConfirm(opts: {
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}): void {
  notifyConfirmToast({ ...opts, toastId: TOAST_ID, tone: "warning" });
}
