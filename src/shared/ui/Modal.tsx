"use client";

import { cn } from "@/lib/cn";
import { dialogTheme } from "@/shared/theme/dialog";
import { Tooltip } from "@/shared/ui/Tooltip";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Ürün detayı gibi geniş, dikey kaydırmalı düzen. */
  wide?: boolean;
  /** wide: viewport sınırına kadar sabit yükseklik (tab geçişinde panel zıplamasını önler). */
  wideFixedHeight?: boolean;
  /** Kapat düğmesi (mobilde keşfedilebilirlik için); erişilebilir etiket. */
  closeButtonLabel?: string;
  /** Başka bir modalın üstünde açılırken daha yüksek z-index. */
  nested?: boolean;
};

export function Modal({
  open,
  onClose,
  titleId,
  title,
  description,
  children,
  className,
  wide = false,
  wideFixedHeight = false,
  closeButtonLabel,
  nested = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (nested) e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, nested);
    return () => window.removeEventListener("keydown", onKey, nested);
  }, [open, onClose, nested]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  if (!mounted) return null;

  const wideHeight = wideFixedHeight
    ? "h-[min(92dvh,56rem)] sm:h-[min(88vh,60rem)] lg:h-[min(90dvh,68rem)] xl:h-[min(92dvh,76rem)]"
    : "max-h-[min(92dvh,56rem)] sm:max-h-[min(88vh,60rem)] lg:max-h-[min(90dvh,68rem)] xl:max-h-[min(92dvh,76rem)]";
  const panelClass = wide
    ? cn(
        "flex w-full max-w-[min(100vw-1rem,80rem)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 shadow-lg xl:max-w-[min(100vw-2rem,90rem)] 2xl:max-w-[min(100vw-3rem,96rem)]",
        wideHeight
      )
    : dialogTheme.panel;
  const headerClass = wide
    ? cn(dialogTheme.headerRow, "shrink-0 border-b border-zinc-100 px-4 py-3 sm:px-6 sm:py-4")
    : dialogTheme.headerRow;

  return createPortal(
    <div
      className={cn(dialogTheme.backdrop, nested && "z-[120]")}
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(panelClass, className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(headerClass, "shrink-0")}>
          <div className={dialogTheme.headerText}>
            <h2 id={titleId} className={dialogTheme.title}>
              {title}
            </h2>
            {description ? (
              <p className={dialogTheme.description}>{description}</p>
            ) : null}
          </div>
          {closeButtonLabel ? (
            <Tooltip content={closeButtonLabel} delayMs={200}>
              <button
                type="button"
                className={dialogTheme.closeButton}
                onClick={onClose}
                aria-label={closeButtonLabel}
              >
                <span aria-hidden>×</span>
              </button>
            </Tooltip>
          ) : null}
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
