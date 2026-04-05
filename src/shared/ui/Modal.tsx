"use client";

import { cn } from "@/lib/cn";
import { dialogTheme } from "@/shared/theme/dialog";
import { useEffect, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Kapat düğmesi (mobilde keşfedilebilirlik için); erişilebilir etiket. */
  closeButtonLabel?: string;
};

export function Modal({
  open,
  onClose,
  titleId,
  title,
  description,
  children,
  className,
  closeButtonLabel,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={dialogTheme.backdrop}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(dialogTheme.panel, className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={dialogTheme.headerRow}>
          <div className={dialogTheme.headerText}>
            <h2 id={titleId} className={dialogTheme.title}>
              {title}
            </h2>
            {description ? (
              <p className={dialogTheme.description}>{description}</p>
            ) : null}
          </div>
          {closeButtonLabel ? (
            <button
              type="button"
              className={dialogTheme.closeButton}
              onClick={onClose}
              aria-label={closeButtonLabel}
            >
              <span aria-hidden>×</span>
            </button>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
