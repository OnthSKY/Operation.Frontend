"use client";

import { notifyDefaults } from "@/shared/lib/notify";
import { NotifyTimerBadge } from "@/shared/lib/notify-timed-message";
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
      <div className="flex w-full min-w-0 flex-col gap-2.5 text-left">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 text-sm leading-snug text-zinc-900">{opts.message}</p>
          <NotifyTimerBadge isPaused={isPaused} autoCloseMs={ms} className="shrink-0" />
        </div>
        <button
          type="button"
          className="self-start rounded-lg border border-red-300/90 bg-red-50 px-3 py-2 text-sm font-semibold text-red-950 shadow-sm transition-colors hover:bg-red-100 active:bg-red-200/80"
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
      className:
        "!w-[min(100vw-1.5rem,22rem)] !max-w-[min(100vw-1.5rem,22rem)] !rounded-2xl !border !border-red-200/90 !bg-white !p-3 !text-zinc-900 !shadow-xl sm:!w-auto sm:!max-w-md sm:!p-4",
    }
  );
}
