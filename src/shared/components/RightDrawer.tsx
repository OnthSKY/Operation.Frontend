"use client";

import { cn } from "@/lib/cn";
import { BackdropCloseConfirm } from "@/shared/overlays/BackdropCloseConfirm";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { Button } from "@/shared/ui/Button";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Alt kısımda kapat (mobil için) */
  closeLabel: string;
  className?: string;
  /** Portal kökü (ör. iç içe modal üstü için z-index). */
  rootClassName?: string;
  /** false: arka plana tıklanınca doğrudan kapanır (varsayılan: onay sorulur). */
  backdropCloseRequiresConfirm?: boolean;
};

export function RightDrawer({
  open,
  onClose,
  title,
  children,
  closeLabel,
  className,
  rootClassName,
  backdropCloseRequiresConfirm = true,
}: Props) {
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
      if (backdropConfirmOpen) {
        setBackdropConfirmOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, backdropConfirmOpen]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const requestBackdropClose = () => {
    if (backdropCloseRequiresConfirm) setBackdropConfirmOpen(true);
    else onClose();
  };

  return createPortal(
    <div className={cn("fixed inset-0", OVERLAY_Z_TW.modal, rootClassName)} role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-[1px]"
        aria-label={closeLabel}
        onClick={requestBackdropClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="right-drawer-title"
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl shadow-zinc-900/15 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]",
          className
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 sm:px-5">
          <h2 id="right-drawer-title" className="text-base font-semibold text-zinc-900">
            {title}
          </h2>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <span className="text-2xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5 sm:py-5">
          {children}
        </div>
        <div className="shrink-0 border-t border-zinc-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:px-5">
          <Button type="button" variant="secondary" className="w-full min-h-11" onClick={onClose}>
            {closeLabel}
          </Button>
        </div>
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
