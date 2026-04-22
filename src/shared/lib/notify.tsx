"use client";

import { NotifyTimedMessage } from "@/shared/lib/notify-timed-message";
import { toast, type Id, type ToastContentProps, type ToastOptions } from "react-toastify";

/**
 * Default Toastify options — adjust here for position, duration, styling hooks.
 */
export const notifyDefaults: ToastOptions = {
  position: "top-center",
  autoClose: 3200,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  hideProgressBar: false,
};

/** Ek seçenekler: `toastId`, farklı `autoClose`, `onClose` vb. */
export type NotifyTimedExtraOptions = Pick<
  ToastOptions,
  "toastId" | "autoClose" | "onClose" | "pauseOnHover" | "pauseOnFocusLoss"
>;

function mergeOpts(extra?: NotifyTimedExtraOptions): ToastOptions {
  return { ...notifyDefaults, ...extra };
}

function autoCloseToMs(extra?: NotifyTimedExtraOptions): number {
  const ac = extra?.autoClose ?? notifyDefaults.autoClose;
  return typeof ac === "number" ? ac : 3200;
}

function renderTimed(message: string, extra: NotifyTimedExtraOptions | undefined) {
  const ms = autoCloseToMs(extra);
  return ({ isPaused }: ToastContentProps) => (
    <NotifyTimedMessage message={message} isPaused={isPaused} autoCloseMs={ms} />
  );
}

export const notify = {
  success(message: string, options?: NotifyTimedExtraOptions) {
    toast.success(renderTimed(message, options), mergeOpts(options));
  },
  error(message: string, options?: NotifyTimedExtraOptions) {
    toast.error(renderTimed(message, options), mergeOpts(options));
  },
  info(message: string, options?: NotifyTimedExtraOptions) {
    toast.info(renderTimed(message, options), mergeOpts(options));
  },
  dismiss(id?: Id) {
    toast.dismiss(id);
  },
  isActive(id: Id) {
    return toast.isActive(id);
  },
};
