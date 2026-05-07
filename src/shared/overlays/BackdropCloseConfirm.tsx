"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { Button } from "@/shared/ui/Button";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function WarningGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.6 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

/**
 * Backdrop’a tıklanınca yanlışlıkla kapanmayı önler.
 * `document.body` üzerinde viewport ortasında gösterilir (üst modal `items-start` hizasından bağımsız).
 */
export function BackdropCloseConfirm({ open, onCancel, onConfirm }: Props) {
  const { t } = useI18n();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setMounted(true);
    });
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className={cn(
        OVERLAY_Z_TW.backdropCloseConfirm,
        "fixed inset-0 flex flex-col items-center justify-center",
        "p-[max(1rem,env(safe-area-inset-left,0.75rem))] pb-[max(1rem,env(safe-area-inset-bottom,0.75rem))] pt-[max(1rem,env(safe-area-inset-top,0.75rem))]",
        "pointer-events-auto"
      )}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={`${titleId}-desc`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/50 backdrop-blur-[3px]"
        aria-label={t("common.modalBackdropCloseStay")}
        onClick={onCancel}
      />
      <div
        className={cn(
          "relative z-[1] flex w-full max-w-[min(22.5rem,calc(100vw-2rem))] flex-col overflow-hidden",
          "rounded-[1.35rem] border border-zinc-200/90 bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-zinc-950/[0.06]",
          "sm:max-w-md"
        )}
      >
        <div className="relative px-5 pb-1 pt-5 sm:px-6 sm:pb-2 sm:pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-800 sm:right-4 sm:top-4"
            aria-label={t("common.modalConfirmOutsideCloseDismissAria")}
          >
            <span className="text-2xl leading-none" aria-hidden>
              ×
            </span>
          </button>
          <div className="flex gap-3.5 pr-10">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/90 text-amber-900 ring-1 ring-amber-200/80"
              aria-hidden
            >
              <WarningGlyph className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 id={titleId} className="text-[1.0625rem] font-semibold leading-snug tracking-tight text-zinc-900 sm:text-lg">
                {t("common.modalConfirmOutsideCloseTitle")}
              </h3>
              <p
                id={`${titleId}-desc`}
                className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-[15px] sm:leading-relaxed"
              >
                {t("common.modalConfirmOutsideCloseMessage")}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-zinc-100 bg-gradient-to-b from-zinc-50/80 to-zinc-50 px-5 py-4 sm:mt-5 sm:gap-2.5 sm:px-6 sm:py-5">
          <Button
            type="button"
            variant="secondary"
            className={cn(
              "min-h-[3rem] w-full border-red-200/90 text-sm font-semibold text-red-800",
              "hover:border-red-300 hover:bg-red-50/90 hover:text-red-900 active:bg-red-100/80",
              "sm:min-h-11"
            )}
            onClick={onConfirm}
          >
            {t("common.modalConfirmOutsideCloseLeave")}
          </Button>
          <Button
            type="button"
            variant="primary"
            autoFocus
            className={cn(
              "min-h-[3.25rem] w-full text-sm font-semibold shadow-md shadow-zinc-900/15",
              "focus-visible:ring-2 focus-visible:ring-zinc-900/25 focus-visible:ring-offset-2",
              "sm:min-h-12"
            )}
            onClick={onCancel}
          >
            {t("common.modalBackdropCloseStay")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
