"use client";

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
  const toastBox =
    "!w-[min(100vw-1.5rem,22rem)] !max-w-[min(100vw-1.5rem,22rem)] !rounded-2xl !p-3 !shadow-xl sm:!w-auto sm:!max-w-md sm:!p-4" +
    (narrow ? " !mb-[max(0.75rem,env(safe-area-inset-bottom,0px))]" : "") +
    (tone === "neutral"
      ? " !bg-white !text-zinc-900 !border !border-zinc-200/90 !shadow-zinc-900/10"
      : "");

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
            className="min-h-11 w-full rounded-lg border border-slate-300/90 bg-slate-100 px-3 text-sm font-medium text-slate-800 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-200 active:bg-slate-300 sm:order-1 sm:w-auto sm:min-w-[6.5rem]"
            onClick={() => closeToast()}
          >
            {opts.cancelLabel}
          </button>
          <button
            type="button"
            className="min-h-11 w-full rounded-lg border border-red-700/80 bg-red-600 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:border-red-800 hover:bg-red-700 active:bg-red-800 sm:order-2 sm:w-auto sm:min-w-[6.5rem]"
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
      type: tone === "warning" ? "warning" : "default",
      icon: tone === "neutral" ? false : undefined,
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
