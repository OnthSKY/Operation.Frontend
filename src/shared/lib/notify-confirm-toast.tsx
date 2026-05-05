"use client";

import {
  toastCardPaddingRadiusShadow,
  toastCardWidth,
  toastSafeBottomMobile,
  toastSurfaceNeutral,
  toastSurfaceWarning,
} from "@/shared/lib/toast-theme";
import { toast } from "react-toastify";
import type { ReactNode } from "react";

function isNarrowScreen(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(max-width: 639px)").matches;
}

export type NotifyConfirmTone = "neutral" | "warning";

export function notifyConfirmToast(opts: {
  toastId: string;
  title?: ReactNode;
  message: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  /** neutral: white card (modal-like). warning: amber strip (e.g. branch income delete). */
  tone?: NotifyConfirmTone;
}): void {
  toast.dismiss(opts.toastId);

  const narrow = isNarrowScreen();
  const tone = opts.tone ?? "neutral";
  const surface = tone === "neutral" ? toastSurfaceNeutral : toastSurfaceWarning;
  const toastBox = [
    toastCardWidth,
    toastCardPaddingRadiusShadow,
    surface,
    narrow ? toastSafeBottomMobile : "",
  ]
    .filter(Boolean)
    .join(" ");

  toast(
    ({ closeToast }) => (
      <div className="flex w-full min-w-0 flex-col gap-3 text-left">
        {opts.title != null && opts.title !== "" ? (
          <p className="text-base font-semibold leading-snug text-zinc-900">{opts.title}</p>
        ) : null}
        <div className="flex min-w-0 flex-col gap-3 break-words text-sm leading-relaxed text-zinc-600">
          {typeof opts.message === "string" ? (
            <p className="whitespace-pre-line">{opts.message}</p>
          ) : (
            opts.message
          )}
        </div>
        <div className="mt-1 flex w-full flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 shadow-sm shadow-zinc-900/5 transition-colors hover:border-zinc-400 hover:bg-zinc-50 active:bg-zinc-100 sm:order-1 sm:w-auto sm:min-w-[6.5rem]"
            onClick={() => closeToast()}
          >
            {opts.cancelLabel}
          </button>
          <button
            type="button"
            className="min-h-11 w-full rounded-xl border border-red-700/85 bg-red-600 px-3 text-sm font-semibold text-white shadow-sm shadow-red-900/15 transition-colors hover:border-red-800 hover:bg-red-700 active:bg-red-800 sm:order-2 sm:w-auto sm:min-w-[6.5rem]"
            onClick={() => {
              closeToast();
              void opts.onConfirm();
            }}
          >
            {opts.confirmLabel}
          </button>
        </div>
      </div>
    ),
    {
      toastId: opts.toastId,
      type: "default",
      icon: false,
      autoClose: false,
      closeOnClick: false,
      draggable: false,
      pauseOnHover: true,
      hideProgressBar: true,
      position: narrow ? "bottom-center" : "top-center",
      className: toastBox,
      role: "alertdialog",
    }
  );
}
