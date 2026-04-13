"use client";

import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/cn";
import { Button } from "@/shared/ui/Button";
import { useId } from "react";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Dışarı (backdrop) tıklanınca yanlışlıkla kapanmayı önlemek için onay katmanı.
 * × veya açık “Kapat” düğmeleri doğrudan `onClose` ile kapanmalı; bu bileşen yalnızca backdrop için.
 */
export function BackdropCloseConfirm({ open, onCancel, onConfirm }: Props) {
  const { t } = useI18n();
  const titleId = useId();

  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-[25] flex items-end justify-center",
        "pl-[max(0.5rem,env(safe-area-inset-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))]",
        "pt-[max(0.5rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0.5rem))]",
        "sm:items-center sm:p-4 sm:pb-4"
      )}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/50"
        aria-label={t("common.modalBackdropCloseStay")}
        onClick={onCancel}
      />
      <div
        className={cn(
          "relative z-[1] w-full max-w-[min(22rem,calc(100vw-1.25rem))] rounded-xl border border-zinc-200 bg-white p-4 shadow-xl",
          "sm:max-w-sm sm:p-5"
        )}
      >
        <h3 id={titleId} className="text-base font-semibold text-zinc-900 sm:text-lg">
          {t("common.modalConfirmOutsideCloseTitle")}
        </h3>
        <p className="mt-2 text-sm leading-snug text-zinc-600 sm:text-[15px]">
          {t("common.modalConfirmOutsideCloseMessage")}
        </p>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full sm:w-auto sm:min-w-[6.5rem]"
            onClick={onCancel}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="min-h-11 w-full sm:w-auto sm:min-w-[6.5rem]"
            onClick={onConfirm}
          >
            {t("common.yes")}
          </Button>
        </div>
      </div>
    </div>
  );
}
