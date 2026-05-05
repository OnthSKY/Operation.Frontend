"use client";

import { notifyDefaults } from "@/shared/lib/notify";
import { NotifyTimerBadge } from "@/shared/lib/notify-timed-message";
import {
  toastCardPaddingRadiusShadow,
  toastCardWidth,
  toastSurfaceDanger,
} from "@/shared/lib/toast-theme";
import { toast } from "react-toastify";

const TOAST_ID = "notify-error-with-action";

export function notifyErrorWithAction(opts: {
  message: string;
  actionLabel: string;
  onAction: () => void;
  /** Varsayılan 10 sn; süre dolunca yalnızca kapanır, `onAction` çağrılmaz. */
  autoCloseMs?: number;
}): void {
  toast.dismiss(TOAST_ID);
  const ms = opts.autoCloseMs ?? 10_000;
  toast(
    ({ closeToast, isPaused }) => (
      <div className="flex w-full min-w-0 flex-col gap-3 text-left">
        <div className="flex items-start gap-3">
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-zinc-800">{opts.message}</p>
          <NotifyTimerBadge isPaused={isPaused} autoCloseMs={ms} surface="light" className="shrink-0 pt-0.5" />
        </div>
        <button
          type="button"
          className="min-h-10 self-start rounded-xl border border-red-300/90 bg-red-50 px-3 py-2 text-sm font-semibold text-red-950 shadow-sm transition-colors hover:bg-red-100 active:bg-red-200/80"
          onClick={() => {
            opts.onAction();
            closeToast?.();
          }}
        >
          {opts.actionLabel}
        </button>
      </div>
    ),
    {
      toastId: TOAST_ID,
      ...notifyDefaults,
      type: "default",
      icon: false,
      autoClose: ms,
      closeOnClick: false,
      className: [toastCardWidth, toastCardPaddingRadiusShadow, toastSurfaceDanger].join(" "),
    }
  );
}
