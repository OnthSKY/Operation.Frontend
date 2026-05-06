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
  /**
   * Mobil (max-sm): tam yükseklik alt sheet — şube detay paneline benzer.
   * İçerik kaydırılabilir alanda; yalnızca `narrow` ile birlikte kullanın.
   */
  sheetMobile?: boolean;
  /** Ürün detayı gibi geniş, dikey kaydırmalı düzen. */
  wide?: boolean;
  /** wide: viewport sınırına kadar sabit yükseklik (tab geçişinde panel zıplamasını önler). */
  wideFixedHeight?: boolean;
  /** wide + büyük ekran: daha geniş/yüksek panel (ör. personel detay). */
  wideExpanded?: boolean;
  /**
   * wide: max-sm’de paneli tam ekran (köşesiz, backdrop kenar boşluksuz) — detay sayfası hissi.
   */
  wideFullScreenMobile?: boolean;
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
  sheetMobile = false,
  wide = false,
  wideFixedHeight = false,
  wideExpanded = false,
  wideFullScreenMobile = false,
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
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  if (!open) return null;

  if (!mounted) return null;

  const wideHeight = wideExpanded
    ? wideFixedHeight
      ? "h-[min(92dvh,64rem)] sm:h-[min(92dvh,68rem)] lg:h-[min(93dvh,76rem)] xl:h-[min(94dvh,84rem)] 2xl:h-[min(94dvh,92rem)]"
      : "max-h-[min(92dvh,64rem)] sm:max-h-[min(92dvh,68rem)] lg:max-h-[min(93dvh,76rem)] xl:max-h-[min(94dvh,84rem)] 2xl:max-h-[min(94dvh,92rem)]"
    : wideFixedHeight
      ? "h-[min(92dvh,60rem)] sm:h-[min(92dvh,64rem)] lg:h-[min(93dvh,72rem)] xl:h-[min(94dvh,80rem)] 2xl:h-[min(94dvh,84rem)]"
      : "max-h-[min(92dvh,60rem)] sm:max-h-[min(92dvh,64rem)] lg:max-h-[min(93dvh,72rem)] xl:max-h-[min(94dvh,80rem)] 2xl:max-h-[min(94dvh,84rem)]";
  const sheetMobileActive = Boolean(sheetMobile && narrow);
  const wideFullScreenMobileActive = Boolean(wide && wideFullScreenMobile);

  const panelClass = wide
    ? cn(
        wideExpanded
          ? "flex min-h-0 w-full max-w-[min(100vw-1rem,96rem)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 shadow-lg lg:max-w-[min(100vw-2rem,108rem)] xl:max-w-[min(100vw-2rem,124rem)] 2xl:max-w-[min(100vw-3rem,132rem)]"
          : "flex min-h-0 w-full max-w-[min(100vw-1rem,88rem)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white p-0 shadow-lg lg:max-w-[min(100vw-2rem,96rem)] xl:max-w-[min(100vw-2rem,112rem)] 2xl:max-w-[min(100vw-3rem,120rem)]",
        wideHeight,
        wideFullScreenMobileActive &&
          "max-sm:!h-[100dvh] max-sm:!max-h-[100dvh] max-sm:!min-h-0 max-sm:w-full max-sm:!max-w-none max-sm:rounded-none max-sm:border-0 max-sm:!shadow-none max-sm:!ring-0"
      )
    : narrow
      ? cn(
          dialogTheme.narrowPanel,
          sheetMobileActive &&
            "max-sm:flex max-sm:h-[min(100dvh,100svh)] max-sm:max-h-[100dvh] max-sm:flex-col max-sm:overflow-hidden max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-t max-sm:border-zinc-200/90 max-sm:!px-0 max-sm:!pt-0 max-sm:!pb-[env(safe-area-inset-bottom,0px)] max-sm:shadow-2xl max-sm:!ring-0"
        )
      : dialogTheme.panel;
  const headerClass = wide
    ? cn(
        dialogTheme.headerRow,
        "shrink-0 border-b border-zinc-100 px-4 py-3 sm:px-6 sm:py-4",
        wideFullScreenMobileActive &&
          "max-sm:pt-[max(0.65rem,env(safe-area-inset-top,0px))] max-sm:pb-3"
      )
    : cn(
        dialogTheme.headerRow,
        sheetMobileActive &&
          "max-sm:shrink-0 max-sm:border-b max-sm:border-zinc-100 max-sm:px-4 max-sm:pb-3 max-sm:pt-[max(0.5rem,env(safe-area-inset-top,0px))]"
      );

  const requestBackdropClose = () => {
    if (backdropCloseRequiresConfirm) setBackdropConfirmOpen(true);
    else onClose();
  };

  return createPortal(
    <div
      className={cn(
        dialogTheme.backdrop,
        backdropClassName,
        sheetMobileActive &&
          "max-sm:items-end max-sm:justify-center max-sm:!bg-zinc-950/50 max-sm:!p-0 max-sm:!pt-0 max-sm:!pb-0",
        wideFullScreenMobileActive &&
          "max-sm:items-stretch max-sm:justify-stretch max-sm:!bg-zinc-950/40 max-sm:!p-0 max-sm:!px-0 max-sm:!pt-0 max-sm:!pb-0",
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
              className={cn(
                dialogTheme.title,
                narrow && "text-balance text-center sm:text-left",
                sheetMobileActive && "max-sm:text-left"
              )}
            >
              {title}
            </h2>
            {description ? (
              <p
                className={cn(
                  dialogTheme.description,
                  narrow && "text-balance text-center text-[15px] leading-snug sm:text-left sm:text-sm lg:text-base",
                  sheetMobileActive && "max-sm:text-left"
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
        {sheetMobileActive ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom,0.75rem))] pt-1 [-webkit-overflow-scrolling:touch]">
            {children}
          </div>
        ) : (
          children
        )}
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
