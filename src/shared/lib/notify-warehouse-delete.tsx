"use client";

import { notifyConfirmToast } from "@/shared/lib/notify-confirm-toast";

export function notifyWarehouseDeleteConfirm(opts: {
  warehouseId: number;
  name: string;
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}): void {
  notifyConfirmToast({
    toastId: `warehouse-delete-confirm-${opts.warehouseId}`,
    title: opts.title,
    message: (
      <>
        <p>{opts.body}</p>
        <p className="mt-2 break-words font-medium text-zinc-900">“{opts.name}”</p>
      </>
    ),
    cancelLabel: opts.cancelLabel,
    confirmLabel: opts.confirmLabel,
    onConfirm: opts.onConfirm,
  });
}
