"use client";

import { cn } from "@/lib/cn";
import { BackdropCloseConfirm } from "@/shared/overlays/BackdropCloseConfirm";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
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
  /** Arka plan (ör. blur / koyu ton). */
  backdropClassName?: string;
  /** Dar kart — OTP, kısa formlar; mobilde üst köşe radius. */
  narrow?: boolean;
  /** Ürün detayı gibi geniş, dikey kaydırmalı düzen. */
  wide?: boolean;
  /** wide: viewport sınırına kadar sabit yükseklik (tab geçişinde panel zıplamasını önler). */
  wideFixedHeight?: boolean;
  /** wide + büyük ekran: daha geniş/yüksek panel (ör. personel detay). */
  wideExpanded?: boolean;
  /** Kapat düğmesi (mobilde keşfedilebilirlik için); erişilebilir etiket. */
  closeButtonLabel?: string;
  /** Başka bir modalın üstünde açılırken daha yüksek z-index. */
  nested?: boolean;
  /** true: arka plana tıklanınca ek onay modalı gösterir (varsayılan: doğrudan onClose). */
  backdropCloseRequiresConfirm?: boolean;
};

export function Modal({
  open,
  onClose,
  titleId,
  title,
  description,
  children,
  className,
  backdropClassName,
  narrow = false,
  wide = false,
  wideFixedHeight = false,
  wideExpanded = false,
  closeButtonLabel,
  nested = false,
  backdropCloseRequiresConfirm = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [backdropConfirmOpen, setBackdropConfirmOpen] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setBackdropConfirmOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (nested) e.stopPropagation();
      if (backdropConfirmOpen) {
        setBackdropConfirmOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey, nested);
    return () => window.removeEventListener("keydown", onKey, nested);
  }, [open, onClose, nested, backdropConfirmOpen]);

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

  const wideHeight = wideExpanded
    ? wideFixedHeight
      ? "h-[min(92dvh,64rem)] sm:h-[min(92dvh,68rem)] lg:h-auto lg:max-h-[min(93dvh,76rem)] xl:max-h-[min(94dvh,84rem)] 2xl:max-h-[min(94dvh,92rem)]"
      : "max-h-[min(92dvh,64rem)] sm:max-h-[min(92dvh,68rem)] lg:max-h-[min(93dvh,76rem)] xl:max-h-[min(94dvh,84rem)] 2xl:max-h-[min(94dvh,92rem)]"
    : wideFixedHeight
      ? "h-[min(92dvh,60rem)] sm:h-[min(92dvh,64rem)] lg:h-auto lg:max-h-[min(93dvh,72rem)] xl:max-h-[min(94dvh,80rem)] 2xl:max-h-[min(94dvh,84rem)]"
      : "max-h-[min(92dvh,60rem)] sm:max-h-[min(92dvh,64rem)] lg:max-h-[min(93dvh,72rem)] xl:max-h-[min(94dvh,80rem)] 2xl:max-h-[min(94dvh,84rem)]";
  const panelClass = wide
    ? cn(
        wideExpanded
          ? "flex min-h-0 w-full max-w-[min(100vw-1rem,96rem)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 shadow-lg lg:max-w-[min(100vw-2rem,108rem)] xl:max-w-[min(100vw-2rem,124rem)] 2xl:max-w-[min(100vw-3rem,132rem)]"
          : "flex min-h-0 w-full max-w-[min(100vw-1rem,88rem)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 shadow-lg lg:max-w-[min(100vw-2rem,96rem)] xl:max-w-[min(100vw-2rem,112rem)] 2xl:max-w-[min(100vw-3rem,120rem)]",
        wideHeight
      )
    : narrow
      ? dialogTheme.narrowPanel
      : dialogTheme.panel;
  const headerClass = wide
    ? cn(dialogTheme.headerRow, "shrink-0 border-b border-zinc-100 px-4 py-3 sm:px-6 sm:py-4")
    : dialogTheme.headerRow;

  const requestBackdropClose = () => {
    if (backdropCloseRequiresConfirm) setBackdropConfirmOpen(true);
    else onClose();
  };

  return createPortal(
    <div
      className={cn(
        dialogTheme.backdrop,
        backdropClassName,
        nested && OVERLAY_Z_TW.modalNested
      )}
      role="presentation"
      onClick={requestBackdropClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(panelClass, className)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn(headerClass, "shrink-0")}>
          <div className={cn(dialogTheme.headerText, narrow && "sm:pr-1")}>
            <h2
              id={titleId}
              className={cn(dialogTheme.title, narrow && "text-balance text-center sm:text-left")}
            >
              {title}
            </h2>
            {description ? (
              <p
                className={cn(
                  dialogTheme.description,
                  narrow && "text-balance text-center text-[15px] leading-snug sm:text-left sm:text-sm lg:text-base"
                )}
              >
                {description}
              </p>
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
      <BackdropCloseConfirm
        open={backdropConfirmOpen}
        onCancel={() => setBackdropConfirmOpen(false)}
        onConfirm={() => {
          setBackdropConfirmOpen(false);
          onClose();
        }}
      />
    </div>,
    document.body
  );
}
