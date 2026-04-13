"use client";

import type { AccountMenuSection } from "@/modules/account/types";
import { useI18n } from "@/i18n/context";
import { AccountPanelTabs } from "@/modules/account/components/AccountPanelTabs";
import type { ReactNode } from "react";
import { BackdropCloseConfirm } from "@/shared/overlays/BackdropCloseConfirm";
import { OVERLAY_Z_TW } from "@/shared/overlays/z-layers";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  section: AccountMenuSection;
  onClose: () => void;
  onSectionChange: (s: AccountMenuSection) => void;
  children: ReactNode;
};

export function AccountPanelShell({
  open,
  section,
  onClose,
  onSectionChange,
  children,
}: Props) {
  const { t } = useI18n();
  const [backdropConfirmOpen, setBackdropConfirmOpen] = useState(false);

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

  if (!open) return null;

  const requestBackdropClose = () => setBackdropConfirmOpen(true);

  return (
    <div
      className={`fixed inset-0 ${OVERLAY_Z_TW.accountPanel} flex md:items-start md:justify-end md:p-3 md:pt-[max(0.75rem,calc(3.5rem+env(safe-area-inset-top,0px)+0.5rem))]`}
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/50 md:bg-zinc-900/40"
        aria-label={t("profile.closePanel")}
        onClick={requestBackdropClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-panel-title"
        className="relative z-10 flex h-[100dvh] w-full max-w-full flex-col bg-white shadow-2xl md:h-[min(100dvh-1.5rem,calc(100dvh-4rem))] md:max-h-[calc(100dvh-1.5rem)] md:w-full md:max-w-md md:rounded-2xl md:ring-1 md:ring-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 flex-col gap-2 border-b border-zinc-200 bg-white px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] md:rounded-t-2xl md:pt-4">
          <div className="flex items-start justify-between gap-2">
            <h2
              id="account-panel-title"
              className="min-w-0 pt-1 text-sm font-semibold text-zinc-900"
            >
              {t("profile.panelTitle")}
            </h2>
            <button
              type="button"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              onClick={onClose}
              aria-label={t("profile.closePanel")}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <AccountPanelTabs active={section} onChange={onSectionChange} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
          {children}
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
    </div>
  );
}
